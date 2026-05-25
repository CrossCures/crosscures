"""MedASR (google/medasr) speech-to-text adapter.

Loads the model lazily on first use, then keeps it resident in process memory.
Audio is decoded with librosa (ffmpeg under the hood) and resampled to 16kHz
mono float32, which the HF pipeline expects.
"""
from __future__ import annotations

import io
import logging
import threading
from typing import Optional

import librosa
import numpy as np

logger = logging.getLogger(__name__)

_pipeline = None
_pipeline_lock = threading.Lock()


def _load_pipeline(model_id: str, hf_token: str):
    global _pipeline
    if _pipeline is not None:
        return _pipeline
    with _pipeline_lock:
        if _pipeline is not None:
            return _pipeline
        import torch
        from transformers import pipeline

        logger.info("Loading MedASR pipeline %s on CPU", model_id)
        kwargs = {"task": "automatic-speech-recognition", "model": model_id, "device": -1}
        if hf_token:
            kwargs["token"] = hf_token
        _pipeline = pipeline(**kwargs)
        torch.set_num_threads(max(1, (torch.get_num_threads() or 1)))
        return _pipeline


def transcribe_bytes(audio_bytes: bytes, model_id: str, hf_token: str = "") -> str:
    """Decode arbitrary audio bytes (webm/wav/mp3/...) and return MedASR text."""
    pipe = _load_pipeline(model_id, hf_token)

    # librosa.load handles webm/ogg/wav/mp3 via audioread/ffmpeg, returns float32 mono
    waveform, _sr = librosa.load(io.BytesIO(audio_bytes), sr=16000, mono=True)
    if waveform.size == 0:
        return ""

    result = pipe(
        {"array": waveform.astype(np.float32), "sampling_rate": 16000},
        chunk_length_s=20,
        stride_length_s=2,
    )
    text = result.get("text", "") if isinstance(result, dict) else str(result)
    return text.strip()
