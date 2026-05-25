"""Voice API routes — MedASR STT, Cartesia TTS."""
import asyncio

import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel

from crosscures_v2.config import get_settings
from crosscures_v2.db_models import UserDB
from crosscures_v2.api.auth import get_current_user
from crosscures_v2.stt_medasr import transcribe_bytes as medasr_transcribe

router = APIRouter(prefix="/v1/voice", tags=["voice"])
settings = get_settings()

CARTESIA_BASE = "https://api.cartesia.ai"


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    user: UserDB = Depends(get_current_user),
):
    """Transcribe audio using MedASR (local HF pipeline)."""
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="empty audio upload")

    try:
        text = await asyncio.to_thread(
            medasr_transcribe,
            audio_bytes,
            settings.medasr_model_id,
            settings.huggingface_token,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"MedASR error: {exc}") from exc

    return {"text": text}


class TTSRequest(BaseModel):
    text: str
    voice_id: str = ""
    output_format: str = "mp3"
    speed: float = 1.0


@router.post("/synthesize")
async def synthesize_speech(
    req: TTSRequest,
    user: UserDB = Depends(get_current_user),
):
    """Synthesize speech using Cartesia sonic-3 TTS."""
    voice_id = req.voice_id or settings.cartesia_voice_id

    payload = {
        "model_id": settings.cartesia_tts_model,
        "transcript": req.text,
        "voice": {"mode": "id", "id": voice_id},
        "output_format": {
            "container": "mp3",
            "encoding": "mp3",
            "sample_rate": 44100,
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{CARTESIA_BASE}/tts/bytes",
            headers={
                "X-API-Key": settings.cartesia_api_key,
                "Cartesia-Version": settings.cartesia_version,
                "Content-Type": "application/json",
            },
            json=payload,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"Cartesia TTS error: {resp.text}")

    return Response(
        content=resp.content,
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=speech.mp3"},
    )
