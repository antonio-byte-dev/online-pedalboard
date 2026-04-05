from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from typing import Optional
import uuid
import wave
import io
from app.database import get_db
from app.models.ir import IR
from app.models.user import User as UserModel
from app.models.favorite import Favorite
from app.dependencies import get_current_user, get_admin_user
from app.models.user import User
from app.models.ir import UserIRUsage
from app.schemas.ir import IRResponse, IRListResponse, IRUpdate
from app import storage
from datetime import datetime, timezone

router = APIRouter()

def enrich_ir(ir: IR, db: Session, current_user=None) -> dict:
    """Attach author_username and is_favorited to an IR dict."""
    data = IRResponse.model_validate(ir).model_dump()
    author = db.query(UserModel).filter(UserModel.id == ir.author_id).first()
    data["author_username"] = author.username if author else None
    if current_user:
        data["is_favorited"] = db.query(Favorite).filter_by(
            user_id=current_user.id, ir_id=ir.id
        ).first() is not None
    return data

def extract_wav_metadata(file_data: bytes) -> dict:
    """Extract sample_rate, duration and file_size from raw WAV bytes.
    Returns safe defaults if the file can't be parsed (e.g. dummy WAV)."""
    try:
        with wave.open(io.BytesIO(file_data)) as w:
            sample_rate = w.getframerate()
            n_frames    = w.getnframes()
            duration    = round(n_frames / sample_rate, 4) if sample_rate else None
            return {
                "sample_rate": sample_rate,
                "duration":    duration,
                "file_size":   len(file_data),
            }
    except Exception:
        return {
            "sample_rate": None,
            "duration":    None,
            "file_size":   len(file_data),
        }


@router.post("/", response_model=IRResponse, status_code=201)
def upload_ir(
    name:        str            = Form(...),
    description: Optional[str] = Form(None),
    tags:        Optional[str] = Form(None),
    file:        UploadFile     = File(...),
    db:          Session        = Depends(get_db),
    current_user: User          = Depends(get_current_user)
):
    if not file.filename.lower().endswith(".wav"):
        raise HTTPException(status_code=400, detail="Only .wav files are accepted")

    file_data = file.file.read()
    filename  = f"{uuid.uuid4()}-{file.filename}"
    file_url  = storage.upload_ir(file_data, filename)
    meta      = extract_wav_metadata(file_data)

    ir = IR(
        name        = name,
        description = description,
        tags        = tags,
        file_url    = file_url,
        file_name   = filename,
        file_size   = meta["file_size"],
        sample_rate = meta["sample_rate"],
        duration    = meta["duration"],
        author_id   = current_user.id,
    )
    db.add(ir)
    db.commit()
    db.refresh(ir)
    return ir

@router.get("/mine", response_model=IRListResponse)
def list_my_irs(
    search:       Optional[str] = Query(None),
    skip:         int           = Query(0, ge=0),
    limit:        int           = Query(20, ge=1, le=100),
    db:           Session       = Depends(get_db),
    current_user: User          = Depends(get_current_user),
):
    query = db.query(IR).filter(IR.author_id == current_user.id)
    if search:
        query = query.filter(IR.name.ilike(f"%{search}%"))
    total = query.count()
    items = query.order_by(IR.created_at.desc()).offset(skip).limit(limit).all()
    return {"items": [enrich_ir(ir, db, current_user) for ir in items], "total": total}


@router.patch("/{ir_id}", response_model=IRResponse)
def update_ir(
    ir_id:        int,
    payload:      IRUpdate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    ir = db.query(IR).filter(IR.id == ir_id).first()
    if not ir:
        raise HTTPException(status_code=404, detail="IR not found")
    if ir.author_id != current_user.id and not current_user.is_admin:  # ← admin bypass
        raise HTTPException(status_code=403, detail="Not authorized")

    if payload.name is not None:
        ir.name = payload.name
    if payload.tags is not None:
        ir.tags = payload.tags
    db.commit()
    db.refresh(ir)
    return enrich_ir(ir, db, current_user)

@router.get("/", response_model=IRListResponse)
def list_irs(
    search:         Optional[str]  = Query(None),
    tags:           Optional[str]  = Query(None),
    favorites_only: bool           = Query(False),
    skip:           int            = Query(0, ge=0),
    limit:          int            = Query(20, ge=1, le=100),
    db:             Session        = Depends(get_db),
    current_user:   Optional[User] = Depends(get_current_user),
):
    query = db.query(IR)
    if search:
        query = query.filter(IR.name.ilike(f"%{search}%"))
    if tags:
        for tag in tags.split(","):
            query = query.filter(IR.tags.ilike(f"%{tag.strip()}%"))
    if favorites_only and current_user:
        query = query.join(Favorite, (Favorite.ir_id == IR.id) & (Favorite.user_id == current_user.id))

    total = query.count()
    items = query.order_by(IR.created_at.desc()).offset(skip).limit(limit).all()
    return {"items": [enrich_ir(ir, db, current_user) for ir in items], "total": total}

@router.get("/{ir_id}", response_model=IRResponse)
def get_ir(
    ir_id:        int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),  
):
    ir = db.query(IR).filter(IR.id == ir_id).first()
    if not ir:
        raise HTTPException(status_code=404, detail="IR not found")
    ir.downloads += 1
    db.commit()
    db.refresh(ir)
    return enrich_ir(ir, db, current_user)


@router.delete("/{ir_id}", status_code=204)
def delete_ir(
    ir_id:        int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    ir = db.query(IR).filter(IR.id == ir_id).first()
    if not ir:
        raise HTTPException(status_code=404, detail="IR not found")
    if ir.author_id != current_user.id and not current_user.is_admin:  # ← admin bypass
        raise HTTPException(status_code=403, detail="Not authorized")

    storage.delete_ir(ir.file_name)
    db.delete(ir)
    db.commit()


@router.post("/{ir_id}/favorite", status_code=201)
def add_favorite(
    ir_id:        int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user)
):
    if not db.query(IR).filter(IR.id == ir_id).first():
        raise HTTPException(status_code=404, detail="IR not found")
    if db.query(Favorite).filter_by(user_id=current_user.id, ir_id=ir_id).first():
        raise HTTPException(status_code=400, detail="Already in favorites")

    db.add(Favorite(user_id=current_user.id, ir_id=ir_id))
    db.commit()
    return {"message": "Added to favorites"}


@router.delete("/{ir_id}/favorite", status_code=204)
def remove_favorite(
    ir_id:        int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user)
):
    favorite = db.query(Favorite).filter_by(
        user_id=current_user.id, ir_id=ir_id
    ).first()
    if not favorite:
        raise HTTPException(status_code=404, detail="Not in favorites")
    db.delete(favorite)
    db.commit()

@router.post("/{ir_id}/use", status_code=204)
def record_ir_usage(
    ir_id:        int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    stmt = pg_insert(UserIRUsage).values(
        user_id=current_user.id,
        ir_id=ir_id,
        last_used_at=datetime.now(timezone.utc),
    ).on_conflict_do_update(
        index_elements=["user_id", "ir_id"],
        set_={"last_used_at": datetime.now(timezone.utc)},
    )
    db.execute(stmt)
    db.commit()