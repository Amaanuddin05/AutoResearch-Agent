from fastapi import FastAPI
from pydantic import BaseModel
from langchain_ollama import OllamaLLM
import fitz  # PyMuPDF
import os
import re
import json

app = FastAPI(title="AutoResearch Summarizer Service")

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
    return {"message": "AutoResearch Summarizer Service running ✅"}


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
    """
    Summarize a full research paper PDF into a structured JSON summary.
    Handles multi-page documents by splitting text into chunks.
    """
    path = data.path
    metadata = data.metadata or {}

    if not path or not os.path.exists(path):
        return {"error": "Invalid or missing PDF path"}

    doc = fitz.open(path)
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    doc.close()

    if not full_text.strip():
        return {"error": "No readable text extracted from PDF"}

    chunk_size = 4000
    chunks = [full_text[i:i + chunk_size] for i in range(0, len(full_text), chunk_size)]
    print(f"📄 Total chunks to summarize: {len(chunks)}")

    partial_summaries = []
    for idx, chunk in enumerate(chunks, 1):
        print(f"⚙️ Summarizing chunk {idx}/{len(chunks)}...")
        prompt = f"Summarize the following section of a research paper in academic tone:\n\n{chunk}"
        summary = llm.invoke(prompt)
        partial_summaries.append(summary.strip())

    combined_summary_text = "\n".join(partial_summaries)
    final_prompt = f"""
    You are an expert AI research summarizer.

    Combine all partial summaries into a structured JSON with this exact schema:
    {{
    "abstract": "<2–3 sentence summary of the paper>",
    "body": [
        {{
        "title": "Introduction",
        "text": "<concise overview of introduction>"
        }},
        {{
        "title": "Methods",
        "text": "<key methodology details>"
        }},
        {{
        "title": "Results",
        "text": "<key findings>"
        }},
        {{
        "title": "Discussion",
        "text": "<insights, implications, or applications>"
        }},
        {{
        "title": "Conclusion",
        "text": "<summary of final thoughts>"
        }}
    ],
    "meta": {{
        "title": "{metadata.get('title', '')}",
        "authors": "{metadata.get('authors', '')}",
        "pdf_url": "{metadata.get('pdf_url', '')}",
        "published": "{metadata.get('published', '')}"
    }}
    }}

    Write only valid JSON. Do not include markdown or commentary.

    Summaries:
    {combined_summary_text}
    """
    final_summary = llm.invoke(final_prompt)

    match = re.search(r"\{.*\}", final_summary, re.DOTALL)
    if match:
        try:
            structured = json.loads(match.group(0))
        except json.JSONDecodeError:
            structured = {"raw_summary": final_summary}
    else:
        structured = {"raw_summary": final_summary}

    structured["meta"] = {
        "title": metadata.get("title", os.path.basename(path).replace(".pdf", "")),
        "authors": metadata.get("authors", "Unknown"),
        "pdf_url": metadata.get("pdf_url", "N/A"),
        "published": metadata.get("published", "N/A"),
    }

    print(f"Summary generated for: {structured['meta']['title']}")
    return structured
