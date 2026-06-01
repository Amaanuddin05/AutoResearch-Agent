from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from langchain_ollama import OllamaLLM
import fitz  # PyMuPDF
import os, re, json, requests, uuid
import tempfile
from vector_store import vector_store
from summarizer_agent import extract_section_summaries, rewrite_paragraphs, extract_concepts
from chat_agent import generate_rag_response

app = FastAPI(title="AutoResearch Summarizer + Insight Service")

llm = OllamaLLM(
    model="llama3:8b",
    base_url="http://100.74.147.124:11434"
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:4200"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============== UTILITY FUNCTIONS ===============

def extract_json_from_text(text: str):
    """
    Tries to extract the first valid JSON object from text.
    Strategy:
    - find first '{', then find matching '}' by scanning (keeps nesting).
    - fallback: take substring from first '{' to last '}'.
    - Finally, try json.loads and return result or None.
    """
    if not text or "{" not in text:
        return None
    start = text.find("{")
    # scan to find matching closing brace considering nested braces
    depth = 0
    end = None
    for i in range(start, len(text)):
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i
                break
    candidate = None
    if end:
        candidate = text[start:end+1]
    else:
        # fallback: from first '{' to last '}'
        last = text.rfind("}")
        if last > start:
            candidate = text[start:last+1]

    if candidate:
        try:
            return json.loads(candidate)
        except Exception:
            # last resort: try to replace single quotes then parse (dangerous)
            try:
                return json.loads(candidate.replace("'", "\""))
            except Exception:
                return None
    return None

def normalize_text(value):
    """Normalize various data types to string for embedding."""
    if isinstance(value, list):
        return " ".join(map(str, value))
    if isinstance(value, dict):
        # if dict contains lists for core fields, convert them
        return " ".join([normalize_text(v) for v in value.values()])
    return str(value or "")

def download_pdf(pdf_url: str) -> str:
    """Downloads a PDF to a temporary local file and returns the path."""
    try:
        resp = requests.get(pdf_url, timeout=30, allow_redirects=True, stream=True)
        if resp.status_code == 200:
            # accept any 200 content but check extension or content-type if available
            content_type = resp.headers.get("content-type", "")
            if 'pdf' in content_type.lower() or pdf_url.lower().endswith('.pdf') or len(resp.content) > 100:
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
                temp_file.write(resp.content)
                temp_file.close()
                return temp_file.name
    except Exception as e:
        print(f"⚠️ Failed to download PDF: {e}")
    return ""

# =============== DATA MODELS ===============

class TextData(BaseModel):
    text: str

class PDFData(BaseModel):
    path: str
    metadata: dict | None = None
    uid: str | None = None # Optional for now, but should be required

class SummaryData(BaseModel):
    summary: str

class PaperStoreRequest(BaseModel):
    title: str
    summary: str
    insights: dict
    metadata: dict
    uid: str

class PaperQueryRequest(BaseModel):
    query: str
    n_results: int = 3
    uid: str

class ChatRequest(BaseModel):
    message: str
    context_ids: list[str] | None = None
    uid: str


# =============== ROOT ROUTE ===============

@app.get("/")
def root():
    return {"message": "AutoResearch Summarizer + Insight Service running ✅"}


# =============== 1️⃣ SUMMARIZATION ENDPOINTS ===============

@app.post("/summarize")
def summarize_text(data: TextData):
    text = data.text.strip()
    if not text:
        return {"error": "Empty input text"}

    prompt = f"Summarize the following research text in concise academic tone:\n\n{text[:2000]}"
    result = llm.invoke(prompt)
    return {"summary": result.strip()}


@app.post("/structured_summary")
def summarize_pdf(data: PDFData, job_id: str = None):
    """
    Summarize a PDF. If job_id is provided, updates analysis_jobs[job_id] with
    per-chunk progress so the frontend can show a live bar.
    Progress range used: 10% (start) → 55% (all chunks done) → 60% (JSON merged).
    """
    path = data.path
    metadata = data.metadata or {}

    def _set_progress(pct: int, msg: str, processed: int = None, total: int = None):
        if job_id and job_id in analysis_jobs:
            analysis_jobs[job_id]["progress"] = pct
            analysis_jobs[job_id]["message"] = msg
            if processed is not None:
                analysis_jobs[job_id]["processedChunks"] = processed
            if total is not None:
                analysis_jobs[job_id]["totalChunks"] = total

    if not path or not os.path.exists(path):
        return {"error": "Invalid or missing PDF path"}

    doc = fitz.open(path)
    full_text = "".join(page.get_text() for page in doc)
    doc.close()

    if not full_text.strip():
        return {"error": "No readable text extracted from PDF"}

    # Larger chunks = fewer LLM calls = less Ollama context exhaustion
    CHUNK_SIZE = 6000
    MAX_CHUNKS = 8      # hard cap: never call the LLM more than 8 times per paper
    chunks = [full_text[i:i + CHUNK_SIZE] for i in range(0, len(full_text), CHUNK_SIZE)]
    chunks = chunks[:MAX_CHUNKS]  # drop tail chunks if paper is very long
    total_chunks = len(chunks)
    print(f"📄 Total chunks (capped at {MAX_CHUNKS}): {total_chunks}")

    # Progress band for chunking: 10% → 90% (80 points spread across chunks)
    CHUNK_START = 10
    CHUNK_END   = 90

    import time
    partial_summaries = []
    for idx, chunk in enumerate(chunks, 1):
        chunk_pct = CHUNK_START + int((idx - 1) / total_chunks * (CHUNK_END - CHUNK_START))
        _set_progress(
            chunk_pct,
            f"Summarizing chunk {idx} of {total_chunks}...",
            processed=idx - 1,
            total=total_chunks
        )
        print(f"⚙️ Summarizing chunk {idx}/{total_chunks}... (progress={chunk_pct}%)")
        prompt = f"Summarize the following section of a research paper in academic tone:\n\n{chunk}"
        summary = llm.invoke(prompt)
        partial_summaries.append(summary.strip())
        _set_progress(
            CHUNK_START + int(idx / total_chunks * (CHUNK_END - CHUNK_START)),
            f"Summarizing chunk {idx} of {total_chunks}...",
            processed=idx,
            total=total_chunks
        )
        if idx < total_chunks:   # no sleep after the last chunk
            time.sleep(1)       # give Ollama breathing room between calls

    # ── DEBUG: inspect chunk results ──────────────────────────────────────
    print(f"[DEBUG] Total chunk summaries collected: {len(partial_summaries)}")
    for i, s in enumerate(partial_summaries):
        print(f"[DEBUG] Chunk {i+1} summary ({len(s)} chars): {s[:120]}...")

    if job_id and job_id in analysis_jobs:
        analysis_jobs[job_id]["processedChunks"] = 0
        analysis_jobs[job_id]["totalChunks"] = 0

    _set_progress(CHUNK_END, "Merging summaries into structured JSON...")
    combined_summary = "\n".join(partial_summaries)
    print(f"[DEBUG] Combined summary length before truncation: {len(combined_summary)} chars")

    # Cap combined_summary to 5000 chars — leaves room for the prompt instructions
    MAX_MERGE_CHARS = 5000
    if len(combined_summary) > MAX_MERGE_CHARS:
        print(f"[DEBUG] ⚠️ Truncating combined_summary from {len(combined_summary)} to {MAX_MERGE_CHARS} chars")
        combined_summary = combined_summary[:MAX_MERGE_CHARS]

    print(f"[DEBUG] FINAL MERGED SUMMARY (first 500 chars):\n{combined_summary[:500]}")

    final_prompt = f"""
    You are an expert AI research summarizer.
    Combine all partial summaries into this JSON schema.
    Output raw JSON only — no markdown, no code fences, no explanation.
    {{
        "abstract": "...",
        "objectives": ["..."],
        "methodology": "...",
        "findings": "...",
        "limitations": "...",
        "key_points": ["..."]
    }}

    Summaries:
    {combined_summary}
    """
    final_summary = llm.invoke(final_prompt)

    _set_progress(92, "Parsing structured summary...")

    # ── DEBUG: raw LLM output ──────────────────────────────────────────────
    print(f"[DEBUG] RAW FINAL LLM OUTPUT:\n{final_summary}")

    # Strip markdown fences before parsing
    cleaned_final = re.sub(r"```(?:json)?\s*", "", final_summary).replace("```", "").strip()

    # Use robust JSON extraction
    extracted = extract_json_from_text(cleaned_final)
    if extracted is not None:
        summary_json = extracted
        print(f"[DEBUG] ✅ JSON extracted successfully. Keys: {list(summary_json.keys())}")
    else:
        print(f"[DEBUG] ⚠️ JSON extraction failed. Storing as raw_summary.")
        # fallback: store full combined_summary as plain text so document is not empty
        summary_json = {"raw_summary": combined_summary or final_summary}

    summary_json["meta"] = {
        "title": metadata.get("title", os.path.basename(path).replace(".pdf", "")),
        "authors": metadata.get("authors", "Unknown"),
        "pdf_url": metadata.get("pdf_url", "N/A"),
        "published": metadata.get("published", "N/A"),
    }

    print(f"✅ Summary generated for: {summary_json['meta']['title']}")
    return summary_json


# =============== 2️⃣ INSIGHT AGENT INTEGRATION ===============

@app.post("/extract_insights")
def extract_insights(data: SummaryData):
    summary = data.summary.strip()
    if not summary:
        return {"error": "Empty summary input"}

    prompt = f"""
    You are an AI research analyst.
    Extract the following structured insights from the summary below.
    Return valid JSON in this schema:
    {{
        "findings": ["..."],
        "methods": ["..."],
        "datasets": ["..."],
        "citations": ["..."],
        "implications": ["..."]
    }}

    Summary:
    {summary}
    """
    result = llm.invoke(prompt)

    # Use robust JSON extraction
    extracted = extract_json_from_text(result)
    if extracted is not None:
        insights = extracted
    else:
        # fallback to raw output
        insights = {"raw_output": result}

    return {"insights": insights}


# =============== ENRICHMENT PIPELINE ===============

def explode_insights(insights: dict) -> list:
    """
    Converts insights dictionary into a list of atomic chunks.
    """
    chunks = []
    # Map insight keys to meaningful chunk types
    key_map = {
        "findings": "finding",
        "methods": "method",
        "datasets": "dataset",
        "limitations": "limitation",
        "implications": "implication",
        "citations": "citation"
    }
    
    for key, items in insights.items():
        if isinstance(items, list):
            chunk_type = key_map.get(key, "insight")
            for item in items:
                if isinstance(item, str) and len(item) > 10:
                    chunks.append({
                        "chunk_type": chunk_type,
                        "content": item
                    })
    return chunks


def enrich_paper(uid: str, summary: str, insights: dict, full_text: str, metadata: dict):
    """
    Background task to run the full enrichment pipeline.
    """
    print(f" Starting enrichment for: {metadata.get('title', 'Unknown')} (User: {uid})")
    
    all_chunks = []
    
    # 1. Section Summaries
    if full_text:
        sections = extract_section_summaries(full_text)
        for sec in sections:
            all_chunks.append({
                "chunk_type": "section_summary",
                "section": sec.get("section"),
                "content": sec.get("content")
            })
            
    # 2. Paragraph Rewrites
    if full_text:
        rewrites = rewrite_paragraphs(full_text)
        for i, rw in enumerate(rewrites):
            all_chunks.append({
                "chunk_type": "paragraph_rewrite",
                "paragraph_index": i,
                "content": rw
            })
            
    # 3. Explode Insights
    insight_chunks = explode_insights(insights)
    all_chunks.extend(insight_chunks)
    
    # 4. Concept Nodes
    concepts = extract_concepts(summary)
    for c in concepts:
        content = f"{c.get('concept')}: {c.get('description')}"
        all_chunks.append({
            "chunk_type": "concept",
            "content": content
        })
        
    # 5. Store all chunks
    if all_chunks:
        vector_store.store_enriched_chunks(uid, all_chunks, metadata)
        print(f" Enrichment completed for: {metadata.get('title')}")
    else:
        print("No enrichment chunks generated.")



# =============== 3️⃣ FULL PIPELINE ===============

# =============== 3️⃣ FULL PIPELINE (ASYNC) ===============

analysis_jobs = {}

def process_analysis(job_id: str, uid: str, data: PDFData, background_tasks: BackgroundTasks):
    try:
        print(f"🚀 Starting background analysis for job {job_id} (User: {uid})...")
        analysis_jobs[job_id] = {
            "status": "processing", 
            "progress": 0, 
            "message": "Starting...",
            "processedChunks": 0,
            "totalChunks": 0
        }
        
        pdf_path = data.path
        if pdf_path.startswith("http"):
            analysis_jobs[job_id]["message"] = "Downloading PDF..."
            pdf_path = download_pdf(pdf_path)
            if not pdf_path:
                analysis_jobs[job_id] = {"status": "failed", "error": "Failed to download PDF"}
                return

        data.path = pdf_path
        
        # Extract full text
        analysis_jobs[job_id]["message"] = "Extracting text..."
        analysis_jobs[job_id]["progress"] = 10
        
        full_text = ""
        try:
            doc = fitz.open(pdf_path)
            full_text = "".join(page.get_text() for page in doc)
            doc.close()
        except Exception as e:
            print(f"⚠️ Failed to extract text: {e}")

        # Summarize — pass job_id so summarize_pdf can emit per-chunk progress
        analysis_jobs[job_id]["message"] = "Starting summarization..."
        analysis_jobs[job_id]["progress"] = 10
        summary_data = summarize_pdf(data, job_id=job_id)
        
        if "error" in summary_data:
            analysis_jobs[job_id] = {"status": "failed", "error": summary_data["error"]}
            return

        analysis_jobs[job_id]["progress"] = 94
        analysis_jobs[job_id]["message"] = "Extracting insights..."

        # Build normalized summary text from structured fields.
        # If the LLM returned N/A defaults (parse failed), fall back to raw_summary.
        PLACEHOLDER = {"N/A", "n/a", "", None}

        abstract    = summary_data.get("abstract", "")
        objectives  = summary_data.get("objectives", [])
        methodology = summary_data.get("methodology", "")
        findings    = summary_data.get("findings", "")
        limitations = summary_data.get("limitations", "")
        key_points  = summary_data.get("key_points", [])
        raw_summary = summary_data.get("raw_summary", "")

        structured_parts = [
            normalize_text(abstract),
            normalize_text(objectives),
            normalize_text(methodology),
            normalize_text(findings),
            normalize_text(limitations),
            normalize_text(key_points),
        ]
        summary_text = "\n".join(
            p for p in structured_parts if p and p.strip() not in PLACEHOLDER
        ).strip()

        # ── DEBUG ────────────────────────────────────────────────────────
        print(f"[DEBUG] summary_data keys: {list(summary_data.keys())}")
        print(f"[DEBUG] abstract  : {str(abstract)[:120]}")
        print(f"[DEBUG] objectives: {str(objectives)[:120]}")
        print(f"[DEBUG] methodology: {str(methodology)[:120]}")
        print(f"[DEBUG] findings  : {str(findings)[:120]}")
        print(f"[DEBUG] summary_text length: {len(summary_text)} chars")
        print(f"[DEBUG] summary_text (first 400): {summary_text[:400]}")

        # If all structured fields were N/A placeholders, use raw_summary
        if not summary_text and raw_summary:
            print("[DEBUG] ⚠️ Structured fields empty — falling back to raw_summary for insight input")
            summary_text = normalize_text(raw_summary)

        if not summary_text:
            print("[DEBUG] ❌ summary_text is still empty after fallback — skipping insight agent, using empty defaults")
            insights = {
                "findings": [],
                "methods": [],
                "datasets": [],
                "citations": [],
                "implications": []
            }
        else:
            result = extract_insights(SummaryData(summary=summary_text))
            insights = result.get("insights", result)
            # Guard: if insight agent returned an error dict, replace with safe defaults
            if isinstance(insights, dict) and "error" in insights:
                print(f"[DEBUG] ⚠️ Insight agent returned error: {insights['error']} — using empty defaults")
                insights = {
                    "findings": [],
                    "methods": [],
                    "datasets": [],
                    "citations": [],
                    "implications": []
                }
        print(f"[DEBUG] insights result: {str(insights)[:300]}")

        analysis_jobs[job_id]["progress"] = 96
        analysis_jobs[job_id]["message"] = "Storing in database..."

        doc_id = summary_data["meta"].get("id") or summary_data["meta"].get("doc_id")
        
        try:
            paper_uid = vector_store.add_paper_to_db(
                uid=uid,
                title=summary_data["meta"]["title"],
                summary=summary_text,
                insights=insights,
                metadata=summary_data["meta"],
                doc_id=doc_id
            )
            if paper_uid:
                summary_data["meta"]["doc_id"] = paper_uid
        except Exception as e:
            print("⚠️ Could not store in ChromaDB:", e)

        # Trigger enrichment
        if full_text and summary_text and summary_data["meta"].get("doc_id"):
            analysis_jobs[job_id]["message"] = "Enriching content (background)..."
            analysis_jobs[job_id]["progress"] = 98
            enrich_paper(uid, summary_text, insights, full_text, summary_data["meta"])

        analysis_jobs[job_id]["progress"] = 100
        analysis_jobs[job_id]["status"] = "completed"
        analysis_jobs[job_id]["message"] = "Done!"
        analysis_jobs[job_id]["processedChunks"] = 0
        analysis_jobs[job_id]["totalChunks"] = 0
        analysis_jobs[job_id]["result"] = {"summary": summary_data, "insights": insights}
        print(f"✅ Job {job_id} completed.")

    except Exception as e:
        print(f"❌ Job {job_id} failed: {e}")
        analysis_jobs[job_id] = {"status": "failed", "error": str(e)}
    finally:
        # Delete temp file if it was copied
        if data.path and data.path.startswith(tempfile.gettempdir()):
            try:
                os.unlink(data.path)
                print(f"🧹 Cleaned up temp upload PDF: {data.path}")
            except Exception as e:
                print("Failed to delete temp file:", e)


@app.post("/analyze_paper")
def analyze_paper(data: PDFData, background_tasks: BackgroundTasks):
    if not data.uid:
        raise HTTPException(400, "UID missing")
        
    # Copy the file to a safe temp file so that the original file can be deleted safely by Express
    if data.path and os.path.exists(data.path) and not data.path.startswith("http"):
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        with open(data.path, "rb") as src, open(temp_file.name, "wb") as dst:
            dst.write(src.read())
        data.path = temp_file.name

    job_id = str(uuid.uuid4())
    background_tasks.add_task(process_analysis, job_id, data.uid, data, background_tasks)
    return {"job_id": job_id, "status": "processing"}


@app.get("/analysis_status/{job_id}")
async def get_analysis_status(job_id: str):
    job = analysis_jobs.get(job_id)
    if not job:
        return {"status": "not_found"}
    return job


# =============== 4️⃣ CHROMA DB STORAGE & SEARCH ===============

@app.post("/store_paper")
def store_paper(data: PaperStoreRequest, background_tasks: BackgroundTasks):
    try:
        if not data.uid:
            raise HTTPException(400, "UID missing")

        doc_id = data.metadata.get("id") or data.metadata.get("doc_id")
        
        paper_uid = vector_store.add_paper_to_db(
            uid=data.uid,
            title=data.title,
            summary=data.summary,
            insights=data.insights,
            metadata=data.metadata,
            doc_id=doc_id
        )
        
        if paper_uid:
            data.metadata["doc_id"] = paper_uid

        # For /store_paper, we might not have full_text if it wasn't passed.
        # But looking at the existing code, /store_paper is usually called after /analyze_paper 
        # or from a context where we might want to re-download if possible.
        # However, the user request says: "run_enrichment_pipeline(summary, insights, full_pdf_text, metadata)"
        # The PaperStoreRequest doesn't have full_text.
        # We can try to download if pdf_url is in metadata.
        
        pdf_url = data.metadata.get("pdf_url")
        if pdf_url and pdf_url != "N/A":
            # We need to fetch text. This might be slow, so definitely background it.
            def fetch_and_enrich(uid, url, summary, insights, meta):
                print("Downloading PDF for enrichment...")
                path = download_pdf(url)
                if path:
                    try:
                        doc = fitz.open(path)
                        text = "".join(page.get_text() for page in doc)
                        doc.close()
                        os.remove(path) # Clean up
                        enrich_paper(uid, summary, insights, text, meta)
                    except Exception as e:
                        print(f"Failed to extract text for enrichment: {e}")
                else:
                    print("Failed to download PDF for enrichment")

            background_tasks.add_task(fetch_and_enrich, data.uid, pdf_url, data.summary, data.insights, data.metadata)
        else:
            # If no PDF, we can still do concept extraction and insight explosion
            background_tasks.add_task(enrich_paper, data.uid, data.summary, data.insights, "", data.metadata)

        return {"message": f"Stored '{data.title}' in ChromaDB successfully ✅ (Enrichment started)"}
    except Exception as e:
        return {"error": str(e)}


@app.post("/search_papers")
def search_papers(data: PaperQueryRequest):
    try:
        if not data.uid:
            raise HTTPException(400, "UID missing")
        results = vector_store.query_papers(data.uid, data.query, data.n_results)
        return results
    except Exception as e:
        return {"error": str(e)}


@app.post("/chat_rag")
def chat_rag(data: ChatRequest):
    """
    RAG Chat endpoint.
    Retrieves enriched chunks, compresses context, and generates answer.
    """
    try:
        if not data.uid:
            raise HTTPException(400, "UID missing")
        response = generate_rag_response(data.uid, data.message, data.context_ids)
        return response
    except Exception as e:
        print(f"⚠️ Chat RAG error: {e}")
        return {"error": str(e)}


@app.get("/get_enriched_paper/{paper_id}")
def get_enriched_paper(paper_id: str, uid: str):
    """
    Fetch a paper and all its enriched chunks.
    Returns structured data organized by chunk type.
    """
    try:
        if not uid:
            raise HTTPException(400, "UID missing")
        if not paper_id:
            raise HTTPException(400, "paper_id missing")
        
        result = vector_store.get_enriched_paper(uid, paper_id)
        
        if not result:
            raise HTTPException(404, f"Paper {paper_id} not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"⚠️ Error fetching enriched paper: {e}")
        return {"error": str(e)}


# =============== 5️⃣ CLEANUP ORPHANS ===============

@app.delete("/cleanup_orphans")
def cleanup_orphans(uid: str):
    """
    Find and delete all paper entries in ChromaDB that have zero enriched chunks.
    These are papers where the enrichment pipeline failed or never ran, so RAG
    always falls back to the general LLM with 'No relevant chunks found'.

    Returns:
      - deleted_ids: list of doc_ids removed from ChromaDB
      - kept_ids:    list of doc_ids that had chunks and were kept
    """
    if not uid:
        raise HTTPException(400, "uid is required")

    try:
        collection = vector_store.get_collection(uid)

        # 1. Fetch every paper entry for this user
        paper_results = collection.get(
            where={"entry_type": "paper"},
            include=["metadatas", "documents"]
        )

        paper_ids   = paper_results.get("ids", [])
        paper_metas = paper_results.get("metadatas", [])

        if not paper_ids:
            return {"message": "No papers found for this user.", "deleted_ids": [], "kept_ids": []}

        deleted_ids = []
        kept_ids    = []

        for i, pid in enumerate(paper_ids):
            meta    = paper_metas[i] if i < len(paper_metas) else {}
            doc_id  = meta.get("doc_id") or pid
            title   = meta.get("title", "Untitled")

            # 2. Count enriched chunks linked to this paper
            try:
                chunk_results = collection.get(
                    where={"$and": [
                        {"entry_type": "chunk"},
                        {"doc_id": doc_id}
                    ]},
                    include=[]   # only need IDs — no document content needed
                )
                chunk_count = len(chunk_results.get("ids", []))
            except Exception as e:
                print(f"⚠️ Could not count chunks for {doc_id}: {e}")
                chunk_count = 0

            if chunk_count == 0:
                # 3. Orphan — delete the paper entry itself from ChromaDB
                print(f"🗑️ Orphan detected: '{title}' (doc_id={doc_id}, chroma_id={pid}) → deleting")
                try:
                    # Delete by ChromaDB internal ID
                    collection.delete(ids=[pid])
                    # Also sweep by doc_id metadata in case of duplicate entries
                    collection.delete(where={"doc_id": doc_id})
                except Exception as e:
                    print(f"⚠️ Failed to delete orphan {doc_id}: {e}")
                deleted_ids.append(doc_id)
            else:
                print(f"✅ Kept: '{title}' (doc_id={doc_id}, chunks={chunk_count})")
                kept_ids.append(doc_id)

        return {
            "message": f"Cleanup complete. {len(deleted_ids)} orphan(s) removed from ChromaDB.",
            "deleted_ids": deleted_ids,
            "kept_ids":    kept_ids
        }

    except Exception as e:
        print(f"❌ cleanup_orphans error: {e}")
        raise HTTPException(500, str(e))


# =============== 6️⃣ DEBUG ENDPOINT ===============


@app.get("/debug_job/{job_id}")
def debug_job(job_id: str):
    """Debug endpoint: returns the full raw job dict for inspection."""
    job = analysis_jobs.get(job_id)
    if not job:
        return {"status": "not_found", "job_id": job_id}
    import json as _json
    # Pretty print to terminal as well
    print(f"\n{'='*60}")
    print(f"[DEBUG] Full job result for {job_id}:")
    print(_json.dumps(job, indent=2, default=str))
    print(f"{'='*60}\n")
    return job


@app.get("/debug_list_papers")
def debug_list_papers(uid: str, limit: int = 10):
    """Debug endpoint to inspect what's stored in ChromaDB for a user."""
    try:
        # Query for empty string retrieving top matches
        results = vector_store.query_papers(uid, " ", n_results=limit)
        return results
    except Exception as e:
        return {"error": str(e), "papers": []}


# =============== 6️⃣ FETCH PAPERS FROM ARXIV ===============

@app.get("/fetch_papers")
def fetch_papers(category: str = "cs.AI", max_results: int = 5):
    """
    Fetch latest research papers from arXiv.
    Example: /fetch_papers?category=cs.AI&max_results=10
    """
    base_url = "http://export.arxiv.org/api/query"
    params = {
        "search_query": f"cat:{category}",
        "start": 0,
        "max_results": max_results,
        "sortBy": "submittedDate",
        "sortOrder": "descending"
    }

    response = requests.get(base_url, params=params)
    if response.status_code != 200:
        return {"error": "Failed to fetch from arXiv"}

    import xml.etree.ElementTree as ET
    root = ET.fromstring(response.text)
    ns = {"atom": "http://www.w3.org/2005/Atom"}

    papers = []

    for entry in root.findall("atom:entry", ns):
        # --- Extract basic info ---
        title_el = entry.find("atom:title", ns)
        summary_el = entry.find("atom:summary", ns)
        title = title_el.text.strip() if title_el is not None else "Untitled"
        summary = summary_el.text.strip() if summary_el is not None else ""

        # --- Authors ---
        authors_list = []
        for a in entry.findall("atom:author", ns):
            name_el = a.find("atom:name", ns)
            if name_el is not None:
                authors_list.append(name_el.text)
        authors = ", ".join(authors_list) if authors_list else "Unknown"

        # --- Published Date ---
        published_el = entry.find("atom:published", ns)
        published = published_el.text[:10] if published_el is not None else "N/A"

        # --- Try to get PDF link ---
        pdf_url = None
        for link in entry.findall("atom:link", ns):
            href = link.attrib.get("href", "")
            title_attr = link.attrib.get("title", "").lower()
            type_attr = link.attrib.get("type", "")
            rel_attr = link.attrib.get("rel", "")

            if title_attr == "pdf" and href:
                pdf_url = href
                break
            if type_attr == "application/pdf" and href:
                pdf_url = href
                break
            if rel_attr == "related" and href.endswith(".pdf"):
                pdf_url = href
                break

        # --- Fallback: construct PDF link from arXiv ID ---
        if not pdf_url:
            id_el = entry.find("atom:id", ns)
            if id_el is not None and id_el.text:
                abs_url = id_el.text.strip()  # e.g. http://arxiv.org/abs/2401.12345
                if "/abs/" in abs_url:
                    pdf_url = abs_url.replace("/abs/", "/pdf/")
                    if not pdf_url.endswith(".pdf"):
                        pdf_url += ".pdf"
                else:
                    pdf_url = abs_url

        papers.append({
            "title": title,
            "summary": summary,
            "authors": authors,
            "publishedDate": published,
            "pdf_url": pdf_url or "N/A"
        })

    return {"papers": papers}

# =============== 7️⃣ DELETE PAPER FROM CHROMADB ===============

@app.delete("/delete_paper/{paper_id}")
def delete_paper(paper_id: str, uid: str):
    """
    Delete a paper permanently from ChromaDB by ID.
    """
    try:
        if not paper_id:
            return {"error": "Missing paper_id"}
        if not uid:
             raise HTTPException(400, "UID missing")

        vector_store.delete_paper(uid, paper_id)
        return {"message": f"Deleted paper {paper_id} successfully ✅"}
    except Exception as e:
        print("⚠️ Error deleting paper:", e)
        return {"error": str(e)}
