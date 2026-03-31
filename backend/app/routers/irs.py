from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Optional
import uuid
from app.database import get_db
from app.models.ir import IR
from app.models.favorite import Favorite
from app.schemas.ir import IRResponse, IRListResponse
from app.dependencies import get_current_user
from app.models.user import User
from app import storage

router = APIRouter()

@router.post("/", response_model=IRResponse, status_code=201)
def upload_ir(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith(('.wav', '.WAV')):
        raise HTTPException(status_code=400, detail="Only .wav files are accepted")

    file_data = file.file.read()
    filename  = f"{uuid.uuid4()}-{file.filename}"
    file_url  = storage.upload_ir(file_data, filename)

    ir = IR(
        name=name,
        description=description,
        tags=tags,
        file_url=file_url,
        file_name=filename,
        file_size=len(file_data),
        author_id=current_user.id
    )
    db.add(ir)
    db.commit()
    db.refresh(ir)
    return ir

@router.get("/", response_model=IRListResponse)
def list_irs(
    search: Optional[str] = Query(None),
    tags:   Optional[str] = Query(None),
    skip:   int = Query(0, ge=0),
    limit:  int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(IR)
    if search:
        query = query.filter(IR.name.ilike(f"%{search}%"))
    if tags:
        for tag in tags.split(","):
            query = query.filter(IR.tags.ilike(f"%{tag.strip()}%"))

    total = query.count()
    items = query.order_by(IR.created_at.desc()).offset(skip).limit(limit).all()
    return { "items": items, "total": total }

@router.get("/{ir_id}", response_model=IRResponse)
def get_ir(ir_id: int, db: Session = Depends(get_db)):
    ir = db.query(IR).filter(IR.id == ir_id).first()
    if not ir:
        raise HTTPException(status_code=404, detail="IR not found")
    return ir

@router.delete("/{ir_id}", status_code=204)
def delete_ir(
    ir_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ir = db.query(IR).filter(IR.id == ir_id).first()
    if not ir:
        raise HTTPException(status_code=404, detail="IR not found")
    if ir.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    storage.delete_ir(ir.file_name)
    db.delete(ir)
    db.commit()

@router.post("/{ir_id}/favorite", status_code=201)
def add_favorite(
    ir_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not db.query(IR).filter(IR.id == ir_id).first():
        raise HTTPException(status_code=404, detail="IR not found")
    if db.query(Favorite).filter_by(user_id=current_user.id, ir_id=ir_id).first():
        raise HTTPException(status_code=400, detail="Already in favorites")

    db.add(Favorite(user_id=current_user.id, ir_id=ir_id))
    db.commit()
    return { "message": "Added to favorites" }

@router.delete("/{ir_id}/favorite", status_code=204)
def remove_favorite(
    ir_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    favorite = db.query(Favorite).filter_by(user_id=current_user.id, ir_id=ir_id).first()
    if not favorite:
        raise HTTPException(status_code=404, detail="Not in favorites")
    db.delete(favorite)
    db.commit()