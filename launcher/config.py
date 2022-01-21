__all__ = [
    "check_config_exists",
    "check_config",
]


from pathlib import Path
import subprocess

import yaml

from launcher.kowalski import generate_token as generate_kowalski_token


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
    Check if config exists, generate a K token for SP, adjust cfg and distribute to K and SP
    """
    c = cfg.replace(".defaults", "")
    check_config_exists(cfg=cfg, yes=yes)

    # generate a token for SkyPortal to talk to Kowalski
    with open(c) as config_yaml:
        config = yaml.load(config_yaml, Loader=yaml.FullLoader)

    kowalski_token = generate_kowalski_token(
        user_id=config["kowalski"]["server"]["admin_username"],
        jwt_secret=config["kowalski"]["server"]["JWT_SECRET_KEY"],
        jwt_algorithm=config["kowalski"]["server"]["JWT_ALGORITHM"],
        jwt_exp_delta_seconds=config["kowalski"]["server"]["JWT_EXP_DELTA_SECONDS"],
    )

    config["skyportal"]["app"]["kowalski"]["token"] = kowalski_token
    config["skyportal"]["app"]["gloria"]["token"] = kowalski_token

    # strip down, adjust, and copy over to Kowalski and SkyPortal
    config_kowalski = {"kowalski": config["kowalski"]}  # don't need the SP stuff
    with open("kowalski/config.yaml", "w") as kowalski_config_yaml:
        yaml.dump(config_kowalski, kowalski_config_yaml)

    # Docker-specific SkyPortal stuff:
    config["skyportal"]["database"]["host"] = "db"
    config["skyportal"]["server"]["url"] = "http://localhost:5000"
    config_skyportal = config["skyportal"]  # don't need the K stuff
    with open("skyportal/docker.yaml", "w") as skyportal_config_yaml:
        yaml.dump(config_skyportal, skyportal_config_yaml)

    # update fritz.yaml:
    with open(c, "w") as config_yaml:
        yaml.dump(config, config_yaml)
