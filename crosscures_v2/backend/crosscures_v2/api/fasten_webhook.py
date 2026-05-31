"""Fasten Connect webhook receiver.

Routes by event.type:
- webhook.test        -> log only (dashboard test button)
- connection_success  -> trigger an EHI export, remember task_id -> patient_id
- ehi_export_success  -> download JSONL, wrap into FHIR Bundle, ingest
- ehi_export_failed   -> log error

Some Fasten environments prefix events with "patient." (e.g.
"patient.connection_success"); we normalize by stripping that prefix.

The widget is launched with external-id=<crosscures patient_id>. Fasten
echoes external_id on connection_success. We trigger the export there
and stash {task_id: patient_id} so ehi_export_success (which only carries
task_id) can still find the right patient.

TODO: replace the in-process _TASK_TO_PATIENT dict with EHRConnectionDB
once we move past single-process demo deployments.
"""
import json
import uuid
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Request
from fastapi.responses import JSONResponse

from crosscures_v2.database import SessionLocal
from crosscures_v2.ingestion.fasten_client import FastenClient, FastenError
from crosscures_v2.ingestion.service import ingest_fhir_json

router = APIRouter(prefix="/api/v1/fasten", tags=["fasten-webhook"])

_TASK_TO_PATIENT: dict[str, str] = {}


@router.post("/webhook")
async def receive_webhook(request: Request, background: BackgroundTasks):
    raw = await request.body()
    headers = dict(request.headers)

    try:
        payload = json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        payload = {"_raw": raw.decode("utf-8", errors="replace")}

    raw_type = payload.get("type", "") or ""
    event_type = raw_type.removeprefix("patient.")

    print("[FASTEN_WEBHOOK] ============================================")
    print(f"[FASTEN_WEBHOOK] event.type = {raw_type} (normalized: {event_type})")
    print(f"[FASTEN_WEBHOOK] headers = {json.dumps(headers, indent=2)}")
    print(f"[FASTEN_WEBHOOK] payload = {json.dumps(payload, indent=2)}")
    print("[FASTEN_WEBHOOK] ============================================")

    if event_type == "connection_success":
        background.add_task(_handle_connection_success, payload)
    elif event_type == "ehi_export_success":
        background.add_task(_handle_ehi_export_success, payload)
    elif event_type == "ehi_export_failed":
        print(f"[FASTEN_WEBHOOK] ehi_export_failed: {payload.get('data')}")
    elif event_type == "webhook.test":
        pass  # logging above is enough
    else:
        print(f"[FASTEN_WEBHOOK] unhandled event.type: {raw_type}")

    return JSONResponse(status_code=200, content={"received": True, "type": event_type})


def _extract_external_id(payload: dict) -> Optional[str]:
    """external_id can appear in payload.data or top-level depending on event variant."""
    data = payload.get("data") or {}
    return data.get("external_id") or payload.get("external_id")


async def _handle_connection_success(payload: dict) -> None:
    data = payload.get("data") or {}
    org_connection_id = (
        data.get("org_connection_id")
        or data.get("connection_id")
        or data.get("id")
    )
    external_id = _extract_external_id(payload)

    print(f"[FASTEN_WEBHOOK:connection_success] org_connection_id={org_connection_id} external_id={external_id}")

    if not org_connection_id:
        print(f"[FASTEN_WEBHOOK:connection_success] no org_connection_id; data keys={list(data.keys())}")
        return

    try:
        client = FastenClient()
        task_id = await client.request_ehi_export(org_connection_id)
        print(f"[FASTEN_WEBHOOK:connection_success] EHI export triggered. task_id={task_id}")
        if external_id:
            _TASK_TO_PATIENT[task_id] = external_id
            print(f"[FASTEN_WEBHOOK:connection_success] mapped task_id -> patient_id={external_id}")
        else:
            print("[FASTEN_WEBHOOK:connection_success] WARN no external_id; ehi_export_success won't be ingestible")
    except FastenError as e:
        print(f"[FASTEN_WEBHOOK:connection_success] EHI export trigger failed: {e}")


async def _handle_ehi_export_success(payload: dict) -> None:
    data = payload.get("data") or {}
    task_id = data.get("task_id")
    download_links = data.get("download_links") or []

    print(f"[FASTEN_WEBHOOK:ehi_export_success] task_id={task_id} download_links={len(download_links)}")

    patient_id = _TASK_TO_PATIENT.get(task_id) if task_id else None
    # Fallback: external_id sometimes echoed back; try it first if mapping miss.
    if not patient_id:
        patient_id = _extract_external_id(payload)

    if not patient_id:
        print(f"[FASTEN_WEBHOOK:ehi_export_success] no patient_id correlation for task_id={task_id}; skipping")
        return

    client = FastenClient()
    upload_id = f"fasten-{task_id or uuid.uuid4().hex}"
    total_ingested = 0
    total_failed = 0

    for idx, link in enumerate(download_links):
        url = link.get("url")
        export_type = link.get("export_type", "?")
        content_type = link.get("content_type", "?")
        if not url:
            continue

        print(f"[FASTEN_WEBHOOK:ehi_export_success] downloading link {idx} type={export_type} content={content_type}")
        try:
            blob = await client.download_export_file(url)
        except FastenError as e:
            print(f"[FASTEN_WEBHOOK:ehi_export_success] download failed for link {idx}: {e}")
            continue

        resources = _parse_jsonl_resources(blob)
        if not resources:
            print(f"[FASTEN_WEBHOOK:ehi_export_success] link {idx} produced no FHIR resources (skipping)")
            continue

        bundle = {
            "resourceType": "Bundle",
            "type": "collection",
            "entry": [{"resource": r} for r in resources],
        }

        db = SessionLocal()
        try:
            result = ingest_fhir_json(
                patient_id=patient_id,
                raw_data=bundle,
                source_name=f"Fasten:{export_type}",
                upload_id=f"{upload_id}-{idx}",
                db=db,
            )
            total_ingested += result.get("records_extracted", 0)
            total_failed += result.get("records_failed", 0)
            print(f"[FASTEN_WEBHOOK:ehi_export_success] link {idx} ingested={result.get('records_extracted')} failed={result.get('records_failed')}")
        except Exception as e:
            print(f"[FASTEN_WEBHOOK:ehi_export_success] ingest failed for link {idx}: {e}")
        finally:
            db.close()

    print(f"[FASTEN_WEBHOOK:ehi_export_success] DONE patient_id={patient_id} ingested={total_ingested} failed={total_failed}")


def _parse_jsonl_resources(blob: bytes) -> list[dict]:
    """Parse JSONL/NDJSON bytes into a list of FHIR resource dicts.

    Skips blank lines and non-resource entries. Logs but does not raise on
    bad lines so a single corrupted resource doesn't blow up the batch.
    """
    resources: list[dict] = []
    for lineno, raw_line in enumerate(blob.splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError as e:
            print(f"[FASTEN_WEBHOOK:jsonl] line {lineno} not valid JSON: {e}")
            continue
        if isinstance(obj, dict) and obj.get("resourceType"):
            resources.append(obj)
        else:
            print(f"[FASTEN_WEBHOOK:jsonl] line {lineno} has no resourceType, skipping")
    return resources
