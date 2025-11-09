from fastapi import FastAPI
from pydantic import BaseModel
from langchain_ollama import OllamaLLM
import fitz  # PyMuPDF
import os


app = FastAPI()

class TextData(BaseModel):
    text: str

llm = OllamaLLM(
    model="llama3:8b",
    base_url="http://192.168.1.36:11434" 
)

@app.get("/")
def root():
    return {"message": "LangChain x Ollama summarization service active"}

@app.post("/summarize")
def summarize_text(data: TextData):
    text = data.text.strip()
    if not text:
        return {"error": "Empty input text"}

    prompt = f"Summarize the following research text in concise academic tone:\n\n{text[:2000]}"
    result = llm.invoke(prompt)
    return {"summary": result}

@app.post("/summarize_pdf")
def summarize_pdf(data: dict):
    path = data.get("path")

    if not path or not os.path.exists(path):
        return {"error": "Invalid PDF path"}

    doc = fitz.open(path)
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    doc.close()

    if not full_text.strip():
        return {"error": "No text extracted from PDF"}

    chunk_size = 4000
    chunks = [full_text[i:i + chunk_size] for i in range(0, len(full_text), chunk_size)]

    print(f"📄 Total chunks to summarize: {len(chunks)}")

    summaries = []
    for idx, chunk in enumerate(chunks, 1):
        print(f"⚙️ Summarizing chunk {idx}/{len(chunks)}...")
        prompt = f"Summarize the following section of a research paper:\n\n{chunk}"
        summary = llm.invoke(prompt)
        summaries.append(summary.strip())

    combined_summary_text = "\n".join(summaries)
    final_prompt = (
        f"Combine the following partial summaries into one cohesive academic summary:\n\n"
        f"{combined_summary_text}\n\n"
        f"Write a final concise, well-structured summary."
    )

    final_summary = llm.invoke(final_prompt)

    return {"summary": final_summary}

