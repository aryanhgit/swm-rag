# Municipal Solid Waste Management Assistant

A retrieval-augmented (RAG) assistant that answers questions about solid waste management rules and policy using official government documents as its only source of truth. Built for the 1M1B AI for Sustainability Virtual Internship (SDG 12 : Responsible Consumption and Production).

## Overview

Citizens and municipal staff need quick, accurate answers to waste management questions : how to segregate waste, what the buffer zone rules are, which industries can use RDF : but the source material is scattered across dense PDF documents. This assistant retrieves the relevant passages from those documents and generates a grounded, cited answer, so every response can be traced back to an exact source and page.

The system is intentionally a single pipeline: no model is trained, no tabular dataset is built. Documents go in, embeddings and retrieval come out, and an LLM writes the final answer strictly from retrieved context.

## Features

- **Grounded Q&A** : answers are generated only from retrieved document excerpts, with the source document and page cited alongside every response
- **Markdown-aware responses** : bold text, bullet lists, and inline code from the model's output are rendered as real HTML, not raw markdown syntax
- **Sample questions** : one-click prompts covering each source document, for quick testing and demos
- **Waste statistics panel** : national-level waste generation/processing figures with a chart, for context alongside the assistant
- **Query history** : past questions and answers are saved locally in the browser and can be revisited instantly without a new API call
- **Minimal frontend** : a single self-contained HTML file, no build step or framework

## Tech Stack

| Layer | Technology |
|---|---|
| PDF parsing | pypdf |
| Embeddings | sentence-transformers (`all-MiniLM-L6-v2`) |
| Vector store | FAISS |
| LLM | Google Gemini (`gemini-3-flash-preview`) |
| Backend | Flask + Flask-CORS |
| Frontend | Vanilla HTML/CSS/JS, Chart.js (CDN) |

## Project Structure

```
waste_rag/
├── documents/              # source PDFs 
├── frontend/
│   └── index.html          # UI: search, stats panel, history sidebar
├── ingest.py                # PDF → chunks → embeddings → FAISS index
├── rag.py              # retrieval + Gemini generation
├── app.py                    # Flask API (/query endpoint)
├── requirements.txt
└── README.md
```

Running `ingest.py` additionally generates `index.faiss` and `metadata.json` in the project root : these are the built index and are not checked in, since they're regenerated from `documents/`.

## Documents / Data Sources

Place these (or equivalent) PDFs in `documents/` before running `ingest.py`:

- `2016_Salient_features_SWM_Rules.pdf`
- `2026_Salient_features_SWM_Rules.pdf`
- `Environmental Standards for Ambient Air, Automobiles, Fuels, Industries and Noise.pdf`
- `Provision of Buffer Zone Around Waste Processing & Disposal Facilities.pdf`
- `Usage of RDF (Refused Derived Fuel) in Various Industries.pdf`

The statistics panel figures are sourced separately from CPCB / CSE's "State of Waste in India" report (FY 2023–24) and are hardcoded in the frontend rather than retrieved from a document.

## Installation

```
pip install -r requirements.txt
```

Set your Gemini API key:

```
export GEMINI_API_KEY=your_key_here
```

## Usage

1. Add PDFs to `documents/`
2. Build the index:
   ```
   python ingest.py
   ```
3. Test retrieval directly (optional):
   ```
   python rag.py
   ```
4. Start the API:
   ```
   python app.py
   ```
5. Open `frontend/index.html` in a browser

Example request:

```
curl -X POST http://localhost:5000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the minimum buffer zone around a waste processing facility?"}'
```

## RAG Pipeline

1. **Extract** : `ingest.py` reads each PDF page by page with `pypdf`
2. **Chunk** : page text is split into ~700-character chunks with 100-character overlap, tagged with source document and page number
3. **Embed** : each chunk is embedded locally with `all-MiniLM-L6-v2` (no API call required for this step)
4. **Index** : embeddings are stored in a FAISS flat index; chunk text and metadata are stored separately in `metadata.json`
5. **Retrieve** : at query time, the question is embedded and the top-4 nearest chunks are retrieved
6. **Generate** : retrieved chunks are passed to Gemini with a system prompt instructing it to answer only from the given context and cite the source; if the context doesn't contain the answer, it says so rather than guessing

## Configuration

| Setting | Location | Default |
|---|---|---|
| Chunk size / overlap | `ingest.py` | 700 / 100 characters |
| Embedding model | `ingest.py`, `rag.py` | `all-MiniLM-L6-v2` |
| Retrieved chunks (top-k) | `rag.py` | 4 |
| LLM model | `rag.py` | `gemini-3-flash-preview` |
| API port | `app.py` | 5000 |
| API base URL (frontend) | `frontend/index.html` (`API_URL`) | `http://localhost:5000/query` |

Swapping the LLM: the generation call is isolated to a single block in `rag.py`, so switching to another provider (e.g. IBM Granite via watsonx.ai, for closer alignment with the internship's IBM SkillsBuild branding) only requires replacing that block : retrieval logic is unaffected.

## Limitations

- Scanned/image-only PDF pages return no extractable text and are silently skipped
- Fixed-size chunking can split a rule or clause across two chunks, occasionally losing context
- No authentication or rate limiting on the API : intended for local/demo use, not public deployment
- History and statistics are stored/displayed client-side only; nothing is persisted server-side
- English-language documents only; no verified multilingual support

## Future Improvements

- OCR fallback for scanned documents
- Semantic or section-aware chunking instead of fixed character length
- Answer feedback (helpful / not helpful) to track response quality
- Multilingual query support
- Basic auth or rate limiting if deployed beyond local demo use

## License

For internship submission use (1M1B AI for Sustainability Virtual Internship, in collaboration with IBM SkillsBuild & AICTE). No license specified for reuse beyond this context.