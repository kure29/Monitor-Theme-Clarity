#!/bin/sh
set -eu

npm run build
test -f dist/index.html
# The upload API reads theme.json at the archive root. The hub creates the
# <short>/ directory itself after validating the manifest.
tar -czf theme.tar.gz theme.json preview.png dist
echo "Created theme.tar.gz"
