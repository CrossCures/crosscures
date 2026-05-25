"""Wearable / HealthKit / Health Connect ingest + retrieval routes.

Patient-facing routes ingest batched samples uploaded from the mobile app
and serve dashboards. Physician-facing routes serve the same data scoped
to linked patients.
"""
import json
from datetime import datetime, timedelta, date
from typing import List, Optional, Dict, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from crosscures_v2.database import get_db
from crosscures_v2.db_models import (
    UserDB, WearableSampleDB, WorkoutSampleDB, SleepSegmentDB,
    PhysicianPatientLinkDB,
)
from crosscures_v2.consent.models import ConsentAction
from crosscures_v2.consent.store import ConsentStore
from crosscures_v2.events import bus as event_bus
from crosscures_v2.events.models import EventType, EventSource
from crosscures_v2.api.auth import require_patient, require_physician


router = APIRouter(prefix="/v1", tags=["wearables"])


MAX_BATCH = 5000

# Canonical quantity types we will surface in /summary "latest" and "today".
LATEST_TYPES = (
    "heart_rate", "resting_heart_rate", "heart_rate_variability_sdnn",
    "oxygen_saturation", "respiratory_rate", "body_mass",
    "body_temperature", "blood_glucose",
)
TODAY_SUM_TYPES = (
    "step_count", "distance_walking_running", "active_energy_burned",
    "basal_energy_burned", "flights_climbed", "water_intake",
    "dietary_energy_consumed", "mindful_minutes",
)


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class WearableSampleIn(BaseModel):
    sample_id: str
    quantity_type: str
    value: float
    unit: str
    start_date: datetime
    end_date: datetime
    source_name: Optional[str] = None
    deleted: bool = False  # if true, sample_id is purged instead of inserted


class WearableSamplesBatch(BaseModel):
    batch_id: str
    sync_reason: Literal["initial", "foreground", "background", "manual"] = "manual"
    samples: List[WearableSampleIn] = Field(default_factory=list)


class WorkoutIn(BaseModel):
    sample_id: str
    workout_type: str
    start_date: datetime
    end_date: datetime
    duration_seconds: int
    total_energy_kcal: Optional[float] = None
    total_distance_m: Optional[float] = None
    average_heart_rate: Optional[float] = None
    source_name: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class WorkoutsBatch(BaseModel):
    batch_id: str
    workouts: List[WorkoutIn] = Field(default_factory=list)


class SleepSegmentIn(BaseModel):
    sample_id: str
    session_id: str
    stage: str  # in_bed | asleep_core | asleep_deep | asleep_rem | awake | asleep_unspecified
    start_date: datetime
    end_date: datetime
    source_name: Optional[str] = None


class SleepBatch(BaseModel):
    batch_id: str
    segments: List[SleepSegmentIn] = Field(default_factory=list)


class IngestResult(BaseModel):
    accepted: int
    duplicates: int
    rejected: int
    deleted: int = 0


# ── Helpers ───────────────────────────────────────────────────────────────────

def _bulk_insert(db: Session, rows: list, sample_id_attr: str = "sample_id") -> tuple[int, int]:
    """Try a single bulk add; on IntegrityError fall back to per-row insert.

    Returns (accepted, duplicates).
    """
    if not rows:
        return 0, 0
    try:
        db.add_all(rows)
        db.commit()
        return len(rows), 0
    except IntegrityError:
        db.rollback()

    accepted = 0
    duplicates = 0
    for row in rows:
        try:
            db.add(row)
            db.commit()
            accepted += 1
        except IntegrityError:
            db.rollback()
            duplicates += 1
    return accepted, duplicates


def _verify_patient_link(physician_id: str, patient_id: str, db: Session):
    link = db.query(PhysicianPatientLinkDB).filter(
        PhysicianPatientLinkDB.physician_id == physician_id,
        PhysicianPatientLinkDB.patient_id == patient_id,
    ).first()
    if not link:
        raise HTTPException(status_code=403, detail="Patient not linked to this physician")


def _parse_iso(value: Optional[str]) -> Optional[datetime]:
    if value is None:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid datetime: {value}")


# ── Ingest: scalar samples ────────────────────────────────────────────────────

