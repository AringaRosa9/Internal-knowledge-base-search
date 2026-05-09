from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import documents, search, logs


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="社内ナレッジ検索 API",
    description="RAGベースの社内ドキュメント検索・質問応答システム",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api/documents", tags=["ドキュメント管理"])
app.include_router(search.router, prefix="/api/search", tags=["検索・質問応答"])
app.include_router(logs.router, prefix="/api/logs", tags=["検索ログ"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "社内ナレッジ検索システムは正常に稼働中です"}
