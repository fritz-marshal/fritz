from skyportal.tests import api


def test_get_archive_catalog(view_only_token):
    status, data = api("GET", "archive_catalogs", token=view_only_token)
    assert status == 200
    assert data["status"] == "success"
    assert "data" in data
    assert len(data["data"]) > 0


def test_get_ztf_light_curve(view_only_token):
    status, data = api("GET", "archive_catalogs", token=view_only_token)
    catalogs = data["data"]
    ztf_sources_catalog = [catalog for catalog in catalogs if "ZTF_sources_" in catalog]
    assert len(ztf_sources_catalog) > 0
    ztf_sources_catalog = ztf_sources_catalog[0]

    # an object from Kowalski's test suite
    ra, dec = 178.9587118, -22.4106486
    radius, radius_units = 2, "arcsec"

    status, data = api(
        "GET",
        f"archive?catalog={ztf_sources_catalog}"
        f"&ra={ra}&dec={dec}"
        f"&radius={radius}&radius_units={radius_units}",
        token=view_only_token,
    )
    assert status == 200
    assert data["status"] == "success"
    assert "data" in data
    assert len(data["data"]) > 0
