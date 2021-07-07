import subprocess


def develop():
    """Install tools for developing Fritz"""
    subprocess.run(["pre-commit", "install"])
