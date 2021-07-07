import subprocess


def log():
    """Show SkyPortal's colorized logs while Fritz is running"""
    p = subprocess.run(
        [
            "docker",
            "exec",
            "-i",
            "skyportal_web_1",
            "/bin/bash",
            "-c",
            "source /skyportal_env/bin/activate; make log",
        ],
        cwd="skyportal",
    )
    if p.returncode != 0:
        raise RuntimeError("Failed to display fritz's logs")
