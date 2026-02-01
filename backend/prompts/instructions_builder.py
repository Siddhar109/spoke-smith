from __future__ import annotations

from typing import Optional

from prompts.coach_system import COACH_SYSTEM_PROMPT
from prompts.journalist_system import (
    DEFAULT_JOURNALIST_CONTEXT,
    DEFAULT_JOURNALIST_QUESTIONS,
    create_journalist_prompt,
)
from prompts.scenario_library import get_journalist_scenario
from prompts.counterparty_profiles import get_counterparty_profile
from prompts.situation_modifiers import get_situation_modifier


def _field(summary, key: str):
    if summary is None:
        return None
    if isinstance(summary, dict):
        return summary.get(key)
    return getattr(summary, key, None)


def _format_list(value) -> str:
    if not value:
        return ""
    if isinstance(value, list):
        return "; ".join([str(item) for item in value if str(item).strip()])
    return str(value)


def format_company_brief(
    company_url: Optional[str],
    company_notes: Optional[str],
    company_brief_summary,
) -> Optional[str]:
    if not company_url and not company_notes and not company_brief_summary:
        return None

    lines: list[str] = []

    if company_url:
        lines.append(f"Website: {company_url}")

    one_liner = _field(company_brief_summary, "one_liner")
    if one_liner:
        lines.append(f"One-liner: {one_liner}")

    products = _format_list(_field(company_brief_summary, "products_services"))
    if products:
        lines.append(f"Products/Services: {products}")

    customers = _format_list(_field(company_brief_summary, "customers_users"))
    if customers:
        lines.append(f"Customers/Users: {customers}")

    positioning = _format_list(_field(company_brief_summary, "positioning_claims"))
    if positioning:
        lines.append(f"Positioning/Claims: {positioning}")

    risks = _format_list(_field(company_brief_summary, "risk_areas"))
    if risks:
        lines.append(f"Risk Areas: {risks}")

    unknowns = _format_list(_field(company_brief_summary, "unknowns"))
    if unknowns:
        lines.append(f"Unknowns: {unknowns}")

    if company_notes:
        lines.append(f"User Notes: {company_notes}")

    lines.append(
        "If company details are missing or uncertain, ask a clarifying question instead of guessing."
    )

    return "\n".join(lines)


def build_instructions(
    mode: str,
    scenario_id: Optional[str],
    counterparty: Optional[str],
    situation: Optional[str],
    company_url: Optional[str],
    company_notes: Optional[str],
    company_brief_summary,
) -> str:
    counterparty_block = get_counterparty_profile(counterparty)
    situation_block = get_situation_modifier(situation)
    company_block = format_company_brief(
        company_url=company_url,
        company_notes=company_notes,
        company_brief_summary=company_brief_summary,
    )

    blocks: list[str] = []
    if company_block:
        blocks.append(f"## Company Context\n{company_block}")
    if counterparty_block:
        blocks.append(f"## Counterparty Profile\n{counterparty_block}")
    if situation_block:
        blocks.append(f"## Situation Modifier\n{situation_block}")

    scenario = get_journalist_scenario(scenario_id)

    if mode == "journalist":
        if scenario:
            return create_journalist_prompt(
                scenario_context=scenario["context"],
                questions=scenario["questions"],
                extra_context_blocks=blocks,
            )
        return create_journalist_prompt(
            scenario_context=DEFAULT_JOURNALIST_CONTEXT,
            questions=DEFAULT_JOURNALIST_QUESTIONS,
            extra_context_blocks=blocks,
        )

    scenario_context = scenario["context"] if scenario else None
    scenario_block = (
        f"## Scenario Context\n{scenario_context}" if scenario_context else None
    )

    coach_blocks = [block for block in [scenario_block, *blocks] if block]

    if not coach_blocks:
        return COACH_SYSTEM_PROMPT

    return f"{COACH_SYSTEM_PROMPT}\n\n" + "\n\n".join(coach_blocks)
