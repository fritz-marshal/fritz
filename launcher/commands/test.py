import time
import subprocess
import sys
from pathlib import Path

import requests
import yaml

from launcher.skyportal import api as skyportal_api


def test():
    """Run the test suite"""
    print("Running integration testing...")

    # load config
    with open("fritz.yaml") as fritz_config_yaml:
        fritz_config = yaml.load(fritz_config_yaml, Loader=yaml.FullLoader)

    num_retries = 10
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
            for container_name in ("skyportal_web_1",)
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

        command = ["docker", "exec", "-i", "skyportal_web_1", "ps", "-ef"]
        process_list = subprocess.check_output(command, universal_newlines=True).strip()

        if "app.py" not in process_list:
            print("SkyPortal is not up, waiting...")
            time.sleep(30)
            continue

        break

    # ensure that the SkyPortal app is responding to requests
    url = (
        f"{fritz_config['skyportal']['server']['protocol']}://"
        f"localhost:{fritz_config['skyportal']['server']['port']}"
        "/api/sysinfo"
    )
    # grab the token from the skyportal_web_1 container's .token.yaml file
    command = [
        "docker",
        "exec",
        "-i",
        "skyportal_web_1",
        "cat",
        "/skyportal/.token.yaml",
    ]
    # the file looks like:
    # token=<token>
    token = (
        subprocess.check_output(command, universal_newlines=True).strip().split("=")[1]
    )
    if not token or len(str(token).strip()) == 0:
        raise RuntimeError("Failed to get token from SkyPortal")

    for i in range(num_retries):
        if i == num_retries - 1:
            raise RuntimeError("SkyPortal failed to spin up")
        try:
            response = skyportal_api("GET", endpoint=url, token=token)

            if response.status_code != 200:
                print("SkyPortal is not responding, waiting...")
                time.sleep(30)
            else:
                break

        except requests.exceptions.ConnectionError:
            print("SkyPortal is not responding, waiting...")
            time.sleep(30)
            continue

    print("Testing Fritz-specific SkyPortal extensions")

    # use the generated config as test config for e.g. the correct db connection details
    command = [
        "docker",
        "exec",
        "-i",
        "skyportal_web_1",
        "cp",
        "docker.yaml",
        "test_config.yaml",
    ]
    try:
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError:
        sys.exit(1)

    api_tests = [
        test_file.name
        for test_file in Path("extensions/skyportal/skyportal/tests/api").glob(
            "test_*.py"
        )
    ]

    error = False
    for api_test in api_tests:
        command = [
            "docker",
            "exec",
            "-i",
            "skyportal_web_1",
            "/bin/bash",
            "-c",
            "source /skyportal_env/bin/activate &&"
            f"python -m pytest -s skyportal/tests/api/{api_test}",
        ]
        try:
            subprocess.run(command, check=True)
        except subprocess.CalledProcessError:
            error = True
            continue
    if error:
        sys.exit(1)
