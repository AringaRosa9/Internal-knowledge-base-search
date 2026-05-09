from __future__ import annotations

from typing import Optional, List

import chromadb
from openai import OpenAI

from app.config import settings

_openai_client: OpenAI | None = None
_chroma_client: chromadb.PersistentClient | None = None
_collection: chromadb.Collection | None = None

COLLECTION_NAME = "shanai_knowledge"


def _get_openai() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=settings.openai_api_key)
    return _openai_client


def _get_collection() -> chromadb.Collection:
    global _chroma_client, _collection
    if _collection is None:
        _chroma_client = chromadb.PersistentClient(path=str(settings.chroma_dir))
        _collection = _chroma_client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def create_embedding(text: str) -> list[float]:
    response = _get_openai().embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


def store_chunks(
    document_id: int,
    document_name: str,
    chunks: list[str],
    pages: list[int | None],
    department: str = "全社共通",
) -> int:
    collection = _get_collection()

    ids = [f"doc{document_id}_chunk{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "document_id": document_id,
            "document_name": document_name,
            "page": page or 0,
            "chunk_index": i,
            "department": department,
        }
        for i, page in enumerate(pages)
    ]

    embeddings = [create_embedding(chunk) for chunk in chunks]

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
    )

    return len(chunks)


def search_similar(
    query: str,
    n_results: int = settings.max_search_results,
    department: Optional[str] = None,
) -> list[dict]:
    collection = _get_collection()
    query_embedding = create_embedding(query)

    where_filter = None
    if department and department != "全社共通":
        where_filter = {
            "$or": [
                {"department": {"$eq": department}},
                {"department": {"$eq": "全社共通"}},
            ]
        }

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
        where=where_filter,
    )

    matches = []
    for i in range(len(results["ids"][0])):
        matches.append({
            "content": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i],
            "relevance_score": round(1 - results["distances"][0][i], 3),
        })

    return matches


def delete_document_chunks(document_id: int) -> None:
    collection = _get_collection()
    existing = collection.get(where={"document_id": document_id})
    if existing["ids"]:
        collection.delete(ids=existing["ids"])
