import pytest

from skyportal.tests import api

SURVEY = "ZTF"
# Known object in the BOOM test corpus (same one used by the legacy
# Kowalski tests). If the seed dataset changes, update both.
OID = "ZTF20aaelulu"
CANDID = 1105522281015015000


def _alerts_url(query: str = "") -> str:
    base = f"boom/surveys/{SURVEY}/alerts"
    return f"{base}?{query}" if query else base


@pytest.mark.requires_boom_data
def test_get_alerts_by_object_id(view_only_token):
    status, data = api("GET", _alerts_url(f"objectId={OID}"), token=view_only_token)
    assert status == 200
    assert data["status"] == "success"
    assert isinstance(data["data"], list)
    assert len(data["data"]) > 0
    assert all(alert.get("objectId") == OID for alert in data["data"])


@pytest.mark.requires_boom_data
def test_get_alerts_by_object_id_comma_list(view_only_token):
    status, data = api(
        "GET", _alerts_url(f"objectId={OID},{OID}"), token=view_only_token
    )
    assert status == 200
    assert data["status"] == "success"
    assert isinstance(data["data"], list)


@pytest.mark.requires_boom_data
def test_get_alerts_by_candid(view_only_token):
    status, data = api("GET", _alerts_url(f"candid={CANDID}"), token=view_only_token)
    assert status == 200
    assert data["status"] == "success"
    assert isinstance(data["data"], list)
    assert any(alert.get("candid") == CANDID for alert in data["data"])


@pytest.mark.requires_boom_data
def test_get_alerts_by_candid_and_object_id(view_only_token):
    status, data = api(
        "GET",
        _alerts_url(f"candid={CANDID}&objectId={OID}"),
        token=view_only_token,
    )
    assert status == 200
    assert data["status"] == "success"
    assert isinstance(data["data"], list)


@pytest.mark.requires_boom_data
def test_get_alerts_by_cone_search(view_only_token):
    ra, dec, radius = 108.5, 35.8, 1
    status, data = api(
        "GET",
        _alerts_url(f"ra={ra}&dec={dec}&radius={radius}&radius_units=deg"),
        token=view_only_token,
    )
    assert status == 200
    assert data["status"] == "success"
    assert all("objectId" in alert for alert in data["data"])


@pytest.mark.requires_boom_data
def test_get_alerts_cone_plus_object_id_filter(view_only_token):
    ra, dec, radius = 108.5, 35.8, 1
    status, data = api(
        "GET",
        _alerts_url(
            f"ra={ra}&dec={dec}&radius={radius}&radius_units=deg&objectId={OID}"
        ),
        token=view_only_token,
    )
    assert status == 200
    assert data["status"] == "success"
    assert all(alert.get("objectId") == OID for alert in data["data"])


def test_get_alerts_no_params_errors(view_only_token):
    status, data = api("GET", _alerts_url(), token=view_only_token)
    assert status == 400
    assert data["status"] == "error"


def test_get_alerts_invalid_candid_errors(view_only_token):
    status, data = api("GET", _alerts_url("candid=not_an_int"), token=view_only_token)
    assert status == 400
    assert data["status"] == "error"


def test_get_alerts_invalid_radius_units_errors(view_only_token):
    status, data = api(
        "GET",
        _alerts_url("ra=108.5&dec=35.8&radius=1&radius_units=parsecs"),
        token=view_only_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_get_alerts_radius_too_large_errors(view_only_token):
    status, data = api(
        "GET",
        _alerts_url("ra=108.5&dec=35.8&radius=2&radius_units=deg"),
        token=view_only_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_get_alerts_incomplete_positional_errors(view_only_token):
    status, data = api(
        "GET",
        _alerts_url("ra=108.5&dec=35.8&radius=1"),
        token=view_only_token,
    )
    assert status == 400
    assert data["status"] == "error"
