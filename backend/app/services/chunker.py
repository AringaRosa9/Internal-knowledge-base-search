from __future__ import annotations

import re

import fugashi

from app.config import settings

_tagger = fugashi.Tagger()

_SENTENCE_ENDINGS = re.compile(r"(?<=[。！？\n])")


def _split_sentences(text: str) -> list[str]:
    parts = _SENTENCE_ENDINGS.split(text)
    return [s.strip() for s in parts if s.strip()]


def chunk_japanese_text(
    text: str,
    chunk_size: int = settings.chunk_size,
    overlap: int = settings.chunk_overlap,
) -> list[str]:
    """Split Japanese text into semantically meaningful chunks using morphological analysis."""
    sentences = _split_sentences(text)
    if not sentences:
        return []

    chunks: list[str] = []
    current_chunk: list[str] = []
    current_length = 0

    for sentence in sentences:
        sentence_length = len(sentence)

        if current_length + sentence_length > chunk_size and current_chunk:
            chunks.append("".join(current_chunk))

            overlap_chunk: list[str] = []
            overlap_length = 0
            for s in reversed(current_chunk):
                if overlap_length + len(s) > overlap:
                    break
                overlap_chunk.insert(0, s)
                overlap_length += len(s)

            current_chunk = overlap_chunk
            current_length = overlap_length

        current_chunk.append(sentence)
        current_length += sentence_length

    if current_chunk:
        chunks.append("".join(current_chunk))

    return chunks


def tokenize_japanese(text: str) -> list[str]:
    """Tokenize Japanese text for analysis."""
    return [word.surface for word in _tagger(text)]
