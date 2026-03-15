from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate, UserLogin
from app.core.security import hash_password, verify_password, create_access_token


def register_user(db: Session, user_data: UserCreate) -> User:
    """새 사용자를 등록한다."""
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 등록된 이메일입니다.",
        )

    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        store_name=user_data.store_name,
        store_address=user_data.store_address,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, login_data: UserLogin) -> tuple[User, str]:
    """사용자를 인증하고 JWT 토큰을 반환한다."""
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return user, access_token
