import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from models.session import Session, SessionMetadata, AnalysisStatus
from services.session_store import session_store
from services.transcription import transcribe_audio

router = APIRouter()


class UploadSessionResponse(BaseModel):
    session_id: str
    status: str
    transcript_text: str | None = None
    word_timings: list[dict] | None = None


@router.post("", response_model=UploadSessionResponse)
async def upload_session(
    audio: UploadFile = File(...),
    metadata: str = Form(...),
):
    """
    Upload a completed session recording and metadata, then transcribe the audio.
    Returns the transcript text and word-level timestamps.
    """
    try:
        metadata_obj = SessionMetadata.model_validate_json(metadata)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid metadata JSON")

    suffix = Path(audio.filename or "session.webm").suffix or ".webm"
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            audio_path = tmp.name
            while True:
                chunk = await audio.read(1024 * 1024)
                if not chunk:
                    break
                tmp.write(chunk)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to persist audio: {str(e)}")
    finally:
        await audio.close()

    session = Session(
        id=metadata_obj.sessionId,
        metadata=metadata_obj,
        audio_path=audio_path,
        status=AnalysisStatus.PROCESSING,
    )
    session_store.save(session)

    try:
        result = await transcribe_audio(
            audio_path,
            mime_type=audio.content_type,
            filename=audio.filename,
        )
        session.transcript_text = result.text
        session.word_timings = result.words
        session.status = AnalysisStatus.COMPLETE
        session_store.save(session)
        return UploadSessionResponse(
            session_id=session.id,
            status=session.status.value,
            transcript_text=session.transcript_text,
            word_timings=session.word_timings,
        )
    except Exception as e:
        session.status = AnalysisStatus.ERROR
        session.error = str(e)
        session_store.save(session)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        keep_audio = os.getenv("KAWKAI_KEEP_SESSION_AUDIO", "").lower() in ("1", "true", "yes")
        if not keep_audio and audio_path:
            try:
                os.unlink(audio_path)
            except FileNotFoundError:
                pass
            except Exception:
                pass

            if session.audio_path == audio_path:
                session.audio_path = None
                session_store.save(session)


@router.get("/{session_id}/transcript", response_model=UploadSessionResponse)
async def get_transcript(session_id: str):
    session = session_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return UploadSessionResponse(
        session_id=session.id,
        status=session.status.value,
        transcript_text=session.transcript_text,
        word_timings=session.word_timings,
    )
