from skyportal.app_server import make_app

from skyportal.handlers.api.alert import (
    AlertHandler,
    AlertAuxHandler,
    AlertCutoutHandler,
)
from skyportal.handlers.api.kowalski_filter import KowalskiFilterHandler


fritz_handlers = [
    # Fritz-specific API endpoints
    # Alerts
    (r"/api/alerts(/.+)?", AlertHandler),
    (r"/api/alerts_aux(/.+)?", AlertAuxHandler),
    (r"/api/alerts_cutouts(/.+)?", AlertCutoutHandler),
    # Alert Stream filter versioning via K:
    (r"/api/filters/([0-9]+)?/v", KowalskiFilterHandler),
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
