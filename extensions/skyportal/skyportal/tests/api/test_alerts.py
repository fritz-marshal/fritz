import uuid
from skyportal.tests import api


def test_get_alert(view_only_token, public_source):
    status, data = api("GET", f"alerts/ztf/{public_source.id}", token=view_only_token)
    assert status == 200
    assert data["status"] == "success"
    # assert all(
    #     k in data["data"][0]
    #     for k in ["query_string", "group_id"]
    # )
