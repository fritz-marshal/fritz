import asyncio
import concurrent

from skyportal.app_server import make_app
from skyportal.handlers.api.boom import (
    BoomFilterHandler,
    BoomFilterModulesHandler,
    BoomObjectHandler,
    BoomRunFilterHandler,
)
from skyportal.handlers.api.kowalski import (
    KowalskiAlertAuxHandler,
    KowalskiAlertCutoutHandler,
    KowalskiAlertHandler,
    KowalskiAlertTripletsHandler,
    KowalskiArchiveCatalogsHandler,
    KowalskiArchiveHandler,
    KowalskiCrossMatchHandler,
    KowalskiFilterHandler,
    KowalskiScopeFeaturesHandler,
)

# Fritz-specific API endpoints
fritz_handlers = [
    # BOOM API endpoints
    (r"/api/boom/filters(/.*)", BoomFilterHandler),
    (r"/api/boom/filter_modules(/.*)?", BoomFilterModulesHandler),
    (r"/api/boom/run_filter", BoomRunFilterHandler),
    (r"/api/boom/alerts/([0-9A-Za-z-_\.\+]+)/([0-9A-Za-z-_\.\+]+)", BoomObjectHandler),
    # Kowalski API endpoints
    (r"/api/kowalski/filters/([0-9]+)?/v", KowalskiFilterHandler),
    (r"/api/kowalski/alerts(/.+)?", KowalskiAlertHandler),
    (r"/api/kowalski/alerts_aux(/.+)?", KowalskiAlertAuxHandler),
    (r"/api/kowalski/alerts_cutouts(/.+)?", KowalskiAlertCutoutHandler),
    (r"/api/kowalski/alerts_triplets(/.+)?", KowalskiAlertTripletsHandler),
    (r"/api/kowalski/archive", KowalskiArchiveHandler),
    (r"/api/kowalski/archive/catalogs", KowalskiArchiveCatalogsHandler),
    (r"/api/kowalski/archive/cross_match", KowalskiCrossMatchHandler),
    (r"/api/kowalski/archive/features", KowalskiScopeFeaturesHandler),
    # Same but without the "/kowalski" prefix, to maintain
    # compatibility with existing Fritz API endpoints
    (r"/api/alerts(/.+)?", KowalskiAlertHandler),
    (r"/api/alerts_aux(/.+)?", KowalskiAlertAuxHandler),
    (r"/api/alerts_cutouts(/.+)?", KowalskiAlertCutoutHandler),
    (r"/api/alerts_triplets(/.+)?", KowalskiAlertTripletsHandler),
    (r"/api/archive", KowalskiArchiveHandler),
    (r"/api/archive/catalogs", KowalskiArchiveCatalogsHandler),
    (r"/api/archive/cross_match", KowalskiCrossMatchHandler),
    (r"/api/archive/features", KowalskiScopeFeaturesHandler),
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
