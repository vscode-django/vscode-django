#!/usr/bin/env python3

import json
import os
from collections import OrderedDict
try:
    import toml
except ImportError:
    print("TOML library needed. Try:\npip3 install --user toml")
    exit()


class Generator:
    def __init__(self, collection):
        self.name = collection
        self.dir_path = os.path.dirname(os.path.realpath(__file__))
        getattr(self, self.name)()

    def template(self):
        path = os.path.join(
            self.dir_path, "django-{}-snippets-gen.json".format(self.name)
        )
        config = toml.load(os.path.join(self.dir_path, "{}.toml".format(self.name)))
        data = OrderedDict(_comment="Genereted by './snippets/generate.py template'")

        for key, conf in config.items():
            name = conf.get("name", key)
            prefix = conf.get("prefix", key)
            var = conf.get("var", False)
            simple = conf.get("simple", False)
            description = "{{{{ {} }}}}" if var else "{{% {} %}}"

            data[key] = {
                "description": description.format(name),
                "prefix": prefix,
                "body": ["", "", ""]
            }

        
        with open(path, 'w') as out:
            out.write(json.dumps(data, indent=4))
        print(path)


def main():
    try:
        collection = os.sys.argv[1]
    except IndexError:
        print("You need to pass an argument. Try:")
        print("python3 snippets/generate.py template")

    Generator(collection)


if __name__ == "__main__":
    main()

