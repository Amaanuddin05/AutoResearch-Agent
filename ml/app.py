from fastapi import FastAPI
from pydantic import BaseModel
from langchain_ollama import OllamaLLM
import fitz  # PyMuPDF
import os, re, json

app = FastAPI(title="AutoResearch Summarizer + Insight Service")

llm = OllamaLLM(
    model="llama3:8b",
    base_url="http://192.168.1.36:11434"
)


class TextData(BaseModel):
    text: str


class PDFData(BaseModel):
    path: str
    metadata: dict | None = None


@app.get("/")
def root():
    return {"message": "AutoResearch Summarizer + Insight Service running ✅"}


# =============== 1️⃣ SUMMARIZATION ENDPOINTS ===============

@app.post("/summarize")
def summarize_text(data: TextData):
    """Summarize plain text."""
    text = data.text.strip()
    if not text:
        return {"error": "Empty input text"}

    prompt = f"Summarize the following research text in concise academic tone:\n\n{text[:2000]}"
    result = llm.invoke(prompt)
    return {"summary": result.strip()}


@app.post("/structured_summary")
def summarize_pdf(data: PDFData):
    """Summarize a research paper PDF into structured JSON."""
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

    match = re.search(r"\{.*\}", final_summary, re.DOTALL)
    try:
        summary_json = json.loads(match.group(0)) if match else {"raw_summary": final_summary}
    except json.JSONDecodeError:
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

class SummaryData(BaseModel):
    summary: str


@app.post("/extract_insights")
def extract_insights(data: SummaryData):
    """
    Extract structured insights (findings, methods, datasets, implications) from summary text.
    """
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

    match = re.search(r"\{.*\}", result, re.DOTALL)
    try:
        insights = json.loads(match.group(0)) if match else {"raw_output": result}
    except json.JSONDecodeError:
        insights = {"raw_output": result}

    return {"insights": insights}


# =============== 3️⃣ COMBINED END-TO-END ROUTE ===============

@app.post("/analyze_paper")
def analyze_paper(data: PDFData):
    """
    1. Summarize the paper (structured)
    2. Extract insights from the summary
    """
    print("🚀 Starting full analysis pipeline...")
    summary_data = summarize_pdf(data)
    if "error" in summary_data:
        return summary_data

    # Convert structured summary JSON → plain text summary
    summary_text = (
        summary_data.get("abstract", "") + "\n" +
        summary_data.get("findings", "") + "\n" +
        " ".join(summary_data.get("key_points", []))
    )

    # Extract insights from that summary
    insights = extract_insights(SummaryData(summary=summary_text))["insights"]

    return {
        "summary": summary_data,
        "insights": insights
    }
