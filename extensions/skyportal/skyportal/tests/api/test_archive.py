from skyportal.tests import api
from baselayer.app.env import load_env

_, cfg = load_env()


def test_get_archive_catalog(view_only_token):
    status, data = api("GET", "archive/catalogs", token=view_only_token)
    assert status == 200
    assert data["status"] == "success"
    assert "data" in data
    assert len(data["data"]) > 0


def test_cross_match(view_only_token):
    # an object from Kowalski's test suite
    ra, dec = 0.00017675657877, 80.01266744553764
    radius, radius_units = 2, "arcsec"

    status, data = api(
        "GET",
        f"archive/cross_match?ra={ra}&dec={dec}"
        f"&radius={radius}&radius_units={radius_units}",
        token=view_only_token,
    )
    print(status, data)
    assert status == 200
    assert data["status"] == "success"
    assert "data" in data
    assert len(data["data"]) > 0


def test_get_ztf_light_curve(view_only_token):
    status, data = api("GET", "archive/catalogs", token=view_only_token)
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


def test_post_ztf_light_curve(super_admin_token):
    status, data = api("GET", "archive/catalogs", token=super_admin_token)
    catalogs = data["data"]
    ztf_sources_catalog = [catalog for catalog in catalogs if "ZTF_sources_" in catalog]
    assert len(ztf_sources_catalog) > 0
    ztf_sources_catalog = ztf_sources_catalog[0]

    # get Sitewide Group id
    status, data = api("GET", "groups/public", token=super_admin_token)
    assert data["status"] == "success"
    assert len(data["data"]) > 0
    group_id = data["data"]["id"]

    # an object from Kowalski's test suite
    ra, dec = 178.9587118, -22.4106486
    # ra, dec = 3.0618363, -22.4289153
    radius, radius_units = 2, "arcsec"

    status, data = api(
        "GET",
        f"archive?catalog={ztf_sources_catalog}"
        f"&ra={ra}&dec={dec}"
        f"&radius={radius}&radius_units={radius_units}",
        token=super_admin_token,
    )
    assert status == 200
    assert data["status"] == "success"
    assert "data" in data
    assert len(data["data"]) > 0

    # post to Sitewide group
    light_curve_ids = [light_curve["_id"] for light_curve in data["data"]]
    status, data = api(
        "POST",
        "archive",
        data={
            "obj_id": None,
            "group_ids": [group_id],
            "catalog": ztf_sources_catalog,
            "light_curve_ids": light_curve_ids,
        },
        token=super_admin_token,
    )
    assert status == 200
    assert data["status"] == "success"
    assert "data" in data
    assert "obj_id" in data["data"]

    # attempt posting to the newly created obj_id
    status, data = api(
        "POST",
        "archive",
        data={
            "obj_id": data["data"]["obj_id"],
            "group_ids": [group_id],
            "catalog": ztf_sources_catalog,
            "light_curve_ids": light_curve_ids,
        },
        token=super_admin_token,
    )
    assert status == 200
    assert data["status"] == "success"
    assert "data" in data
    assert "obj_id" in data["data"]

    # posting with obj_id=None would attempt creating
    # an Obj with an already existing name
    # and should thus raise an error:
    status, data = api(
        "POST",
        "archive",
        data={
            "obj_id": None,
            "group_ids": [group_id],
            "catalog": ztf_sources_catalog,
            "light_curve_ids": light_curve_ids,
        },
        token=super_admin_token,
    )
    assert status == 400
    assert data["status"] == "error"
