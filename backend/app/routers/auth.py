from fastapi import APIRouter, Depends, HTTPException, Body, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext
from app.database import get_db
from app.models.user import User
from app.models.ir import IR
from app.schemas.user import UserCreate, UserResponse, Token, UserStatsResponse
from app.config import settings
from app.dependencies import get_current_user
from app.models.ir import UserIRUsage
from app.schemas.ir import IRResponse
from typing import Optional  
from sqlalchemy import select 
import secrets
from app.models.password_reset import PasswordResetToken
from app.email import send_password_reset_email
router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# — Request reset —
@router.post("/forgot-password", status_code=204)
def forgot_password(
    email:            str = Body(..., embed=True),
    background_tasks: BackgroundTasks = None,
    db:               Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return

    db.query(PasswordResetToken).filter_by(user_id=user.id, used=False).update({"used": True})
    db.commit()

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    db.add(PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at,
    ))
    db.commit()

    background_tasks.add_task(
        send_password_reset_email, user.email, user.username, token
    )


# — Reset password —
@router.post("/reset-password", status_code=204)
def reset_password(
    token:        str = Body(..., embed=True),
    new_password: str = Body(..., embed=True),
    db:           Session = Depends(get_db),
):
    record = db.query(PasswordResetToken).filter_by(token=token, used=False).first()

    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    # Normalize to naive UTC for SQLite compatibility
    expires_at = record.expires_at
    if expires_at.tzinfo is not None:
        expires_at = expires_at.replace(tzinfo=None)
    now = datetime.utcnow()

    if expires_at < now:
        raise HTTPException(status_code=400, detail="Token has expired")

    user = db.query(User).filter(User.id == record.user_id).first()
    user.password = hash_password(new_password)
    record.used = True
    db.commit()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        settings.secret_key,
        algorithm=settings.algorithm
    )


@router.post("/register", response_model=UserResponse, status_code=201)
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    new_user = User(
        username=user.username,
        email=user.email,
        password=hash_password(user.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db:   Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Record login time
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    return {
        "access_token": create_access_token(user.id),
        "token_type":   "bearer"
    }


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/me/stats", response_model=UserStatsResponse)
def me_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total_irs    = db.query(IR).count()
    user_uploads = db.query(IR).filter(IR.author_id == current_user.id).count()

    return {
        "total_irs":    total_irs,
        "user_uploads": user_uploads,
        "last_login":   current_user.last_login,
    }

@router.get("/me/recent-ir", response_model=Optional[IRResponse])
def get_recent_ir(
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    result = db.execute(
        select(IR)
        .join(UserIRUsage, UserIRUsage.ir_id == IR.id)
        .where(UserIRUsage.user_id == current_user.id)
        .order_by(UserIRUsage.last_used_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()