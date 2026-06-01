from langchain_ollama import OllamaLLM
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import os, json, re

llm = OllamaLLM(
    model="llama3:8b",
    base_url="http://100.74.147.124:11434"  
)

def normalize_summary_data(summary_json, metadata=None):
    """Ensure all required fields exist and inject metadata."""
    default_fields = {
        "abstract": "N/A",
        "objectives": [],
        "methodology": "N/A",
        "findings": "N/A",
        "limitations": "N/A",
        "key_points": []
    }

    for key, default in default_fields.items():
        if key not in summary_json or not summary_json[key]:
            summary_json[key] = default

    if metadata:
        summary_json["meta"] = {
            "title": metadata.get("title", "Untitled"),
            "authors": metadata.get("authors", "Unknown"),
            "pdf_url": metadata.get("pdf_url", "N/A"),
            "published": metadata.get("published", "N/A")
        }
    else:
        summary_json["meta"] = {
            "title": summary_json.get("title", "Untitled"),
            "authors": "Unknown",
            "pdf_url": "N/A",
            "published": "N/A"
        }

    summary_json.pop("title", None)

    return summary_json


def summarize_pdf(pdf_path, metadata=None):
    """Summarize a research paper PDF into structured JSON with metadata."""
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")

    loader = PyMuPDFLoader(pdf_path)
    docs = loader.load()
    splitter = RecursiveCharacterTextSplitter(chunk_size=4000, chunk_overlap=300)
    chunks = splitter.split_documents(docs)
    combined_text = "\n".join([c.page_content for c in chunks])

    # ── DEBUG: show input size ──────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"[DEBUG] PDF path: {pdf_path}")
    print(f"[DEBUG] Total chunks from splitter: {len(chunks)}")
    print(f"[DEBUG] Combined text length (chars): {len(combined_text)}")
    print(f"[DEBUG] First 500 chars of combined_text:")
    print(combined_text[:500])
    print(f"{'='*60}\n")

    # Truncate to ~6000 chars to stay within LLaMA 3:8b context window
    MAX_CONTEXT_CHARS = 6000
    if len(combined_text) > MAX_CONTEXT_CHARS:
        print(f"[DEBUG] ⚠️ Truncating combined_text from {len(combined_text)} to {MAX_CONTEXT_CHARS} chars")
        combined_text = combined_text[:MAX_CONTEXT_CHARS]

    prompt_template = """
    You are an expert AI research summarizer.
    Analyze the following research paper and return ONLY valid JSON in this exact format:

    {{
      "abstract": "...",
      "objectives": ["...", "..."],
      "methodology": "...",
      "findings": "...",
      "limitations": "...",
      "key_points": ["...", "..."]
    }}

    Ensure all fields exist, even if empty. Do NOT include markdown, code fences, or explanations. Output raw JSON only.

    Paper text:
    {context}
    """

    prompt = ChatPromptTemplate.from_template(prompt_template)
    summarizer_chain = prompt | llm | StrOutputParser()

    print("⚙️ Generating structured summary...")
    raw_output = summarizer_chain.invoke({"context": combined_text})

    # ── DEBUG: show raw LLM response ───────────────────────────────────────
    print(f"\n{'='*60}")
    print("[DEBUG] RAW LLM OUTPUT:")
    print(raw_output)
    print(f"{'='*60}\n")

    # Strip markdown code fences if present (e.g. ```json ... ``` )
    cleaned_output = re.sub(r"```(?:json)?\s*", "", raw_output).replace("```", "").strip()

    # Try direct parse first (cleanest path)
    summary_json = None
    try:
        summary_json = json.loads(cleaned_output)
        print("[DEBUG] ✅ Direct json.loads succeeded.")
    except json.JSONDecodeError as e:
        print(f"[DEBUG] ❌ Direct json.loads failed: {e}")

    # Fallback: extract first {...} block
    if summary_json is None:
        match = re.search(r"\{.*\}", cleaned_output, re.DOTALL)
        if match:
            candidate = match.group(0)
            print(f"[DEBUG] Trying regex-extracted JSON ({len(candidate)} chars): {candidate[:200]}...")
            try:
                summary_json = json.loads(candidate)
                print("[DEBUG] ✅ Regex-extracted JSON parsed successfully.")
            except json.JSONDecodeError as e:
                print(f"[DEBUG] ❌ Regex-extracted JSON also failed: {e}")
                print(f"[DEBUG] Problematic JSON candidate:\n{candidate}")

    if summary_json is None:
        print("[DEBUG] ⚠️ All JSON parse attempts failed. Returning raw_summary fallback.")
        summary_json = {"raw_summary": raw_output}

    # ── DEBUG: show parsed dict keys ───────────────────────────────────────
    print(f"[DEBUG] Parsed summary_json keys: {list(summary_json.keys())}")
    print(f"[DEBUG] Full parsed dict: {json.dumps(summary_json, indent=2)[:800]}")

    summary_json = normalize_summary_data(summary_json, metadata)

    output_file = "structured_summary.json"
    with open(output_file, "w") as f:
        json.dump(summary_json, f, indent=2)

    print(f"[DEBUG] Saved structured summary to {output_file}")
    print(f"[DEBUG] Final returned keys: {list(summary_json.keys())}")
    return summary_json


