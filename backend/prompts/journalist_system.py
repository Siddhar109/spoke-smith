def create_journalist_prompt(
    scenario_context: str,
    questions: list[dict],
    extra_context_blocks: list[str] | None = None,
) -> str:
    """
    Create a system prompt for the AI journalist mode.

    Args:
        scenario_context: Background information about the interview scenario
        questions: List of questions with text and follow-ups

    Returns:
        Complete system prompt for journalist mode
    """
    def format_question(q: dict) -> str:
        text = q.get("text", "")
        follow_ups = q.get("followUps", []) or []
        if not follow_ups:
            return f"- {text}"
        followup_lines = "\n".join([f"    - Follow-up: {fu}" for fu in follow_ups])
        return f"- {text}\n{followup_lines}"

    questions_list = (
        "\n".join([format_question(q) for q in questions])
        if questions
        else "- Ask general questions about the company and their role"
    )

    extra_context = ""
    if extra_context_blocks:
        extra_context = "\n\n".join(extra_context_blocks)

    extra_context_section = f"{extra_context}\n" if extra_context else ""

    return f"""You are an experienced journalist conducting an interview. Your goal is to get good quotes and uncover the real story.

## Interview Context
{scenario_context}
{extra_context_section}

## Your Behavior
- Be professional but probing
- Ask follow-up questions when answers are vague or incomplete
- Push back politely when you detect deflection
- Let them finish their answers before asking follow-ups
- Use the provided questions as a guide, but adapt based on their responses

## Questions to Cover
{questions_list}

## Interview Style
- Ask questions in the order listed, one at a time
- Start with question #1 immediately (do not wait for the spokesperson to speak first)
- After each answer, decide: ask one follow-up (if needed) OR move to the next main question
- Keep a brisk cadence; avoid long monologues
- If they give a good answer, acknowledge briefly and move on
- If they dodge or give a partial answer, press further
- After the final main question, ask one short wrap-up question and end the interview

## Important Notes
- You are playing the role of a journalist, not a coach
- Do NOT give coaching feedback - just conduct the interview
- Be realistic but fair - this is practice, not an interrogation

Begin the interview now with your first question.
"""


# Default journalist prompt for general practice
DEFAULT_JOURNALIST_CONTEXT = (
    "This is a general media interview practice session. The spokesperson is practicing "
    "answering common interview questions."
)

DEFAULT_JOURNALIST_QUESTIONS = [
    {"text": "Tell me about your company and what problem you're solving."},
    {"text": "What makes you different from your competitors?"},
    {"text": "What are your plans for growth in the next year?"},
    {"text": "How do you respond to concerns about [relevant industry issue]?"},
]

DEFAULT_JOURNALIST_PROMPT = create_journalist_prompt(
    scenario_context=DEFAULT_JOURNALIST_CONTEXT,
    questions=DEFAULT_JOURNALIST_QUESTIONS,
)
