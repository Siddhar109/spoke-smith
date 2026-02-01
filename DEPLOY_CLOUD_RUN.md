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
   - Set env var `NEXT_PUBLIC_API_URL` to your backend URL (example: `https://YOUR-BACKEND-xxxx.a.run.app`)

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
   - Set env var `CORS_ALLOW_ORIGINS` to the frontend service URL (comma-separated if multiple), e.g. `https://YOUR-FRONTEND-xxxx.a.run.app`
   - Add any other backend env vars/secrets your app needs (recommended via Secret Manager)

Notes:
- The backend listens on `$PORT` (Cloud Run sets this; default is `8080`).
- Health check endpoint: `GET /health`

## Common Cloud Run settings

- **Authentication**: easiest is “Allow unauthenticated” for both services while you’re iterating.
- **Region**: keep both services in the same region to minimize latency.

