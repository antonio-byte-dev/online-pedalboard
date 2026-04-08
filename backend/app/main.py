from fastapi import FastAPI
import app.models  # noqa: F401 - registers models with SQLAlchemy
from app.routers import irs, auth
from contextlib import asynccontextmanager
from app.database import engine, Base
#import os # comment before deploying or working with nginx
#from fastapi.middleware.cors import CORSMiddleware # comment before deploying or working with nginx
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title="Pedalboard IR API", lifespan=lifespan, redirect_slashes=False)

# Uncomment for local development, comment for nginx
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173",os.getenv("FRONTEND_URL")],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(irs.router,  prefix="/irs",  tags=["irs"])

@app.get("/health")
def health():
    return { "status": "ok" }
