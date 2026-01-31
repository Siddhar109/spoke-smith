from __future__ import annotations

from typing import Optional


def get_journalist_scenario(scenario_id: Optional[str]) -> Optional[dict]:
    if not scenario_id:
        return None

    scenarios: dict[str, dict] = {
        "crisis-layoffs": {
            "context": (
                "The company has just announced a 15% workforce reduction (approximately 500 employees).\n"
                "The spokesperson is the VP of Communications. This is the first media interview after the announcement.\n"
                "The journalist is from a major business publication and is known for tough questioning."
            ),
            "questions": [
                {
                    "text": "Can you explain why the company decided to lay off 500 employees?",
                    "followUps": [
                        "But your last earnings report showed record profits. How do you justify this?",
                        "Were executives asked to take pay cuts before this decision?",
                    ],
                },
                {
                    "text": "How do you respond to criticism that the company prioritized shareholders over employees?",
                    "followUps": ["So you are putting profits over people?"],
                },
                {
                    "text": "Will there be more layoffs in the future?",
                    "followUps": [
                        "So you can't guarantee that these will be the last layoffs?",
                    ],
                },
            ],
        },
        "product-launch": {
            "context": (
                "The company is launching a new AI-powered feature for its main product.\n"
                "This is an exclusive interview with a tech journalist from a respected publication.\n"
                "The journalist is generally favorable but will ask probing questions."
            ),
            "questions": [
                {
                    "text": "What makes this new feature different from what competitors are offering?",
                    "followUps": [
                        "But Company X announced something similar last month. Are you playing catch-up?",
                    ],
                },
                {
                    "text": (
                        "Tell me about the AI technology behind this. Is it built in-house or are you using "
                        "third-party models?"
                    ),
                    "followUps": ["What about data privacy concerns with AI?"],
                },
                {
                    "text": "When will this be available and how much will it cost?",
                    "followUps": [],
                },
            ],
        },
        "general-profile": {
            "context": (
                "A business journalist is doing a profile piece on the company for a general business audience.\n"
                "This is a friendly but thorough interview.\n"
                "The journalist wants to understand the company story and vision."
            ),
            "questions": [
                {
                    "text": "Tell me about the company and what problem you are solving.",
                    "followUps": [],
                },
                {
                    "text": "What's the company culture like?",
                    "followUps": [
                        "I've heard reports of burnout among employees. Can you address that?",
                    ],
                },
                {
                    "text": "Where do you see the company in five years?",
                    "followUps": [
                        "How will you compete against bigger players in the market?",
                    ],
                },
            ],
        },
        "crisis-security": {
            "context": (
                "The company recently discovered and disclosed a security incident that potentially affected "
                "customer data.\n"
                "The spokesperson is the Chief Information Security Officer.\n"
                "The journalist is a cybersecurity reporter with deep technical knowledge."
            ),
            "questions": [
                {
                    "text": "Can you walk me through what exactly happened and when?",
                    "followUps": ["Why did it take so long to discover the breach?"],
                },
                {
                    "text": (
                        "How many customers were affected and what type of data was compromised?"
                    ),
                    "followUps": [
                        "Were passwords or financial information included?",
                        "Have you seen any evidence of the data being used maliciously?",
                    ],
                },
                {
                    "text": "What are you doing to make sure this doesn't happen again?",
                    "followUps": [],
                },
            ],
        },
    }

    return scenarios.get(scenario_id)

