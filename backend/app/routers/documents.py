from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import (
    Document,
    DocumentStatus,
    DocumentUploadResponse,
    DocumentListResponse,
    DEPARTMENTS,
)
from app.services.document import save_upload, extract_text, classify_document
from app.services.chunker import chunk_japanese_text
from app.services.embedding import store_chunks, delete_document_chunks

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md"}


@router.get("/departments")
async def list_departments():
    return {"departments": DEPARTMENTS}


@router.post("", response_model=DocumentUploadResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    department: str = Form("全社共通"),
    db: AsyncSession = Depends(get_db),
):
    filename = file.filename or "unknown"
    suffix = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"サポートされていないファイル形式です。対応形式: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    if department not in DEPARTMENTS:
        raise HTTPException(status_code=400, detail=f"無効な部署名です: {department}")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="ファイルサイズは50MB以下にしてください")

    doc = Document(
        filename=filename,
        file_type=suffix.lstrip("."),
        department=department,
        status=DocumentStatus.processing,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    try:
        path = save_upload(filename, content)
        pages = extract_text(path)

        full_text = "\n".join(p["text"] for p in pages)
        doc.category = classify_document(full_text)

        all_chunks: list[str] = []
        all_pages: list[int | None] = []
        for page_data in pages:
            chunks = chunk_japanese_text(page_data["text"])
            for chunk in chunks:
                all_chunks.append(chunk)
                all_pages.append(page_data.get("page"))

        if all_chunks:
            store_chunks(doc.id, filename, all_chunks, all_pages, department)

        doc.chunk_count = len(all_chunks)
        doc.status = DocumentStatus.completed
    except Exception as e:
        doc.status = DocumentStatus.error
        await db.commit()
        raise HTTPException(status_code=500, detail=f"ドキュメント処理中にエラーが発生しました: {str(e)}")

    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    skip: int = 0,
    limit: int = 20,
    department: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    base_query = select(Document)

    if department and department != "全社共通":
        base_query = base_query.where(
            or_(Document.department == department, Document.department == "全社共通")
        )

    total_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = total_result.scalar() or 0

    result = await db.execute(
        base_query.order_by(Document.created_at.desc()).offset(skip).limit(limit)
    )
    documents = result.scalars().all()

    return DocumentListResponse(documents=documents, total=total)


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="ドキュメントが見つかりません")

    delete_document_chunks(document_id)
    await db.delete(doc)
    await db.commit()
