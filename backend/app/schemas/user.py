from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: str = Field(..., description="이메일", examples=["user@example.com"])
    password: str = Field(..., min_length=6, description="비밀번호")
    store_name: str = Field(..., max_length=100, description="점포명")
    store_address: Optional[str] = Field(None, max_length=500, description="점포 주소")


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    store_name: str
    store_address: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
