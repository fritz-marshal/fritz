"""Smoke tests for the BOOM-backed alerts pages.

These exercise the frontend changes from PR #578 (Migrate Frontend to
BOOM-based endpoints): the rewritten Alerts.jsx search/list page and
the new Alert.jsx detail view. We only assert minimal landmarks — that
the page mounts and shows the survey selector / alert details — so the
tests remain robust to small UI tweaks while still catching regressions
like a route disappearing or a duck/reducer wiring change.
"""

import pytest


def test_alerts_page_loads(driver):
    """The /alerts route mounts and renders the survey selector."""
    driver.get("/alerts")
    # AlertsSearchButton routes here; the page should render a survey
    # selector (ZTF / LSST). We look for either label via a broad xpath.
    driver.wait_for_xpath(
        "//*[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ',"
        "'abcdefghijklmnopqrstuvwxyz'),'ztf') or "
        "contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ',"
        "'abcdefghijklmnopqrstuvwxyz'),'lsst')]"
    )


def test_alerts_page_search_by_object_id(driver):
    """The /alerts page accepts an objectId query param and renders without
    a hard crash. We don't require results because BOOM may have no data
    matching arbitrary OIDs at this stage; the assertion is just that the
    page mounted (websocket connected, body present)."""
    driver.get("/alerts?survey=ZTF&objectId=ZTF99zzzzzz")
    driver.wait_for_xpath("//body")


@pytest.mark.requires_boom_data
def test_alert_detail_page_loads(driver, boom_seed_oid):
    """The Alert.jsx detail page renders for an object that BOOM has data
    for. The component reads its objectId from route.id (Alert.jsx:472);
    we assert the heading or another landmark containing the OID."""
    driver.get(f"/alerts/ZTF/{boom_seed_oid}")
    driver.wait_for_xpath(f"//*[contains(text(),'{boom_seed_oid}')]")


@pytest.mark.requires_boom_data
def test_alerts_search_results_for_seed_oid(driver, boom_seed_oid):
    """Run the alerts search with the seed objectId and confirm at least
    one row references it."""
    driver.get(f"/alerts?survey=ZTF&objectId={boom_seed_oid}")
    driver.wait_for_xpath(f"//*[contains(text(),'{boom_seed_oid}')]")
