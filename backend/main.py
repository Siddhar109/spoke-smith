from pathlib import Path

import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

logger = logging.getLogger("kawkai")

from api.realtime import router as realtime_router
from api.company_brief import router as company_brief_router
from api.sessions import router as sessions_router
from api.face_nudge import router as face_nudge_router

app = FastAPI(
    title="Kawkai API",
    description="AI Media Training Coach Backend",
    version="1.0.0",
)

def _normalize_origin(origin: str) -> str:
    origin = origin.strip()
    if origin and origin != "*":
        origin = origin.rstrip("/")
    return origin


cors_allow_origins_env = os.getenv("CORS_ALLOW_ORIGINS", "")
cors_allow_origin_regex = os.getenv("CORS_ALLOW_ORIGIN_REGEX")

cors_allow_origins = [
    _normalize_origin(o)
    for o in cors_allow_origins_env.split(",")
    if _normalize_origin(o)
] or [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

cors_allow_credentials = "*" not in cors_allow_origins

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allow_origins,
    allow_origin_regex=cors_allow_origin_regex,
    allow_credentials=cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(
    "CORS configured: allow_origins=%s allow_origin_regex=%s allow_credentials=%s",
    cors_allow_origins,
    cors_allow_origin_regex,
    cors_allow_credentials,
)

# Include routers
app.include_router(realtime_router, prefix="/api/realtime", tags=["realtime"])
app.include_router(company_brief_router, prefix="/api", tags=["company"])
app.include_router(sessions_router, prefix="/api/sessions", tags=["sessions"])
app.include_router(face_nudge_router, prefix="/api/face", tags=["face"])


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Kawkai API",
        "version": "1.0.0",
        "docs": "/docs",
    }
