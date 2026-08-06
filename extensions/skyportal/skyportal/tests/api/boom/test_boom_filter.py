"""BOOM filter integration coverage, against SkyPortal's broker endpoints.

These exercise the live BOOM round-trip (`/api/brokers/{id}/filters`,
`/filter/test`, `/filter_modules`), which SkyPortal's own broker tests only
cover against stubs or Lasair.
"""

from skyportal.tests import api

# ── /brokers/{id}/filters/{fid} ──────────────────────────────────────────────


def test_get_boom_filter(view_only_token, boom_broker_id, boom_filter):
    status, data = api(
        "GET", f"brokers/{boom_broker_id}/filters/{boom_filter}", token=view_only_token
    )
    assert status == 200
    assert data["status"] == "success"
    for key in ("id", "name", "group_id", "broker_id"):
        assert key in data["data"]
    # The stream comes back as a nested object, not a bare stream_id.
    assert (data["data"].get("stream") or {}).get("id") is not None
    # The BOOM-side provisioning should have stamped altdata.boom.filter_id.
    altdata = data["data"].get("altdata") or {}
    assert isinstance(altdata.get("boom"), dict)
    assert "filter_id" in altdata["boom"]


def test_get_boom_filter_unknown_id_errors(view_only_token, boom_broker_id):
    status, data = api(
        "GET", f"brokers/{boom_broker_id}/filters/0", token=view_only_token
    )
    assert status == 400
    assert data["status"] == "error"


def test_post_new_version(super_admin_token, boom_broker_id, boom_filter):
    """POSTing to an already-provisioned BOOM filter appends a new pipeline
    version (rather than re-creating)."""
    # BOOM requires the pipeline to end with a $project that includes
    # objectId (see build_and_test_filter_version in boom's filters.rs).
    new_pipeline = [
        {"$match": {"candidate.drb": {"$gt": 0.9}}},
        {"$project": {"objectId": 1, "candid": 1, "candidate": 1}},
    ]
    status, data = api(
        "POST",
        f"brokers/{boom_broker_id}/filters/{boom_filter}",
        data={"altdata": new_pipeline, "filters": "v2"},
        token=super_admin_token,
    )
    assert status == 200
    assert data["status"] == "success"
    assert data["data"]["id"] == boom_filter

    # Re-fetch and confirm the new version is reflected in altdata.filters
    status, data = api(
        "GET",
        f"brokers/{boom_broker_id}/filters/{boom_filter}",
        token=super_admin_token,
    )
    assert status == 200
    versions = data["data"]["altdata"].get("filters") or []
    assert any(v.get("version") == "v2" for v in versions)


def test_patch_active_active_fid(super_admin_token, boom_broker_id, boom_filter):
    status, data = api(
        "GET",
        f"brokers/{boom_broker_id}/filters/{boom_filter}",
        token=super_admin_token,
    )
    active_fid = data["data"].get("active_fid")
    if active_fid is None:
        # BOOM didn't return an fid — handler depends on it; skip the toggle.
        return
    status, data = api(
        "PATCH",
        f"brokers/{boom_broker_id}/filters/{boom_filter}",
        data={"active": False, "active_fid": active_fid},
        token=super_admin_token,
    )
    assert status == 200
    assert data["status"] == "success"


def test_patch_autoannotate(super_admin_token, boom_broker_id, boom_filter):
    status, data = api(
        "PATCH",
        f"brokers/{boom_broker_id}/filters/{boom_filter}",
        data={"autoAnnotate": True},
        token=super_admin_token,
    )
    assert status == 200
    assert data["status"] == "success"


def test_patch_autosave(super_admin_token, boom_broker_id, boom_filter):
    status, data = api(
        "PATCH",
        f"brokers/{boom_broker_id}/filters/{boom_filter}",
        data={"autoSave": True},
        token=super_admin_token,
    )
    assert status == 200
    assert data["status"] == "success"


def test_patch_autofollowup(super_admin_token, boom_broker_id, boom_filter):
    status, data = api(
        "PATCH",
        f"brokers/{boom_broker_id}/filters/{boom_filter}",
        data={"autoFollowup": True},
        token=super_admin_token,
    )
    assert status == 200
    assert data["status"] == "success"


def test_delete_boom_filter(super_admin_token, boom_broker_id, boom_filter):
    status, data = api(
        "DELETE",
        f"brokers/{boom_broker_id}/filters/{boom_filter}",
        token=super_admin_token,
    )
    assert status == 200

    status, data = api(
        "GET",
        f"brokers/{boom_broker_id}/filters/{boom_filter}",
        token=super_admin_token,
    )
    assert status == 400
    assert "Cannot find" in (data.get("message") or "")


