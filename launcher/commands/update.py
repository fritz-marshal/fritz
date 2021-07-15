import subprocess
from typing import Optional


def update(
    init: bool = False,
    repo: Optional[str] = None,
    branch: Optional[str] = None,
):
    """Update Fritz

    :param init: Initialize before updating Fritz
    :param repo: Remote repository to pull from
    :param branch: Branch on the remote repository
    """
    git_pull_command = ["git", "pull"]
    if repo is not None and branch is not None:
        git_pull_command.extend([repo, branch])
    p = subprocess.run(git_pull_command)
    if p.returncode != 0:
        raise RuntimeError("Failed to git pull Fritz")

    if init:
        # initialize/update fritz's submodules kowalski and skyportal
        # pull skyportal and kowalski
        p = subprocess.run(["git", "submodule", "update", "--init", "--recursive"])
        if p.returncode != 0:
            raise RuntimeError("Failed to initialize fritz's submodules")
    # auto stash SP
    p = subprocess.run(["git", "stash"], cwd="skyportal")
    if p.returncode != 0:
        raise RuntimeError("SkyPortal autostash failed")

    # update submodules
    p = subprocess.run(["git", "submodule", "update", "--recursive"])
    if p.returncode != 0:
        raise RuntimeError("Failed to update fritz's submodules")
