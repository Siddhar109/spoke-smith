from pydantic import BaseModel
from typing import Optional, Literal
from enum import Enum


class AnalysisStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETE = "complete"
    ERROR = "error"


class TranscriptSegment(BaseModel):
    text: str
    speaker: Literal["user", "ai"]
    startTime: float  # milliseconds
    endTime: float


class SessionMetadata(BaseModel):
    sessionId: str
    scenarioId: Optional[str] = None
    mode: Literal["coach", "journalist"]
    transcript: list[TranscriptSegment]


class SectionScores(BaseModel):
    message_discipline: int  # 0-5
    question_handling: int
    risk_compliance: int
    soundbites: int
    tone_presence: int


class TimestampedFlag(BaseModel):
    start_time: float  # seconds
    end_time: float
    issue_type: str
    severity: Literal["low", "medium", "high"]
    evidence_quote: str
    recommendation: str


class Rewrite(BaseModel):
    question: str
    original_answer: str
    improved_answer: str
    explanation: str


class Drill(BaseModel):
    name: str
    instructions: str
    target_metric: str


class AnalysisResult(BaseModel):
    overall_score: int  # 0-100
    section_scores: SectionScores
    timestamped_flags: list[TimestampedFlag]
    rewrites: list[Rewrite]
    drills: list[Drill]


class Session(BaseModel):
    id: str
    metadata: SessionMetadata
    audio_path: Optional[str] = None
    transcript_text: Optional[str] = None
    word_timings: Optional[list[dict]] = None
    analysis: Optional[AnalysisResult] = None
    status: AnalysisStatus = AnalysisStatus.PENDING
    error: Optional[str] = None
