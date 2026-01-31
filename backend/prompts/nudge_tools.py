"""
Nudge tool definition for OpenAI Realtime API.

The nudge tool allows the AI coach to send brief coaching instructions
to the spokesperson during the interview.
"""

NUDGE_TOOL = {
    "type": "function",
    "name": "nudge",
    "description": "Give a brief coaching nudge to the spokesperson. Use sparingly - only when a real media coach would interrupt.",
    "parameters": {
        "type": "object",
        "properties": {
            "text": {
                "type": "string",
                "description": "Short coaching instruction (max 10 words)",
            },
            "severity": {
                "type": "string",
                "enum": ["gentle", "firm", "urgent"],
                "description": "gentle=suggestion, firm=important, urgent=stop immediately"
            },
            "reason": {
                "type": "string",
                "enum": ["pace", "filler", "bridge", "answer_length", "off_message", "risk", "dodge", "positive"],
                "description": "Category of the coaching issue (positive for encouragement)"
            }
        },
        "required": ["text", "severity", "reason"],
    }
}


# Nudge threshold guidelines (for reference in prompts)
NUDGE_THRESHOLDS = {
    "pace": {
        "too_fast": 180,  # WPM
        "too_slow": 100,  # WPM
        "target_range": (130, 160),  # Ideal WPM range
    },
    "filler": {
        "warning": 3,  # fillers in 30 seconds
        "intervention": 5,  # fillers in 30 seconds
    },
    "answer_length": {
        "warning": 30,  # seconds
        "intervention": 45,  # seconds
        "max": 60,  # seconds - definitely intervene
    },
}
