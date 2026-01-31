import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

router = APIRouter()

OPENAI_REALTIME_URL = "https://api.openai.com/v1/realtime/sessions"
REALTIME_MODEL = os.getenv("OPENAI_REALTIME_MODEL", "gpt-4o-realtime-preview-2024-12-17")
TRANSCRIPTION_MODEL = os.getenv("OPENAI_TRANSCRIPTION_MODEL", "gpt-4o-mini-transcribe")


class TokenResponse(BaseModel):
    """Response model for ephemeral token endpoint."""
    client_secret: str
    expires_at: int
    model: str


class TokenRequest(BaseModel):
    """Request model for token endpoint."""
    mode: str = "coach"  # "coach" or "journalist"
    scenario_id: str | None = None


@router.post("/token", response_model=TokenResponse)
async def create_ephemeral_token(request: TokenRequest = TokenRequest()):
    """
    Generate an ephemeral token for client-side WebRTC connection.
    The token expires in 60 seconds.
    """
    from prompts.coach_system import COACH_SYSTEM_PROMPT
    from prompts.journalist_system import create_journalist_prompt
    from prompts.journalist_system import DEFAULT_JOURNALIST_PROMPT
    from prompts.nudge_tools import NUDGE_TOOL
    from prompts.scenario_library import get_journalist_scenario

    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
        )

    # Choose system prompt based on mode
    if request.mode == "journalist":
        scenario = get_journalist_scenario(request.scenario_id)
        if scenario:
            system_prompt = create_journalist_prompt(
                scenario_context=scenario["context"],
                questions=scenario["questions"],
            )
        else:
            system_prompt = DEFAULT_JOURNALIST_PROMPT
    else:
        system_prompt = COACH_SYSTEM_PROMPT

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                OPENAI_REALTIME_URL,
                headers={
                    "Authorization": f"Bearer {openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": REALTIME_MODEL,
                    "voice": "alloy",
                    "instructions": system_prompt,
                    "tools": [NUDGE_TOOL],
                    "input_audio_transcription": {
                        "model": TRANSCRIPTION_MODEL,
                    },
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.5,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 500,
                    },
                },
                timeout=30.0,
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"OpenAI API error: {response.text}"
                )

            data = response.json()
            return TokenResponse(
                client_secret=data["client_secret"]["value"],
                expires_at=data["client_secret"]["expires_at"],
                model=REALTIME_MODEL,
            )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to connect to OpenAI API: {str(e)}"
        )
