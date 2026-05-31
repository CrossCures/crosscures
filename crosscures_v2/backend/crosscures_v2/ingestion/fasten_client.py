"""Fasten Connect outbound API client.

Covers the three calls our backend needs:
- request_ehi_export(org_connection_id) -> task_id
- get_export_status(task_id) -> {task_id, status}
- download_export_file(url) -> JSONL bytes

Auth is HTTP Basic with username=public_id, password=private_key.
"""
from typing import Optional
import httpx

from crosscures_v2.config import get_settings


class FastenError(Exception):
    pass


class FastenClient:
    def __init__(
        self,
        public_id: Optional[str] = None,
        private_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 30.0,
    ):
        settings = get_settings()
        self.public_id = public_id or settings.fasten_public_id
        self.private_key = private_key or settings.fasten_private_key
        self.base_url = (base_url or settings.fasten_api_base).rstrip("/")
        self.timeout = timeout

        if not self.public_id or not self.private_key:
            raise FastenError(
                "Fasten credentials missing. Set FASTEN_PUBLIC_ID and FASTEN_PRIVATE_KEY in .env."
            )

    @property
    def _auth(self) -> tuple[str, str]:
        return (self.public_id, self.private_key)

    async def request_ehi_export(self, org_connection_id: str) -> str:
        """POST /bridge/fhir/ehi-export. Returns task_id."""
        url = f"{self.base_url}/bridge/fhir/ehi-export"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                url,
                auth=self._auth,
                json={"org_connection_id": org_connection_id},
            )
        if resp.status_code >= 400:
            raise FastenError(f"ehi-export request failed: {resp.status_code} {resp.text}")
        body = resp.json()
        if not body.get("success"):
            raise FastenError(f"ehi-export returned success=false: {body}")
        return body["data"]["task_id"]

    async def get_export_status(self, task_id: str) -> dict:
        """GET /bridge/fhir/ehi-export/{taskId}. Returns {task_id, status}."""
        url = f"{self.base_url}/bridge/fhir/ehi-export/{task_id}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, auth=self._auth)
        if resp.status_code >= 400:
            raise FastenError(f"ehi-export status failed: {resp.status_code} {resp.text}")
        body = resp.json()
        return body.get("data", {})

    async def download_export_file(self, download_url: str) -> bytes:
        """Follow the 302 redirect to the signed S3 URL and return JSONL bytes.

        `download_url` is the value from webhook payload's `data.download_links[].url`.
        Signed URLs are short-lived (~10 min) — call this promptly after the webhook.
        """
        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            resp = await client.get(download_url, auth=self._auth)
        if resp.status_code >= 400:
            raise FastenError(f"download failed: {resp.status_code} {resp.text[:200]}")
        return resp.content
