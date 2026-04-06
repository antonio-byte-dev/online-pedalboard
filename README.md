# Online Pedalboard
## Live Demo

The application is available at:

- 🌐 https://online-pedalboard.vercel.app/

Read the official documentation at:

- 📄 https://online-pedalboard-docs.vercel.app/
## Summary
A web-based guitar pedalboard that lets users upload, browse, and audition Impulse Responses (IRs) in real time. Built as a portfolio project to demonstrate full-stack development with a focus on low-latency audio processing in the browser as well as knowledge in CI/CD Pipelines and containerized applications.

The motivation behind this project stems from the widespread adoption of impulse responses (IRs) among modern guitarists, particularly as digital modeling continues to gain prominence. Despite their popularity, there is currently no seamless way to audition IRs without first downloading them and loading them into a digital audio workstation (DAW) or hardware/software pedalboard.

This limitation makes the process of discovering suitable IRs both time-consuming and potentially discouraging. Even when users have a clear idea of the desired cabinet characteristics, it remains difficult to predict how a given IR will interact with their specific guitar and signal chain. Furthermore, the audio samples typically provided in IR libraries do not always offer an accurate or representative preview, which further complicates the selection process.

## Overview

Online Pedalboard gives guitarists and producers a way to test cabinet IRs without installing any software. Users can upload their own `.wav` IR files, browse a shared library, and load them into a live signal chain running entirely in the browser.

The audio engine is built on the Web Audio API using AudioWorklets to keep processing off the main thread and minimize latency. A ConvolverNode handles IR convolution for cabinet simulation, with a signal chain of distortion, EQ, cabinet IR, delay, and plate reverb. Latency is kept as low as the Web Audio API allows — though some is unavoidable due to browser audio buffer constraints.

## Tech Stack

**Frontend**
- Vue 3 + Vite
- Web Audio API with AudioWorklets
- Deployed on Vercel

**Backend**
- FastAPI (Python 3.12)
- PostgreSQL — user accounts, IR metadata, favorites, usage tracking
- MinIO — object storage for IR `.wav` files
- Nginx — reverse proxy and SSL termination
- Deployed on a VPS via Docker Compose

**CI/CD**
- GitHub Actions for testing and deployment
- Resend for transactional email (password reset)

## Project Structure

```
online-pedalboard/
├── frontend/                   # Vue 3 app (deployed to Vercel)
│   ├── src/
│   │   ├── PedalBoard.vue
|   |   |── views/
│   │   ├── components/
│   │   │   ├── CabinetPedal.vue
│   │   │   ├── EffectPedal.vue
│   │   │   ├── PreampPedal.vue
│   │   │   └── __tests__/
│   │   ├── composables/
|   |   |   ├──__tests__/
│   │   │   ├── useAudioEngine.js
│   │   │   └── useIRLibrary.js
│   │   └── router/
│   │       └── index.js
│   ├── vercel.json
│   └── vite.config.js
│
└── backend/                    # FastAPI app (deployed to VPS)
    ├── app/
    │   ├── main.py
    │   ├── config.py
    │   ├── database.py
    │   ├── dependencies.py
    │   ├── models/
    │   └── routers/
    │       ├── auth.py
    │       └── irs.py
    │       
    ├── nginx/
    │   └── nginx.conf
    ├── Dockerfile
    ├── docker-compose.yml
    ├── tests/
    └── requirements.txt
```

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.12
- Docker and Docker Compose

### Frontend

```bash
cd frontend
npm install
cp .env.example .env          # set VITE_API_URL=http://localhost:8000
npm run dev
```

### Backend Setup
#### Run locally (Recommended for development)
```bash
cd backend
python3.12 -m venv venv
./venv/Scripts/activate
uvicorn main:app --reload
```
For local development, it is recommended to run only the required service containers (e.g., PostgreSQL and MinIO) separately. This allows us to bypass nginx entirely and avoid network issues.

#### Run with Docker (All Services)
```bash
cd backend
cp .env.example .env          # fill in the required values (see below)
docker compose up -d
```

### Environment Variables

The backend requires the following variables in `backend/.env`:

```env
SECRET_KEY=
DATABASE_URL=postgresql://user:password@postgres:5432/pedalboard
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=
MINIO_PUBLIC_URL=
RESEND_API_KEY=        # leave empty to disable emails in development
FRONTEND_URL=http://localhost:5173
```

The frontend does not require environment variables by default, as it falls back to http://localhost:8000.

However, you can optionally define the API URL manually:

```env
VITE_API_URL=http://localhost:8000
```

## Deployment

The project uses GitHub Actions for automated deployment. The frontend is handled automatically by Vercel on every push. The backend deploys to a VPS via SSH.

### How it works
### Backend
On every push to `main`:
1. The CI job runs ruff to check for unused variables and bad practices
2. Then it runs the test suite against a ephemeral PostgreSQL service container
3. If tests pass, the deploy job SSHs into the VPS using a key stored in GitHub Secrets
4. The backend folder is copied to the VPS via SCP
5. The workflow writes a fresh `.env` from GitHub Secrets directly onto the server
6. `docker compose up -d --build` rebuilds and restarts the containers


This means the VPS never needs to touch git, it just receives files and runs Docker. The only one-time manual setup required on the VPS is installing Docker.
```
Note: Code quality checks (e.g., Ruff) and tests run on every push, regardless of the branch, but deployment is only triggered for the main branch.
```
### Frontend
On every push to `main`:

1. Run ESLint to enforce code quality standards
2. Execute the test suite using Vitest
3. Deploy the application to Vercel

```
Note: Linting and tests run on every push, regardless of the branch.
```
### Infrastructure

The VPS runs four containers on an internal Docker network (`pedalboard-net`):

- `nginx` — the only container with public ports (80, 443). Handles SSL termination and proxies `/api/` to the backend and `/files/` to MinIO
- `backend` — FastAPI, internal only
- `postgres` — database, internal only
- `minio` — object storage, internal only

SSL certificates are issued by Let's Encrypt via Certbot and auto-renewed by a daily cron job on the VPS.

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `VPS_HOST` | VPS IP address or domain |
| `VPS_USER` | SSH user |
| `VPS_SSH_KEY` | Private SSH key |
| `SECRET_KEY` | JWT signing secret (32+ random bytes) |
| `DATABASE_URL` | Full PostgreSQL connection string |
| `POSTGRES_USER` | Database username |
| `POSTGRES_PASSWORD` | Database password |
| `POSTGRES_DB` | Database name |
| `MINIO_ROOT_USER` | MinIO root username |
| `MINIO_ROOT_PASSWORD` | MinIO root password |
| `MINIO_ACCESS_KEY` | MinIO access key for the backend client |
| `MINIO_SECRET_KEY` | MinIO secret key for the backend client |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `FRONTEND_URL` | Vercel deployment URL for CORS |

## Contributing

Contributions are welcome. Please open an issue before submitting a pull request for anything beyond small bug fixes, so we can discuss the approach first.

### Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/
```

Tests require a running PostgreSQL instance. The easiest way is to use the Docker Compose setup locally, or export `DATABASE_URL` pointing to any accessible Postgres database.

### Known Limitations

- Web Audio API latency is inherent to the browser environment and cannot be fully eliminated. AudioWorklets reduce it significantly but a small buffer delay remains
