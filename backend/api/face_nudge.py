import json
import os
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from prompts.face_nudge import PHRASE_SYSTEM_PROMPT, VERIFY_SYSTEM_PROMPT

router = APIRouter()

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
PHRASE_MODEL = os.getenv("OPENAI_FACE_PHRASE_MODEL", "gpt-4o-mini")
VERIFY_MODEL = os.getenv("OPENAI_FACE_VERIFY_MODEL", PHRASE_MODEL)
DEFAULT_COOLDOWN_MS = int(os.getenv("FACE_NUDGE_DEFAULT_COOLDOWN_MS", "12000"))


class FaceNudgeContext(BaseModel):
    scenario_id: str | None = None
    user_goal: str | None = None
    mode: str | None = None


class FaceNudgeSignals(BaseModel):
    face_present: float | None = Field(default=None, ge=0, le=1)
    framing: float | None = Field(default=None, ge=0, le=1)
    lighting: float | None = Field(default=None, ge=0, le=1)
    tracking_confidence: float | None = Field(default=None, ge=0, le=1)


class FaceNudgePhraseRequest(BaseModel):
    t_ms: int
    reason: str
    severity: str
    fallback_text: str
    context: FaceNudgeContext | None = None
    signals: FaceNudgeSignals | None = None


class FaceNudgePhraseResponse(BaseModel):
    abstain: bool
    text: str
    cooldown_ms: int | None = None


class FaceNudgeImage(BaseModel):
    mime_type: str
    base64: str


class FaceNudgeVerifyRequest(BaseModel):
    t_ms: int
    reason: str
    severity: str
    fallback_text: str
    signals: FaceNudgeSignals | None = None
    image: FaceNudgeImage


class FaceNudgeVerifyResponse(BaseModel):
    verified: bool
    abstain: bool
    text: str
    cooldown_ms: int | None = None


def _clamp_phrase(text: str, max_words: int = 10, max_chars: int = 80) -> str:
    cleaned = " ".join((text or "").strip().split())
    if not cleaned:
        return ""
    words = cleaned.split(" ")
    if len(words) > max_words:
        cleaned = " ".join(words[:max_words])
    if len(cleaned) > max_chars:
        cleaned = cleaned[:max_chars].rstrip()
    return cleaned


def _extract_json_payload(data: dict[str, Any]) -> dict[str, Any] | None:
    def _try_parse(text: str) -> dict[str, Any] | None:
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            return None
        return parsed if isinstance(parsed, dict) else None

    output = data.get("output")
    if isinstance(output, list):
        for item in output:
            for content in item.get("content", []) if isinstance(item, dict) else []:
                if not isinstance(content, dict):
                    continue
                if isinstance(content.get("json"), dict):
                    return content["json"]
                if isinstance(content.get("text"), str):
                    parsed = _try_parse(content["text"])
                    if parsed:
                        return parsed

    if isinstance(data.get("output_text"), str):
        return _try_parse(data["output_text"])

    return None


async def _call_responses_api(
    model: str,
    system_prompt: str,
    user_payload: dict[str, Any],
    response_schema: dict[str, Any],
    image: FaceNudgeImage | None = None,
) -> dict[str, Any]:
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured. Set OPENAI_API_KEY environment variable.",
        )

    user_content: list[dict[str, Any]] = [
        {"type": "input_text", "text": json.dumps(user_payload)}
    ]
    if image:
        data_url = f"data:{image.mime_type};base64,{image.base64}"
        user_content.append({"type": "input_image", "image_url": data_url})

    payload = {
        "model": model,
        "input": [
            {
                "role": "system",
                "content": [{"type": "input_text", "text": system_prompt}],
            },
            {"role": "user", "content": user_content},
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "face_nudge_response",
                "schema": response_schema,
            },
        },
        "temperature": 0.3,
        "max_output_tokens": 120,
        "store": False,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            OPENAI_RESPONSES_URL,
            headers={
                "Authorization": f"Bearer {openai_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=20.0,
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"OpenAI API error: {response.text}",
        )

    data = response.json()
    parsed = _extract_json_payload(data)
    if not parsed:
        raise HTTPException(
            status_code=502,
            detail="Failed to parse OpenAI response payload.",
        )
    return parsed


@router.post("/nudge/phrase", response_model=FaceNudgePhraseResponse)
async def phrase_face_nudge(request: FaceNudgePhraseRequest):
    response_schema = {
        "type": "object",
        "properties": {
            "abstain": {"type": "boolean"},
            "text": {"type": "string"},
            "cooldown_ms": {"type": "integer", "minimum": 0},
        },
        "required": ["abstain", "text"],
        "additionalProperties": False,
    }

    parsed = await _call_responses_api(
        model=PHRASE_MODEL,
        system_prompt=PHRASE_SYSTEM_PROMPT,
        user_payload={
            "t_ms": request.t_ms,
            "reason": request.reason,
            "severity": request.severity,
            "fallback_text": request.fallback_text,
            "context": request.context.model_dump() if request.context else None,
            "signals": request.signals.model_dump() if request.signals else None,
        },
        response_schema=response_schema,
    )

    abstain = bool(parsed.get("abstain", False))
    text = _clamp_phrase(parsed.get("text", ""))
    cooldown_ms = parsed.get("cooldown_ms")
    if not isinstance(cooldown_ms, int):
        cooldown_ms = DEFAULT_COOLDOWN_MS

    if abstain:
        text = ""

    return FaceNudgePhraseResponse(
        abstain=abstain,
        text=text,
        cooldown_ms=cooldown_ms,
    )


@router.post("/nudge/verify", response_model=FaceNudgeVerifyResponse)
async def verify_face_nudge(request: FaceNudgeVerifyRequest):
    response_schema = {
        "type": "object",
        "properties": {
            "verified": {"type": "boolean"},
            "abstain": {"type": "boolean"},
            "text": {"type": "string"},
            "cooldown_ms": {"type": "integer", "minimum": 0},
        },
        "required": ["verified", "abstain", "text"],
        "additionalProperties": False,
    }

    parsed = await _call_responses_api(
        model=VERIFY_MODEL,
        system_prompt=VERIFY_SYSTEM_PROMPT,
        user_payload={
            "t_ms": request.t_ms,
            "reason": request.reason,
            "severity": request.severity,
            "fallback_text": request.fallback_text,
            "signals": request.signals.model_dump() if request.signals else None,
        },
        response_schema=response_schema,
        image=request.image,
    )

    verified = bool(parsed.get("verified", False))
    abstain = bool(parsed.get("abstain", False))
    text = _clamp_phrase(parsed.get("text", ""))
    cooldown_ms = parsed.get("cooldown_ms")
    if not isinstance(cooldown_ms, int):
        cooldown_ms = DEFAULT_COOLDOWN_MS

    if abstain or not verified:
        text = ""

    return FaceNudgeVerifyResponse(
        verified=verified,
        abstain=abstain,
        text=text,
        cooldown_ms=cooldown_ms,
    )
