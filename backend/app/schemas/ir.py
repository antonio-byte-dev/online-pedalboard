from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class IRCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tags: Optional[str] = None

class IRUpdate(BaseModel):
    name: Optional[str] = None
    tags: Optional[str] = None

class IRResponse(BaseModel):
    id:              int
    name:            str
    description:     Optional[str]
    tags:            Optional[str]
    file_url:        str
    file_size:       Optional[int]
    duration:        Optional[float]
    sample_rate:     Optional[int]
    downloads:       int
    created_at:      datetime
    author_id:       int
    author_username: Optional[str] = None
    is_favorited:    bool = False

    model_config = {"from_attributes": True}

class IRListResponse(BaseModel):
    items: list[IRResponse]
    total: int