@router.post("/patient/wearables/samples", status_code=201, response_model=IngestResult)
def ingest_samples(
    batch: WearableSamplesBatch,
    user: UserDB = Depends(require_patient),
    db: Session = Depends(get_db),
):
    ConsentStore(db).require(user.id, ConsentAction.WEARABLE_SYNC)
    if len(batch.samples) > MAX_BATCH:
        raise HTTPException(status_code=413, detail=f"Batch too large (max {MAX_BATCH})")

    # Partition into inserts vs deletes
    to_insert: list[WearableSampleDB] = []
    delete_ids: list[str] = []
    rejected = 0
    for s in batch.samples:
        if s.deleted:
            delete_ids.append(s.sample_id)
            continue
        if s.end_date < s.start_date:
            rejected += 1
            continue
        to_insert.append(WearableSampleDB(
            sample_id=s.sample_id,
            patient_id=user.id,
            quantity_type=s.quantity_type,
            value=s.value,
            unit=s.unit,
            start_date=s.start_date,
            end_date=s.end_date,
            source_name=s.source_name,
        ))

    accepted, duplicates = _bulk_insert(db, to_insert)

    deleted = 0
    if delete_ids:
        q = db.query(WearableSampleDB).filter(
            WearableSampleDB.patient_id == user.id,
            WearableSampleDB.sample_id.in_(delete_ids),
        )
        deleted = q.delete(synchronize_session=False)
        db.commit()

    types = sorted({s.quantity_type for s in batch.samples})
    event_bus.emit(
        event_bus.make_event(
            EventType.WEARABLE_SYNC_COMPLETED,
            user.id,
            EventSource.MOBILE,
            payload={
                "shape": "samples",
                "accepted": accepted,
                "duplicates": duplicates,
                "deleted": deleted,
                "types": types,
                "sync_reason": batch.sync_reason,
            },
            idempotency_key=f"samples:{batch.batch_id}",
        ),
        db,
    )
    return IngestResult(accepted=accepted, duplicates=duplicates, rejected=rejected, deleted=deleted)


@router.post("/patient/wearables/workouts", status_code=201, response_model=IngestResult)
def ingest_workouts(
    batch: WorkoutsBatch,
    user: UserDB = Depends(require_patient),
    db: Session = Depends(get_db),
):
    ConsentStore(db).require(user.id, ConsentAction.WEARABLE_SYNC)
    if len(batch.workouts) > MAX_BATCH:
        raise HTTPException(status_code=413, detail=f"Batch too large (max {MAX_BATCH})")

    rows: list[WorkoutSampleDB] = []
    rejected = 0
    for w in batch.workouts:
        if w.end_date < w.start_date or w.duration_seconds < 0:
            rejected += 1
            continue
        rows.append(WorkoutSampleDB(
            sample_id=w.sample_id,
            patient_id=user.id,
            workout_type=w.workout_type,
            start_date=w.start_date,
            end_date=w.end_date,
            duration_seconds=w.duration_seconds,
            total_energy_kcal=w.total_energy_kcal,
            total_distance_m=w.total_distance_m,
            average_heart_rate=w.average_heart_rate,
            source_name=w.source_name,
            metadata_json=json.dumps(w.metadata) if w.metadata else None,
        ))
    accepted, duplicates = _bulk_insert(db, rows)
    event_bus.emit(
        event_bus.make_event(
            EventType.WEARABLE_SYNC_COMPLETED, user.id, EventSource.MOBILE,
            payload={"shape": "workouts", "accepted": accepted, "duplicates": duplicates},
            idempotency_key=f"workouts:{batch.batch_id}",
        ), db,
    )
    return IngestResult(accepted=accepted, duplicates=duplicates, rejected=rejected)


