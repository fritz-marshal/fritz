#!/bin/bash
# Run by skyportal's Dockerfile when this file is in the build context.
set -euo pipefail

PELICAN_VERSION="${PELICAN_VERSION:-7.27.0}"

# OSDF staging mints a token from the Pelican keypair per upload.
arch="$(dpkg --print-architecture | sed s/amd64/x86_64/)"
curl -fsSL "https://github.com/PelicanPlatform/pelican/releases/download/v${PELICAN_VERSION}/pelican_Linux_${arch}.tar.gz" \
    | tar -xz -C /tmp
install -m 0755 "/tmp/pelican-${PELICAN_VERSION}/pelican" /usr/local/bin/pelican
rm -rf "/tmp/pelican-${PELICAN_VERSION}"
pelican --version
