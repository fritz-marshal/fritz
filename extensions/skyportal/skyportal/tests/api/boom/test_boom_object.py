import pytest

from skyportal.tests import api

SURVEY = "ZTF"
OID = "ZTF20aaelulu"
UNKNOWN_OID = "ZTF99zzzzzz"


def _obj_url(oid: str, query: str = "") -> str:
    base = f"boom/surveys/{SURVEY}/objects/{oid}"
    return f"{base}?{query}" if query else base


@pytest.mark.requires_boom_data
def test_get_object_aux_default(view_only_token):
    status, data = api("GET", _obj_url(OID), token=view_only_token)
    assert status == 200
    assert data["status"] == "success"
    assert isinstance(data["data"], dict)
    # Default-projected keys
    for key in ["prv_candidates", "fp_hists", "prv_nondetections", "cross_matches"]:
        assert key in data["data"]


@pytest.mark.requires_boom_data
def test_get_object_aux_can_omit_arrays(view_only_token):
    status, data = api(
        "GET",
        _obj_url(
            OID,
            "includePrvCandidates=false"
            "&includeFpHists=false"
            "&includePrvNondetections=false",
        ),
        token=view_only_token,
    )
    assert status == 200
    assert data["status"] == "success"
    assert "prv_candidates" not in data["data"]
    assert "fp_hists" not in data["data"]
    assert "prv_nondetections" not in data["data"]


@pytest.mark.requires_boom_data
def test_get_object_aux_include_all_fields(view_only_token):
    status, data = api(
        "GET",
        _obj_url(OID, "includeAllFields=true"),
        token=view_only_token,
    )
    assert status == 200
    assert data["status"] == "success"


@pytest.mark.requires_boom_data
def test_get_unknown_object_returns_missing_sentinel(view_only_token):
    status, data = api("GET", _obj_url(UNKNOWN_OID), token=view_only_token)
    assert status == 200
    assert data["status"] == "success"
    assert data["data"].get("missing") is True


def test_post_object_requires_group_ids(upload_data_token):
    status, data = api(
        "POST",
        _obj_url(OID),
        data={},
        token=upload_data_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_post_object_rejects_nonint_group_ids(upload_data_token):
    status, data = api(
        "POST",
        _obj_url(OID),
        data={"group_ids": ["not_an_int"]},
        token=upload_data_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_post_object_rejects_inaccessible_group(upload_data_token):
    status, data = api(
        "POST",
        _obj_url(OID),
        data={"group_ids": [999999]},
        token=upload_data_token,
    )
    assert status == 400
    assert data["status"] == "error"


@pytest.mark.requires_boom_data
def test_post_object_happy_path(upload_data_token, public_group):
    """End-to-end import: ask BOOM for the alert, save Obj+Source+photometry
    into SkyPortal, and confirm the source is then queryable."""
    status, data = api(
        "POST",
        _obj_url(OID),
        data={"group_ids": [public_group.id]},
        token=upload_data_token,
    )
    assert status == 200
    assert data["status"] == "success"
    assert data["data"]["objectId"] == OID
    assert data["data"]["survey"] == SURVEY

    # The Obj should now exist in SkyPortal.
    status, src = api("GET", f"sources/{OID}", token=upload_data_token)
    assert status == 200
    assert src["status"] == "success"
    assert src["data"]["id"] == OID
