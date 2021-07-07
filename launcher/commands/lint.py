import subprocess
import sys

from launcher.commands import develop


def lint():
    """Lint the full code base"""
    try:
        import pre_commit  # noqa: F401
    except ImportError:
        develop()

    try:
        subprocess.run(["pre-commit", "run", "--all-files"], check=True)
    except subprocess.CalledProcessError:
        sys.exit(1)
