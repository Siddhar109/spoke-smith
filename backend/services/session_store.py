from typing import Optional
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.session import Session, AnalysisStatus, AnalysisResult


class SessionStore:
    """In-memory session storage for MVP."""

    def __init__(self):
        self._sessions: dict[str, Session] = {}

    def save(self, session: Session) -> None:
        self._sessions[session.id] = session

    def get(self, session_id: str) -> Optional[Session]:
        return self._sessions.get(session_id)

    def update_status(
        self, session_id: str, status: AnalysisStatus, error: Optional[str] = None
    ) -> None:
        if session_id in self._sessions:
            self._sessions[session_id].status = status
            if error:
                self._sessions[session_id].error = error

    def update_analysis(self, session_id: str, analysis: AnalysisResult) -> None:
        if session_id in self._sessions:
            self._sessions[session_id].analysis = analysis
            self._sessions[session_id].status = AnalysisStatus.COMPLETE

    def delete(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)


# Singleton instance
session_store = SessionStore()
