from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.services.auth import register_user, authenticate_user

router = APIRouter(prefix="/api/auth", tags=["인증"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """회원가입: 새 사용자를 등록하고 JWT 토큰을 반환한다."""
    from app.core.security import create_access_token

    user = register_user(db, user_data)
    access_token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """로그인: 인증 후 JWT 토큰을 반환한다."""
    user, access_token = authenticate_user(db, login_data)
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )
