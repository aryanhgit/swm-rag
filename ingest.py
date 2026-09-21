import json
import os
from pathlib import Path

import faiss
import numpy as np
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).parent

DOCS_DIR = BASE_DIR / "documents"
INDEX_PATH = BASE_DIR / "data" / "index.faiss"
METADATA_PATH = BASE_DIR / "data" / "metadata.json"
CHUNK_SIZE = 700
CHUNK_OVERLAP = 100
EMBEDDING_MODEL = "all-MiniLM-L6-v2"


def extract_text(pdf_path):
    reader = PdfReader(str(pdf_path))
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append((i + 1, text))
    return pages


def chunk_text(text, source, page_number):
    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunk = text[start:end].strip()
        if chunk:
            chunks.append({"text": chunk, "source": source, "page": page_number})
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def build_index():
    pdf_files = sorted(DOCS_DIR.glob("*.pdf"))
    if not pdf_files:
        raise SystemExit(f"No PDFs found in {DOCS_DIR}")

    all_chunks = []
    for pdf_path in pdf_files:
        for page_number, text in extract_text(pdf_path):
            all_chunks.extend(chunk_text(text, pdf_path.name, page_number))

    print(f"Extracted {len(all_chunks)} chunks from {len(pdf_files)} documents")

    model = SentenceTransformer(EMBEDDING_MODEL)
    texts = [c["text"] for c in all_chunks]
    embeddings = model.encode(texts, show_progress_bar=True, convert_to_numpy=True)

    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings.astype(np.float32))

    faiss.write_index(index, str(INDEX_PATH))
    with open(METADATA_PATH, "w") as f:
        json.dump(all_chunks, f)

    print(f"Index saved to {INDEX_PATH}")
    print(f"Metadata saved to {METADATA_PATH}")


if __name__ == "__main__":
    build_index()