# ================= ENRICHMENT FUNCTIONS =================

def extract_section_summaries(full_text: str) -> list:
    """
    Extracts summaries for standard sections: Abstract, Introduction, Methods, Results, Discussion, Conclusion.
    Returns a list of dicts: [{"section": "Methods", "content": "..."}]
    """
    # Limit text to avoid context window issues, but keep it large enough
    # For a real robust solution, we might need chunking, but for now let's take first 15k chars + last 5k
    if len(full_text) > 20000:
        context_text = full_text[:15000] + "\n...[skipped]...\n" + full_text[-5000:]
    else:
        context_text = full_text

    prompt_template = """
    You are an expert research analyst.
    Summarize the following sections from the paper text below.
    If a section is missing, skip it.

    Sections to summarize:
    1. Abstract
    2. Introduction
    3. Methods
    4. Results
    5. Discussion
    6. Conclusion

    Return ONLY valid JSON in this format:
    [
      {{"section": "Abstract", "content": "..."}},
      {{"section": "Methods", "content": "..."}}
    ]

    Paper Text:
    {context}
    """
    
    prompt = ChatPromptTemplate.from_template(prompt_template)
    chain = prompt | llm | StrOutputParser()
    
    print("⚙️ Extracting section summaries...")
    try:
        raw_output = chain.invoke({"context": context_text})
        match = re.search(r"\[.*\]", raw_output, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    except Exception as e:
        print(f"⚠️ Section extraction failed: {e}")
    
    return []


def rewrite_paragraphs(full_text: str) -> list:
    """
    Splits text into paragraphs and rewrites them for clarity/conciseness.
    Returns list of strings.
    """
    # Simple splitting by double newline, filtering out short lines/headers
    raw_paragraphs = [p.strip() for p in full_text.split('\n\n') if len(p.strip()) > 100]
    
    # Limit to first 20 paragraphs to save time/tokens for this demo
    # In production, you might process all or use a sliding window
    selected_paragraphs = raw_paragraphs[:20]
    
    rewritten = []
    print(f"⚙️ Rewriting {len(selected_paragraphs)} paragraphs...")
    
    # We can batch this or do it one by one. One by one is safer for local LLM context.
    prompt_template = "Rewrite this paragraph to be clear, concise, and self-contained for retrieval:\n\n{text}"
    prompt = ChatPromptTemplate.from_template(prompt_template)
    chain = prompt | llm | StrOutputParser()
    
    for i, p in enumerate(selected_paragraphs):
        try:
            res = chain.invoke({"text": p})
            rewritten.append(res.strip())
        except Exception as e:
            print(f"⚠️ Paragraph rewrite failed at idx {i}: {e}")
            
    return rewritten


def extract_concepts(summary: str) -> list:
    """
    Extracts 10 core concepts with 1-sentence descriptions.
    Returns list of dicts: [{"concept": "...", "description": "..."}]
    """
    prompt_template = """
    Extract 10 core concepts from this research summary.
    For each concept, provide a short 1-sentence description.
    
    Return ONLY valid JSON in this format:
    [
      {{"concept": "Transformer Architecture", "description": "A neural network architecture relying on self-attention mechanisms."}},
      ...
    ]
    
    Summary:
    {summary}
    """
    
    prompt = ChatPromptTemplate.from_template(prompt_template)
    chain = prompt | llm | StrOutputParser()
    
    print("⚙️ Extracting concepts...")
    try:
        raw_output = chain.invoke({"summary": summary})
        match = re.search(r"\[.*\]", raw_output, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    except Exception as e:
        print(f"⚠️ Concept extraction failed: {e}")
        
    return []



if __name__ == "__main__":
    path = "/home/ace/code/Research Agent/server/uploads/sample.pdf"
    meta = {
        "title": "AutoResearch Agent: Multi-Agent AI System for Research Automation",
        "authors": "Amaan Uddin",
        "pdf_url": "http://arxiv.org/pdf/2401.12345v1",
        "published": "2024-03-11"
    }

    result = summarize_pdf(path, meta)
    print(json.dumps(result, indent=2))
