"""Offline App boundary tests: real ephemeral RSA signing, fake HTTP and gh only."""
import base64
import copy
from contextlib import redirect_stderr
from datetime import datetime, timedelta, timezone
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("github_app", ROOT / "scripts/adapters/github-app.py")
APP = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(APP)
OPENSSL = shutil.which("openssl")
TOKEN = "ghs_fixture_app_" + "a.b-c_" * 20  # Synthetic stateless-format token, never live.
API_ARGS = ["api", "--hostname", "github.com", "repos/a/b/issues/1", "--method", "GET"]
PR_ARGS = ["pr", "view", "2", "--repo", "a/b", "--json", APP.FIELDS]
GH = '''#!/usr/bin/env python3
import json,os,sys
token=os.environ.get("GH_TOKEN", "")
assert token.startswith("ghs_fixture_app_")
assert os.environ["GH_HOST"] == "github.com"
assert os.environ["HOME"] == os.environ["GH_CONFIG_DIR"]
assert not any(os.path.exists(os.path.join(os.environ["GH_CONFIG_DIR"], name))
               for name in ["hosts.yml", "config.yml"])
assert not any(k in os.environ for k in ["GITHUB_TOKEN","GH_ENTERPRISE_TOKEN",
 "GITHUB_ENTERPRISE_TOKEN","GH_DEBUG","DEBUG","GIT_TRACE","GH_REPO",
 "GH_PATH","HTTP_PROXY","HTTPS_PROXY","SSLKEYLOGFILE","OPENSSL_CONF"])
print(token, file=sys.stderr) # Deliberately hostile stderr must never escape.
if "--input" in sys.argv:
 assert sys.argv[sys.argv.index("--input")+1] == "-"
 json.loads(sys.stdin.buffer.read())
print(json.dumps({"args":sys.argv[1:], "authenticated_fixture_token":bool(token)}))
'''


class AppTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="nexus-app-offline-")
        cls.directory = Path(cls.tmp.name).resolve()
        cls.key = cls.directory / "key.pem"
        result = subprocess.run([OPENSSL, "genrsa", "-out", str(cls.key), "2048"], capture_output=True)
        if result.returncode:
            raise RuntimeError("Ephemeral test key generation failed")
        cls.key.chmod(0o600)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def setUp(self):
        self.work = tempfile.TemporaryDirectory(dir=self.directory)
        self.dir = Path(self.work.name)
        self.config_path = self.dir / "app.json"
        self.config = {"version": 1, "app_id": 123, "private_key_path": str(self.key),
                       "repositories": {"a/b": {"id": 789, "installation_id": 456,
                           "permissions": {k: "write" for k in APP.PERMISSIONS}}}}
        self.save_config()
        self.gh = self.dir / "gh"
        self.gh.write_text(GH)
        self.gh.chmod(0o700)
        self.calls = []
        self.changes = {}
        self.link = ""
        self.needed = APP.command_permissions("a/b", API_ARGS)
        self.env = {"PATH": os.environ["PATH"], "NEXUS_GITHUB_APP_CONFIG": str(self.config_path),
                    "GH_TOKEN": "personal-secret", "GITHUB_TOKEN": "other-personal-secret",
                    "GH_ENTERPRISE_TOKEN": "enterprise-secret", "GITHUB_ENTERPRISE_TOKEN": "secret",
                    "GH_DEBUG": "api", "DEBUG": "1", "GIT_TRACE": "1", "GH_REPO": "foreign/repo",
                    "GH_PATH": "foreign", "HTTPS_PROXY": "http://secret", "HTTP_PROXY": "http://secret",
                    "SSLKEYLOGFILE": str(self.dir / "tls-secret"), "OPENSSL_CONF": "foreign"}

    def tearDown(self):
        self.key.chmod(0o600)
        self.work.cleanup()

    def save_config(self):
        self.config_path.write_text(json.dumps(self.config))

    def transport(self, method, path, credential, body=None):
        self.calls.append((method, path, credential, body))
        installation = dict(id=456, app_id=123, account={"login": "a"}, target_type="Organization",
                            suspended_at=None, permissions={k: "write" for k in APP.PERMISSIONS})
        responses = {"/app": {"id": 123, "slug": "test-app"}, "/app/installations/456": installation,
                     "/users/test-app%5Bbot%5D": {"login": "test-app[bot]", "id": 987, "type": "Bot"},
                     "/repos/a/b/git/ref/heads/main": {"ref":"refs/heads/main", "object":{"type":"commit", "sha":getattr(self, "base", "a"*40)}},
                     "/repos/a/b/git/ref/heads/feature": {"ref":"refs/heads/feature", "url":"https://api.github.com/repos/a/b/git/refs/heads/feature", "object":{"type":"commit", "sha":getattr(self, "head", "a"*40), "url":"https://api.github.com/repos/a/b/git/commits/"+getattr(self, "head", "a"*40)}},
                     "/repos/a/b/installation": installation,
                     "/app/installations/456/access_tokens": {
                         "token": TOKEN, "permissions": self.needed,
                         "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=59)).strftime("%Y-%m-%dT%H:%M:%SZ")},
                     "/installation/repositories?per_page=100": {
                         "total_count": 1, "repositories": [{"id": 789, "full_name": "a/b"}]},
                     "/installation/token": None}
        response = copy.deepcopy(responses[path])
        change = self.changes.get(path)
        if isinstance(change, Exception):
            raise change
        if callable(change):
            response = change(response)
        return response, self.link if path.startswith("/installation/repositories") else ""

    def execute(self, args=API_ARGS, identity_request=None):
        self.needed = APP.command_permissions("a/b", args)
        with patch.dict(os.environ, self.env, clear=True), patch.object(APP, "request", self.transport), \
                patch.object(APP.shutil, "which", side_effect=lambda name: str(self.gh) if name == "gh" else OPENSSL):
            return APP.run("a/b", args, identity_request)

    def test_authenticated_bot_resolution_numeric_user_id_and_revocation(self):
        code, output = self.execute(["identity"])
        self.assertEqual(code, 0)
        bot = json.loads(output)
        self.assertEqual(bot["email"], "987+test-app[bot]@users.noreply.github.com")
        self.assertEqual(bot["bot_user_id"], 987)
        self.assertEqual(bot["app_id"], 123)
        self.assertEqual(self.calls[-1][:2], ("DELETE", "/installation/token"))
        self.assertEqual(self.needed, {"metadata":"read"})
        for path, change in [("/app", lambda r: dict(r, slug=None)),
                             ("/users/test-app%5Bbot%5D", lambda r: dict(r, login="human")),
                             ("/users/test-app%5Bbot%5D", lambda r: dict(r, id=True)),
                             ("/users/test-app%5Bbot%5D", lambda r: dict(r, type="User")),
                             ("/users/test-app%5Bbot%5D", OSError("secret-token"))]:
            self.calls.clear(); self.changes = {path:change}
            with self.assertRaises(APP.AuthError if not isinstance(change, Exception) else Exception):
                self.execute(["identity"])
            self.assertEqual(self.calls[-1][:2], ("DELETE", "/installation/token"))

    def publication(self, personal=False):
        checkout = self.dir / "checkout"; checkout.mkdir()
        env = {"PATH":os.environ["PATH"], "HOME":str(self.dir)}
        def git(*args):
            return subprocess.check_output(["git", "-C", str(checkout), *args], env=env, text=True, stderr=subprocess.DEVNULL).strip()
        git("init", "-b", "feature")
        git("-c", "user.name=Human", "-c", "user.email=human@example.test", "commit", "--allow-empty", "-m", "base")
        self.base = git("rev-parse", "HEAD")
        name, email = ("Human", "human@example.test") if personal else ("test-app[bot]", "987+test-app[bot]@users.noreply.github.com")
        git("-c", "user.name="+name, "-c", "user.email="+email, "commit", "--allow-empty", "-m", "candidate")
        self.head = git("rev-parse", "HEAD")
        request = dict(head_repository="a/b", head="feature", base="main", expected_head_revision=git("rev-parse", "HEAD"),
                       commit_identity=dict(checkout=str(checkout),base_revision=self.base,preserved_commits=[]))
        payload = self.dir / "payload.json"; payload.write_text(json.dumps(dict(head="feature",base="main",title="Title",body="Body",draft=True)))
        args = ["api", "--hostname", "github.com", "repos/a/b/pulls", "--method", "POST", "--input", str(payload)]
        return args, request

    def test_pr_transport_rechecks_identity_against_same_authenticated_app_and_base(self):
        args, request = self.publication()
        code, output = self.execute(args, request)
        self.assertEqual(code, 0)
        self.assertTrue(output)
        self.assertEqual(self.needed, {"metadata":"read", "pull_requests":"write", "contents":"read"})
        self.assertIn("/users/test-app%5Bbot%5D", [c[1] for c in self.calls])
        self.assertEqual(self.calls[-1][:2], ("DELETE", "/installation/token"))
        for change in [{"/users/test-app%5Bbot%5D":lambda r:dict(r,id=111)},
                       {"/repos/a/b/git/ref/heads/main":lambda r:dict(r,object={"type":"commit","sha":"b"*40})},
                       {"/repos/a/b/git/ref/heads/feature":lambda r:dict(r,object={"type":"commit","sha":"b"*40})}]:
            self.changes = change
            with self.assertRaises(Exception): self.execute(args, request)
            self.assertEqual(self.calls[-1][:2], ("DELETE", "/installation/token"))
        self.changes = {}
        with self.assertRaises(APP.AuthError): self.execute(args)
        payload = Path(args[-1]); payload.write_text(json.dumps(dict(head="different",base="main")))
        with self.assertRaises(APP.AuthError): self.execute(args, request)

    def test_pr_transport_rejects_actual_personal_metadata_before_gh_write(self):
        args, request = self.publication(personal=True)
        original = subprocess.run
        gh_calls = []
        def spy(argv, **kwargs):
            if argv[0] == str(self.gh): gh_calls.append(argv)
            return original(argv, **kwargs)
        with patch.object(APP.subprocess, "run", side_effect=spy):
            with self.assertRaises(Exception): self.execute(args, request)
        self.assertEqual(gh_calls, [])
        self.assertEqual(self.calls[-1][:2], ("DELETE", "/installation/token"))

    def test_authenticated_request_substitution_cannot_exempt_moved_personal_head(self):
        args, request = self.publication()
        approved = copy.deepcopy(request)
        request_file = self.dir / "request.json"
        request_file.write_text(json.dumps(request))
        def changed(record):
            checkout = request["commit_identity"]["checkout"]
            def git(*parts):
                return subprocess.check_output(["git", "-C", checkout, *parts],
                    env={"PATH": os.environ["PATH"], "HOME": str(self.dir)}, text=True,
                    stderr=subprocess.DEVNULL).strip()
            git("-c", "user.name=Human", "-c", "user.email=human@example.test",
                "commit", "--allow-empty", "-m", "unapproved personal")
            personal = git("rev-parse", "HEAD")
            git("-c", "user.name=test-app[bot]", "-c", "user.email=987+test-app[bot]@users.noreply.github.com",
                "commit", "--allow-empty", "-m", "unapproved bot")
            self.head = git("rev-parse", "HEAD")
            request["expected_head_revision"] = self.head
            request["commit_identity"]["preserved_commits"] = [dict(revision=personal,
                source_revision=personal, approval_reference="invented:never-approved")]
            request_file.write_text(json.dumps(request))
            return record
        self.changes = {"/users/test-app%5Bbot%5D": changed}
        original = subprocess.run
        writes = []
        def spy(argv, **kwargs):
            if argv[0] == str(self.gh): writes.append(argv)
            return original(argv, **kwargs)
        with patch.object(APP.subprocess, "run", side_effect=spy):
            with self.assertRaisesRegex(Exception, "Identity checkout branch or head differs"):
                self.execute(args, request)
        self.assertNotEqual(request["expected_head_revision"], approved["expected_head_revision"])
        self.assertEqual(writes, [])
        self.assertEqual(self.calls[-1][:2], ("DELETE", "/installation/token"))

    def test_authenticated_payload_file_substitution_submits_exact_validated_bytes(self):
        args, request = self.publication()
        payload_path = Path(args[-1])
        approved_bytes = payload_path.read_bytes()
        def changed(record):
            altered = json.loads(approved_bytes)
            altered.update(head="different-personal-branch", body="unapproved body", base="other-base")
            payload_path.write_text(json.dumps(altered))
            return record
        self.changes = {"/users/test-app%5Bbot%5D": changed}
        original = subprocess.run
        writes = []
        def spy(argv, **kwargs):
            if argv[0] == str(self.gh): writes.append((argv, kwargs["input"]))
            return original(argv, **kwargs)
        with patch.object(APP.subprocess, "run", side_effect=spy):
            code, _ = self.execute(args, request)
        self.assertEqual(code, 0)
        self.assertNotEqual(payload_path.read_bytes(), approved_bytes)
        self.assertEqual(len(writes), 1)
        self.assertEqual(writes[0][0][-1], "-")
        self.assertEqual(writes[0][1], approved_bytes)
        self.assertEqual(args[-1], str(payload_path))
        self.assertEqual(self.calls[-1][:2], ("DELETE", "/installation/token"))

    def test_authenticated_context_alias_changes_cannot_replace_approved_checks(self):
        args, request = self.publication()
        approved = copy.deepcopy(request)
        def changed(record):
            request["head"] = "unapproved-branch"
            request["commit_identity"].update(checkout="/invalid/checkout", preserved_commits=[dict(
                revision="b"*40, source_revision="b"*40, approval_reference="invented:never-approved")])
            return record
        self.changes = {"/users/test-app%5Bbot%5D": changed}
        self.assertEqual(self.execute(args, request)[0], 0)
        self.assertNotEqual(request, approved)
        self.assertIn("/repos/a/b/git/ref/heads/feature", [c[1] for c in self.calls])
        self.assertEqual(self.calls[-1][:2], ("DELETE", "/installation/token"))

    def test_fork_pr_source_uses_separate_exact_installation_token(self):
        args, request = self.publication()
        request["head_repository"] = "fork/b"
        Path(args[-1]).write_text(json.dumps(dict(head="fork:feature",head_repo="b",base="main",title="Title",body="Body")))
        self.config["repositories"]["fork/b"] = dict(id=790, installation_id=457, permissions={k:"write" for k in APP.PERMISSIONS})
        self.save_config()
        source_ref = dict(ref="refs/heads/feature",url="https://api.github.com/repos/fork/b/git/refs/heads/feature",
                          object=dict(type="commit",sha=self.head,url="https://api.github.com/repos/fork/b/git/commits/"+self.head))
        self.gh.write_text(GH.replace('print(json.dumps({"args":sys.argv[1:], "authenticated_fixture_token":bool(token)}))',
            'print(json.dumps(' + repr(source_ref) + ') if "repos/fork/b/git/ref/heads/feature" in sys.argv else json.dumps({"args":sys.argv[1:]}))'))
        fork_token = "ghs_fixture_app_fork_" + "x"*32
        original_transport = self.transport
        def transport(method, path, credential, body=None):
            if path in {"/app/installations/457","/repos/fork/b/installation"}:
                self.calls.append((method,path,credential,body))
                return dict(id=457,app_id=123,account={"login":"fork"},target_type="Organization",
                            suspended_at=None,permissions={k:"write" for k in APP.PERMISSIONS}), ""
            if path == "/app/installations/457/access_tokens":
                self.calls.append((method,path,credential,body))
                return dict(token=fork_token,permissions=body["permissions"],expires_at=(datetime.now(timezone.utc)+timedelta(minutes=59)).strftime("%Y-%m-%dT%H:%M:%SZ")), ""
            if path == "/installation/repositories?per_page=100" and credential == fork_token:
                self.calls.append((method,path,credential,body))
                return dict(total_count=1,repositories=[dict(id=790,full_name="fork/b")]), ""
            return original_transport(method,path,credential,body)
        self.transport = transport
        self.assertEqual(self.execute(args,request)[0],0)
        issued = [c[3] for c in self.calls if c[0] == "POST"]
        self.assertEqual([p["repository_ids"] for p in issued], [[789],[790]])
        self.assertEqual(issued[1]["permissions"], {"metadata":"read","contents":"read"})
        self.assertEqual([c[2] for c in self.calls if c[0] == "DELETE"], [fork_token,TOKEN])

    def test_api_pr_and_pagination_authenticated_commands(self):
        for args in [API_ARGS, PR_ARGS, ["api", "--hostname", "github.com",
                    "repos/a/b/issues?state=all&per_page=100", "--method", "GET", "--paginate", "--slurp"]]:
            with self.subTest(args=args):
                self.calls.clear()
                code, output = self.execute(args)
                self.assertEqual(code, 0)
                self.assertEqual(json.loads(output)["args"], args)
                issue = next(call for call in self.calls if call[0] == "POST")
                self.assertEqual(issue[3], {"repository_ids": [789], "permissions": self.needed})
                self.assertEqual(self.calls[-1][:2], ("DELETE", "/installation/token"))
                self.assertNotIn(TOKEN.encode(), output)
                self.assertFalse((self.dir / "tls-secret").exists())

    def test_jwt_signature_claims_and_secret_free_argv_environment(self):
        original_run = subprocess.run
        observed = []
        def spy(argv, **kwargs):
            observed.append((argv, kwargs.get("env")))
            return original_run(argv, **kwargs)
        with patch.object(APP.subprocess, "run", side_effect=spy):
            self.execute()
        encoded = self.calls[0][2]
        header, payload, signature = encoded.split(".")
        decode = lambda value: base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
        self.assertEqual(json.loads(decode(header)), {"alg": "RS256", "typ": "JWT"})
        claims = json.loads(decode(payload))
        self.assertEqual(claims["iss"], "123")
        self.assertLessEqual(abs(claims["iat"] - (int(APP.time.time()) - 60)), 5)
        self.assertLessEqual(claims["exp"] - int(APP.time.time()), 540)
        public = subprocess.run([OPENSSL, "rsa", "-in", str(self.key), "-pubout"], capture_output=True, check=True).stdout
        pubfile = self.dir / "public.pem"; pubfile.write_bytes(public)
        sigfile = self.dir / "signature"; sigfile.write_bytes(decode(signature))
        verified = subprocess.run([OPENSSL, "dgst", "-sha256", "-verify", str(pubfile), "-signature", str(sigfile)],
                                  input=(header + "." + payload).encode(), capture_output=True)
        self.assertEqual(verified.returncode, 0)
        for argv, env in observed:
            self.assertNotIn(encoded, " ".join(argv))
            self.assertNotIn(TOKEN, " ".join(argv))
            self.assertNotIn(str(self.key), " ".join(argv))
            self.assertNotIn("personal-secret", str(env))
            if argv[0] == OPENSSL:
                self.assertNotIn("GH_TOKEN", env)

    def test_missing_malformed_duplicate_config_and_permission_ceiling(self):
        bad_configs = [None, [], {}, dict(self.config, app_id=True), dict(self.config, app_id="123"),
                       dict(self.config, version=2), dict(self.config, repositories={}),
                       dict(self.config, executable="never")]
        for config in bad_configs:
            with self.subTest(config=config):
                self.config_path.write_text(json.dumps(config))
                with self.assertRaises(APP.AuthError):
                    self.execute()
                self.assertFalse(self.calls)
        for raw in ["{", '{"version":1,"version":1}']:
            self.config_path.write_text(raw)
            with self.assertRaises((APP.AuthError, ValueError)):
                self.execute()
        self.config_path.unlink()
        with self.assertRaises(FileNotFoundError):
            self.execute()
        self.config["repositories"]["a/b"]["permissions"] = {"metadata": "read"}
        self.save_config()
        with self.assertRaises(APP.AuthError):
            self.execute()
        self.assertFalse(self.calls)

    def test_key_mode_ownership_type_links_and_symlink_parents(self):
        for mode in [0o644, 0o640, 0o660, 0o700]:
            self.key.chmod(mode)
            with self.assertRaises(APP.AuthError):
                self.execute()
        self.key.chmod(0o400)
        self.assertEqual(self.execute()[0], 0)
        self.key.chmod(0o600)
        with patch.object(APP.os, "getuid", return_value=os.getuid() + 1):
            with self.assertRaises(APP.AuthError):
                self.execute()
        for name, make in [("link", lambda p: p.symlink_to(self.key)),
                           ("hardlink", lambda p: os.link(self.key, p)),
                           ("fifo", lambda p: os.mkfifo(p, 0o600)),
                           ("directory", lambda p: p.mkdir())]:
            p = self.dir / name; make(p)
            self.config["private_key_path"] = str(p); self.save_config()
            with self.assertRaises((APP.AuthError, OSError)):
                self.execute()
            if name == "hardlink": p.unlink()
        parent = self.dir / "alias"; parent.symlink_to(self.directory, target_is_directory=True)
        self.config["private_key_path"] = str(parent / "key.pem"); self.save_config()
        with self.assertRaises(OSError): self.execute()
        for key in ["relative.pem", str(ROOT / "local/key.pem")]:
            self.config["private_key_path"] = key; self.save_config()
            with self.assertRaises(APP.AuthError): self.execute()

    def test_weak_wrong_and_malformed_keys(self):
        for name, command in [("weak", ["genrsa", "1024"]),
                              ("ec", ["ecparam", "-name", "prime256v1", "-genkey", "-noout"])]:
            p = self.dir / name
            p.write_bytes(subprocess.run([OPENSSL, *command], capture_output=True, check=True).stdout)
            p.chmod(0o600)
            self.config["private_key_path"] = str(p); self.save_config()
            with self.assertRaises(APP.AuthError): self.execute()
        p.write_text("invalid-private-key"); p.chmod(0o600)
        with self.assertRaises(APP.AuthError): self.execute()

    def test_wrong_app_installation_repository_denial_and_permission(self):
        installation = "/app/installations/456"
        cases = [("/app", lambda r: dict(r, id=124)),
                 (installation, lambda r: dict(r, id=457)),
                 (installation, lambda r: dict(r, app_id=124)),
                 (installation, lambda r: dict(r, account={"login": "foreign"})),
                 (installation, lambda r: dict(r, target_type="Enterprise")),
                 (installation, lambda r: dict(r, suspended_at="now")),
                 (installation, lambda r: dict(r, permissions={})),
                 ("/repos/a/b/installation", lambda r: dict(r, id=457)),
                 ("/app", urllib.error.HTTPError("url", 401, "secret", {}, None)),
                 (installation, urllib.error.HTTPError("url", 403, "secret", {}, None))]
        for path, change in cases:
            self.calls.clear(); self.changes = {path: change}
            with self.subTest(path=path), self.assertRaises(Exception): self.execute()
            self.assertFalse(any(c[0] == "POST" for c in self.calls))

    def test_token_permission_expiry_faults_revoke_after_issuance(self):
        path = "/app/installations/456/access_tokens"
        changes = [{"permissions": {}}, {"permissions": {**self.needed, "contents": "write"}},
                   {"expires_at": "2000-01-01T00:00:00Z"}, {"expires_at": "bad"},
                   {"expires_at": "2099-01-01T00:00:00Z"}, {"expires_at": "2026-99-99T00:00:00Z"}]
        for values in changes:
            self.calls.clear(); self.changes = {path: lambda r: dict(r, **values)}
            with self.subTest(values=values), self.assertRaises(Exception): self.execute()
            self.assertEqual(self.calls[-1][:2], ("DELETE", "/installation/token"))
        for token in [None, "", "short", "with\nnewline", 123]:
            self.changes = {path: lambda r: dict(r, token=token)}
            with self.assertRaises(APP.AuthError): self.execute()

    def test_repository_inventory_identity_and_pagination_faults(self):
        path = "/installation/repositories?per_page=100"
        for change in [lambda r: dict(r, total_count=2), lambda r: dict(r, total_count=True),
                       lambda r: dict(r, repositories=[]),
                       lambda r: dict(r, repositories=[{"id": 790, "full_name": "a/b"}]),
                       lambda r: dict(r, repositories=[{"id": 789, "full_name": "A/b"}])]:
            self.changes = {path: change}
            with self.assertRaises(APP.AuthError): self.execute()
            self.assertEqual(self.calls[-1][:2], ("DELETE", "/installation/token"))
        self.changes = {}; self.link = '<https://api.github.com/installation/repositories?page=2>; rel="next"'
        with self.assertRaises(APP.AuthError): self.execute()

    def test_command_failure_no_replay_no_stderr_secret_and_revocation_failure(self):
        self.gh.write_text(GH + '\nsys.exit(7)\n')
        self.assertEqual(self.execute(), (7, b""))
        self.assertEqual(sum(c[0] == "POST" for c in self.calls), 1)
        self.changes = {"/installation/token": OSError("secret token")}
        self.assertEqual(self.execute(), (7, b""))
        self.gh.write_text(GH)
        with self.assertRaises(APP.AuthError): self.execute()
        self.changes = {}; self.gh.write_text(GH + '\nprint(token)\n')
        with self.assertRaises(APP.AuthError): self.execute()
        self.assertEqual(self.calls[-1][:2], ("DELETE", "/installation/token"))

    def test_default_never_uses_legacy_or_personal_auth_and_errors_are_sanitized(self):
        env = dict(self.env, NEXUS_GH_COMMAND=str(self.gh))
        result = subprocess.run(["python3", "-B", str(ROOT / "scripts/adapters/github-app.py"), "a/b", *API_ARGS],
                                env=env, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(b"Legacy command override refused", result.stderr)
        self.assertFalse(result.stdout)
        env.pop("NEXUS_GH_COMMAND"); env["NEXUS_GITHUB_APP_CONFIG"] = str(self.dir / "absent")
        result = subprocess.run(["python3", "-B", str(ROOT / "scripts/adapters/github-app.py"), "a/b", *API_ARGS],
                                env=env, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn(b"personal-secret", result.stdout + result.stderr)
        self.assertNotIn(b"Traceback", result.stderr)

    def test_command_shapes_source_repository_and_permission_floors(self):
        args = ["api", "--hostname", "github.com", "repos/fork/b/git/ref/heads/topic%2Fchange", "--method", "GET"]
        self.assertEqual(APP.command_permissions("fork/b", args), {"metadata": "read", "contents": "read"})
        project = ["api", "--hostname", "github.com", "graphql", "-f", "query=query($id:ID!){node(id:$id){id}}", "-f", "id=P", "--paginate", "--slurp"]
        self.assertEqual(APP.command_permissions("a/b", project)["organization_projects"], "read")
        project[5] = "query=mutation($id:ID!){node(id:$id){id}}"
        self.assertEqual(APP.command_permissions("a/b", project)["organization_projects"], "write")
        for args in [["auth", "token"], API_ARGS + ["--verbose"], API_ARGS + ["-H", "Authorization: secret"],
                     [*API_ARGS[:3], "https://foreign/", *API_ARGS[4:]], PR_ARGS + ["--web"]]:
            with self.assertRaises(APP.AuthError): APP.command_permissions("a/b", args)

    def test_timeout_subprocess_failure_and_main_error_redaction(self):
        original = subprocess.run
        for failure in [OSError("secret-token"), subprocess.TimeoutExpired("secret-token", 120)]:
            self.calls.clear()
            def fail_gh(argv, **kwargs):
                if argv[0] == str(self.gh): raise failure
                return original(argv, **kwargs)
            with patch.object(APP.subprocess, "run", side_effect=fail_gh):
                with self.assertRaises(Exception): self.execute()
            self.assertEqual(self.calls[-1][:2], ("DELETE", "/installation/token"))
            self.assertEqual(sum(c[0] == "POST" for c in self.calls), 1)
        for failure in [OSError(TOKEN), urllib.error.HTTPError("secret-url", 403, TOKEN, {}, None), ValueError(TOKEN)]:
            errors = io.StringIO()
            with patch.object(APP, "run", side_effect=failure), patch.object(sys, "argv", ["helper", "a/b", *API_ARGS]), redirect_stderr(errors):
                self.assertEqual(APP.main(), 1)
            self.assertNotIn(TOKEN, errors.getvalue())
            self.assertNotIn("Traceback", errors.getvalue())

    def test_http_fixed_origin_no_redirect_no_proxy_or_tls_logging(self):
        response = unittest.mock.MagicMock()
        response.__enter__.return_value = response
        response.status = 200
        response.read.return_value = b'{"id":123}'
        response.headers = {}
        opener = unittest.mock.Mock()
        opener.open.return_value = response
        context = unittest.mock.Mock()
        with patch.dict(os.environ, self.env, clear=True), patch.object(APP.ssl, "SSLContext", return_value=context), \
                patch.object(APP.urllib.request, "build_opener", return_value=opener) as build:
            self.assertEqual(APP.request("GET", "/app", "synthetic.jwt")[0], {"id": 123})
            req = opener.open.call_args.args[0]
            self.assertEqual(req.full_url, "https://api.github.com/app")
            self.assertEqual(req.get_header("Authorization"), "Bearer synthetic.jwt")
            self.assertEqual(build.call_args.args[0].proxies, {})
            self.assertNotIn("SSLKEYLOGFILE", str(context.mock_calls))
            self.assertEqual(context.load_verify_locations.call_args.kwargs["cafile"], APP.ssl.get_default_verify_paths().openssl_cafile)
            response.status = 403
            with self.assertRaises(APP.AuthError): APP.request("GET", "/app", TOKEN)
            response.status = 200; response.read.return_value = b"x" * (2 * 1024 * 1024 + 1)
            with self.assertRaises(APP.AuthError): APP.request("GET", "/app", TOKEN)
        with self.assertRaises(APP.AuthError):
            APP.NoRedirect().redirect_request(None, None, 302, "secret", {}, "https://foreign")

    def test_shell_boundary_ignores_python_startup_environment(self):
        marker = self.dir / "startup-ran"
        (self.dir / "sitecustomize.py").write_text(
            "from pathlib import Path\nPath(" + repr(str(marker)) + ").write_text('executed')\n")
        env = dict(self.env, PYTHONPATH=str(self.dir), PYTHONINSPECT="1",
                   NEXUS_GITHUB_APP_CONFIG=str(self.dir / "missing"))
        result = subprocess.run([str(ROOT / "scripts/work-items.sh"), "issue-read", "a/b", "1"],
                                env=env, capture_output=True, timeout=10)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(marker.exists())
        self.assertFalse(result.stdout)
        self.assertNotIn(b"personal-secret", result.stderr)


if __name__ == "__main__":
    unittest.main()
