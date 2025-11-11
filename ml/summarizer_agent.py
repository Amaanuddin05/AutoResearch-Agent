from langchain_ollama import OllamaLLM
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import os, json, re

llm = OllamaLLM(
    model="llama3:8b",
    base_url="http://192.168.1.36:11434"  
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

    Ensure all fields exist, even if empty. Do NOT include markdown or explanations.

    Paper text:
    {context}
    """

    prompt = ChatPromptTemplate.from_template(prompt_template)
    summarizer_chain = prompt | llm | StrOutputParser()

    print("⚙️ Generating structured summary...")
    raw_output = summarizer_chain.invoke({"context": combined_text})

    match = re.search(r"\{.*\}", raw_output, re.DOTALL)
    if match:
        try:
            summary_json = json.loads(match.group(0))
        except json.JSONDecodeError:
            print("Could not parse JSON perfectly; returning raw text.")
            summary_json = {"raw_summary": raw_output}
    else:
        summary_json = {"raw_summary": raw_output}

    summary_json = normalize_summary_data(summary_json, metadata)

    output_file = "structured_summary.json"
    with open(output_file, "w") as f:
        json.dump(summary_json, f, indent=2)

    print(f"Saved improved structured summary to {output_file}")
    return summary_json


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
