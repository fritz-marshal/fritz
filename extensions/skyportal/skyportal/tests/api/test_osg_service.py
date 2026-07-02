"""Tests for the `osg` external analysis service (fiesta on OSPool).

Two layers:

* config-shape checks that the service is wired into the Fritz config the way
  baselayer's setup_services and the plugin's own load_plugin_config expect
  (repo + rev + params), mirroring how `boom` is configured; and
* a mocked end-to-end round-trip. The real plugin submits to OSG/HTCondor,
  which isn't available in CI, so we stand up a tiny local webhook in place of
  the plugin: it accepts SkyPortal's POST (like the plugin's fire-and-forget
  batch path) and asynchronously POSTs a fiesta-shaped result back to the
  callback_url. This exercises the registration -> submit -> callback -> stored
  result contract end to end. Mirrors skyportal core's analysis-service test.
"""

import json
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, HTTPServer

import requests

from baselayer.app.env import load_env
from skyportal.tests import api

_, cfg = load_env()


# --- config-shape ---------------------------------------------------------------


def test_osg_external_service_registered():
    external = cfg["services.external"]
    assert "osg" in external, "osg missing from services.external"
    osg = external["osg"]
    assert osg["repo"].endswith("osg-skyportal-plugin.git"), osg["repo"]
    assert osg.get("rev")


def test_osg_params_shape():
    # The plugin reads this exact dotted key; if it's missing it crashes on boot.
    params = cfg["services.external.osg.params"]

    for block in (
        "listener",
        "htcondor",
        "defaults",
        "poller",
        "batch",
        "caps",
        "osdf",
        "auth",
    ):
        assert block in params, f"missing osg params block: {block}"

    for key in ("collector", "schedd", "scitoken_path", "project_name"):
        assert key in params["htcondor"], f"missing htcondor.{key}"

    assert params["defaults"].get("singularity_image")
    assert "incoming_bearer_token" in params["auth"]


# --- mocked end-to-end round-trip -----------------------------------------------


def _mock_osg_plugin(result_bundle, delay=2.0):
    """Build a handler that stands in for the osg plugin's /analysis/<name>.

    On POST it replies 200 {status: pending} (the plugin's batch fire-and-forget
    response) and, after `delay` seconds, POSTs `result_bundle` to the request's
    callback_url -- emulating a finished fiesta fit coming back from OSG. The
    delay lets SkyPortal finish marking the analysis `pending` before the
    callback lands, avoiding a status race.
    """

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):  # silence the default stderr logging
            pass

        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "pending", "queued": True}).encode())

            callback_url = body.get("callback_url")
            if callback_url:

                def _fire():
                    time.sleep(delay)
                    requests.post(callback_url, json=result_bundle, timeout=30)

                threading.Thread(target=_fire, daemon=True).start()

    return Handler


def test_osg_analysis_service_roundtrip(
    analysis_service_token, analysis_token, public_group, public_source
):
    """Register a fiesta_osg-style AnalysisService pointed at a local stand-in
    for the osg plugin, run it on a source, and confirm the fiesta-shaped result
    round-trips back through SkyPortal's webhook and is stored."""

    result_bundle = {
        "status": "success",
        "message": "fit complete",
        "analysis": {
            "results": {
                "format": "json",
                "data": {"model_name": "Bu2019lm", "n_detections": 5},
            },
            "plots": [],
        },
    }

    server = HTTPServer(("localhost", 0), _mock_osg_plugin(result_bundle))
    port = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        name = f"fiesta_osg_{uuid.uuid4().hex[:8]}"
        post_data = {
            "name": name,
            "display_name": "Fiesta (OSG)",
            "description": "fiesta light-curve fitting on OSG (mocked in test)",
            "version": "1.0",
            "contact_name": "Tester",
            "contact_email": "t@example.com",
            "url": f"http://localhost:{port}/analysis/{name}",
            "authentication_type": "none",
            "analysis_type": "lightcurve_fitting",
            "input_data_types": ["photometry"],
            "timeout": 60,
            "group_ids": [public_group.id],
        }
        status, data = api(
            "POST", "analysis_service", data=post_data, token=analysis_service_token
        )
        assert status == 200, data
        analysis_service_id = data["data"]["id"]

        status, data = api(
            "POST",
            f"obj/{public_source.id}/analysis/{analysis_service_id}",
            token=analysis_token,
        )
        assert status == 200, data
        analysis_id = data["data"]["id"]

        analysis_status = "queued"
        params = {"includeAnalysisData": True}
        for _ in range(20):
            status, data = api(
                "GET",
                f"obj/analysis/{analysis_id}",
                token=analysis_token,
                params=params,
            )
            assert status == 200, data
            analysis_status = data["data"]["status"]
            if analysis_status not in ("queued", "pending"):
                break
            time.sleep(3)
        else:
            assert False, (
                f"analysis never completed: {data['data'].get('status_message')}"
            )

        assert analysis_status == "completed", data["data"].get("status_message")
        assert data["data"]["status_message"] == "fit complete"
        stored = data["data"]["data"]["results"]["data"]
        assert stored["model_name"] == "Bu2019lm"
    finally:
        server.shutdown()
        server.server_close()
