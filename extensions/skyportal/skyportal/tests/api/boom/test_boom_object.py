import pytest

from skyportal.tests import api

SURVEY = "ZTF"
UNKNOWN_OID = "ZTF99zzzzzz"


def _obj_url(oid: str, query: str = "") -> str:
    base = f"boom/surveys/{SURVEY}/objects/{oid}"
    return f"{base}?{query}" if query else base


# ── Happy paths (need real alert in BOOM mongo) ─────────────────────────────


@pytest.mark.requires_boom_data
def test_get_object_aux_default(view_only_token, boom_seed_oid):
    status, data = api("GET", _obj_url(boom_seed_oid), token=view_only_token)
    assert status == 200
    assert data["status"] == "success"
    assert isinstance(data["data"], dict)
    for key in ["prv_candidates", "fp_hists", "prv_nondetections", "cross_matches"]:
        assert key in data["data"]


@pytest.mark.requires_boom_data
def test_get_object_aux_can_omit_arrays(view_only_token, boom_seed_oid):
    status, data = api(
        "GET",
        _obj_url(
            boom_seed_oid,
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
def test_get_object_aux_include_all_fields(view_only_token, boom_seed_oid):
    status, data = api(
        "GET",
        _obj_url(boom_seed_oid, "includeAllFields=true"),
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


# ── POST validation (doesn't need seed data) ────────────────────────────────


def test_post_object_requires_group_ids(upload_data_token, boom_seed):
    # Need *some* objectId to hit the route; use the seed if present
    # else just use a placeholder (the validation fires before lookup).
    oid = boom_seed["objectId"] if boom_seed else "ZTF_placeholder"
    status, data = api("POST", _obj_url(oid), data={}, token=upload_data_token)
    assert status == 400
    assert data["status"] == "error"


def test_post_object_rejects_nonint_group_ids(upload_data_token, boom_seed):
    oid = boom_seed["objectId"] if boom_seed else "ZTF_placeholder"
    status, data = api(
        "POST",
        _obj_url(oid),
        data={"group_ids": ["not_an_int"]},
        token=upload_data_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_post_object_rejects_inaccessible_group(upload_data_token, boom_seed):
    oid = boom_seed["objectId"] if boom_seed else "ZTF_placeholder"
    status, data = api(
        "POST",
        _obj_url(oid),
        data={"group_ids": [999999]},
        token=upload_data_token,
    )
    assert status == 400
    assert data["status"] == "error"


# ── End-to-end import ───────────────────────────────────────────────────────


@pytest.mark.requires_boom_data
def test_post_object_happy_path(upload_data_token, public_group, boom_seed_oid):
    """End-to-end import: ask BOOM for the alert, save Obj+Source+photometry
    into SkyPortal, and confirm the source is then queryable."""
    status, data = api(
        "POST",
        _obj_url(boom_seed_oid),
        data={"group_ids": [public_group.id]},
        token=upload_data_token,
    )
    assert status == 200, data
    assert data["status"] == "success"
    assert data["data"]["objectId"] == boom_seed_oid
    assert data["data"]["survey"] == SURVEY

    # The Obj should now exist in SkyPortal.
    status, src = api("GET", f"sources/{boom_seed_oid}", token=upload_data_token)
    assert status == 200, src
    assert src["status"] == "success"
    assert src["data"]["id"] == boom_seed_oid
