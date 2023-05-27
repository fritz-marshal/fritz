import asyncio
import concurrent

from skyportal.app_server import make_app

from skyportal.handlers.api.alert import (
    AlertHandler,
    AlertAuxHandler,
    AlertCutoutHandler,
    AlertTripletsHandler,
)
from skyportal.handlers.api.archive import (
    ArchiveCatalogsHandler,
    ArchiveHandler,
    CrossMatchHandler,
    ScopeFeaturesHandler,
)
from skyportal.handlers.api.kowalski_filter import KowalskiFilterHandler


fritz_handlers = [
    # Fritz-specific API endpoints
    # Alerts
    (r"/api/alerts(/.+)?", AlertHandler),
    (r"/api/alerts_aux(/.+)?", AlertAuxHandler),
    (r"/api/alerts_cutouts(/.+)?", AlertCutoutHandler),
    (r"/api/alerts_triplets(/.+)?", AlertTripletsHandler),
    # Archive
    (r"/api/archive", ArchiveHandler),
    (r"/api/archive/catalogs", ArchiveCatalogsHandler),
    (r"/api/archive/cross_match", CrossMatchHandler),
    (r"/api/archive/features", ScopeFeaturesHandler),
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

    # Limit the number of threads on each Tornado instance.
    # This is to ensure that we don't run out of database connections,
    # or overload our SQLAlchemy connection pool.
    asyncio.get_event_loop().set_default_executor(
        concurrent.futures.ThreadPoolExecutor(max_workers=8)
    )

    app.add_handlers(r".*", fritz_handlers)  # match any host

    return app
