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
COMPANY_BRIEF_MAX_OUTPUT_TOKENS_DEFAULT = 1600
COMPANY_BRIEF_LIST_LIMIT_DEFAULT = 6


def _get_int_env(name: str, default: int, *, min_value: int, max_value: int) -> int:
    raw = os.getenv(name)
    if raw is None or not str(raw).strip():
        return default
    try:
        value = int(str(raw).strip())
    except ValueError:
        return default
    return max(min_value, min(max_value, value))


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

    list_limit = _get_int_env(
        "OPENAI_COMPANY_BRIEF_LIST_LIMIT",
        COMPANY_BRIEF_LIST_LIMIT_DEFAULT,
        min_value=2,
        max_value=12,
    )
    max_output_tokens = _get_int_env(
        "OPENAI_COMPANY_BRIEF_MAX_OUTPUT_TOKENS",
        COMPANY_BRIEF_MAX_OUTPUT_TOKENS_DEFAULT,
        min_value=400,
        max_value=4000,
    )

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
- products_services (string[], max {list_limit} items)
- customers_users (string[], max {list_limit} items)
- positioning_claims (string[], max {list_limit} items)
- risk_areas (string[], max {list_limit} items)
- unknowns (string[], max {list_limit} items)
- generated_at (ISO timestamp)

Style constraints:
- Be brief and non-marketing.
- Each list item should be a short phrase (prefer <= 12 words).
"""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            payload = {
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
                "max_output_tokens": max_output_tokens,
                "store": False,
            }

            response = await client.post(
                OPENAI_RESPONSES_URL,
                headers={
                    "Authorization": f"Bearer {openai_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
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
                if reason == "max_output_tokens":
                    retry_limit = max(2, min(4, list_limit - 2))
                    retry_max_output_tokens = min(4000, max_output_tokens * 2)
                    retry_user_prompt = user_prompt.replace(
                        f"max {list_limit} items", f"max {retry_limit} items"
                    ) + "\nIf you are at risk of running out of tokens, shorten list items further."

                    retry_payload = dict(payload)
                    retry_payload["max_output_tokens"] = retry_max_output_tokens
                    retry_payload["input"] = [
                        payload["input"][0],
                        {
                            "role": "user",
                            "content": [{"type": "input_text", "text": retry_user_prompt}],
                        },
                    ]

                    retry_response = await client.post(
                        OPENAI_RESPONSES_URL,
                        headers={
                            "Authorization": f"Bearer {openai_api_key}",
                            "Content-Type": "application/json",
                        },
                        json=retry_payload,
                    )

                    if retry_response.status_code != 200:
                        raise HTTPException(
                            status_code=retry_response.status_code,
                            detail=f"OpenAI API error: {retry_response.text}",
                        )

                    data = retry_response.json()

                if data.get("status") != "completed":
                    reason = None
                    details = data.get("incomplete_details")
                    if isinstance(details, dict):
                        reason = details.get("reason")
                    detail = "OpenAI response incomplete."
                    if reason:
                        detail = f"OpenAI response incomplete: {reason}."
                    if reason == "max_output_tokens":
                        detail += (
                            " Increase OPENAI_COMPANY_BRIEF_MAX_OUTPUT_TOKENS or reduce "
                            "OPENAI_COMPANY_BRIEF_LIST_LIMIT."
                        )
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
