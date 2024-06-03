import subprocess
import time
from pathlib import Path

import yaml

from launcher.commands import update
from launcher.config import check_config
from launcher.skyportal import (
    get_token as get_skyportal_token,
    patch as patch_skyportal,
)


def build(
    init: bool = False,
    repo: str = "origin",
    branch: str = "master",
    traefik: bool = False,
    no_kowalski: bool = False,
    do_update: bool = False,
    skyportal_tag: str = "skyportal/web:latest",
    yes: bool = False,
):
    """Build Fritz

    :param init: Initialize Fritz
    :param repo: Remote repository to pull from
    :param branch: Branch on the remote repository
    :param traefik: Build Fritz to run behind Traefik
    :param no_kowalski: Do not build images for Kowalski
    :param do_update: pull <repo>/<branch>, autostash SP and update submodules
    :param skyportal_tag: Tag to apply to SkyPortal docker image
    :param yes: agree with all potentially asked questions
    """
    if do_update:
        update(init=init, repo=repo, branch=branch)

    if not no_kowalski:
        # install Kowalski's deps:
        c = ["make", "setup"]
        subprocess.run(c, cwd="kowalski", check=True)

    # check config
    check_config(cfg="fritz.defaults.yaml", yes=yes)

    # load config
    with open("fritz.yaml") as fritz_config_yaml:
        fritz_config = yaml.load(fritz_config_yaml, Loader=yaml.FullLoader)

    patch_skyportal()

    # adjust F-specific docker-compose.yaml for SP
    with open("skyportal/docker-compose.skyportal.yaml") as docker_compose_yaml:
        docker_compose = yaml.load(docker_compose_yaml, Loader=yaml.FullLoader)
    # fix absolute paths in docker-compose.skyportal.yaml
    for vi, volume in enumerate(docker_compose["services"]["web"]["volumes"]):
        docker_compose["services"]["web"]["volumes"][vi] = volume.replace(
            "${PWD}", str(Path(__file__).parent.absolute())
        )
    if traefik:
        # fix host for Traefik
        docker_compose["services"]["web"]["labels"][2] = docker_compose["services"][
            "web"
        ]["labels"][2].replace("<host>", fritz_config["skyportal"]["server"]["host"])
    else:
        # not running behind Traefik? then publish port 5000 on host
        port = fritz_config["skyportal"]["server"].get("port", 5000)
        if port is None:
            port = 5000
        docker_compose["services"]["web"]["ports"] = [f"{port}:{port}"]
    # execute `make run` instead of `make run_production` at init:
    if init:
        docker_compose["services"]["web"][
            "command"
        ] = 'bash -c "source /skyportal_env/bin/activate && (make log &) && make run"'
    # save the adjusted version
    with open("skyportal/docker-compose.skyportal.yaml", "w") as docker_compose_yaml:
        yaml.dump(docker_compose, docker_compose_yaml)

    # Build skyportal's images
    cmd = ["docker", "build", "."]
    if skyportal_tag:
        cmd.extend(["-t", skyportal_tag])
    print(f"Building SkyPortal docker image (tag: {skyportal_tag})")
    p = subprocess.run(cmd, cwd="skyportal")
    if p.returncode != 0:
        raise RuntimeError("Failed to build skyportal's docker images")

    # when initializing, must start SP to generate token for K
    if init:
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

        # init skyportal and load seed data
        mi, max_retires = 1, 5
        while mi <= max_retires:
            p = subprocess.run(
                [
                    "docker",
                    "exec",
                    "-i",
                    "skyportal_web_1",
                    "/bin/bash",
                    "-c",
                    "source /skyportal_env/bin/activate; make db_clear; make db_init;"
                    "make prepare_seed_data; make load_seed_data",
                ],
                cwd="skyportal",
            )
            if p.returncode == 0:
                break
            else:
                print("Failed to load seed data into SkyPortal, waiting to retry...")
                mi += 1
                time.sleep(30)
        if mi == max_retires + 1:
            raise RuntimeError("Failed to init SkyPortal and load seed data")

        # generate a token for Kowalski to talk to SkyPortal:
        with open("kowalski/config.yaml") as kowalski_config_yaml:
            config = yaml.load(kowalski_config_yaml, Loader=yaml.FullLoader)

        token = get_skyportal_token()
        config["kowalski"]["skyportal"]["token"] = token

        # save it to K's config:
        with open("kowalski/config.yaml", "w") as kowalski_config_yaml:
            yaml.dump(config, kowalski_config_yaml)

        # update fritz.yaml
        fritz_config["kowalski"]["skyportal"]["token"] = token
        with open("fritz.yaml", "w") as fritz_config_yaml:
            yaml.dump(fritz_config, fritz_config_yaml)

    if not no_kowalski:
        # Build kowalski's images
        c = ["make", "docker_build"]
        if init and yes and not Path("kowalski/docker-compose.yaml").exists():
            print("Using default config for Kowalski")
            subprocess.run(
                [
                    "cp",
                    "kowalski/docker-compose.fritz.defaults.yaml",
                    "kowalski/docker-compose.yaml",
                ],
                check=True,
            )
        p = subprocess.run(c, cwd="kowalski")
        if p.returncode != 0:
            raise RuntimeError("Failed to build Kowalski's docker images")

    if init:
        # stop SkyPortal
        subprocess.run(
            ["docker-compose", "-f", "docker-compose.skyportal.yaml", "down"],
            cwd="skyportal",
        )

        # remove common network
        subprocess.run(["docker", "network", "remove", "fritz_net"])
