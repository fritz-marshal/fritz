from skyportal.tests import api

SURVEY = "ZTF"
OID = "ZTF20aaelulu"
CANDID = 1105522281015015000


def _cutout_url(query: str) -> str:
    return f"boom/surveys/{SURVEY}/alerts/cutouts?{query}"


def test_get_cutout_fits_by_candid(view_only_token):
    status, data = api(
        "GET", _cutout_url(f"candid={CANDID}&file_format=fits"), token=view_only_token
    )
    assert status == 200
    assert data["status"] == "success"
    assert isinstance(data["data"], dict)
    for key in ("cutoutScience", "cutoutTemplate", "cutoutDifference"):
        assert key in data["data"]


def test_get_cutout_fits_by_object_id(view_only_token):
    status, data = api(
        "GET",
        _cutout_url(f"objectId={OID}&which=last&file_format=fits"),
        token=view_only_token,
    )
    assert status == 200
    assert data["status"] == "success"
    assert isinstance(data["data"], dict)


def test_get_cutout_png_all_types(view_only_token):
    for cutout in ("science", "template", "difference"):
        response = api(
            "GET",
            _cutout_url(f"candid={CANDID}&file_format=png&cutout={cutout}"),
            token=view_only_token,
            raw_response=True,
        )
        assert response.status_code == 200
        assert response.headers.get("Content-Type") == "image/png"
        assert len(response.content) > 0


def test_get_cutout_no_identifier_errors(view_only_token):
    status, data = api("GET", _cutout_url("file_format=fits"), token=view_only_token)
    assert status == 400
    assert data["status"] == "error"


def test_get_cutout_both_identifiers_errors(view_only_token):
    status, data = api(
        "GET",
        _cutout_url(f"candid={CANDID}&objectId={OID}&file_format=fits"),
        token=view_only_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_get_cutout_png_without_cutout_param_errors(view_only_token):
    status, data = api(
        "GET",
        _cutout_url(f"candid={CANDID}&file_format=png"),
        token=view_only_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_get_cutout_invalid_cutout_errors(view_only_token):
    status, data = api(
        "GET",
        _cutout_url(f"candid={CANDID}&file_format=png&cutout=bogus"),
        token=view_only_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_get_cutout_invalid_candid_errors(view_only_token):
    status, data = api(
        "GET",
        _cutout_url("candid=not_an_int&file_format=fits"),
        token=view_only_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_get_cutout_invalid_file_format_errors(view_only_token):
    status, data = api(
        "GET",
        _cutout_url(f"candid={CANDID}&file_format=jpeg"),
        token=view_only_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_get_cutout_invalid_which_errors(view_only_token):
    status, data = api(
        "GET",
        _cutout_url(f"objectId={OID}&which=middle&file_format=fits"),
        token=view_only_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_post_cutout_requires_object_id(upload_data_token):
    status, data = api(
        "POST",
        f"boom/surveys/{SURVEY}/alerts/cutouts",
        data={},
        token=upload_data_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_post_cutout_unknown_object_errors(upload_data_token):
    status, data = api(
        "POST",
        f"boom/surveys/{SURVEY}/alerts/cutouts",
        data={"objectId": "ZTF99zzzzzz", "which": "last"},
        token=upload_data_token,
    )
    assert status == 400
    assert data["status"] == "error"
    # Handler returns "Object 'X' not found. Save it as a source first."
    assert "not found" in (data.get("message") or "").lower()
