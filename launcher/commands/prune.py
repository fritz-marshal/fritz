import subprocess

from launcher.commands import stop


def prune(yes: bool = False):
    """☠️ Prune fritz's docker containers and volumes and reset configs to defaults

    :param yes: agree to all potentially asked questions
    """
    go = (
        input(
            "Do you want to prune Fritz's docker containers and volumes and deinit submodules? [y/N] "
        )
        if not yes
        else "y"
    )

    if go.lower() == "y":
        # try stopping anything that's running first:
        stop()

        # remove docker images
        for image_name in "skyportal/web":
            p1 = subprocess.Popen(["docker", "images"], stdout=subprocess.PIPE)
            p2 = subprocess.Popen(
                ["grep", image_name], stdin=p1.stdout, stdout=subprocess.PIPE
            )
            image_id = subprocess.check_output(
                ["awk", "{print $3}"], stdin=p2.stdout, universal_newlines=True
            ).strip()
            p3 = subprocess.run(["docker", "rmi", image_id])
            if p3.returncode == 0:
                print(f"Removed {image_name} docker image")
            else:
                print(f"Failed to remove {image_name} docker image")

        # remove docker volumes
        for volume_name in (
            "skyportal_dbdata",
            "skyportal_thumbnails",
        ):
            p = subprocess.run(["docker", "volume", "rm", volume_name])
            if p.returncode == 0:
                print(f"Removed {volume_name} docker volume")
            else:
                print(f"Failed to remove {volume_name} docker volume")

        # deinit submodules
        p = subprocess.run(["git", "submodule", "deinit", "--all", "-f"])
        if p.returncode == 0:
            print("Deinitialized fritz's submodules")
        else:
            print("Failed to deinit fritz's submodules")
