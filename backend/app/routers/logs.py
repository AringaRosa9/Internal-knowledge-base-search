from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schemas import SearchLog, SearchLogListResponse

router = APIRouter()


@router.get("", response_model=SearchLogListResponse)
async def list_search_logs(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    total_result = await db.execute(select(func.count(SearchLog.id)))
    total = total_result.scalar() or 0

    result = await db.execute(
        select(SearchLog).order_by(SearchLog.searched_at.desc()).offset(skip).limit(limit)
    )
    logs = result.scalars().all()

    return SearchLogListResponse(logs=logs, total=total)
