from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.routers import auth, sales, upload, analysis

# 테이블 자동 생성 (개발용, 프로덕션에서는 alembic 사용)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="CU 편의점 매출 데이터를 업로드하고 분석하는 API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router)
app.include_router(sales.router)
app.include_router(upload.router)
app.include_router(analysis.router)


@app.get("/")
def root():
    return {"message": "CU 편의점 매출 분석 플랫폼 API", "docs": "/docs"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