@router.post("/patient/wearables/sleep", status_code=201, response_model=IngestResult)
def ingest_sleep(
    batch: SleepBatch,
    user: UserDB = Depends(require_patient),
    db: Session = Depends(get_db),
):
    ConsentStore(db).require(user.id, ConsentAction.WEARABLE_SYNC)
    if len(batch.segments) > MAX_BATCH:
        raise HTTPException(status_code=413, detail=f"Batch too large (max {MAX_BATCH})")

    rows: list[SleepSegmentDB] = []
    rejected = 0
    for s in batch.segments:
        if s.end_date < s.start_date:
            rejected += 1
            continue
        rows.append(SleepSegmentDB(
            sample_id=s.sample_id,
            patient_id=user.id,
            session_id=s.session_id,
            stage=s.stage,
            start_date=s.start_date,
            end_date=s.end_date,
            source_name=s.source_name,
        ))
    accepted, duplicates = _bulk_insert(db, rows)
    event_bus.emit(
        event_bus.make_event(
            EventType.WEARABLE_SYNC_COMPLETED, user.id, EventSource.MOBILE,
            payload={"shape": "sleep", "accepted": accepted, "duplicates": duplicates},
            idempotency_key=f"sleep:{batch.batch_id}",
        ), db,
    )
    return IngestResult(accepted=accepted, duplicates=duplicates, rejected=rejected)


# ── Purge ─────────────────────────────────────────────────────────────────────

def purge_wearable_data(patient_id: str, db: Session) -> dict:
    """Delete all wearable rows for a patient. Used by consent revoke."""
    samples_deleted = db.query(WearableSampleDB).filter(
        WearableSampleDB.patient_id == patient_id,
    ).delete(synchronize_session=False)
    workouts_deleted = db.query(WorkoutSampleDB).filter(
        WorkoutSampleDB.patient_id == patient_id,
    ).delete(synchronize_session=False)
    sleep_deleted = db.query(SleepSegmentDB).filter(
        SleepSegmentDB.patient_id == patient_id,
    ).delete(synchronize_session=False)
    db.commit()
    return {
        "samples_deleted": samples_deleted,
        "workouts_deleted": workouts_deleted,
        "sleep_segments_deleted": sleep_deleted,
    }


@router.delete("/patient/wearables/samples")
def delete_all_samples(
    user: UserDB = Depends(require_patient),
    db: Session = Depends(get_db),
):
    counts = purge_wearable_data(user.id, db)
    event_bus.emit(
        event_bus.make_event(
            EventType.WEARABLE_DATA_PURGED, user.id, EventSource.MOBILE,
            payload={"trigger": "manual_delete", **counts},
        ), db,
    )
    return counts


# ── Retrieval helpers ─────────────────────────────────────────────────────────

def _build_summary(patient_id: str, db: Session) -> dict:
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)

    latest: dict = {}
    for qt in LATEST_TYPES:
        row = db.query(WearableSampleDB).filter(
            WearableSampleDB.patient_id == patient_id,
            WearableSampleDB.quantity_type == qt,
        ).order_by(WearableSampleDB.end_date.desc()).first()
        if row:
            latest[qt] = {
                "value": row.value,
                "unit": row.unit,
                "recorded_at": row.end_date.isoformat(),
                "source": row.source_name,
            }

    today: dict = {}
    for qt in TODAY_SUM_TYPES:
        total = db.query(func.coalesce(func.sum(WearableSampleDB.value), 0.0)).filter(
            WearableSampleDB.patient_id == patient_id,
            WearableSampleDB.quantity_type == qt,
            WearableSampleDB.start_date >= today_start,
        ).scalar()
        if total:
            today[qt] = float(total)

    # Last night's sleep: most recent sleep session whose start_date >= 24h ago
    last_session_row = db.query(SleepSegmentDB).filter(
        SleepSegmentDB.patient_id == patient_id,
        SleepSegmentDB.start_date >= now - timedelta(hours=36),
    ).order_by(SleepSegmentDB.start_date.desc()).first()

    last_sleep = None
    if last_session_row:
        session_id = last_session_row.session_id
        segs = db.query(SleepSegmentDB).filter(
            SleepSegmentDB.patient_id == patient_id,
            SleepSegmentDB.session_id == session_id,
        ).order_by(SleepSegmentDB.start_date.asc()).all()
        stages: dict = {}
        for seg in segs:
            mins = (seg.end_date - seg.start_date).total_seconds() / 60.0
            stages[seg.stage] = stages.get(seg.stage, 0.0) + mins
        total_minutes = sum(v for k, v in stages.items() if k != "awake" and k != "in_bed")
        last_sleep = {
            "session_id": session_id,
            "session_start": segs[0].start_date.isoformat() if segs else None,
            "session_end": segs[-1].end_date.isoformat() if segs else None,
            "total_minutes": round(total_minutes, 1),
            "stages": {k: round(v, 1) for k, v in stages.items()},
        }

    recent_workouts = db.query(WorkoutSampleDB).filter(
        WorkoutSampleDB.patient_id == patient_id,
        WorkoutSampleDB.start_date >= now - timedelta(days=7),
    ).order_by(WorkoutSampleDB.start_date.desc()).limit(10).all()

    return {
        "as_of": now.isoformat(),
        "latest": latest,
        "today": today,
        "last_night_sleep": last_sleep,
        "recent_workouts": [
            {
                "sample_id": w.sample_id,
                "workout_type": w.workout_type,
                "start_date": w.start_date.isoformat(),
                "duration_seconds": w.duration_seconds,
                "total_energy_kcal": w.total_energy_kcal,
                "total_distance_m": w.total_distance_m,
                "source": w.source_name,
            }
            for w in recent_workouts
        ],
    }


