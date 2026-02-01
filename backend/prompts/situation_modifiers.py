from __future__ import annotations

from typing import Optional


SITUATION_MODIFIERS: dict[str, str] = {
    "crisis": (
        "Crisis constraints: avoid speculation, lead with empathy, state what is known, "
        "what is being done, and when the next update will come."
    ),
    "demo": (
        "Demo constraints: be clear and structured, highlight value quickly, handle objections, "
        "and keep answers concise and action-oriented."
    ),
    "interview": (
        "Interview constraints: balanced tone, short story + vision, answer first then expand, "
        "avoid rambling."
    ),
}


def normalize_situation(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    v = value.strip().lower()
    if v in {"interview"}:
        return "interview"
    if v in {"crisis"}:
        return "crisis"
    if v in {"demo"}:
        return "demo"
    return v


def get_situation_modifier(situation: Optional[str]) -> Optional[str]:
    key = normalize_situation(situation)
    if not key:
        return None
    return SITUATION_MODIFIERS.get(key)
