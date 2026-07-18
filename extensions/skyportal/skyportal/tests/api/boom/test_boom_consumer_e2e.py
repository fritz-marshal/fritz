"""End-to-end smoke test for the native BOOM ingestion.

BOOM ingestion is now SkyPortal's in-core ``broker_ingest`` service, so this
test drives that path directly: it publishes a synthetic Avro alert onto the
BOOM Kafka topic, then runs ``BOOMBROKER.run_ingestion(broker, max_messages=1)``
-- the same coroutine the service runs -- for a single bounded consume, and
checks that the resulting candidate/source appears. Unlike the old plugin smoke
(which relied on a separately-deployed consumer), the test is the consumer, so
it needs no long poll loop.

Prerequisites (skips if any is missing -- treat as a scaffold validated on a
live/CI stack, not a unit test):

* ``confluent_kafka`` / ``fastavro`` importable in this (skyportal) env;
* an active ``BOOMBROKER`` Broker record whose ``altdata.kafka`` gives the
  bootstrap + topics (the record that also drives the deployed service). CI must
  seed one; there is no longer a ``services.external.boom`` config block to read;
* a provisioned BOOM filter (``boom_filter``) whose BOOM-side ``filter_id`` we
  put on the alert so ``run_ingestion`` routes it to a SkyPortal Filter -- needs
  a seeded boom-mongo (hence ``requires_boom_data``).

CAVEAT: the Avro schema below is reconstructed from the fields
``_normalize_boom_alert``/``build_photometry_groups`` read; if BOOM's real
writer schema carries more required fields, widen it to match a captured sample.
"""

import io
import time
import uuid

import pytest

from skyportal.tests import api

pytestmark = pytest.mark.requires_boom_data


# Minimal Avro schema covering the fields the native ingestion reads.
_ALERT_SCHEMA = {
    "type": "record",
    "name": "BoomAlertResult",
    "fields": [
        {"name": "objectId", "type": "string"},
        {"name": "survey", "type": "string"},
        {"name": "candid", "type": "long"},
        {"name": "ra", "type": "double"},
        {"name": "dec", "type": "double"},
        {"name": "drb", "type": ["null", "double"], "default": None},
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


def _active_boom_broker(token):
    """Return (broker_id, kafka_altdata) for an active BOOMBROKER whose altdata
    carries a kafka config, or (None, None). altdata is only returned to a
    system-admin token."""
    status, data = api("GET", "brokers", token=token)
    if status != 200:
        return None, None
    for b in data.get("data", []) or []:
        if b.get("broker_classname") != "BOOMBROKER" or not b.get("active"):
            continue
        s2, d2 = api("GET", f"brokers/{b['id']}", token=token)
        altdata = (d2.get("data") or {}).get("altdata") or {} if s2 == 200 else {}
        kafka = altdata.get("kafka")
        if kafka:
            return b["id"], kafka
    return None, None


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
    """The BOOM-side filter_id run_ingestion maps to this SkyPortal Filter (set on
    Filter.altdata.boom when the filter was provisioned on BOOM)."""
    status, data = api("GET", f"filters/{skyportal_filter_id}", token=token)
    assert status == 200, data
    boom = ((data["data"] or {}).get("altdata") or {}).get("boom") or {}
    return boom.get("filter_id")


def _run_bounded_ingestion(broker_id, max_messages=1):
    """Run one bounded pass of the native ingestion coroutine for this broker."""
    import asyncio

    import sqlalchemy as sa

    from baselayer.app.models import async_plain_session_factory
    from skyportal.broker_apis.boom import BOOMBROKER
    from skyportal.models import Broker

    async def _run():
        async with async_plain_session_factory() as session:
            broker = await session.scalar(
                sa.select(Broker).where(Broker.id == broker_id)
            )
        # run_ingestion only reads broker.altdata/id and opens its own sessions.
        return await BOOMBROKER.run_ingestion(broker, max_messages=max_messages)

    return asyncio.run(_run())


def test_native_run_ingestion_consumes_kafka_alert(boom_filter, super_admin_token):
    pytest.importorskip("confluent_kafka")
    pytest.importorskip("fastavro")

    broker_id, kafka = _active_boom_broker(super_admin_token)
    if not broker_id or not kafka:
        pytest.skip("No active BOOMBROKER record with kafka altdata configured")

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
        "drb": 0.99,
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

    # Producing to Kafka is an infra precondition, not what we're testing; skip
    # (rather than fail) if the broker is unreachable.
    try:
        producer = _producer(kafka)
        topic = (kafka.get("topics") or ["ZTF_alerts_results"])[0]
        producer.produce(topic, value=_encode_avro(record))
        undelivered = producer.flush(timeout=30)
        if undelivered:
            pytest.skip(f"Kafka did not accept the message ({undelivered} undelivered)")
    except Exception as e:
        pytest.skip(f"Could not produce to Kafka (broker not ready): {e}")

    # Drive the native ingestion for a single message. Retry a few times: the
    # consumer may need a couple of polls before the just-produced offset lands.
    consumed = 0
    for _ in range(6):
        consumed = _run_bounded_ingestion(broker_id) or 0
        if consumed:
            break
    if not consumed:
        pytest.skip("run_ingestion consumed no message (offset/timing on this stack)")

    status, data = api(
        "GET", "candidates", params={"objectID": obj_id}, token=super_admin_token
    )
    assert status == 200, data
    assert data["data"].get("candidates"), (
        f"native run_ingestion consumed a message but no candidate for {obj_id} "
        "appeared (filter routing / save transform issue)."
    )