def _build_series(
    patient_id: str,
    quantity_type: str,
    frm: datetime,
    to: datetime,
    bucket: Literal["hour", "day"],
    db: Session,
) -> dict:
    rows = db.query(WearableSampleDB).filter(
        WearableSampleDB.patient_id == patient_id,
        WearableSampleDB.quantity_type == quantity_type,
        WearableSampleDB.start_date >= frm,
        WearableSampleDB.start_date <= to,
    ).order_by(WearableSampleDB.start_date.asc()).all()

    buckets: dict[str, dict[str, float]] = {}
    unit = None
    for r in rows:
        if unit is None:
            unit = r.unit
        if bucket == "hour":
            key = r.start_date.replace(minute=0, second=0, microsecond=0).isoformat()
        else:
            key = r.start_date.date().isoformat()
        b = buckets.setdefault(key, {"sum": 0.0, "min": r.value, "max": r.value, "count": 0})
        b["sum"] += r.value
        b["min"] = min(b["min"], r.value)
        b["max"] = max(b["max"], r.value)
        b["count"] += 1

    series = []
    for key in sorted(buckets.keys()):
        b = buckets[key]
        series.append({
            "t": key,
            "avg": round(b["sum"] / b["count"], 3),
            "min": round(b["min"], 3),
            "max": round(b["max"], 3),
            "sum": round(b["sum"], 3),
            "count": b["count"],
        })

    return {
        "quantity_type": quantity_type,
        "unit": unit,
        "bucket": bucket,
        "from": frm.isoformat(),
        "to": to.isoformat(),
        "series": series,
    }


def _build_workouts(patient_id: str, frm: datetime, to: datetime, db: Session) -> list[dict]:
    rows = db.query(WorkoutSampleDB).filter(
        WorkoutSampleDB.patient_id == patient_id,
        WorkoutSampleDB.start_date >= frm,
        WorkoutSampleDB.start_date <= to,
    ).order_by(WorkoutSampleDB.start_date.desc()).all()
    return [
        {
            "sample_id": w.sample_id,
            "workout_type": w.workout_type,
            "start_date": w.start_date.isoformat(),
            "end_date": w.end_date.isoformat(),
            "duration_seconds": w.duration_seconds,
            "total_energy_kcal": w.total_energy_kcal,
            "total_distance_m": w.total_distance_m,
            "average_heart_rate": w.average_heart_rate,
            "source": w.source_name,
        }
        for w in rows
    ]


