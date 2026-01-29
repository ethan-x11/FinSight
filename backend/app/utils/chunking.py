from __future__ import annotations

from typing import Iterable, Iterator, List

from langchain_text_splitters import RecursiveCharacterTextSplitter


def chunk_text(text: str, chunk_size: int = 1200, overlap: int = 200) -> Iterator[str]:
    """Yield trimmed text chunks without holding the full list in memory."""

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero")
    if overlap < 0:
        raise ValueError("overlap cannot be negative")
    if overlap >= chunk_size:
        raise ValueError("overlap must be smaller than chunk_size")

    start = 0
    text_length = len(text)
    while start < text_length:
        end = min(start + chunk_size, text_length)
        chunk = text[start:end].strip()
        if chunk:
            yield chunk
        if end >= text_length:
            break
        start = end - overlap


def enumerate_chunks(chunks: Iterable[str]):
    for idx, chunk in enumerate(chunks):
        yield {
            "id": f"chunk-{idx+1}",
            "content": chunk,
        }


def semantic_chunk_text(
    text: str,
    chunk_size: int = 1200,
    overlap: int = 200,
    min_chunk_size: int | None = None,
) -> Iterator[str]:
    """Chunk text using LangChain's RecursiveCharacterTextSplitter with markdown-aware separators."""

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero")
    if overlap < 0:
        raise ValueError("overlap cannot be negative")
    if overlap >= chunk_size:
        raise ValueError("overlap must be smaller than chunk_size")
    if min_chunk_size is None:
        min_chunk_size = max(200, chunk_size // 2)

    text = text or ""
    if not text.strip():
        return iter(())

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        length_function=len,
        separators=[
            "\n# ",
            "\n## ",
            "\n### ",
            "\n#### ",
            "\n\n",
            "\n",
            ". ",
            " ",
            "",
        ],
    )

    raw_chunks = [chunk.strip() for chunk in splitter.split_text(text) if chunk and chunk.strip()]
    if not raw_chunks:
        return iter(())

    def _merge_small_chunks(chunks: List[str]) -> List[str]:
        merged: List[str] = []
        buffer: List[str] = []
        buffer_len = 0

        for chunk in chunks:
            sep_len = 2 if buffer else 0
            projected_len = buffer_len + sep_len + len(chunk)

            if projected_len < min_chunk_size and projected_len <= int(chunk_size * 1.25):
                buffer.append(chunk)
                buffer_len = projected_len
                continue

            if buffer:
                assembled = "\n\n".join(buffer).strip()
                if assembled:
                    merged.append(assembled)
            buffer = [chunk]
            buffer_len = len(chunk)

        if buffer:
            assembled = "\n\n".join(buffer).strip()
            if assembled:
                merged.append(assembled)

        return merged

    final_chunks = _merge_small_chunks(raw_chunks) if min_chunk_size > 0 else raw_chunks
    return (chunk for chunk in final_chunks if chunk)
