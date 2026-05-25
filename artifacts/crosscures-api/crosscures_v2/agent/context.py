"""Context assembly for the agent — pulls from memory and health records."""
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session

from crosscures_v2.db_models import (
    HealthRecordDB, SymptomLogDB, PrescriptionDB, MemoryRecordDB,
    WearableSampleDB, WorkoutSampleDB, SleepSegmentDB,
)


def assemble_context(patient_id: str, db: Session, query: Optional[str] = None) -> dict:
    """Assemble a context dict for use in LLM calls."""
    since_30d = datetime.utcnow() - timedelta(days=30)
    since_14d = datetime.utcnow() - timedelta(days=14)

    # Active prescriptions
    prescriptions = db.query(PrescriptionDB).filter(
        PrescriptionDB.patient_id == patient_id,
        PrescriptionDB.status == "monitoring",
    ).all()

    # Recent health records
    records = db.query(HealthRecordDB).filter(
        HealthRecordDB.patient_id == patient_id,
    ).order_by(HealthRecordDB.created_at.desc()).limit(20).all()

    # Recent symptom logs (14 days)
    symptom_logs = db.query(SymptomLogDB).filter(
        SymptomLogDB.patient_id == patient_id,
        SymptomLogDB.submitted_at >= since_14d,
        SymptomLogDB.completion_status == "completed",
    ).order_by(SymptomLogDB.session_date.desc()).limit(10).all()

    # Memory records
    memories = db.query(MemoryRecordDB).filter(
        MemoryRecordDB.patient_id == patient_id,
    ).order_by(MemoryRecordDB.updated_at.desc()).limit(10).all()

    # Wearable summaries (last 14 days)
    wearable = db.query(WearableSampleDB).filter(
        WearableSampleDB.patient_id == patient_id,
        WearableSampleDB.start_date >= since_14d,
    ).order_by(WearableSampleDB.start_date.desc()).limit(50).all()

    # Format context
    conditions = [r for r in records if r.resource_type in ("Condition", "DiagnosticReport")]
    medications = [r for r in records if r.resource_type in ("MedicationRequest", "MedicationStatement")]
    allergies = [r for r in records if r.resource_type == "AllergyIntolerance"]

    patient_snapshot_parts = []
    if conditions:
        patient_snapshot_parts.append("Conditions: " + "; ".join(r.display_text for r in conditions[:5]))
    if medications:
        patient_snapshot_parts.append("Medications: " + "; ".join(r.display_text for r in medications[:5]))
    if allergies:
        patient_snapshot_parts.append("Allergies: " + "; ".join(r.display_text for r in allergies[:3]))
    if prescriptions:
        rx_list = [f"{p.medication_name} {p.dose} {p.frequency}" for p in prescriptions]
        patient_snapshot_parts.append("Active prescriptions: " + "; ".join(rx_list))

    patient_summary = "\n".join(patient_snapshot_parts) if patient_snapshot_parts else "No health records on file yet."

    # Symptom trend summary
    symptom_summary_parts = []
    for log in symptom_logs[:5]:
        if log.responses:
            date_str = str(log.session_date)
            resp_summary = []
            for resp in log.responses:
                if resp.get("value") is not None:
                    resp_summary.append(f"{resp.get('question_id', 'Q')}: {resp.get('value')}")
            if resp_summary:
                symptom_summary_parts.append(f"{date_str}: " + ", ".join(resp_summary[:3]))
    symptom_summary = "\n".join(symptom_summary_parts) if symptom_summary_parts else "No recent check-ins."

    # Workout + sleep (last 14 days) — supplements raw quantity samples
    workouts_14d = db.query(WorkoutSampleDB).filter(
        WorkoutSampleDB.patient_id == patient_id,
        WorkoutSampleDB.start_date >= since_14d,
    ).order_by(WorkoutSampleDB.start_date.desc()).limit(20).all()

    sleep_14d = db.query(SleepSegmentDB).filter(
        SleepSegmentDB.patient_id == patient_id,
        SleepSegmentDB.start_date >= since_14d,
    ).all()

    # Wearable summary
    wearable_parts: list[str] = []
    if wearable:
        wearable_by_type: dict = {}
        unit_by_type: dict = {}
        for s in wearable:
            wearable_by_type.setdefault(s.quantity_type, []).append(s.value)
            unit_by_type.setdefault(s.quantity_type, s.unit)
        for qt, values in wearable_by_type.items():
            avg = sum(values) / len(values)
            mn = min(values)
            mx = max(values)
            unit = unit_by_type.get(qt, "")
            wearable_parts.append(f"{qt}: avg {avg:.1f}{unit} (min {mn:.1f}, max {mx:.1f}, n={len(values)})")

    if workouts_14d:
        by_type: dict = {}
        for w in workouts_14d:
            by_type.setdefault(w.workout_type, []).append(w)
        workout_summary = []
        for wt, ws in by_type.items():
            total_min = sum(w.duration_seconds for w in ws) / 60.0
            workout_summary.append(f"{wt} ×{len(ws)} ({total_min:.0f} min)")
        wearable_parts.append("workouts (14d): " + ", ".join(workout_summary))

    if sleep_14d:
        sessions_by_id: dict = {}
        for seg in sleep_14d:
            sessions_by_id.setdefault(seg.session_id, []).append(seg)
        nightly_minutes: list[float] = []
        for sid, segs in sessions_by_id.items():
            mins = sum(
                (s.end_date - s.start_date).total_seconds() / 60.0
                for s in segs if s.stage not in ("awake", "in_bed")
            )
            nightly_minutes.append(mins)
        if nightly_minutes:
            avg_sleep = sum(nightly_minutes) / len(nightly_minutes)
            wearable_parts.append(
                f"sleep (14d): avg {avg_sleep:.0f} min/night across {len(nightly_minutes)} nights"
            )

    wearable_summary = "; ".join(wearable_parts) if wearable_parts else "No wearable data."

    # Memory records content
    memory_content = []
    for m in memories[:5]:
        memory_content.append(m.content)

    return {
        "patient_summary": patient_summary,
        "symptom_trend": symptom_summary,
        "wearable_summary": wearable_summary,
        "memory_highlights": "\n".join(memory_content),
        "all_records": [
            {"type": r.resource_type, "display": r.display_text, "id": r.id}
            for r in records
        ],
        "prescriptions": [
            {
                "id": p.id,
                "name": p.medication_name,
                "dose": p.dose,
                "frequency": p.frequency,
                "start_date": str(p.start_date),
                "status": p.status,
            }
            for p in prescriptions
        ],
    }
