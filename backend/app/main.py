from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import app.models  # noqa: F401 - registers models with SQLAlchemy
from app.routers import irs, auth
import os

app = FastAPI(title="Pedalboard IR API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173",os.getenv("FRONTEND_URL")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(irs.router,  prefix="/irs",  tags=["irs"])

@app.get("/health")
def health():
    return { "status": "ok" }
