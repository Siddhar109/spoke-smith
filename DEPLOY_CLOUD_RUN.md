# Cloud Run deployment (single repo, 2 services)

This repo is set up to deploy **two Cloud Run services** from the same GitHub repo:

- **Frontend (Next.js)**: built from the repo root `Dockerfile`
- **Backend (FastAPI)**: built from `backend/Dockerfile`

## Frontend service (Next.js)

1. In **Cloud Run → Create service**
2. Choose **Continuously deploy from a repository (source)**
3. Connect your GitHub repo, select the branch
4. Build configuration:
   - **Build type**: `Dockerfile`
   - **Dockerfile directory**: repo root (where `Dockerfile` lives)
5. Runtime configuration:
   - Set env var `BACKEND_API_URL` to your backend URL (example: `https://YOUR-BACKEND-xxxx.a.run.app`)
   - Optional: set `NEXT_PUBLIC_API_URL` too (used only for `public/runtime-env.js` debugging; client requests go through same-origin `/api/*` proxy)

Notes:
- The container listens on `$PORT` (Cloud Run sets this; default is `8080`).
- `public/runtime-env.js` is generated at container start from runtime env vars, so `NEXT_PUBLIC_*` values can be changed in Cloud Run without rebuilding the image.

## Backend service (FastAPI)

1. In **Cloud Run → Create service**
2. Choose **Continuously deploy from a repository (source)**
3. Select the same GitHub repo + branch
4. Build configuration:
   - **Build type**: `Dockerfile`
   - **Dockerfile directory**: `backend` (where `backend/Dockerfile` lives)
5. Runtime configuration:
   - Set env var `CORS_ALLOW_ORIGINS` to the frontend service **origin** (comma-separated if multiple), e.g. `https://YOUR-FRONTEND-xxxx.a.run.app` (no trailing `/`)
     - Optional: `CORS_ALLOW_ORIGIN_REGEX` for pattern-based allow (e.g. multiple preview URLs)
     - Optional (not recommended for production): `CORS_ALLOW_ORIGINS=*` to allow any origin (credentials will be disabled)
   - Set env var `OPENAI_API_KEY`
   - Optional tuning (if company context is truncating):
     - `OPENAI_COMPANY_BRIEF_MAX_OUTPUT_TOKENS` (default `1600`)
     - `OPENAI_COMPANY_BRIEF_LIST_LIMIT` (default `6`)
   - Add any other backend env vars/secrets your app needs (recommended via Secret Manager)

Notes:
- The backend listens on `$PORT` (Cloud Run sets this; default is `8080`).
- Health check endpoint: `GET /health`

## Common Cloud Run settings

- **Authentication**: easiest is “Allow unauthenticated” for both services while you’re iterating.
- **Region**: keep both services in the same region to minimize latency.
