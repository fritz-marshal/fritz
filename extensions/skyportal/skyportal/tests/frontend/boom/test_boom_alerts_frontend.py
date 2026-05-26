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
    link = driver.wait_for_xpath(f"//*[@data-testid='{boom_seed_oid}']", 20)

    original_window = driver.current_window_handle
    starting_handles = set(driver.window_handles)
    link.click()

    # target='_blank' opens a new tab; switch to whichever handle is new.
    import time

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
def test_save_alert_as_source(driver, boom_seed_oid, public_group):
    """Drive the Save-as-Source workflow end-to-end: open the alert
    detail page, click the SaveAlertButton, check a group in the dialog,
    and submit. Verifies the success toast appears, which means the
    full chain (frontend → boom_alert duck → /api/boom/.../alerts ingest
    → skyportal Source creation) ran. `public_group` ensures there is at
    least one selectable group in the dialog.
    """
    driver.get(f"/alerts/ZTF/{boom_seed_oid}")
    save_btn = driver.wait_for_xpath(
        f"//*[@data-testid='saveAlertButton_{boom_seed_oid}']", 30
    )
    save_btn.click()
    # Dialog title (SaveAlertButton.jsx:206).
    driver.wait_for_xpath("//*[contains(text(),'Select one or more groups')]", 10)
    # Pick the first group checkbox. Two layers of trickiness:
    # (1) Selenium's native .click() on anything inside the MUI dialog
    #     gets "element click intercepted" by the backdrop.
    # (2) JS-clicking the raw <input> toggles `checked` but does NOT
    #     fire the React synthetic onChange that react-hook-form
    #     listens for — so validateGroups() sees nothing selected
    #     and the form silently fails validation (no notification).
    # Clicking the wrapping <label> (via .closest('label')) is both
    # backdrop-immune and triggers a proper onChange via the native
    # label→input wiring.
    checkbox = driver.wait_for_xpath("//input[@type='checkbox' and not(@disabled)]", 10)
    driver.execute_script("arguments[0].closest('label').click();", checkbox)
    # Submit button has name=finalSaveAlertButton{alert.id}.
    submit = driver.wait_for_xpath(
        f"//button[@name='finalSaveAlertButton{boom_seed_oid}']", 10
    )
    driver.execute_script("arguments[0].click();", submit)
    # Success notification (SaveAlertButton.jsx:84).
    driver.wait_for_xpath(
        "//*[contains(text(),'Source photometry updated successfully')]", 30
    )
