"""Operation-scoped Git identity and exact raw-object publication checks."""
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys


class IdentityError(Exception):
    """Fixed diagnostics only; never echo hostile configuration or Git errors."""


def require(condition, message):
    if not condition:
        raise IdentityError(message)


def load_request(path):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, "Duplicate identity request key.")
            result[key] = value
        return result
    return json.loads(Path(path).read_text(encoding="utf-8"), object_pairs_hook=unique)


def validate_identity(bot, repository):
    require(type(bot) is dict and bot.get("repository") == repository and
            type(bot.get("app_id")) is int and bot["app_id"] > 0 and
            type(bot.get("app_slug")) is str and
            re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9-]*", bot["app_slug"]) and
            bot.get("bot_login") == bot["app_slug"] + "[bot]" and
            type(bot.get("bot_user_id")) is int and bot["bot_user_id"] > 0 and
            bot.get("bot_type") == "Bot" and
            bot.get("email") == str(bot["bot_user_id"]) + "+" + bot["bot_login"] +
            "@users.noreply.github.com", "Verified App bot identity missing or mismatched.")
    return bot


def app_module():
    spec = importlib.util.spec_from_file_location("nexus_app", Path(__file__).with_name("github-app.py"))
    app = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(app)
    return app


def resolve(repository):
    code, output = app_module().run(repository, ["identity"])
    require(code == 0, "App bot identity resolution failed.")
    return validate_identity(json.loads(output), repository)


def reject_overrides(bot=None):
    # Configuration injection/alternate objects can redirect even read-only Git.
    # Do not print values: they can contain credentials or private paths.
    unsafe = {"GIT_DIR", "GIT_WORK_TREE", "GIT_COMMON_DIR", "GIT_INDEX_FILE",
              "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES",
              "GIT_REPLACE_REF_BASE", "GIT_SHALLOW_FILE", "EMAIL"}
    require(not any(k.startswith("GIT_CONFIG") or k in unsafe for k in os.environ),
            "Conflicting Git configuration or repository override.")
    if bot is not None:
        expected = identity_environment(bot)
        require(all(k not in os.environ or os.environ[k] == v for k, v in expected.items()),
                "Conflicting Git author or committer override.")


def identity_environment(bot):
    return {"GIT_AUTHOR_NAME": bot["bot_login"], "GIT_COMMITTER_NAME": bot["bot_login"],
            "GIT_AUTHOR_EMAIL": bot["email"], "GIT_COMMITTER_EMAIL": bot["email"]}


def git(checkout, *args, identity=None):
    env = {k: v for k, v in os.environ.items() if k in {"PATH", "HOME", "LANG", "LC_ALL", "SYSTEMROOT"}}
    env.update(GIT_NO_REPLACE_OBJECTS="1", GIT_TERMINAL_PROMPT="0")
    if identity is not None:
        env.update(identity)
    result = subprocess.run(["git", "-C", str(checkout), *args], env=env,
                            capture_output=True, timeout=120)
    require(result.returncode == 0, "Git identity operation failed; inspect local state before retry.")
    return result.stdout.decode("utf-8")


def checkout_path(value):
    require(type(value) is str and Path(value).is_absolute(), "Exact absolute checkout required.")
    path = Path(value).resolve(strict=True)
    require(git(path, "rev-parse", "--show-toplevel").strip() == str(path),
            "Identity checkout is not the exact Git root.")
    require(git(path, "rev-parse", "--is-shallow-repository").strip() == "false",
            "Incomplete Git history blocks identity verification.")
    grafts = Path(git(path, "rev-parse", "--git-path", "info/grafts").strip())
    if not grafts.is_absolute():
        grafts = path / grafts
    require(not grafts.exists() or grafts.stat().st_size == 0,
            "Grafted Git history blocks identity verification.")
    return path


def sha(value):
    require(type(value) is str and re.fullmatch(r"[0-9a-f]{40}", value),
            "Exact immutable 40-character commit revision required.")
    return value


def object_metadata(checkout, revision):
    require(git(checkout, "cat-file", "-t", sha(revision)).strip() == "commit",
            "Identity revision must be an original commit object.")
    raw = git(checkout, "cat-file", "commit", sha(revision))
    headers = raw.split("\n\n", 1)[0].splitlines()
    result = {}
    for role in ("author", "committer"):
        rows = [line for line in headers if line.startswith(role + " ")]
        require(len(rows) == 1, "Commit identity metadata missing or ambiguous.")
        match = re.fullmatch(role + r" (.+) <([^<>\n]+)> [0-9]+ [+-][0-9]{4}", rows[0])
        require(match is not None, "Invalid raw commit identity metadata.")
        result[role] = {"name": match[1], "email": match[2]}
    return result


def check_metadata(metadata, bot):
    expected = {"name": bot["bot_login"], "email": bot["email"]}
    require(metadata == {"author": expected, "committer": expected},
            "New automation commit author or committer differs from verified App bot.")


def effective(checkout, bot, scoped=False):
    reject_overrides(bot)
    path = checkout_path(checkout)
    # preflight observes inherited identities; commit uses scoped identities.
    env = identity_environment(bot) if scoped else {
        k: os.environ[k] for k in identity_environment(bot) if k in os.environ}
    for role in ("AUTHOR", "COMMITTER"):
        value = git(path, "var", "GIT_" + role + "_IDENT", identity=env).strip()
        require(value.startswith(bot["bot_login"] + " <" + bot["email"] + "> "),
                "Effective Git author or committer differs from verified App bot.")
    return path


