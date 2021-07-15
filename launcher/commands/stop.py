import subprocess


def stop():
    """✋ Shut Fritz down"""
    print("Shutting down Fritz...")

    # stop traefik if it is running
    running_container_images = (
        subprocess.check_output(["docker", "ps", "-a", "--format", "{{.Image}}"])
        .decode("utf-8")
        .strip()
        .split("\n")
    )
    traefik_is_running = any("traefik" in x.lower() for x in running_container_images)
    if traefik_is_running:
        print("Shutting down Traefik")
        subprocess.run(["docker-compose", "-f", "docker-compose.traefik.yaml", "down"])

    # stop Kowalski and SkyPortal
    subprocess.run(["python", "kowalski.py", "down"], cwd="kowalski")
    subprocess.run(
        ["docker-compose", "-f", "docker-compose.skyportal.yaml", "down"],
        cwd="skyportal",
    )

    # remove common network
    subprocess.run(["docker", "network", "remove", "fritz_net"])
