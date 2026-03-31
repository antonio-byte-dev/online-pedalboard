from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models import User, IR, Favorite
from app.routers import irs, auth

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pedalboard IR API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(irs.router,  prefix="/irs",  tags=["irs"])

@app.get("/health")
def health():
    return { "status": "ok" }
