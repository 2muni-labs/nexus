"""Temporary Git repositories only; no deployment authentication or configuration."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("identity", ROOT / "scripts/adapters/github-identity.py")
ID = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ID)
BOT = dict(app_id=123, app_slug="test-app", bot_login="test-app[bot]", bot_user_id=987,
           bot_type="Bot", repository="a/b", email="987+test-app[bot]@users.noreply.github.com")


class IdentityTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="nexus-identity-test-")
        self.dir = Path(self.tmp.name).resolve()
        self.home = self.dir / "home"; self.home.mkdir()
        self.home.joinpath(".gitconfig").write_text("[user]\n name = Human\n email = human@example.test\n")
        self.repo = self.dir / "repo"; self.repo.mkdir()
        self.env = {"PATH": os.environ["PATH"], "HOME": str(self.home)}
        self.environment = patch.dict(os.environ, self.env, clear=True)
        self.environment.start()
        self.git("init", "-b", "feature")
        self.base = self.commit("human base")
        self.original = ID.object_metadata(self.repo, self.base)
        self.config = (self.repo / ".git/config").read_bytes()
        self.global_config = (self.home / ".gitconfig").read_bytes()
        self.message = self.dir / "message"; self.message.write_text("new automation\n")

    def tearDown(self):
        self.environment.stop()
        self.tmp.cleanup()

    def git(self, *args, bot=False):
        env = dict(os.environ)
        if bot: env.update(ID.identity_environment(BOT))
        result = subprocess.run(["git", "-C", str(self.repo), *args], env=env,
                                text=True, capture_output=True, check=True)
        return result.stdout.strip()

    def commit(self, message, bot=False):
        self.git("commit", "--allow-empty", "-m", message, bot=bot)
        return self.git("rev-parse", "HEAD")

    def request(self, head=None, preserved=None):
        return dict(head="feature", base="main", head_repository="a/b",
                    expected_head_revision=head or self.git("rev-parse", "HEAD"),
                    commit_identity=dict(checkout=str(self.repo), base_revision=self.base,
                                         preserved_commits=preserved or []))

    def staged(self):
        (self.repo / "change").write_text("controlled change\n")
        self.git("add", "change")

    def test_scoped_commit_overrides_personal_defaults_without_config_or_history_changes(self):
        self.staged()
        with patch.object(ID, "resolve", return_value=BOT):
            result = ID.create_commit("a/b", str(self.repo), self.base, str(self.message))
        ID.check_metadata(ID.object_metadata(self.repo, result["head"]), BOT)
        with patch.dict(os.environ, ID.identity_environment(BOT)):
            ID.effective(str(self.repo), BOT)
        verified = ID.verify_request(self.request(), BOT)
        self.assertEqual([c["revision"] for c in verified["commits"]], [result["head"]])
        self.assertEqual(ID.object_metadata(self.repo, self.base), self.original)
        self.assertEqual((self.repo / ".git/config").read_bytes(), self.config)
        self.assertEqual((self.home / ".gitconfig").read_bytes(), self.global_config)
        self.assertNotIn("GIT_AUTHOR_NAME", os.environ)

    def test_inherited_personal_effective_identity_and_actual_personal_commits_rejected(self):
        with self.assertRaises(ID.IdentityError): ID.effective(str(self.repo), BOT)
        personal = self.commit("inherited personal")
        with self.assertRaises(ID.IdentityError): ID.verify_request(self.request(personal), BOT)
        # A bot-looking author alone does not certify a human committer.
        with patch.dict(os.environ, {"GIT_AUTHOR_NAME": BOT["bot_login"], "GIT_AUTHOR_EMAIL": BOT["email"]}):
            mixed = self.commit("mixed")
        with self.assertRaises(ID.IdentityError): ID.verify_request(self.request(mixed), BOT)

    def test_conflicting_identity_or_config_overrides_fail_without_commits_or_disclosure(self):
        self.staged()
        overrides = [{"GIT_AUTHOR_NAME":"hostile-secret"}, {"GIT_COMMITTER_EMAIL":"hostile-secret"},
                     {"EMAIL":"hostile-secret"}, {"GIT_CONFIG_COUNT":"1", "GIT_CONFIG_KEY_0":"user.name", "GIT_CONFIG_VALUE_0":"hostile-secret"},
                     {"GIT_CONFIG_PARAMETERS":"hostile-secret"}, {"GIT_CONFIG_GLOBAL":"hostile-secret"},
                     {"GIT_DIR":"hostile-secret"}, {"GIT_INDEX_FILE":"hostile-secret"},
                     {"GIT_OBJECT_DIRECTORY":"hostile-secret"}]
        for values in overrides:
            with self.subTest(keys=list(values)), patch.dict(os.environ, values), patch.object(ID, "resolve", return_value=BOT):
                with self.assertRaises(ID.IdentityError) as failure:
                    ID.create_commit("a/b", str(self.repo), self.base, str(self.message))
                self.assertNotIn("hostile-secret", str(failure.exception))
            self.assertEqual(self.git("rev-parse", "HEAD"), self.base)
        self.assertEqual((self.repo / ".git/config").read_bytes(), self.config)
        self.assertEqual((self.home / ".gitconfig").read_bytes(), self.global_config)

    def test_unknown_or_mismatched_bot_identity_rejected(self):
        for change in [{"bot_login":"human"}, {"bot_user_id":None}, {"bot_user_id":True},
                       {"bot_type":"User"}, {"email":"123+test-app[bot]@users.noreply.github.com"},
                       {"repository":"foreign/repo"}, {"app_slug":"different"}]:
            with self.subTest(change=change), self.assertRaises(ID.IdentityError):
                ID.validate_identity(dict(BOT, **change), "a/b")
        with self.assertRaises(ID.IdentityError): ID.validate_identity({}, "a/b")

    def test_self_exempted_new_personal_commit_and_unknown_authority_rejected(self):
        personal = self.commit("new personal automation")
        claim = dict(revision=personal, source_revision=personal, approval_reference="self:invented")
        with self.assertRaises(ID.IdentityError): ID.verify_request(self.request(personal, [claim]), BOT)
        bot = self.commit("bot after personal", bot=True)
        for claim in [dict(revision=personal, source_revision=personal),
                      dict(revision=personal, source_revision=personal, approval_reference="")]:
            with self.assertRaises(ID.IdentityError): ID.verify_request(self.request(bot, [claim]), BOT)

    def test_manual_publication_preflight_pins_actual_target_base(self):
        self.commit("new bot", bot=True)
        app = unittest.mock.Mock()
        app.run.return_value = (0, json.dumps({"ref":"refs/heads/main","object":{"type":"commit","sha":self.base}}).encode())
        with patch.object(ID, "resolve", return_value=BOT), patch.object(ID, "app_module", return_value=app):
            result = ID.publication_preflight("a/b", self.request())
            self.assertEqual(result["base"], self.base)
            app.run.return_value = (0, json.dumps({"ref":"refs/heads/main","object":{"type":"commit","sha":"b"*40}}).encode())
            with self.assertRaises(ID.IdentityError): ID.publication_preflight("a/b", self.request())

    def test_original_upstream_merge_objects_preserved_only_with_reviewed_exemption(self):
        self.git("switch", "-c", "upstream")
        (self.repo / "upstream-file").write_text("human\n"); self.git("add", "upstream-file")
        self.git("commit", "-m", "original upstream")
        original = self.git("rev-parse", "HEAD")
        metadata = ID.object_metadata(self.repo, original)
        self.git("switch", "feature")
        automated = self.commit("automated", bot=True)
        self.git("merge", "--no-ff", "upstream", "-m", "integrate original", bot=True)
        head = self.git("rev-parse", "HEAD")
        with self.assertRaises(ID.IdentityError): ID.verify_request(self.request(head), BOT)
        provenance = dict(revision=original, source_revision=original, approval_reference="human:reviewed-original-upstream")
        result = ID.verify_request(self.request(head, [provenance]), BOT)
        self.assertEqual({r["revision"] for r in result["commits"]}, {automated, original, head})
        self.assertEqual(ID.object_metadata(self.repo, original), metadata)
        self.assertEqual(ID.object_metadata(self.repo, self.base), self.original)
        self.assertEqual(next(r for r in result["commits"] if r["revision"] == original)["provenance"], provenance)
        for change in [{"approval_reference":""}, {"source_revision":self.base}, {"revision":head}]:
            with self.assertRaises(ID.IdentityError):
                ID.verify_request(self.request(head, [dict(provenance, **change)]), BOT)
        unreviewed = dict(revision=original, source_revision=original)
        with self.assertRaises(ID.IdentityError): ID.verify_request(self.request(head, [unreviewed]), BOT)

    def test_exact_head_base_graph_and_raw_metadata_ignore_mailmap_and_replace_refs(self):
        personal = self.commit("personal")
        (self.repo / ".mailmap").write_text("test-app[bot] <987+test-app[bot]@users.noreply.github.com> Human <human@example.test>\n")
        bot = self.commit("bot", bot=True)
        self.git("replace", personal, bot)
        with self.assertRaises(ID.IdentityError): ID.verify_request(self.request(bot), BOT)
        self.git("replace", "-d", personal)
        for change in [{"expected_head_revision":self.base}, {"head":"wrong"},
                       {"commit_identity":dict(self.request()["commit_identity"],base_revision=bot)},
                       {"commit_identity":dict(self.request()["commit_identity"],base_revision="a"*40)}]:
            with self.assertRaises(ID.IdentityError): ID.verify_request(dict(self.request(), **change), BOT)
        # Stale candidate after another commit cannot pass.
        old_request = self.request(bot); self.commit("later", bot=True)
        with self.assertRaises(ID.IdentityError): ID.verify_request(old_request, BOT)
        (self.repo / ".git/info/grafts").write_text(bot + "\n")
        with self.assertRaises(ID.IdentityError): ID.verify_request(self.request(), BOT)

    def test_commit_stale_head_and_main_refused(self):
        self.staged()
        with patch.object(ID, "resolve", return_value=BOT):
            with self.assertRaises(ID.IdentityError): ID.create_commit("a/b", str(self.repo), "a"*40, str(self.message))
            self.git("branch", "-m", "main")
            with self.assertRaises(ID.IdentityError): ID.create_commit("a/b", str(self.repo), self.base, str(self.message))
        self.assertEqual(self.git("rev-parse", "HEAD"), self.base)

    def test_duplicate_request_keys_refused(self):
        path = self.dir / "request"
        path.write_text('{"commit_identity":null,"commit_identity":{}}')
        with self.assertRaises(ID.IdentityError): ID.load_request(path)

    def test_cli_scoped_commit_and_hostile_override_diagnostics_with_offline_identity(self):
        fixture = self.dir / "identity-fixture"
        fixture.write_text("#!/usr/bin/env python3\nimport json,os,sys\n"
                           "assert sys.argv[1:]==['identity']\n"
                           "assert 'GITHUB_TOKEN' not in os.environ\n"
                           "print(" + repr(json.dumps(BOT)) + ")\n")
        fixture.chmod(0o700)
        env = dict(os.environ, NEXUS_GITHUB_OFFLINE_FIXTURE=str(fixture), GITHUB_TOKEN="synthetic-secret")
        command = [str(ROOT / "scripts/commit-identity.sh")]
        preflight = subprocess.run([*command,"preflight","a/b",str(self.repo)],env=env,capture_output=True,text=True)
        self.assertNotEqual(preflight.returncode, 0)
        self.assertNotIn("synthetic-secret", preflight.stdout + preflight.stderr)
        self.staged()
        result = subprocess.run([*command,"commit","a/b",str(self.repo),self.base,str(self.message)],env=env,capture_output=True,text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        head = json.loads(result.stdout)["head"]
        ID.check_metadata(ID.object_metadata(self.repo,head),BOT)
        env.update(GIT_COMMITTER_EMAIL="hostile-secret")
        rejected = subprocess.run([*command,"preflight","a/b",str(self.repo)],env=env,capture_output=True,text=True)
        self.assertNotEqual(rejected.returncode, 0)
        self.assertNotIn("hostile-secret", rejected.stdout + rejected.stderr)


if __name__ == "__main__":
    unittest.main()
