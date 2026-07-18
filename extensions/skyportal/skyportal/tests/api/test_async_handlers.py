"""Structural regression guard for the async migration of the fritz boom/kowalski
extension handlers.

On the async-SQLAlchemy skyportal branch every Tornado handler method must be a
coroutine (`async def`) and use `async with self.AsyncSession()`. This test:

  * imports every migrated handler module (catching import-time breakage such as
    undefined names or bad relative imports against the overlaid skyportal), and
  * asserts that each handler class's HTTP methods (get/post/put/delete/patch)
    are coroutine functions — so a method accidentally left/added as plain `def`
    (which would silently never await its DB work) fails CI.

It does not hit Kowalski/BOOM, so it runs anywhere the fritz extensions are
overlaid onto skyportal.
"""

import importlib
import inspect

import pytest

# Modules overlaid onto skyportal by the fritz extensions that were migrated to
# async. Paths are the in-skyportal import paths (post-overlay).
HANDLER_MODULES = [
    "skyportal.handlers.api.kowalski.alert",
    "skyportal.handlers.api.kowalski.archive",
    "skyportal.handlers.api.kowalski.filter",
    "skyportal.handlers.api.kowalski_filter",
    "skyportal.handlers.api.boom.filter",
    "skyportal.handlers.api.boom.filter_modules",
    "skyportal.handlers.api.boom.run_filter",
    "skyportal.handlers.api.db_stats",
]

HTTP_METHODS = ("get", "post", "put", "delete", "patch")


@pytest.mark.parametrize("module_name", HANDLER_MODULES)
def test_handler_http_methods_are_async(module_name):
    module = importlib.import_module(module_name)  # fails the test on import error

    checked = 0
    for cls_name, cls in inspect.getmembers(module, inspect.isclass):
        if not cls_name.endswith("Handler") or cls.__module__ != module_name:
            continue
        for method_name in HTTP_METHODS:
            method = cls.__dict__.get(method_name)
            if method is None:
                continue
            # unwrap auth_or_token / permissions decorators (functools.wraps) to
            # the underlying method to check its async-ness
            func = inspect.unwrap(method)
            assert inspect.iscoroutinefunction(func), (
                f"{module_name}.{cls_name}.{method_name} must be 'async def' on "
                "the async skyportal branch (a sync handler never awaits its DB "
                "work)"
            )
            checked += 1

    assert checked > 0, f"no HTTP handler methods found in {module_name}"
