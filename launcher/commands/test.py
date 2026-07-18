import subprocess
import sys
import time
from pathlib import Path

import yaml

from launcher.skyportal import api as skyportal_api

_SCOPE_TO_SUBDIRS = {
    "api": ["api/boom"],
    "all": ["api/boom"],
}


def test(scope: str = "all"):
    """Run the integration test suite.

    scope: which test slice to run (only the BOOM API tests remain; the alert
        page is now served natively by SkyPortal and tested there).
        api      → BOOM API tests
        all      → same as api (default)
    """
    if scope not in _SCOPE_TO_SUBDIRS:
        print(f"Unknown test scope '{scope}'. Choose: {list(_SCOPE_TO_SUBDIRS)}")
        sys.exit(2)
    boom_subdirs = _SCOPE_TO_SUBDIRS[scope]

    print(f"Running integration testing (scope={scope})...")

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

    # Discover fritz-specific BOOM test files on the host, then translate
    # the paths to where they land inside the container.
    #
    # We deliberately scope to the boom/ subdirs rather than rglob'ing the
    # whole tests/ tree. The legacy api/test_alerts.py,
    # test_archive.py, test_kowalski_filters.py and
    # api_tests/.../test_filters.py all fail with
    # `TypeError: 'module' object is not callable` because of a name
    # collision: skyportal/tests/__init__.py defines an `api()` function,
    # and `skyportal/tests/api/` is a subpackage. Once the subpackage is
    # imported during test collection, the function is rebound to the
    # package. The boom tests live deeper (tests/api/boom/) and resolve
    # correctly via import order; the sibling-level legacy tests do not.
    # Fixing the collision belongs in skyportal proper.
    host_tests = Path("extensions/skyportal/skyportal/tests")
    container_tests = Path("skyportal/tests")
    test_files: list[Path] = []
    for subdir in boom_subdirs:
        host_root = host_tests / subdir
        if host_root.exists():
            test_files.extend(sorted(host_root.rglob("test_*.py")))
    if not test_files:
        print(
            f"No test files found under {[str(host_tests / d) for d in boom_subdirs]}"
        )
        sys.exit(1)
    container_paths = [
        str(container_tests / f.relative_to(host_tests)) for f in test_files
    ]

    # The skyportal container is built with ENV UV_NO_DEV=1, so test-only
    # deps (playwright, pytest plugins) are absent. SkyPortal's
    # tests/conftest.py imports tests.test_util -> playwright at module load,
    # so we install the missing pins directly. Versions match skyportal's
    # pyproject.toml dev group at the pinned submodule SHA.
    test_deps = (
        "playwright==1.58.0 pytest-playwright==0.7.2 "
        "pytest-rerunfailures pytest-randomly==4.0.1"
    )

    docker_exec_args = ["docker", "exec", "-i"]

    pre_pytest = f"source .venv/bin/activate && uv pip install --quiet {test_deps}"

    command = docker_exec_args + [
        "skyportal-web-1",
        "/bin/bash",
        "-c",
        f"{pre_pytest} && python -m pytest -v -s {' '.join(container_paths)}",
    ]
    try:
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError:
        sys.exit(1)
