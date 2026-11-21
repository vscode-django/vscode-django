"""Updates the built-in tags and filters from the official Django documentation.

It reads the Sphinx inventory (objects.inv) of the latest stable version of Django, then:

- adds the missing tags and filters to the grammar (syntaxes/repositories),
- writes data/django-docs.json, which the extension uses to link tags and filters to the docs,
- builds the grammars again.

    uv run syntaxes/update_builtins.py             # latest stable version
    uv run syntaxes/update_builtins.py --version 5.2
    uv run syntaxes/update_builtins.py --check     # change nothing, fail if something is out of date
    uv run syntaxes/update_builtins.py --prune     # also remove the names that are not in the docs

Names that are not in the docs, like the removed {% ifequal %}, are kept so that older projects are
still highlighted, unless --prune is used. Only the standard library is needed to run it.
"""

import argparse
import json
import os
import re
import sys
import urllib.request
import zlib
from os.path import abspath, dirname, join

ROOT = dirname(dirname(abspath(__file__)))
DOCS_URL = "https://docs.djangoproject.com/en"
TAGS_FILE = join(ROOT, "syntaxes", "repositories", "django-stuff.toml")
FILTERS_FILE = join(ROOT, "syntaxes", "repositories", "django-template-filter.toml")
DATA_FILE = join(ROOT, "data", "django-docs.json")

# The list of tag names in django-stuff.toml, and the list of filters in django-template-filter.toml
TAGS_RE = re.compile(r'(begin = "\(\{%\)\\\\s\*\()([\w|]+)(\)\\\\b")')
FILTERS_RE = re.compile(r'(match = "\(\\\\\|\) \?\()([\w|]+)(\)\\\\b")')

# Words of the syntax of a tag that are not tags of the docs
SYNTAX_WORDS = {"elif", "else", "empty", "plural", "from"}


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "vscode-django build script"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def inventory(version):
    """The version and the {name: page} of the tags and filters, from the objects.inv of the docs."""
    raw = fetch(f"{DOCS_URL}/{version}/objects.inv")
    lines = raw.split(b"\n", 4)
    found = re.match(r"# Version: (\S+)", lines[2].decode())
    if not found or not lines[0].startswith(b"# Sphinx inventory version 2"):
        sys.exit(f"Unexpected objects.inv header: {lines[:3]}")
    tags, filters = {}, {}
    for line in zlib.decompress(lines[4]).decode().splitlines():
        parts = line.split(None, 4)
        if len(parts) < 4 or parts[1] not in ("std:templatetag", "std:templatefilter"):
            continue
        name, role, _, uri = parts[:4]
        page, _, anchor = uri.partition("#")
        if anchor.replace("$", name) != f"{role.replace('std:', 'std-')}-{name}":
            sys.exit(f"Unexpected anchor for {name}: {uri}")
        (tags if role == "std:templatetag" else filters)[name] = page
    return found.group(1), tags, filters


def block_tags(version, tags):
    """The tags that are closed by an end tag, found in the docs: {% if %} ... {% endif %}."""
    text = ""
    for page in sorted(set(tags.values())):
        html = fetch(f"{DOCS_URL}/{version}/{page}").decode()
        text += re.sub(r"<[^>]+>", "", html)
    return {name for name in tags if re.search(r"{%\s*end" + re.escape(name) + r"\b", text)}


def listed(path, regex):
    text = open(path).read()
    found = regex.findall(text)
    if len(found) != 1:
        sys.exit(f"Expected one list of names in {path}, found {len(found)}")
    return text, found[0][1].split("|")


def replace(path, regex, text, names):
    updated = regex.sub(lambda match: match.group(1) + "|".join(names) + match.group(3), text)
    if updated != text:
        with open(path, "w") as f:
            f.write(updated)


def report(label, added, unofficial, pruned):
    print(f"{label}: {len(added)} added, {len(unofficial)} not in the docs ({'removed' if pruned else 'kept'})")
    if added:
        print("  added:", ", ".join(sorted(added)))
    if unofficial:
        print("  not in the docs:", ", ".join(sorted(unofficial)))


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--version", default="stable", help="Django version of the docs, like 5.2 (default: stable)")
    parser.add_argument("--check", action="store_true", help="change nothing, exit with 1 if something is out of date")
    parser.add_argument("--prune", action="store_true", help="remove the names that are not in the docs")
    args = parser.parse_args()
    os.chdir(ROOT)

    version, tags, filters = inventory(args.version)
    print(f"Django {version}: {len(tags)} tags and {len(filters)} filters in the docs")
    ends = block_tags(version, tags)
    changed = False

    # Tags: the official ones, the end of the block tags and the words of the syntax
    text, current = listed(TAGS_FILE, TAGS_RE)
    official = set(tags) | {"end" + name for name in ends}
    kept = {name for name in current if name in official or name in SYNTAX_WORDS
            or (name.startswith("end") and name[3:] in tags)}
    unofficial = set(current) - kept
    names = official | SYNTAX_WORDS | (set(current) if not args.prune else kept)
    added = names - set(current)
    report("Tags", added, unofficial, args.prune)
    if sorted(names) != sorted(current):
        changed = True
        if not args.check:
            replace(TAGS_FILE, TAGS_RE, text, sorted(names))

    # Filters
    text, current = listed(FILTERS_FILE, FILTERS_RE)
    unofficial = set(current) - set(filters)
    names = set(filters) | (set(current) if not args.prune else set(filters) & set(current))
    added = names - set(current)
    report("Filters", added, unofficial, args.prune)
    if sorted(names) != sorted(current):
        changed = True
        if not args.check:
            replace(FILTERS_FILE, FILTERS_RE, text, sorted(names))

    # The links to the docs: the name of the page of each tag and filter
    data = json.dumps({"version": version, "tags": tags, "filters": filters}, indent=2, sort_keys=True) + "\n"
    old = open(DATA_FILE).read() if os.path.exists(DATA_FILE) else ""
    if data != old:
        changed = True
        print(f"{os.path.relpath(DATA_FILE, ROOT)}: updated to Django {version}")
        if not args.check:
            os.makedirs(dirname(DATA_FILE), exist_ok=True)
            with open(DATA_FILE, "w") as f:
                f.write(data)

    if args.check:
        sys.exit(1 if changed else 0)
    if changed:
        import build

        build.main()
        print("Grammars built again.")
    else:
        print("Everything is up to date.")


if __name__ == "__main__":
    main()
