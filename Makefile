VERSION := $(shell node -p "require('./package.json').version")
TAG := $(patsubst %.0,%,$(VERSION))

all: publish

# Tags the version and creates the GitHub release, whose notes come from
# CHANGELOG.md. The release triggers .github/workflows/publish.yml.
# make prerelease publishes it as a pre-release on the Marketplace.
publish: GH_FLAGS :=
prerelease: GH_FLAGS := --prerelease
publish prerelease:
	git tag $(TAG)
	git push origin $(TAG)
	awk '/^## \[$(VERSION)\]/{f=1; next} /^## \[/{f=0} f' CHANGELOG.md \
		| gh release create $(TAG) --verify-tag --title $(TAG) $(GH_FLAGS) --notes-file -

# Packages the extension locally, without publishing
package:
	yarn vsce package
