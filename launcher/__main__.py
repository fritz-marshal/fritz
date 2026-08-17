import subprocess
import sys
from pathlib import Path

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

sys.path.insert(0, "skyportal")


def initialize_submodules():
    """Initialize submodules if either submodule directory is empty

    The progress line is written out by hand rather than via baselayer's
    `status` helper: this is what clones the submodules, so baselayer does not
    exist on disk yet. Git's output is shown only when the clone fails.
    """
    message = "Initializing submodules"
    print(f"[·] {message}", end="")
    sys.stdout.flush()

    do_initialize = any(
        len(list(Path(submodule).glob("*"))) == 0 for submodule in ("skyportal")
    )
    if do_initialize:
        p = subprocess.run(
            ["git", "submodule", "update", "--init", "--recursive"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        if p.returncode != 0:
            print(f"\r[✗] {message}")
            print(p.stdout.decode("utf-8"))
            raise RuntimeError("Failed to initialize fritz's submodules")

    print(f"\r[✓] {message}")


if __name__ == "__main__":
    try:
        import fire
    except ImportError:
        print("This tool depends on `fire`.  Please install it using:")
        print()
        print("  uv sync --inexact")
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
        initialize_submodules()

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
