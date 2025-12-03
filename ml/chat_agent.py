# ml/chat_agent.py
import json
import re
from typing import List, Optional

from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from vector_store import VectorStore  # local module in ml/
# If your project structure differs, adjust import accordingly.

# Instantiate vector store (wrapper around Chroma/client)
vector_store = VectorStore()

# Instantiate LLM
llm = OllamaLLM(
    model="llama3:8b",
    base_url="http://100.74.147.124:11434"
)


def compress_context(chunks: List[dict]) -> str:
    """
    Compress retrieved chunks into a readable research digest.
    """
    if not chunks:
        return ""

    combined_text = ""
    for c in chunks:
        meta = c.get("metadata", {}) or {}
        title = meta.get("title", "Unknown")
        doc_id = meta.get("doc_id", "N/A")
        type_ = meta.get("chunk_type", "fragment")
        content = c.get("content", "") or c.get("document", "") or ""
        combined_text += f"--- Source: {title} (ID: {doc_id}, Type: {type_}) ---\n{content}\n\n"

    # If the combined text is already short enough, return it
    if len(combined_text) < 4000:
        return combined_text

    # Otherwise use the LLM to compress (keep attribution)
    prompt_template = """
    Summarize and distill these research fragments into a compact representation while preserving key details, methods, and findings.
    Keep the source attributions clear.

    Fragments:
    {context}
    """

    prompt = ChatPromptTemplate.from_template(prompt_template)
    chain = prompt | llm | StrOutputParser()

    try:
        # slice to a safe length to avoid model input overflow
        compressed = chain.invoke({"context": combined_text[:12000]})
        # If the chain returned structured JSON, extract string; else return as-is
        if isinstance(compressed, str):
            return compressed
        try:
            # If StrOutputParser returned JSON-like, try to stringify/return
            return json.dumps(compressed)[:4000]
        except Exception:
            return str(compressed)[:4000]
    except Exception as e:
        print(f"⚠️ Context compression failed: {e}")
        return combined_text[:4000]


def generate_rag_response(uid: str, message: str, context_ids: Optional[List[str]] = None) -> dict:
    """
    Full RAG pipeline: Retrieve -> Compress -> Generate.
    Returns a dict: {"answer": str, "sources": [ {title, doc_id, chunk_type, section?}, ... ] }
    """
    try:
        print(f"🤖 RAG Chat: '{message}' (uid={uid}, context_ids={context_ids})")

        # 1. Retrieve (user-scoped)
        chunks = vector_store.query_enriched_chunks(uid=uid, query=message, n_results=10, doc_ids=context_ids)
    except Exception as e:
        print(f"⚠️ Retrieval failed: {e}")
        chunks = []

    # If no chunks found, fallback to general LLM answer
    if not chunks:
        print("⚠️ No relevant chunks found. Falling back to general LLM.")
        prompt_template = """
        You are a helpful research assistant.
        The user asked: "{question}"

        Answer based on your general knowledge.
        Return ONLY valid JSON in this format:
        {{
          "answer": "...",
          "sources": []
        }}
        """
        prompt = ChatPromptTemplate.from_template(prompt_template)
        chain = prompt | llm | StrOutputParser()
        try:
            raw_output = chain.invoke({"question": message})
            # Try to parse JSON object out of output
            match = re.search(r"\{[\s\S]*\}", raw_output)
            if match:
                try:
                    return json.loads(match.group(0))
                except Exception:
                    return {"answer": raw_output, "sources": []}
            else:
                return {"answer": raw_output, "sources": []}
        except Exception as e:
            print(f"⚠️ Fallback LLM failed: {e}")
            return {
                "answer": "I couldn't find any research on that, and I had trouble generating a general answer.",
                "sources": []
            }

    # 2. Compress the retrieved chunks into a short context
    short_context = compress_context(chunks)

    # 3. Generate the final answer grounded on the retrieved context
    prompt_template = """
    You are ResearchGPT, a grounded research assistant.
    Use ONLY the provided research context to answer the user's question.

    RESEARCH CONTEXT:
    {context}

    USER QUESTION:
    {question}

    Answer with:
    1. A clear, accurate explanation
    2. Cite relevant sources using paper titles
    3. Do NOT hallucinate missing information

    Return ONLY valid JSON in this format:
    {{
      "answer": "...",
      "sources": [
        {{ "title": "...", "doc_id": "...", "chunk_type": "..." }}
      ]
    }}
    """

    prompt = ChatPromptTemplate.from_template(prompt_template)
    chain = prompt | llm | StrOutputParser()

    try:
        raw_output = chain.invoke({"context": short_context, "question": message})

        # Extract JSON object from model output if possible
        match = re.search(r"\{[\s\S]*\}", raw_output)
        if match:
            try:
                result = json.loads(match.group(0))
            except Exception:
                # If the JSON parsing fails, keep raw_output as answer
                result = {"answer": raw_output, "sources": []}
        else:
            result = {"answer": raw_output, "sources": []}

    except Exception as e:
        print(f"⚠️ Answer generation failed: {e}")
        result = {"answer": "Sorry, I encountered an error generating the answer.", "sources": []}

    # If model didn't provide sources, construct fallback sources from chunks
    if not result.get("sources"):
        unique_sources = {}
        for c in chunks:
            meta = c.get("metadata", {}) or {}
            doc_id = meta.get("doc_id") or meta.get("id") or meta.get("document_id")
            key = f"{doc_id}_{meta.get('chunk_type')}"
            if doc_id and key not in unique_sources:
                unique_sources[key] = {
                    "title": meta.get("title", "Unknown"),
                    "doc_id": doc_id,
                    "chunk_type": meta.get("chunk_type", "generic"),
                    "section": meta.get("section", "General")
                }
        result["sources"] = list(unique_sources.values())[:10]

    # Ensure result has required keys
    if "answer" not in result:
        result["answer"] = "No answer generated."
    if "sources" not in result:
        result["sources"] = []

    return result
