import enum
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum as SAEnum, func
from app.database import Base


# ---------- SQLAlchemy ORM ----------

class DocumentStatus(str, enum.Enum):
    processing = "処理中"
    completed = "完了"
    error = "エラー"


DEPARTMENTS = ["全社共通", "営業部", "技術部", "人事部", "経理部", "総務部"]


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)
    category = Column(String(50), default="未分類")
    department = Column(String(50), default="全社共通")
    status = Column(SAEnum(DocumentStatus), default=DocumentStatus.processing)
    chunk_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


class SearchLog(Base):
    __tablename__ = "search_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    query = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    source_documents = Column(Text, nullable=True)
    confidence_score = Column(Integer, nullable=True)
    searched_at = Column(DateTime, server_default=func.now())


# ---------- Pydantic Schemas ----------

class DocumentUploadResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    category: str
    department: str
    status: str
    chunk_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    documents: List[DocumentUploadResponse]
    total: int


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    conversation_id: Optional[str] = None
    department: Optional[str] = None


class SourceChunk(BaseModel):
    document_name: str
    page: Optional[int] = None
    content: str
    relevance_score: float


class SearchResponse(BaseModel):
    answer: str
    confidence_score: int = Field(..., ge=0, le=100)
    sources: List[SourceChunk]
    conversation_id: str


class SearchLogResponse(BaseModel):
    id: int
    query: str
    answer: Optional[str]
    source_documents: Optional[str]
    confidence_score: Optional[int]
    searched_at: datetime

    model_config = {"from_attributes": True}


class SearchLogListResponse(BaseModel):
    logs: List[SearchLogResponse]
    total: int
