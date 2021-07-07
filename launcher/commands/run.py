import os
import subprocess

from launcher.commands.build import build
from launcher.config import check_config_exists


def run(
    init: bool = False,
    repo: str = "origin",
    branch: str = "master",
    traefik: bool = False,
    no_kowalski: bool = False,
    do_update: bool = False,
    skyportal_tag: str = "skyportal/web:latest",
    yes: bool = False,
):
    """🚀 Launch Fritz"""
    env = os.environ.copy()
    env.update({"FLAGS": "--config=../fritz.yaml"})

    if init:
        build(
            init=init,
            repo=repo,
            branch=branch,
            traefik=traefik,
            no_kowalski=no_kowalski,
            do_update=do_update,
            skyportal_tag=skyportal_tag,
            yes=yes,
        )

    # create common docker network (if it does not exist yet)
    p = subprocess.run(
        ["docker", "network", "create", "fritz_net"],
        capture_output=True,
        universal_newlines=True,
    )
    if (p.returncode != 0) and ("already exists" not in p.stderr):
        raise RuntimeError("Failed to create network fritz_net")

    # start up skyportal
    # docker-compose.skyportal.yaml bind-mounts the fritz-specific config.yaml and db_seed.yaml
    p = subprocess.run(
        ["docker-compose", "-f", "docker-compose.skyportal.yaml", "up", "-d"],
        cwd="skyportal",
        check=True,
    )
    if p.returncode != 0:
        raise RuntimeError("Failed to start SkyPortal")

    # start up kowalski
    c = ["python", "kowalski.py", "up"]
    p = subprocess.run(c, cwd="kowalski")
    if p.returncode != 0:
        raise RuntimeError("Failed to start Kowalski")

    if traefik:
        # check traefik's config
        check_config_exists(cfg="docker-compose.traefik.defaults.yaml", yes=yes)
        # fire up traefik
        p = subprocess.run(
            ["docker-compose", "-f", "docker-compose.traefik.yaml", "up", "-d"],
            check=True,
        )
        if p.returncode != 0:
            raise RuntimeError("Failed to start Traefik")
