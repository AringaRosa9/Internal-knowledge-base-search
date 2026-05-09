from __future__ import annotations

import hashlib
from pathlib import Path

import markdown
from PyPDF2 import PdfReader
from docx import Document as DocxDocument

from app.config import settings


def save_upload(filename: str, content: bytes) -> Path:
    file_hash = hashlib.md5(content).hexdigest()[:8]
    safe_name = f"{file_hash}_{filename}"
    path = settings.upload_dir / safe_name
    path.write_bytes(content)
    return path


def extract_text(path: Path) -> list[dict]:
    """Extract text from a file. Returns list of {page, text} dicts."""
    suffix = path.suffix.lower()
    extractors = {
        ".pdf": _extract_pdf,
        ".docx": _extract_docx,
        ".doc": _extract_docx,
        ".txt": _extract_txt,
        ".md": _extract_markdown,
    }
    extractor = extractors.get(suffix)
    if not extractor:
        raise ValueError(f"サポートされていないファイル形式です: {suffix}")
    return extractor(path)


def _extract_pdf(path: Path) -> list[dict]:
    reader = PdfReader(str(path))
    pages = []
    for i, page in enumerate(reader.pages, 1):
        text = page.extract_text() or ""
        if text.strip():
            pages.append({"page": i, "text": text.strip()})
    return pages


def _extract_docx(path: Path) -> list[dict]:
    doc = DocxDocument(str(path))
    full_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    if not full_text:
        return []
    return [{"page": 1, "text": full_text}]


def _extract_txt(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    if not text.strip():
        return []
    return [{"page": 1, "text": text.strip()}]


def _extract_markdown(path: Path) -> list[dict]:
    raw = path.read_text(encoding="utf-8")
    html = markdown.markdown(raw)
    import re
    text = re.sub(r"<[^>]+>", "", html)
    if not text.strip():
        return []
    return [{"page": 1, "text": text.strip()}]


def classify_document(text: str) -> str:
    """Simple keyword-based document classification."""
    categories = {
        "議事録": ["議事録", "会議", "出席者", "決定事項", "アジェンダ"],
        "技術資料": ["API", "実装", "アーキテクチャ", "設計", "コード", "デプロイ"],
        "規程・マニュアル": ["規程", "規則", "マニュアル", "手順", "ガイドライン", "ポリシー"],
        "報告書": ["報告", "レポート", "分析", "結果", "調査"],
        "提案書": ["提案", "企画", "プロジェクト計画", "見積"],
    }

    text_lower = text[:2000]
    best_category = "未分類"
    best_score = 0

    for category, keywords in categories.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > best_score:
            best_score = score
            best_category = category

    return best_category
