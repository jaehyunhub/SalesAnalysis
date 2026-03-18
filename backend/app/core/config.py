from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # 앱 설정
    APP_NAME: str = "CU 편의점 매출 분석 플랫폼"
    DEBUG: bool = True

    # 데이터베이스
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/cu_sales"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24시간

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # 외부 API 키
    WEATHER_API_KEY: str = ""  # 기상청 API Hub 인증키
    HOLIDAY_API_KEY: str = ""  # 공공데이터포털 특일정보 서비스키

    # 파일 업로드
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
