import json
import os
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException

from models.company_brief import (
    CompanyBriefRequest,
    CompanyBriefResponse,
    CompanyBriefSummary,
)

router = APIRouter()

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
COMPANY_BRIEF_MODEL = os.getenv("OPENAI_COMPANY_BRIEF_MODEL", "gpt-5-mini")


def normalize_url(url: str) -> str:
    trimmed = url.strip()
    if not trimmed:
        return trimmed
    if not trimmed.startswith(("http://", "https://")):
        return f"https://{trimmed}"
    return trimmed


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
            if not isinstance(item, dict):
                continue
            content_blocks = item.get("content")
            if not isinstance(content_blocks, list):
                continue
            for content in content_blocks:
                if not isinstance(content, dict):
                    continue
                json_payload = content.get("json")
                if isinstance(json_payload, dict):
                    return json_payload
                text_payload = content.get("text")
                if isinstance(text_payload, str):
                    parsed = _try_parse(text_payload)
                    if parsed:
                        return parsed

    if isinstance(data.get("output_text"), str):
        return _try_parse(data["output_text"])

    return None


def listify(value) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def coerce_summary(data: dict) -> CompanyBriefSummary:
    return CompanyBriefSummary(
        one_liner=str(data.get("one_liner", "")).strip(),
        products_services=listify(data.get("products_services")),
        customers_users=listify(data.get("customers_users")),
        positioning_claims=listify(data.get("positioning_claims")),
        risk_areas=listify(data.get("risk_areas")),
        unknowns=listify(data.get("unknowns")),
        generated_at=str(data.get("generated_at", "")).strip(),
    )


@router.post("/company_brief", response_model=CompanyBriefResponse)
async def create_company_brief(request: CompanyBriefRequest):
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured. Set OPENAI_API_KEY environment variable.",
        )

    company_url = normalize_url(request.company_url)
    if not company_url:
        raise HTTPException(status_code=400, detail="company_url is required.")

    notes = (request.notes or "").strip()

    system_prompt = (
        "You are a concise research assistant. Use web search to gather company context from "
        "official sources (homepage, about, product, pricing, docs, newsroom) using the provided "
        "company URL and user notes. Do not invent facts. If information is missing or uncertain, "
        "place it in `unknowns`. Return ONLY valid JSON matching the required schema."
    )

    user_prompt = f"""Company URL: {company_url}

User notes (optional):
{notes or "None"}

Return JSON with keys:
- one_liner (string)
- products_services (string[])
- customers_users (string[])
- positioning_claims (string[])
- risk_areas (string[])
- unknowns (string[])
- generated_at (ISO timestamp)
"""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENAI_RESPONSES_URL,
                headers={
                    "Authorization": f"Bearer {openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": COMPANY_BRIEF_MODEL,
                    "tools": [{"type": "web_search"}],
                    "tool_choice": "auto",
                    "reasoning": {"effort": "low"},
                    "text": {
                        "format": {
                            "type": "json_schema",
                            "name": "company_brief_summary",
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "one_liner": {"type": "string"},
                                    "products_services": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                    },
                                    "customers_users": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                    },
                                    "positioning_claims": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                    },
                                    "risk_areas": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                    },
                                    "unknowns": {"type": "array", "items": {"type": "string"}},
                                    "generated_at": {"type": "string"},
                                },
                                "required": [
                                    "one_liner",
                                    "products_services",
                                    "customers_users",
                                    "positioning_claims",
                                    "risk_areas",
                                    "unknowns",
                                    "generated_at",
                                ],
                                "additionalProperties": False,
                            },
                        }
                    },
                    "input": [
                        {
                            "role": "system",
                            "content": [{"type": "input_text", "text": system_prompt}],
                        },
                        {
                            "role": "user",
                            "content": [{"type": "input_text", "text": user_prompt}],
                        },
                    ],
                    "max_output_tokens": 900,
                    "store": False,
                },
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"OpenAI API error: {response.text}",
                )

            data = response.json()
            if data.get("status") != "completed":
                reason = None
                details = data.get("incomplete_details")
                if isinstance(details, dict):
                    reason = details.get("reason")
                detail = "OpenAI response incomplete."
                if reason:
                    detail = f"OpenAI response incomplete: {reason}."
                raise HTTPException(status_code=502, detail=detail)
            summary_data = _extract_json_payload(data)
            if not summary_data:
                raise HTTPException(
                    status_code=502,
                    detail="Failed to parse company brief response payload.",
                )
            summary = coerce_summary(summary_data)
            summary.generated_at = datetime.now(timezone.utc).isoformat()

            return CompanyBriefResponse(company_brief_summary=summary)
    except (KeyError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to parse company brief response: {str(exc)}",
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to connect to OpenAI API: {str(exc)}",
        )
