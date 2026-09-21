import json
import os
from pathlib import Path

import faiss
import numpy as np
import google.generativeai as genai
from google.generativeai.generative_models import GenerativeModel
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).parent

INDEX_PATH = BASE_DIR /"data" / "index.faiss"
METADATA_PATH = BASE_DIR /"data" / "metadata.json"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
TOP_K = 4

SYSTEM_PROMPT = """You are a municipal solid waste management assistant.
Answer only using the provided context excerpts. If the context does not
contain the answer, say so explicitly instead of guessing. Always cite
which document and page each part of your answer comes from."""

_model = None
_index = None
_metadata = None


def _load():
    global _model, _index, _metadata
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
        _index = faiss.read_index(str(INDEX_PATH))
        with open(METADATA_PATH) as f:
            _metadata = json.load(f)


def retrieve(query, top_k=TOP_K):
    _load()
    assert _model is not None
    query_embedding = _model.encode([query], convert_to_numpy=True).astype(np.float32)
    assert _index is not None
    distances, indices = _index.search(query_embedding, top_k)
    return [_metadata[i] for i in indices[0] if i != -1] # type: ignore


def build_context(chunks):
    parts = []
    for c in chunks:
        parts.append(f"[{c['source']}, page {c['page']}]\n{c['text']}")
    return "\n\n".join(parts)


def answer(query):
    chunks = retrieve(query)
    context = build_context(chunks)

    genai.configure(api_key=os.environ.get("GEMINI_API_KEY")) # type: ignore
    model = GenerativeModel(
        "gemini-3-flash-preview",
        system_instruction=SYSTEM_PROMPT,
    )
    response = model.generate_content(f"Context:\n{context}\n\nQuestion: {query}")

    return {
        "answer": response.text,
        "sources": [{"document": c["source"], "page": c["page"]} for c in chunks],
    }