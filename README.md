# Municipal Waste Management RAG

## Setup
```
pip install -r requirements.txt
```
Set your API key:
```
export GEMINI_API_KEY=your_key_here
```

## Step 1 — Add your documents
Drop your downloaded PDFs (SWM Rules 2016, municipal bylaws, sanitation guidelines) into `documents/`.

## Step 2 — Build the index
```
python ingest.py
```
This extracts text, chunks it, embeds each chunk, and saves `index.faiss` + `metadata.json`.

## Step 3 — Query directly (fastest way to test)
```
python rag_query.py
```
Edit the sample question at the bottom of `rag_query.py` to try your own.

## Step 4 — Run as an API
```
python app.py
```
Then:
```
curl -X POST http://localhost:5000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the fine for not segregating waste at source?"}'
```

## Step 5 — Frontend
Open `frontend/index.html` directly in your browser (no server needed for the page itself) while `python app.py` is running. It calls `http://localhost:5000/query` and displays the grounded answer with source citations as chips.

## For the deliverable
Take a screenshot of a `rag_query.py` run (or the curl response) showing:
question → retrieved source/page → grounded answer. That's your "RAG demo" prototype — no frontend needed.

## Swapping the LLM
`rag_query.py` currently calls the Gemini API. If you want closer alignment with the internship's IBM SkillsBuild branding, swap the `genai.GenerativeModel(...)` block for a watsonx.ai call to an IBM Granite model — the retrieval and prompt-building logic above stays identical.