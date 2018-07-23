import json

import toml
from tomlkit import dumps, loads


def load(file_path):
    with open(file_path) as f:
        return loads(f.read())


def main():

    with open("syntaxes/django-repo.json") as f:
        data = toml.dumps(json.load(f))

    with open("syntaxes/django-repo.toml", 'w') as f:
        f.write(data)

    # data = load("syntaxes/django-html.toml")

    # with open("syntaxes/django-html.tmLanguage.json", "w") as f:
        # json.dump(data, f, indent=2)