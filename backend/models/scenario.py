from pydantic import BaseModel, Field


class ScenarioQuestion(BaseModel):
    id: str = ""
    text: str = ""
    followUps: list[str] = Field(default_factory=list)
    difficulty: str = "medium"
    expectedDurationSeconds: int = 25
    tags: list[str] = Field(default_factory=list)


class Scenario(BaseModel):
    id: str = ""
    name: str = ""
    description: str = ""
    category: str = "general"
    difficulty: str = "beginner"
    context: str = ""
    questions: list[ScenarioQuestion] = Field(default_factory=list)
    keyMessages: list[str] = Field(default_factory=list)
    redLines: list[str] = Field(default_factory=list)


class GenerateScenarioRequest(BaseModel):
    company_url: str | None = None
    company_notes: str | None = None
    company_brief_summary: dict | None = None
    counterparty: str | None = None
    situation: str | None = None
    question_count: int = 3


class GenerateScenarioResponse(BaseModel):
    scenario: Scenario

