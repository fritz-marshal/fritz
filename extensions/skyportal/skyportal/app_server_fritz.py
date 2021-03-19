from skyportal.app_server import make_app

from skyportal.handlers.api.alert import (
    ZTFAlertHandler,
    ZTFAlertAuxHandler,
    ZTFAlertCutoutHandler,
    ZTFAlertsByCoordsHandler,
)
from skyportal.handlers.api.kowalski_filter import KowalskiFilterHandler


fritz_handlers = [
    # Fritz-specific API endpoints
    # ZTF Alerts
    # most descriptive paths must be defined first
    (r"/api/alerts/ztf/(.+)/aux", ZTFAlertAuxHandler),
    (r"/api/alerts/ztf/(.+)/cutout", ZTFAlertCutoutHandler),
    (r"/api/alerts/ztf/(.+)", ZTFAlertHandler),
    # Alert Stream filter versioning via K:
    (r"/api/filters/([0-9]+)?/v", KowalskiFilterHandler),
    (r"/api/alerts_by_coords.*", ZTFAlertsByCoordsHandler),
]


def make_app_fritz(cfg, baselayer_handlers, baselayer_settings, process=None, env=None):
    """Create and return a `tornado.web.Application` object with (Fritz-specific) specified
    handlers and settings.

    Parameters
    ----------
    cfg : Config
        Loaded configuration.  Can be specified with '--config'
        (multiple uses allowed).
    baselayer_handlers : list
        Tornado handlers needed for baselayer to function.
    baselayer_settings : cfg
        Settings needed for baselayer to function.

    """
    app = make_app(cfg, baselayer_handlers, baselayer_settings, process, env)

    app.add_handlers(r".*", fritz_handlers)  # match any host

    return app
