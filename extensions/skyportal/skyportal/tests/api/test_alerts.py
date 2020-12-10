from skyportal.tests import api


def test_get_alert(view_only_token, public_source):
    status, data = api("GET", f"alerts/ztf/{public_source.id}", token=view_only_token)
    assert status == 200
    assert data["status"] == "success"
    # assert all(
    #     k in data["data"][0]
    #     for k in ["query_string", "group_id"]
    # )


def test_get_alert_aux(view_only_token, public_source):
    status, data = api(
        "GET", f"alerts/ztf/{public_source.id}/aux", token=view_only_token
    )
    assert status == 200
    assert data["status"] == "success"


def test_get_alert_cutout(view_only_token, public_source):
    for cutout in ("science", "template", "difference"):
        for file_format in ("png", "fits"):
            status, data = api(
                "GET",
                f"/api/alerts/ztf/${public_source.id}/cutout"
                f"?candid=${public_source.candid}&cutout={cutout}&file_format={file_format}",
            )
            assert status == 200
            assert data["status"] == "success"
