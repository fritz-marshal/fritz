from skyportal.app_server import make_app

from skyportal.handlers.api.alert import (
    AlertHandler,
    AlertAuxHandler,
    AlertCutoutHandler,
)


def make_app_fritz(cfg, baselayer_handlers, baselayer_settings):
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
    app = make_app(cfg, baselayer_handlers, baselayer_settings)

    # add Fritz-specific handlers
    handlers = [
        # Fritz-specific API endpoints
        (r'/api/alerts/ztf/(.+)/aux', AlertAuxHandler),  # most descriptive path must be defined first
        (r'/api/alerts/ztf/(.+)/cutout', AlertCutoutHandler),  # most descriptive path must be defined first
        (r'/api/alerts/ztf/(.+)', AlertHandler),
    ]

    app.add_handlers(
        r".*",  # match any host
        handlers
    )

    return app
