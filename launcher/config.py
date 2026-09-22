__all__ = [
    "check_config_exists",
    "check_config",
]


import secrets
import subprocess
from pathlib import Path

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
            raise OSError(f"{c} does not exist, aborting")


# The key shipped in skyportal's config.yaml.defaults, which the app refuses
# to start on: session cookies and the credentials encrypted in the database
# would be readable by anyone holding a copy of the defaults.
DEFAULT_SECRET_KEY = "abc01234"


def ensure_secret_key(skyportal_config):
    """Give this checkout its own app.secret_key, once.

    fritz.yaml is local and gitignored, so the generated key stays out of the
    repository and survives rebuilds -- sessions and anything encrypted under
    it keep working. Production sets its own key and never reaches this.
    """
    app = skyportal_config.setdefault("app", {})
    if app.get("secret_key") in (None, "", DEFAULT_SECRET_KEY):
        app["secret_key"] = secrets.token_urlsafe(32)
        print("Generated an app.secret_key for this checkout")


def check_config(cfg="fritz.defaults.yaml", yes=False):
    """
    Check if config exists, generate a K token for SP, adjust cfg and distribute to K and SP
    """
    c = cfg.replace(".defaults", "")
    check_config_exists(cfg=cfg, yes=yes)

    with open(c) as config_yaml:
        config = yaml.load(config_yaml, Loader=yaml.FullLoader)

    # Docker-specific SkyPortal stuff:
    config["skyportal"]["database"]["host"] = "db"
    config["skyportal"]["server"]["url"] = "http://localhost:5000"
    ensure_secret_key(config["skyportal"])
    config_skyportal = config["skyportal"]
    with open("skyportal/docker.yaml", "w") as skyportal_config_yaml:
        yaml.dump(config_skyportal, skyportal_config_yaml)

    # update fritz.yaml:
    with open(c, "w") as config_yaml:
        yaml.dump(config, config_yaml)
