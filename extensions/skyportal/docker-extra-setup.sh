#!/bin/bash
# Run by skyportal's Dockerfile when this file is in the build context.
set -euo pipefail

PELICAN_VERSION="${PELICAN_VERSION:-7.27.0}"
OSG_PLUGIN_REPO="${OSG_PLUGIN_REPO:-https://github.com/skyportal/osg-skyportal-plugin.git}"
OSG_PLUGIN_REV="${OSG_PLUGIN_REV:-main}"

# OSDF staging mints a token from the Pelican keypair per upload.
arch="$(dpkg --print-architecture | sed s/amd64/x86_64/)"
curl -fsSL "https://github.com/PelicanPlatform/pelican/releases/download/v${PELICAN_VERSION}/pelican_Linux_${arch}.tar.gz" \
    | tar -xz -C /tmp
install -m 0755 "/tmp/pelican-${PELICAN_VERSION}/pelican" /usr/local/bin/pelican
rm -rf "/tmp/pelican-${PELICAN_VERSION}"
pelican --version

# services.external clones the OSG plugin at service setup; baking it here as
# well leaves a deployment that cannot reach GitHub at startup with a copy.
git clone --depth 1 --branch "${OSG_PLUGIN_REV}" "${OSG_PLUGIN_REPO}" /skyportal/services/osg
rm -rf /skyportal/services/osg/.git
chown -R skyportal:skyportal /skyportal/services/osg
