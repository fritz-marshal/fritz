from skyportal.tests import api


def test_get_archive_catalogs(view_only_token):
    status, data = api("GET", "boom/archive/catalogs", token=view_only_token)
    assert status == 200
    assert data["status"] == "success"
    assert isinstance(data["data"], list)
    # Reference catalogs only — survey collections must be stripped out.
    for name in data["data"]:
        assert not name.startswith(("ZTF_", "LSST_", "PTF_", "PGIR_", "WNTR_"))


def test_cross_match_happy_path(view_only_token):
    ra, dec = 0.00017675657877, 80.01266744553764
    status, data = api(
        "GET",
        f"boom/archive/cross_match?ra={ra}&dec={dec}&radius=2&radius_units=arcsec",
        token=view_only_token,
    )
    assert status == 200
    assert data["status"] == "success"
    assert isinstance(data["data"], dict)


def test_cross_match_missing_params_errors(view_only_token):
    status, data = api("GET", "boom/archive/cross_match?ra=10", token=view_only_token)
    assert status == 400
    assert data["status"] == "error"


def test_cross_match_invalid_radius_units_errors(view_only_token):
    status, data = api(
        "GET",
        "boom/archive/cross_match?ra=10&dec=20&radius=1&radius_units=parsecs",
        token=view_only_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_cross_match_non_float_errors(view_only_token):
    status, data = api(
        "GET",
        "boom/archive/cross_match?ra=abc&dec=20&radius=1&radius_units=arcsec",
        token=view_only_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_cross_match_ra_out_of_range_errors(view_only_token):
    status, data = api(
        "GET",
        "boom/archive/cross_match?ra=400&dec=20&radius=1&radius_units=arcsec",
        token=view_only_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_cross_match_dec_out_of_range_errors(view_only_token):
    status, data = api(
        "GET",
        "boom/archive/cross_match?ra=10&dec=120&radius=1&radius_units=arcsec",
        token=view_only_token,
    )
    assert status == 400
    assert data["status"] == "error"


def test_cross_match_radius_too_large_errors(view_only_token):
    status, data = api(
        "GET",
        "boom/archive/cross_match?ra=10&dec=20&radius=2&radius_units=deg",
        token=view_only_token,
    )
    assert status == 400
    assert data["status"] == "error"
