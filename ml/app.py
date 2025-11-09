from fastapi import FastAPI
from pydantic import BaseModel
from langchain_ollama import OllamaLLM

app = FastAPI()

class TextData(BaseModel):
    text: str

llm = OllamaLLM(
    model="llama3:8b",
    base_url="http://192.168.1.36:11434" 
)

@app.get("/")
def root():
    return {"message": "LangChain × Ollama summarization service active"}

@app.post("/summarize")
def summarize_text(data: TextData):
    text = data.text.strip()
    if not text:
        return {"error": "Empty input text"}

    prompt = f"Summarize the following research text in concise academic tone:\n\n{text[:2000]}"
    result = llm.invoke(prompt)
    return {"summary": result}