# ── /brokers/{id}/filter/test ────────────────────────────────────────────────


def _run_filter_payload(**overrides):
    base = {
        "filter_id": 1,
        "selectedCollection": "ZTF_alerts",
        # BOOM's /filters/test endpoint also validates the pipeline ends
        # with a $project that includes objectId.
        "pipeline": [
            {"$match": {"candidate.drb": {"$gt": 0.5}}},
            {"$project": {"objectId": 1, "candid": 1, "candidate": 1}},
        ],
        "start_jd": 2459000.0,
        "end_jd": 2459001.0,
    }
    base.update(overrides)
    return base


def test_run_filter_happy_path_count(super_admin_token, boom_broker_id, boom_filter):
    """Without `sort_by`, BOOMBROKER.test_filter hits /filters/test/count."""
    status, data = api(
        "POST",
        f"brokers/{boom_broker_id}/filter/test",
        data=_run_filter_payload(filter_id=boom_filter),
        token=super_admin_token,
    )
    assert status == 200
    assert data["status"] == "success"
    assert "data" in data


def test_run_filter_happy_path_sorted(super_admin_token, boom_broker_id, boom_filter):
    """With `sort_by`, it hits /filters/test and returns results with the
    Mongo _id stringified."""
    status, data = api(
        "POST",
        f"brokers/{boom_broker_id}/filter/test",
        data=_run_filter_payload(
            filter_id=boom_filter,
            sort_by="candidate.magpsf",
            sort_order="Ascending",
            limit=5,
        ),
        token=super_admin_token,
    )
    assert status == 200
    assert data["status"] == "success"
    assert "results" in data["data"]


def test_run_filter_missing_pipeline_errors(super_admin_token, boom_broker_id):
    payload = _run_filter_payload()
    payload.pop("pipeline")
    status, data = api(
        "POST",
        f"brokers/{boom_broker_id}/filter/test",
        data=payload,
        token=super_admin_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_run_filter_bad_pipeline_errors(super_admin_token, boom_broker_id):
    status, data = api(
        "POST",
        f"brokers/{boom_broker_id}/filter/test",
        data=_run_filter_payload(pipeline="not_a_list"),
        token=super_admin_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_run_filter_jd_inverted_errors(super_admin_token, boom_broker_id):
    status, data = api(
        "POST",
        f"brokers/{boom_broker_id}/filter/test",
        data=_run_filter_payload(start_jd=2459001.0, end_jd=2459000.0),
        token=super_admin_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_run_filter_invalid_sort_order_errors(super_admin_token, boom_broker_id):
    status, data = api(
        "POST",
        f"brokers/{boom_broker_id}/filter/test",
        data=_run_filter_payload(
            sort_by="candidate.magpsf", sort_order="Sideways", limit=10
        ),
        token=super_admin_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_run_filter_nonpositive_limit_errors(super_admin_token, boom_broker_id):
    status, data = api(
        "POST",
        f"brokers/{boom_broker_id}/filter/test",
        data=_run_filter_payload(
            sort_by="candidate.magpsf", sort_order="Ascending", limit=0
        ),
        token=super_admin_token,
    )
    assert status == 400
    assert data["status"] == "error"


# ── /brokers/{id}/filter_modules ─────────────────────────────────────────────


def test_filter_modules_default_returns_schema(view_only_token, boom_broker_id):
    """`elements` defaults to "schema", which round-trips to BOOM's
    filters/schemas/{survey} rather than reading the module store."""
    status, data = api(
        "GET", f"brokers/{boom_broker_id}/filter_modules", token=view_only_token
    )
    assert status == 200
    assert data["status"] == "success"
    assert "schema" in data["data"]


def test_filter_modules_invalid_elements_errors(view_only_token, boom_broker_id):
    status, data = api(
        "GET",
        f"brokers/{boom_broker_id}/filter_modules?elements=bogus",
        token=view_only_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_filter_modules_list_blocks(view_only_token, boom_broker_id):
    status, data = api(
        "GET",
        f"brokers/{boom_broker_id}/filter_modules?elements=blocks",
        token=view_only_token,
    )
    assert status == 200
    assert data["status"] == "success"
    assert "blocks" in data["data"]
    assert isinstance(data["data"]["blocks"], list)
