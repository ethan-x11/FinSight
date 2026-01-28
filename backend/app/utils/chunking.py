from __future__ import annotations

from typing import Iterable, Iterator, List


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
    """Chunk markdown-like text using paragraph and heading boundaries."""

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero")
    if overlap < 0:
        raise ValueError("overlap cannot be negative")
    if min_chunk_size is None:
        min_chunk_size = max(200, chunk_size // 2)

    blocks = _split_markdown_blocks(text)
    if not blocks:
        return iter(())

    base_chunks: List[str] = []
    buffer: List[str] = []
    buffer_len = 0
    for block in blocks:
        block = block.strip()
        if not block:
            continue

        block_len = len(block)
        if block_len > chunk_size * 1.2:
            if buffer:
                assembled = "\n\n".join(buffer).strip()
                if assembled:
                    base_chunks.append(assembled)
                buffer = []
                buffer_len = 0
            for fallback in chunk_text(block, chunk_size=chunk_size, overlap=overlap):
                base_chunks.append(fallback)
            continue

        separator_len = 2 if buffer else 0
        projected_len = buffer_len + separator_len + block_len
        if projected_len <= chunk_size or buffer_len < min_chunk_size:
            buffer.append(block)
            buffer_len = projected_len
            continue

        assembled = "\n\n".join(buffer).strip()
        if assembled:
            base_chunks.append(assembled)
        buffer = [block]
        buffer_len = block_len

    if buffer:
        assembled = "\n\n".join(buffer).strip()
        if assembled:
            base_chunks.append(assembled)

    if not base_chunks:
        return iter(())

    if overlap <= 0:
        return (chunk for chunk in base_chunks if chunk)

    def _with_overlap() -> Iterator[str]:
        prev_tail = ""
        for chunk in base_chunks:
            if not chunk:
                continue
            combined = chunk
            if prev_tail and not chunk.startswith(prev_tail):
                combined = f"{prev_tail}\n\n{chunk}".strip()
            yield combined
            prev_tail = _build_overlap_tail(chunk, overlap)

    return _with_overlap()


def _split_markdown_blocks(text: str) -> List[str]:
    blocks: List[str] = []
    current: List[str] = []

    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if not stripped:
            if current:
                blocks.append("\n".join(current).strip())
                current = []
            continue

        if stripped.startswith("#"):
            if current:
                blocks.append("\n".join(current).strip())
                current = []
            blocks.append(stripped)
            continue

        current.append(line)

    if current:
        blocks.append("\n".join(current).strip())

    return blocks


def _build_overlap_tail(text: str, max_chars: int) -> str:
    if max_chars <= 0:
        return ""

    snippet = text[-max_chars:].strip()
    if not snippet:
        return ""

    first_space = snippet.find(" ")
    if first_space <= 0:
        return snippet

    return snippet[first_space + 1 :].strip() or snippet
