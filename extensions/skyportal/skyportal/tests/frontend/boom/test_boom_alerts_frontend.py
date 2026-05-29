"""Smoke tests for the BOOM-backed alerts pages.

These exercise the frontend changes from PR #578 (Migrate Frontend to
BOOM-based endpoints): the rewritten Alerts.jsx search/list page and
the new Alert.jsx detail view. We only assert minimal landmarks — that
the page mounts and shows the survey selector / alert details — so the
tests remain robust to small UI tweaks while still catching regressions
like a route disappearing or a duck/reducer wiring change.

All clicks go through skyportal's `driver.click_xpath()` helper
(defined on MyCustomWebDriver in skyportal/tests/test_util.py). It
wraps a 3-strategy click chain — native selenium click, JS click,
ActionChains coordinate click — plus scroll-into-view, which together
handle MUI dialog backdrops and other interaction edge cases that
bare `element.click()` trips on.
"""

import time

import pytest

from skyportal.tests import api


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


@pytest.mark.requires_boom_data
def test_open_alert_from_table(driver, boom_seed_oid):
    """The main navigation flow: open the alerts search page, click the
    alert's objectId link in the results table, switch to the new tab
    that opens (the row link has target='_blank'), and verify the
    Alert.jsx detail page rendered with the SaveAlertButton present.
    This exercises the row link in Alerts.jsx:497-508 and confirms that
    clicking through to the detail page wires up the save action.
    """
    driver.get(f"/alerts?survey=ZTF&objectId={boom_seed_oid}")
    # Row link uses data-testid={objectId} (Alerts.jsx:502).
    original_window = driver.current_window_handle
    starting_handles = set(driver.window_handles)
    driver.click_xpath(f"//*[@data-testid='{boom_seed_oid}']", timeout=20)

    # target='_blank' opens a new tab; switch to whichever handle is new.
    deadline = time.time() + 20
    new_handle = None
    while time.time() < deadline:
        new_handles = set(driver.window_handles) - starting_handles
        if new_handles:
            new_handle = next(iter(new_handles))
            break
        time.sleep(0.5)
    assert new_handle is not None, "alert link did not open a new tab"
    driver.switch_to.window(new_handle)
    try:
        # SaveAlertButton has data-testid=saveAlertButton_{alert.id} where
        # alert.id is the objectId.
        driver.wait_for_xpath(
            f"//*[@data-testid='saveAlertButton_{boom_seed_oid}']", 30
        )
    finally:
        driver.close()
        driver.switch_to.window(original_window)


@pytest.mark.requires_boom_data
def test_save_alert_as_source(driver, boom_seed_oid, public_group, super_admin_token):
    """Drive the Save-as-Source workflow end-to-end: open the alert
    detail page, click the SaveAlertButton, check a group in the dialog,
    and submit. We verify the *outcome* via the API — confirm a Source
    was created — rather than waiting for a UI notification, because
    the success toast can dismiss before selenium catches it, or be
    skipped if a non-error/non-success branch fires. `public_group`
    ensures there is at least one selectable group in the dialog.
    """
    driver.get(f"/alerts/ZTF/{boom_seed_oid}")
    driver.click_xpath(
        f"//*[@data-testid='saveAlertButton_{boom_seed_oid}']", timeout=30
    )
    # Dialog title (SaveAlertButton.jsx:206).
    driver.wait_for_xpath("//*[contains(text(),'Select one or more groups')]", 10)
    # Click the group's label text rather than the raw checkbox input.
    # The <input> is visibility:hidden in MUI (only the SVG icon is
    # visible), so any direct click ends up missing the actual hit area
    # OR fires an event React Hook Form ignores. Clicking the label
    # text triggers the native label→input pairing, which is exactly
    # what RHF's Controller picks up. public_group.name is a random
    # UUID prefix that's unique on the page.
    driver.click_xpath(
        f"//*[contains(text(),'{public_group.name}')]",
        timeout=10,
    )
    # Submit button has name=finalSaveAlertButton{alert.id}.
    driver.click_xpath(
        f"//button[@name='finalSaveAlertButton{boom_seed_oid}']", timeout=10
    )

    # Poll the API for the Source. The full chain we're verifying is:
    # dialog submit → boom_alert.saveAlertAsSource duck → backend
    # POST /api/boom/surveys/ZTF/objects/{oid} (BoomObjectHandler.post)
    # → Obj + Source created.
    deadline = time.time() + 30
    last_status = None
    while time.time() < deadline:
        last_status, data = api(
            "GET", f"sources/{boom_seed_oid}", token=super_admin_token
        )
        if last_status == 200 and data.get("status") == "success":
            assert data["data"]["id"] == boom_seed_oid
            return
        time.sleep(1)
    pytest.fail(
        f"Source {boom_seed_oid} never appeared after submit "
        f"(last GET /sources status={last_status})"
    )
