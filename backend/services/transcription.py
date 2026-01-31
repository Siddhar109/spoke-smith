import os
import httpx
from dataclasses import dataclass
import mimetypes

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


@dataclass
class TranscriptionResult:
    text: str
    words: list[dict]  # [{word, start, end}, ...]


def _normalize_mime_type(mime_type: str | None) -> str | None:
    if not mime_type:
        return None
    base = mime_type.split(";", 1)[0].strip()
    return base or None


def _guess_mime_type(audio_path: str) -> str | None:
    guessed = mimetypes.guess_type(audio_path)[0]
    return _normalize_mime_type(guessed)


async def transcribe_audio(
    audio_path: str,
    *,
    mime_type: str | None = None,
    filename: str | None = None,
) -> TranscriptionResult:
    """
    Transcribe audio file using OpenAI Whisper API.
    Returns text and word-level timestamps.
    """
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY environment variable is not set")

    normalized_mime_type = _normalize_mime_type(mime_type) or _guess_mime_type(audio_path)
    content_type = normalized_mime_type or "application/octet-stream"
    upload_name = filename or os.path.basename(audio_path)

    async with httpx.AsyncClient(timeout=120.0) as client:
        with open(audio_path, "rb") as f:
            response = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                files={"file": (upload_name, f, content_type)},
                data={
                    "model": "whisper-1",
                    "response_format": "verbose_json",
                    "timestamp_granularities[]": "word",
                },
            )

    if response.status_code != 200:
        raise Exception(f"Transcription failed: {response.text}")

    data = response.json()

    words = []
    if "words" in data:
        words = [
            {"word": w["word"], "start": w["start"], "end": w["end"]}
            for w in data["words"]
        ]

    return TranscriptionResult(text=data["text"], words=words)


def segment_qa_turns(
    words: list[dict], transcript_segments: list[dict]
) -> list[dict]:
    """
    Segment transcription into Q/A turns based on speaker.
    Uses existing transcript segments from real-time session.
    """
    turns = []
    current_turn = None

    for segment in transcript_segments:
        speaker = segment.get("speaker", "user")
        text = segment.get("text", "")
        start_time = segment.get("startTime", 0) / 1000  # Convert ms to seconds
        end_time = segment.get("endTime", 0) / 1000

        if current_turn is None or current_turn["speaker"] != speaker:
            if current_turn:
                turns.append(current_turn)
            current_turn = {
                "speaker": speaker,
                "text": text,
                "start_time": start_time,
                "end_time": end_time,
            }
        else:
            current_turn["text"] += " " + text
            current_turn["end_time"] = end_time

    if current_turn:
        turns.append(current_turn)

    return turns
