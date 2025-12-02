from fastapi import FastAPI, Request
from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import json, re

app = FastAPI()

llm = OllamaLLM(
    model="llama3:8b",
    base_url="http://100.74.147.124:11434"
)

prompt = ChatPromptTemplate.from_template("""
You are an expert AI research analyst.  
Analyze the following research summary and extract deeper insights.

Return ONLY valid JSON in this exact format (nothing else):

{{
  "findings": ["..."],
  "methods": ["..."],
  "datasets": ["..."],
  "citations": ["..."],
  "implications": ["..."]
}}

Summary:
{summary}
""")

chain = prompt | llm | StrOutputParser()

def safe_json_parse(text: str):
    """Extract and safely parse JSON from noisy LLM output."""
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            print("Could not cleanly parse JSON, returning raw text.")
            return {"raw_output": match.group(0)}
    else:
        return {"raw_output": text.strip()}

@app.post("/insight_from_summary")
async def insight_from_summary(request: Request):
    data = await request.json()
    summary = data.get("summary")

    if not summary:
        return {"error": "Missing summary data"}

    print("Generating insights...")
    raw_output = chain.invoke({"summary": str(summary)})
    insights = safe_json_parse(raw_output)

    return insights
