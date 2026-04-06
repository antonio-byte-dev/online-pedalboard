# Online Pedalboard

A web-based guitar pedalboard that lets users upload, browse, and audition Impulse Responses (IRs) in real time. Built as a portfolio project to demonstrate full-stack development with a focus on low-latency audio processing in the browser.

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

On every push to `main`:

1. The CI job runs the test suite against a ephemeral PostgreSQL service container
2. If tests pass, the deploy job SSHs into the VPS using a key stored in GitHub Secrets
3. The backend folder is copied to the VPS via SCP
4. The workflow writes a fresh `.env` from GitHub Secrets directly onto the server
5. `docker compose up -d --build` rebuilds and restarts the containers

This means the VPS never needs to touch git — it just receives files and runs Docker. The only one-time manual setup required on the VPS is installing Docker.

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
