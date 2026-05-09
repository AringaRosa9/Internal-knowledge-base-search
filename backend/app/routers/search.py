import json

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import SearchRequest, SearchResponse, SourceChunk, SearchLog
from app.services.embedding import search_similar
from app.services.llm import generate_answer

router = APIRouter()


@router.post("", response_model=SearchResponse)
async def search_knowledge(
    request: SearchRequest,
    db: AsyncSession = Depends(get_db),
):
    similar_chunks = search_similar(request.query, department=request.department)

    llm_result = generate_answer(
        query=request.query,
        context_chunks=similar_chunks,
        conversation_id=request.conversation_id,
    )

    sources = [
        SourceChunk(
            document_name=chunk["metadata"]["document_name"],
            page=chunk["metadata"]["page"] if chunk["metadata"]["page"] != 0 else None,
            content=chunk["content"],
            relevance_score=chunk["relevance_score"],
        )
        for chunk in similar_chunks
    ]

    log = SearchLog(
        query=request.query,
        answer=llm_result["answer"],
        source_documents=json.dumps(
            [{"name": s.document_name, "page": s.page} for s in sources],
            ensure_ascii=False,
        ),
        confidence_score=llm_result["confidence_score"],
    )
    db.add(log)
    await db.commit()

    return SearchResponse(
        answer=llm_result["answer"],
        confidence_score=llm_result["confidence_score"],
        sources=sources,
        conversation_id=llm_result["conversation_id"],
    )
