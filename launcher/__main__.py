#!/usr/bin/env python
from pathlib import Path
import subprocess
import sys

from launcher.commands import (
    build,
    develop,
    doc,
    lint,
    log,
    prune,
    run,
    stop,
    test,
    update,
)

from tools.check_environment import dependencies_ok
from tools.status import status

sys.path.insert(0, "skyportal")


def initialize_submodules():
    """Initialize submodules if either submodule directory is empty"""
    do_initialize = any(
        len(list(Path(submodule).glob("*"))) == 0 for submodule in ("skyportal")
    )
    if do_initialize:
        p = subprocess.run(
            ["git", "submodule", "update", "--init", "--recursive"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        print(p.stdout.decode("utf-8"))
        if p.returncode != 0:
            raise RuntimeError("Failed to initialize fritz's submodules")


if __name__ == "__main__":
    try:
        import fire
    except ImportError:
        print("This tool depends on `fire`.  Please install it using:")
        print()
        print("  pip install fire")
        print()
        sys.exit(-1)

    # Monkey-patch away fire's paging
    fire.core.Display = lambda lines, out: print(*lines, file=out)

    # Prevent fire from printing annoying extra debugging information
    # when the user specifies `--help` instead of `-- --help`
    if sys.argv[-1] == "--help" and sys.argv[-2] != "":
        sys.argv.insert(-1, "--")

    # No need to install whole environment if the user just
    # wants/needs some help
    if sys.argv[-1] != "--help" and len(sys.argv) != 1:
        # check environment
        with status("Initializing submodules"):
            initialize_submodules()

        env_ok = dependencies_ok()
        if not env_ok:
            print("\nHalting because of unsatisfied dependencies.")
            sys.exit(-1)

    fire.Fire(
        {
            "build": build,
            "develop": develop,
            "doc": doc,
            "lint": lint,
            "log": log,
            "prune": prune,
            "run": run,
            "stop": stop,
            "test": test,
            "update": update,
        },
        name="fritz",
    )