def _build_sleep(patient_id: str, frm: datetime, to: datetime, db: Session) -> list[dict]:
    rows = db.query(SleepSegmentDB).filter(
        SleepSegmentDB.patient_id == patient_id,
        SleepSegmentDB.start_date >= frm,
        SleepSegmentDB.start_date <= to,
    ).order_by(SleepSegmentDB.start_date.asc()).all()
    sessions: dict[str, list[SleepSegmentDB]] = {}
    for r in rows:
        sessions.setdefault(r.session_id, []).append(r)

    out: list[dict] = []
    for sid, segs in sessions.items():
        segs.sort(key=lambda s: s.start_date)
        stages: dict[str, float] = {}
        for s in segs:
            mins = (s.end_date - s.start_date).total_seconds() / 60.0
            stages[s.stage] = stages.get(s.stage, 0.0) + mins
        out.append({
            "session_id": sid,
            "session_start": segs[0].start_date.isoformat(),
            "session_end": segs[-1].end_date.isoformat(),
            "total_minutes": round(
                sum(v for k, v in stages.items() if k not in ("awake", "in_bed")), 1
            ),
            "stages": {k: round(v, 1) for k, v in stages.items()},
            "source": segs[0].source_name,
        })
    out.sort(key=lambda s: s["session_start"], reverse=True)
    return out


# ── Patient retrieval ─────────────────────────────────────────────────────────

@router.get("/patient/wearables/summary")
def get_patient_summary(
    user: UserDB = Depends(require_patient),
    db: Session = Depends(get_db),
):
    return _build_summary(user.id, db)


@router.get("/patient/wearables/samples")
def get_patient_samples(
    quantity_type: str = Query(..., min_length=1),
    frm: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
    bucket: Literal["hour", "day"] = Query("day"),
    user: UserDB = Depends(require_patient),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    frm_dt = _parse_iso(frm) or (now - timedelta(days=30))
    to_dt = _parse_iso(to) or now
    return _build_series(user.id, quantity_type, frm_dt, to_dt, bucket, db)


@router.get("/patient/wearables/workouts")
def get_patient_workouts(
    frm: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
    user: UserDB = Depends(require_patient),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    frm_dt = _parse_iso(frm) or (now - timedelta(days=30))
    to_dt = _parse_iso(to) or now
    return {"workouts": _build_workouts(user.id, frm_dt, to_dt, db)}


@router.get("/patient/wearables/sleep")
def get_patient_sleep(
    frm: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
    user: UserDB = Depends(require_patient),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    frm_dt = _parse_iso(frm) or (now - timedelta(days=30))
    to_dt = _parse_iso(to) or now
    return {"sessions": _build_sleep(user.id, frm_dt, to_dt, db)}


# ── Physician retrieval ───────────────────────────────────────────────────────

@router.get("/physician/patients/{patient_id}/wearables/summary")
def physician_summary(
    patient_id: str,
    user: UserDB = Depends(require_physician),
    db: Session = Depends(get_db),
):
    _verify_patient_link(user.id, patient_id, db)
    return _build_summary(patient_id, db)


@router.get("/physician/patients/{patient_id}/wearables/samples")
def physician_samples(
    patient_id: str,
    quantity_type: str = Query(..., min_length=1),
    frm: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
    bucket: Literal["hour", "day"] = Query("day"),
    user: UserDB = Depends(require_physician),
    db: Session = Depends(get_db),
):
    _verify_patient_link(user.id, patient_id, db)
    now = datetime.utcnow()
    frm_dt = _parse_iso(frm) or (now - timedelta(days=30))
    to_dt = _parse_iso(to) or now
    return _build_series(patient_id, quantity_type, frm_dt, to_dt, bucket, db)


@router.get("/physician/patients/{patient_id}/wearables/workouts")
def physician_workouts(
    patient_id: str,
    frm: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
    user: UserDB = Depends(require_physician),
    db: Session = Depends(get_db),
):
    _verify_patient_link(user.id, patient_id, db)
    now = datetime.utcnow()
    frm_dt = _parse_iso(frm) or (now - timedelta(days=30))
    to_dt = _parse_iso(to) or now
    return {"workouts": _build_workouts(patient_id, frm_dt, to_dt, db)}


@router.get("/physician/patients/{patient_id}/wearables/sleep")
def physician_sleep(
    patient_id: str,
    frm: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
    user: UserDB = Depends(require_physician),
    db: Session = Depends(get_db),
):
    _verify_patient_link(user.id, patient_id, db)
    now = datetime.utcnow()
    frm_dt = _parse_iso(frm) or (now - timedelta(days=30))
    to_dt = _parse_iso(to) or now
    return {"sessions": _build_sleep(patient_id, frm_dt, to_dt, db)}
