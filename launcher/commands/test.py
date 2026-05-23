import subprocess
import sys
import time
from pathlib import Path

import yaml

from launcher.skyportal import api as skyportal_api


def test():
    """Run the test suite"""
    print("Running integration testing...")

    # load config
    with open("fritz.yaml") as fritz_config_yaml:
        fritz_config = yaml.load(fritz_config_yaml, Loader=yaml.FullLoader)

    num_retries = 20
    # make sure the containers are up and running
    for i in range(num_retries):
        if i == num_retries - 1:
            raise RuntimeError("Fritz's containers failed to spin up")

        command = ["docker", "ps", "-a"]
        container_list = (
            subprocess.check_output(command, universal_newlines=True)
            .strip()
            .split("\n")
        )
        if len(container_list) == 1:
            print("No containers are running, waiting...")
            time.sleep(3)
            continue

        containers_up = (
            len(
                [
                    container
                    for container in container_list
                    if container_name in container and " Up " in container
                ]
            )
            > 0
            for container_name in ("skyportal-web-1",)
        )

        if not all(containers_up):
            print("Fritz's containers are not up, waiting...")
            time.sleep(5)
            continue

        break

    # make sure SkyPortal is running
    for i in range(num_retries):
        if i == num_retries - 1:
            raise RuntimeError("SkyPortal failed to spin up")

        command = ["docker", "exec", "-i", "skyportal-web-1", "ps", "-ef"]
        process_list = subprocess.check_output(command, universal_newlines=True).strip()

        if "app.py" not in process_list:
            print("SkyPortal is not up, waiting...")
            time.sleep(30)
            continue

        break

    print("Testing Fritz-specific SkyPortal extensions")

    # use the generated config as test config for e.g. the correct db connection details
    command = [
        "docker",
        "exec",
        "-i",
        "skyportal-web-1",
        "cp",
        "docker.yaml",
        "test_config.yaml",
    ]
    try:
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError:
        sys.exit(1)

    # Discover fritz-specific test files on the host (under
    # extensions/skyportal/...), then translate the paths to where they
    # land inside the container (skyportal/...). Recursive so subdirs
    # (e.g. tests/api/boom/) are picked up.
    host_root = Path("extensions/skyportal/skyportal/tests")
    container_root = Path("skyportal/tests")
    test_files = sorted(host_root.rglob("test_*.py"))
    if not test_files:
        print(f"No test files found under {host_root}")
        sys.exit(1)
    container_paths = [
        str(container_root / f.relative_to(host_root)) for f in test_files
    ]

    # The skyportal container is built with UV_NO_DEV=1, so test-only deps
    # (selenium, pytest plugins) aren't installed. SkyPortal's tests/conftest.py
    # imports tests.fixtures -> tests.test_util -> selenium at module load,
    # so we install the dev group before invoking pytest.
    command = [
        "docker",
        "exec",
        "-i",
        "skyportal-web-1",
        "/bin/bash",
        "-c",
        "source .venv/bin/activate && "
        "uv sync --inexact --group dev --active --quiet && "
        f"python -m pytest -v -s {' '.join(container_paths)}",
    ]
    try:
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError:
        sys.exit(1)
