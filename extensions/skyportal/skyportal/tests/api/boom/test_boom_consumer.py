"""Per-record transform tests for the native BOOM ingestion path.

BOOM alert ingestion is now handled by SkyPortal's in-core ``broker_ingest``
service (``skyportal/broker_apis/boom.py``), which replaced the old
boom-skyportal-plugin Kafka listener. For each decoded Avro record the native
``BOOMBROKER.run_ingestion`` loop calls ``_normalize_boom_alert`` to convert
BOOM's native ``photometry[]`` (flux in nJy, with a sentinel for "no value")
into the standard ``candidate`` + ``prv_candidates`` shape the shared save
transform (``save_object_as_candidate``) consumes.

These tests exercise that transform directly on synthetic records -- the native
replacement for the plugin's ``process_record`` parsing coverage. They are pure
and deterministic (no Kafka, no DB). The DB-write half (Obj/Candidate/Photometry
from the normalized shape) is owned and tested by SkyPortal core; the full
Kafka -> DB path is smoke-tested in ``test_boom_consumer_e2e.py``.
"""

from skyportal.broker_apis.boom import _BOOM_SENTINEL, _normalize_boom_alert


def _photometry_point(**overrides):
    point = {
        "origin": "Alert",
        "survey": "ZTF",
        "programid": 1,
        "jd": 2459000.5,
        "band": "ztfg",
        "flux": 1.0e4,  # nJy
        "flux_err": 1.0e2,
        "ra": 234.22,
        "dec": -22.33,
    }
    point.update(overrides)
    return point


def _record(photometry, *, obj_id="ZTF_boomnorm", candid=10_000_001):
    return {
        "objectId": obj_id,
        "survey": "ZTF",
        "candid": candid,
        "ra": 234.22,
        "dec": -22.33,
        "drb": 0.99,
        "photometry": photometry,
    }


def test_normalize_detection_maps_flux_and_candidate():
    """A detection becomes a prv_candidates point (flux -> psfFlux in nJy, the
    shared save scales to Jy), and candidate ra/dec/drb come off the record."""
    data = _normalize_boom_alert(_record([_photometry_point()]))

    assert data["objectId"] == "ZTF_boomnorm"
    assert data["candid"] == 10_000_001
    assert data["candidate"] == {"ra": 234.22, "dec": -22.33, "drb": 0.99}

    assert len(data["prv_candidates"]) == 1
    p = data["prv_candidates"][0]
    assert p["psfFlux"] == 1.0e4
    assert p["psfFluxErr"] == 1.0e2
    assert p["band"] == "ztfg"
    assert p["jd"] == 2459000.5
    assert p["programid"] == 1


def test_normalize_drops_point_with_sentinel_flux_err():
    """A point whose flux_err is the BOOM sentinel carries no usable uncertainty
    and is dropped entirely (can't be a detection or a limit)."""
    data = _normalize_boom_alert(
        _record(
            [
                _photometry_point(),
                _photometry_point(jd=2459002.5, flux_err=_BOOM_SENTINEL),
            ]
        )
    )
    assert len(data["prv_candidates"]) == 1
    assert data["prv_candidates"][0]["jd"] == 2459000.5


def test_normalize_sentinel_flux_is_kept_as_nondetection():
    """A point with a real flux_err but sentinel flux is a non-detection: kept,
    with psfFlux nulled (the save transform reads it as an upper limit)."""
    data = _normalize_boom_alert(
        _record([_photometry_point(flux=_BOOM_SENTINEL, jd=2459003.5)])
    )
    assert len(data["prv_candidates"]) == 1
    p = data["prv_candidates"][0]
    assert p["psfFlux"] is None
    assert p["psfFluxErr"] == 1.0e2


def test_normalize_no_photometry_yields_empty_prv():
    """A record without photometry normalizes to an empty light curve rather
    than raising (the ingestion loop must not crash on a bare alert)."""
    data = _normalize_boom_alert(_record([]))
    assert data["prv_candidates"] == []
    assert data["candidate"]["drb"] == 0.99
