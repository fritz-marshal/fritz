import subprocess
import json
import requests
from distutils.dir_util import copy_tree


def api(method, endpoint, token, data=None):
    headers = {"Authorization": f"token {token}"}
    response = requests.request(method, endpoint, json=data, headers=headers)
    return response


def patch():
    """Make fritz-specific file modifications to SkyPortal."""
    print("Applying fritz-specific patches to SkyPortal")

    p = subprocess.run(["git", "rev-parse", "--short", "HEAD"], stdout=subprocess.PIPE)
    git_hash = p.stdout.decode("utf-8").strip()

    # add Fritz-specific SP extensions
    copy_tree("extensions/skyportal/", "skyportal/")

    # Add fritz and SkyPortal git version to skyportal/__init__.py
    from skyportal import __version__

    init_file = "skyportal/skyportal/__init__.py"
    with open(init_file, "r") as f:
        init = f.readlines()
    out = []
    for line in init:
        if line.startswith("__version__ = "):
            __version__ = "+".join(
                [v for v in __version__.split("+") if not v.startswith("fritz")]
            )
            line = f'__version__ = "{__version__}+fritz.{git_hash}"\n'
        out.append(line)
    with open(init_file, "wb") as f:
        f.write("".join(out).encode("utf-8"))

    # Add git logs for SkyPortal
    from skyportal.utils.gitlog import get_gitlog

    skyportal_log = get_gitlog(
        cwd="skyportal",
        name="S",
        pr_url_base="https://github.com/skyportal/skyportal/pull",
        commit_url_base="https://github.com/skyportal/skyportal/commit",
        N=1000,
    )
    with open("skyportal/data/gitlog-skyportal.json", "w") as f:
        json.dump(skyportal_log, f)

    # add Fritz-specific dependencies for SP
    # js
    with open("extensions/skyportal/package.fritz.json", "r") as f:
        fritz_pkg = json.load(f)
    with open("skyportal/package.json", "r") as f:
        skyportal_pkg = json.load(f)

    skyportal_pkg["dependencies"] = {
        **skyportal_pkg["dependencies"],
        **fritz_pkg["dependencies"],
    }
    with open("skyportal/package.json", "w") as f:
        json.dump(skyportal_pkg, f, indent=2)

    # python
    with open(".requirements/ext.txt", "r") as f:
        ext_req = f.readlines()
    with open("skyportal/requirements.txt", "r") as f:
        skyportal_req = f.readlines()
    with open("skyportal/requirements.txt", "w") as f:
        f.writelines(skyportal_req)
        for line in ext_req:
            if line not in skyportal_req:
                f.write(line)
