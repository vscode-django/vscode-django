VERSION := $(shell node -p "require('./package.json').version")
TAG := $(patsubst %.0,%,$(VERSION))

all: publish

# Tags the version and creates the GitHub release, whose notes come from
# CHANGELOG.md. The release triggers .github/workflows/publish.yml.
publish:
	git tag $(TAG)
	git push origin $(TAG)
	awk '/^## \[$(VERSION)\]/{f=1; next} /^## \[/{f=0} f' CHANGELOG.md \
		| gh release create $(TAG) --verify-tag --title $(TAG) --notes-file -

# Packages the extension locally, without publishing
package:
	yarn vsce package
