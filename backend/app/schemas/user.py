from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime
    last_login: Optional[datetime] = None
    is_admin:   bool = False
    model_config = { "from_attributes": True }

class Token(BaseModel):
    access_token: str
    token_type: str

class UserStatsResponse(BaseModel):
    total_irs:    int
    user_uploads: int
    last_login:   Optional[datetime] = None