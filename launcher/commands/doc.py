import subprocess
import os
import json

from launcher.config import check_config
from launcher.skyportal import patch as patch_skyportal


def doc(yes: bool = False, upload: bool = False):
    """Build the documentation

    :param yes: agree to all potentially asked questions
    :param upload: Upload documentation to GitHub
    """
    check_config(yes=yes)
    for destination in ("config.yaml.defaults",):
        subprocess.run(
            [
                "cp",
                "config.yaml",
                destination,
            ],
            check=True,
            cwd="skyportal",
        )

    subprocess.run(["make", "html"], cwd="doc", check=True)

    patch_skyportal()

    env = os.environ.copy()
    env.update({"PYTHONPATH": "."})

    from baselayer.app.app_server import handlers as baselayer_handlers
    from skyportal.app_server import skyportal_handlers
    from skyportal.app_server_fritz import fritz_handlers
    from skyportal import openapi

    spec = openapi.spec_from_handlers(
        baselayer_handlers + skyportal_handlers + fritz_handlers,
        metadata={
            "title": "Fritz: SkyPortal API",
            "servers": [{"url": "https://fritz.science"}],
        },
    )
    with open("skyportal/openapi.json", "w") as f:
        json.dump(spec.to_dict(), f)

    subprocess.run(
        [
            "npx",
            "redoc-cli@0.9.8",
            "bundle",
            "openapi.json",
            "--title",
            "Fritz API docs",
            "--cdn",
            "--options.theme.logo.gutter",
            "2rem",
            "-o",
            "../doc/_build/html/api.html",
        ],
        check=True,
        cwd="skyportal",
    )
    os.remove("skyportal/openapi.json")

    if upload:
        subprocess.run(
            [
                "./tools/push_dir_to_repo.py",
                "--branch",
                "master",
                "--committer",
                "fritz",
                "--email",
                "fritz@fritz-marshal.org",
                "--message",
                "Update website",
                "--force",
                "./doc/_build/html",
                "git@github.com:fritz-marshal/doc",
            ],
            check=True,
        )