def request_identity(request):
    require(type(request) is dict, "PR identity request required.")
    identity = request.get("commit_identity")
    require(type(identity) is dict and set(identity) ==
            {"checkout", "base_revision", "preserved_commits"},
            "PR commit_identity checkout, base_revision and preserved_commits required.")
    require(type(identity["checkout"]) is str and Path(identity["checkout"]).is_absolute(),
            "Exact absolute identity checkout required.")
    sha(identity["base_revision"])
    sha(request.get("expected_head_revision"))
    require(type(request.get("head_repository")) is str and
            re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9][A-Za-z0-9_.-]*", request["head_repository"]) and
            type(request.get("head")) is str and request["head"] and
            type(request.get("base")) is str and request["base"],
            "Exact PR source repository and head/base branches required.")
    require(type(identity["preserved_commits"]) is list, "Explicit preserved commit provenance required.")
    seen = set()
    for record in identity["preserved_commits"]:
        require(type(record) is dict and set(record) == {"revision", "source_revision", "approval_reference"},
                "Preserved commit requires original revision, source_revision and reviewed exemption.")
        sha(record["revision"]); sha(record["source_revision"])
        require(type(record["approval_reference"]) is str and record["approval_reference"].strip(),
                "Unknown preserved commit authority blocks publication.")
        require(record["revision"] not in seen, "Duplicate preserved commit provenance.")
        seen.add(record["revision"])
    return identity


def verify_request(request, bot):
    identity = request_identity(request)
    validate_identity(bot, bot["repository"])
    reject_overrides(bot)
    path = checkout_path(identity["checkout"])
    head = request["expected_head_revision"]
    require(type(request.get("head")) is str and
            git(path, "symbolic-ref", "HEAD").strip() == "refs/heads/" + request["head"] and
            git(path, "rev-parse", "HEAD").strip() == head,
            "Identity checkout branch or head differs from exact candidate.")
    base = identity["base_revision"]
    git(path, "merge-base", "--is-ancestor", base, head)
    commits = git(path, "rev-list", "--reverse", base + ".." + head).splitlines()
    require(commits, "No new automation commits to verify.")
    preserved = {r["revision"]: r for r in identity["preserved_commits"]}
    require(set(preserved) <= set(commits), "Preserved provenance is outside candidate commit graph.")
    require(head not in preserved, "Candidate head must be a verified new automation commit.")
    records = []
    for revision in commits:
        metadata = object_metadata(path, revision)
        if revision in preserved:
            # Same original object SHA, reachable in the explicitly reviewed source.
            # A cherry-picked/rewritten object cannot claim this exemption.
            require(git(path, "cat-file", "-t", preserved[revision]["source_revision"]).strip() == "commit",
                    "Preserved source must be an immutable commit object.")
            git(path, "merge-base", "--is-ancestor", revision, preserved[revision]["source_revision"])
        else:
            check_metadata(metadata, bot)
        records.append({"revision": revision, "preserved": revision in preserved,
                        "provenance": preserved.get(revision), **metadata})
    require(git(path, "rev-parse", "HEAD").strip() == head,
            "Candidate changed during identity verification.")
    return {"head": head, "base": base, "bot": bot, "commits": records}


def publication_preflight(repository, request):
    result = verify_request(request, resolve(repository))
    import urllib.parse
    endpoint = "repos/" + repository + "/git/ref/heads/" + urllib.parse.quote(request["base"], safe="")
    code, output = app_module().run(repository, ["api", "--hostname", "github.com", endpoint, "--method", "GET"])
    require(code == 0, "Exact target base observation failed.")
    record = json.loads(output)
    require(type(record) is dict and record.get("ref") == "refs/heads/" + request["base"] and
            record.get("object", {}).get("type") == "commit" and
            record["object"].get("sha") == request["commit_identity"]["base_revision"],
            "Exact target base changed; identity range requires new approval.")
    return result


def create_commit(repository, checkout, expected_head, message_file):
    bot = resolve(repository)
    path = effective(checkout, bot, scoped=True)
    sha(expected_head)
    require(git(path, "rev-parse", "HEAD").strip() == expected_head,
            "Commit baseline changed; reobserve before committing.")
    require(git(path, "symbolic-ref", "--short", "HEAD").strip() != "main",
            "Automation commits on main are forbidden.")
    require(Path(message_file).is_file(), "Readable commit message file required.")
    git(path, "commit", "--file", str(Path(message_file).resolve()), identity=identity_environment(bot))
    head = git(path, "rev-parse", "HEAD").strip()
    require(git(path, "rev-list", "--parents", "-n", "1", head).strip().split() == [head, expected_head],
            "Unexpected commit parents; preserve local result and reconcile.")
    metadata = object_metadata(path, head)
    check_metadata(metadata, bot)
    return {"head": head, "base": expected_head, "bot": bot, **metadata}


def main():
    try:
        args = sys.argv[1:]
        if len(args) == 2 and args[0] == "plan":
            reject_overrides()
            request_identity(load_request(args[1]))
            output = {"identity_request": "valid", "authentication": "not-observed"}
        elif len(args) == 2 and args[0] == "identity":
            output = resolve(args[1])
        elif len(args) == 3 and args[0] == "preflight":
            bot = resolve(args[1]); effective(args[2], bot)
            output = {"bot": bot, "effective_identity": "verified"}
        elif len(args) == 3 and args[0] == "verify":
            output = publication_preflight(args[1], load_request(args[2]))
        elif len(args) == 5 and args[0] == "commit":
            output = create_commit(*args[1:])
        else:
            raise IdentityError("Use identity REPO, preflight REPO CHECKOUT, commit REPO CHECKOUT BASE MESSAGE_FILE, or verify REPO REQUEST.")
        print(json.dumps(output))
        return 0
    except IdentityError as error:
        print(str(error), file=sys.stderr)
    except Exception:
        print("Git/App identity unavailable; no publication or credential fallback.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
