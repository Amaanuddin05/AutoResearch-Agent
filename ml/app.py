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
def summarize_pdf(data: PDFData):
    path = data.path
    metadata = data.metadata or {}

    if not path or not os.path.exists(path):
        return {"error": "Invalid or missing PDF path"}

    doc = fitz.open(path)
    full_text = "".join(page.get_text() for page in doc)
    doc.close()

    if not full_text.strip():
        return {"error": "No readable text extracted from PDF"}

    chunk_size = 4000
    chunks = [full_text[i:i + chunk_size] for i in range(0, len(full_text), chunk_size)]
    print(f"📄 Total chunks: {len(chunks)}")

    partial_summaries = []
    for idx, chunk in enumerate(chunks, 1):
        print(f"⚙️ Summarizing chunk {idx}/{len(chunks)}...")
        prompt = f"Summarize the following section of a research paper in academic tone:\n\n{chunk}"
        summary = llm.invoke(prompt)
        partial_summaries.append(summary.strip())

    combined_summary = "\n".join(partial_summaries)
    final_prompt = f"""
    You are an expert AI research summarizer.
    Combine all partial summaries into this JSON schema:
    {{
        "abstract": "...",
        "objectives": ["..."],
        "methodology": "...",
        "findings": "...",
        "limitations": "...",
        "key_points": ["..."]
    }}
    Ensure valid JSON only.

    Summaries:
    {combined_summary}
    """
    final_summary = llm.invoke(final_prompt)

    # Use robust JSON extraction
    extracted = extract_json_from_text(final_summary)
    if extracted is not None:
        summary_json = extracted
    else:
        # fallback to raw text
        summary_json = {"raw_summary": final_summary}

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
        analysis_jobs[job_id] = {"status": "processing", "progress": 0, "message": "Starting..."}
        
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

        # Summarize
        analysis_jobs[job_id]["message"] = "Summarizing paper..."
        analysis_jobs[job_id]["progress"] = 20
        
        # We need to modify summarize_pdf to report progress or just estimate
        # For now, we'll just call it synchronously as it was
        summary_data = summarize_pdf(data)
        
        if "error" in summary_data:
            analysis_jobs[job_id] = {"status": "failed", "error": summary_data["error"]}
            return

        analysis_jobs[job_id]["progress"] = 60
        analysis_jobs[job_id]["message"] = "Extracting insights..."

        # Build normalized summary text
        summary_text = (
            normalize_text(summary_data.get("abstract", "")) + "\n" +
            normalize_text(summary_data.get("objectives", "")) + "\n" +
            normalize_text(summary_data.get("methodology", "")) + "\n" +
            normalize_text(summary_data.get("findings", "")) + "\n" +
            normalize_text(summary_data.get("limitations", "")) + "\n" +
            normalize_text(summary_data.get("key_points", []))
        )

        result = extract_insights(SummaryData(summary=summary_text))
        insights = result.get("insights", result)

        analysis_jobs[job_id]["progress"] = 80
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
            analysis_jobs[job_id]["message"] = "Enriching content..."
            # Run enrichment synchronously here or spawn another task? 
            # Since we are already in a background task, we can run it here or just let it be.
            # But to show 100% only when done, let's run it here.
            enrich_paper(uid, summary_text, insights, full_text, summary_data["meta"])

        analysis_jobs[job_id]["progress"] = 100
        analysis_jobs[job_id]["status"] = "completed"
        analysis_jobs[job_id]["result"] = {"summary": summary_data, "insights": insights}
        print(f"✅ Job {job_id} completed.")

    except Exception as e:
        print(f"❌ Job {job_id} failed: {e}")
        analysis_jobs[job_id] = {"status": "failed", "error": str(e)}


@app.post("/analyze_paper")
def analyze_paper(data: PDFData, background_tasks: BackgroundTasks):
    if not data.uid:
        raise HTTPException(400, "UID missing")
    job_id = str(uuid.uuid4())
    background_tasks.add_task(process_analysis, job_id, data.uid, data, background_tasks)
    return {"job_id": job_id, "status": "processing"}


@app.get("/analysis_status/{job_id}")
def get_analysis_status(job_id: str):
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


# =============== 5️⃣ DEBUG ENDPOINT ===============

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
