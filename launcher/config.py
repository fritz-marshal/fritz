__all__ = [
    "check_config_exists",
    "check_config",
]


from pathlib import Path
import subprocess

import yaml


def check_config_exists(cfg="fritz.defaults.yaml", yes=False):
    c = cfg.replace(".defaults", "")
    if not Path(c).exists():
        cd = (
            input(
                f"{c} does not exist, do you want to use default settings from {cfg}? [y/N] "
            )
            if not yes
            else "y"
        )
        if cd.lower() == "y":
            subprocess.run(["cp", f"{cfg}", f"{c}"], check=True)
        else:
            raise IOError(f"{c} does not exist, aborting")


def check_config(cfg="fritz.defaults.yaml", yes=False):
    """
    Check if config exists, and adjust cfg
    """
    c = cfg.replace(".defaults", "")
    check_config_exists(cfg=cfg, yes=yes)

    with open(c) as config_yaml:
        config = yaml.load(config_yaml, Loader=yaml.FullLoader)

    # Docker-specific SkyPortal stuff:
    config["skyportal"]["database"]["host"] = "db"
    config["skyportal"]["server"]["url"] = "http://localhost:5000"
    config_skyportal = config["skyportal"]  # don't need the K stuff
    with open("skyportal/docker.yaml", "w") as skyportal_config_yaml:
        yaml.dump(config_skyportal, skyportal_config_yaml)

    # update fritz.yaml:
    with open(c, "w") as config_yaml:
        yaml.dump(config, config_yaml)
