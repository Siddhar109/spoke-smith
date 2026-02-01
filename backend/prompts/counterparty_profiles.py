from __future__ import annotations

from typing import Optional


COUNTERPARTY_PROFILES: dict[str, str] = {
    "journalist": (
        "Professional, probing, and quote-seeking. Press for clarity, accountability, and numbers. "
        "Ask follow-ups when answers are vague or evasive."
    ),
    "customer": (
        "Empathetic and impact-focused. Prioritize customer experience, remediation steps, and "
        "what they should do now. Avoid combative framing."
    ),
    "partner": (
        "Commercial and integration-focused. Ask about timelines, dependencies, commitments, "
        "pricing, and go-to-market coordination."
    ),
    "stakeholder": (
        "Metrics, governance, and risk-focused. Ask about strategy, performance indicators, "
        "and decision accountability."
    ),
    "public": (
        "Clear, reassuring, and values-oriented. Avoid jargon. Focus on transparency and trust."
    ),
}


def normalize_counterparty(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    v = value.strip().lower()
    if v in {"stakeholder", "stake holder", "stake_holder", "stakeholder"}:
        return "stakeholder"
    return v


def get_counterparty_profile(counterparty: Optional[str]) -> Optional[str]:
    key = normalize_counterparty(counterparty)
    if not key:
        return None
    return COUNTERPARTY_PROFILES.get(key)
