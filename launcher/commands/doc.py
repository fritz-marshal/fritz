import subprocess
import os
import json
import jinja2

from launcher.config import check_config
from launcher.skyportal import patch as patch_skyportal


def patch_api_doc_template():
    """Patch the API documentation template with the OpenAPI spec.

    This function reads the OpenAPI specification from the openapi.json file,
    populates it with server information from the configuration, and renders
    a HTML documentation page from https://github.com/scalar/scalar
    using a Jinja2 template.

    Raises:
        ValueError: If the server information is not valid.
    """
    # open the openapi.json file generated by build-spec.py
    from baselayer.app.env import load_env

    _, cfg = load_env()

    with open("openapi.json") as f:
        openapi_spec = json.load(f)

    # populate the OpenAPI spec with (optional) server information
    servers = cfg.get("docs.servers", [])
    if servers is None:
        servers = []
    if not isinstance(servers, list):
        raise ValueError("API servers must be a list.")

    for server in servers:
        if not all(k in server for k in ("url", "description")):
            raise ValueError("Each server must have 'url' and 'description' keys.")
    openapi_spec["servers"] = servers

    # Create a Jinja2 template environment
    template_env = jinja2.Environment(loader=jinja2.FileSystemLoader(searchpath="./"))

    # Load the template file
    template = template_env.get_template("skyportal/doc/openapi.html.template")

    # Render the template with the OpenAPI spec
    output = template.render(openapi_spec=json.dumps(openapi_spec, indent=2))

    # Write the output to a new HTML file
    with open("../doc/_build/html/api.html", "w") as f:
        f.write(output)


def doc(yes: bool = False, upload: bool = False):
    """Build the documentation

    :param yes: agree to all potentially asked questions
    :param upload: Upload documentation to GitHub
    """
    check_config(yes=yes)
    for destination in ("config.yaml.defaults",):
        subprocess.run(
            [
                "cp",
                "docker.yaml",
                destination,
            ],
            check=True,
            cwd="skyportal",
        )

    subprocess.run(["make", "html"], cwd="doc", check=True)

    patch_skyportal()

    env = os.environ.copy()
    env.update({"PYTHONPATH": "."})

    from baselayer.app.app_server import handlers as baselayer_handlers
    from skyportal.app_server import skyportal_handlers
    from skyportal.app_server_fritz import fritz_handlers
    from skyportal import openapi

    spec = openapi.spec_from_handlers(
        baselayer_handlers + skyportal_handlers + fritz_handlers,
        metadata={
            "title": "Fritz: SkyPortal API",
            "servers": [{"url": "https://fritz.science"}],
        },
    )
    with open("openapi.json", "w") as f:
        json.dump(spec.to_dict(), f)

    patch_api_doc_template()

    os.remove("openapi.json")

    if upload:
        subprocess.run(
            [
                "./tools/push_dir_to_repo.py",
                "--branch",
                "master",
                "--committer",
                "fritz",
                "--email",
                "fritz@fritz-marshal.org",
                "--message",
                "Update website",
                "--force",
                "./doc/_build/html",
                "git@github.com:fritz-marshal/doc",
            ],
            check=True,
        )
