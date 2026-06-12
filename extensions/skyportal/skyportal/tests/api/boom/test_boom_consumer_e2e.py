"""End-to-end smoke test for the BOOM Kafka consumer.

This is the one *true* end-to-end test: it publishes a synthetic Avro alert
onto the same Kafka topic the deployed BOOM consumer subscribes to, then polls
the SkyPortal API until the resulting candidate/source appears. It exercises
the real running service — Kafka delivery, ``read_avro``, ``process_record``,
the DB writes, and offset handling — rather than calling functions in-process
(see ``test_boom_consumer.py`` for the in-process version).

It is deliberately a single happy-path smoke. It skips unless the whole stack
is present, because it has several hard prerequisites:

* ``confluent_kafka`` and ``fastavro`` importable in this (skyportal) env;
* a reachable Kafka with the configured bootstrap servers
  (``services.external.boom.params.kafka``);
* the BOOM consumer actually running and subscribed to ``ZTF_alerts_results``;
* a provisioned BOOM filter (``boom_filter`` fixture) whose BOOM-side
  ``filter_id`` we put on the synthetic alert so it passes — this needs a
  seeded boom-mongo (hence ``@requires_boom_data``).

CAVEAT: the Avro schema below is reconstructed from the fields
``process_record``/``ingest_photometry_array`` read. The real BOOM producer's
schema may carry more fields; if the consumer rejects this message on a real
run, widen the schema to match the producer's writer schema (capture one from
the seed dataset). Treat this as a scaffold to validate on a live stack.
"""

import io
import time
import uuid

import pytest

from skyportal.tests import api

pytestmark = pytest.mark.requires_boom_data


# Minimal Avro schema covering the fields the BOOM consumer reads.
_ALERT_SCHEMA = {
    "type": "record",
    "name": "BoomAlertResult",
    "fields": [
        {"name": "objectId", "type": "string"},
        {"name": "survey", "type": "string"},
        {"name": "candid", "type": "long"},
        {"name": "ra", "type": "double"},
        {"name": "dec", "type": "double"},
        {
            "name": "filters",
            "type": {
                "type": "array",
                "items": {
                    "type": "record",
                    "name": "PassedFilter",
                    "fields": [
                        # BOOM filter ids are UUID strings (Filter.altdata.boom.filter_id)
                        {"name": "filter_id", "type": "string"},
                        {"name": "passed_at", "type": "long"},
                        {"name": "annotations", "type": "string"},
                    ],
                },
            },
        },
        {
            "name": "photometry",
            "type": {
                "type": "array",
                "items": {
                    "type": "record",
                    "name": "PhotPoint",
                    "fields": [
                        {"name": "origin", "type": "string"},
                        {"name": "survey", "type": "string"},
                        {"name": "programid", "type": "int"},
                        {"name": "jd", "type": "double"},
                        {"name": "band", "type": "string"},
                        {"name": "flux", "type": ["null", "double"]},
                        {"name": "flux_err", "type": "double"},
                        {"name": "ra", "type": "double"},
                        {"name": "dec", "type": "double"},
                    ],
                },
            },
            "default": [],
        },
    ],
}


def _encode_avro(record):
    import fastavro

    buf = io.BytesIO()
    fastavro.writer(buf, _ALERT_SCHEMA, [record])
    return buf.getvalue()


def _kafka_cfg():
    from baselayer.app.env import load_env

    _, cfg = load_env()
    return (cfg.get("services.external.boom.params") or {}).get("kafka") or {}


def _producer(kafka):
    from confluent_kafka import Producer

    conf = {
        "bootstrap.servers": f"{kafka.get('host', 'localhost')}:{kafka.get('port', 9092)}",
    }
    username, password = kafka.get("username"), kafka.get("password")
    if username and password:
        conf.update(
            {
                "security.protocol": "SASL_PLAINTEXT",
                "sasl.mechanism": kafka.get("sasl_mechanism", "SCRAM-SHA-512"),
                "sasl.username": username,
                "sasl.password": password,
            }
        )
    return Producer(conf)


def _boom_filter_id(skyportal_filter_id, token):
    """Read the BOOM-side filter_id the consumer maps from the SkyPortal
    filter's altdata (set when the filter was provisioned on BOOM)."""
    status, data = api("GET", f"filters/{skyportal_filter_id}", token=token)
    assert status == 200, data
    altdata = (data["data"] or {}).get("altdata") or {}
    boom = altdata.get("boom") or {}
    return boom.get("filter_id")


def test_consumer_ingests_kafka_alert(boom_filter, super_admin_token):
    pytest.importorskip("confluent_kafka")
    pytest.importorskip("fastavro")

    kafka = _kafka_cfg()
    if not kafka:
        pytest.skip("No BOOM kafka config present")

    boom_fid = _boom_filter_id(boom_filter, super_admin_token)
    if boom_fid is None:
        pytest.skip("Provisioned filter has no altdata.boom.filter_id")

    obj_id = f"ZTF_e2e_{uuid.uuid4().hex[:8]}"
    record = {
        "objectId": obj_id,
        "survey": "ZTF",
        "candid": int(time.time() * 1000),
        "ra": 234.22,
        "dec": -22.33,
        "filters": [
            {
                "filter_id": str(boom_fid),
                "passed_at": int(time.time() * 1000),
                "annotations": '{"drb": 0.99}',
            }
        ],
        "photometry": [
            {
                "origin": "Alert",
                "survey": "ZTF",
                "programid": 1,
                "jd": 2459000.5,
                "band": "ztfg",
                "flux": 1.0e4,
                "flux_err": 1.0e2,
                "ra": 234.22,
                "dec": -22.33,
            }
        ],
    }

    # Producing to Kafka is an infra precondition, not what we're testing. If
    # the broker is unreachable (it was flaky/down in some CI runs), skip rather
    # than hard-fail.
    try:
        producer = _producer(kafka)
        topic = (kafka.get("topics") or ["ZTF_alerts_results"])[0]
        producer.produce(topic, value=_encode_avro(record))
        undelivered = producer.flush(timeout=30)
        if undelivered:
            pytest.skip(
                f"Kafka did not accept the message ({undelivered} undelivered); "
                "broker not ready"
            )
    except Exception as e:
        pytest.skip(f"Could not produce to Kafka (broker not ready): {e}")

    # Poll until the consumer has created the object (or give up).
    deadline = time.time() + 120
    seen = False
    while time.time() < deadline:
        status, data = api("GET", f"sources/{obj_id}", token=super_admin_token)
        if status == 200 and data.get("status") == "success":
            seen = True
            break
        # candidates endpoint as a fallback signal that the obj/candidate exists
        status, data = api(
            "GET", "candidates", params={"objectID": obj_id}, token=super_admin_token
        )
        if (
            status == 200
            and data.get("status") == "success"
            and data["data"].get("candidates")
        ):
            seen = True
            break
        time.sleep(5)

    assert seen, (
        f"BOOM consumer did not ingest the Kafka alert for {obj_id} within the "
        "timeout (is the consumer running and subscribed?)."
    )
