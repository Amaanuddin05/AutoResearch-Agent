from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from vector_store import query_enriched_chunks
import json
import re

llm = OllamaLLM(
    model="llama3:8b",
    base_url="http://100.74.147.124:11434"
)

def compress_context(chunks: list) -> str:
    """
    Compress retrieved chunks into a readable research digest.
    """
    if not chunks:
        return ""
        
    combined_text = ""
    for c in chunks:
        meta = c.get("metadata", {})
        title = meta.get("title", "Unknown")
        doc_id = meta.get("doc_id", "N/A")
        type_ = meta.get("chunk_type", "fragment")
        content = c.get("content", "")
        combined_text += f"--- Source: {title} (ID: {doc_id}, Type: {type_}) ---\n{content}\n\n"
        
    if len(combined_text) < 4000:
        return combined_text
        
    prompt_template = """
    Summarize and distill these research fragments into a compact representation while preserving key details, methods, and findings.
    Keep the source attributions clear.
    
    Fragments:
    {context}
    """
    
    prompt = ChatPromptTemplate.from_template(prompt_template)
    chain = prompt | llm | StrOutputParser()
    
    try:
        compressed = chain.invoke({"context": combined_text[:12000]}) # Limit input to avoid overflow
        return compressed
    except Exception as e:
        print(f"⚠️ Context compression failed: {e}")
        return combined_text[:4000]


def generate_rag_response(message: str, context_ids: list = None):
    """
    Full RAG pipeline: Retrieve -> Compress -> Generate.
    """
    print(f"🤖 RAG Chat: '{message}' (context_ids={context_ids})")
    
    # 1. Retrieve
    chunks = query_enriched_chunks(message, n_results=10, doc_ids=context_ids)
    if not chunks:
        return {
            "answer": "I couldn't find any relevant research in the database to answer your question.",
            "sources": []
        }
        
    # 2. Compress
    short_context = compress_context(chunks)
    
    # 3. Generate Answer
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
        
        # Parse JSON
        match = re.search(r"\{[\s\S]*\}", raw_output)
        if match:
            try:
                result = json.loads(match.group(0))
            except:
                result = {"answer": raw_output, "sources": []}
        else:
            result = {"answer": raw_output, "sources": []}
            
    except Exception as e:
        print(f"⚠️ Answer generation failed: {e}")
        result = {"answer": "Sorry, I encountered an error generating the answer.", "sources": []}
        
    # Ensure sources are populated if LLM failed to structure them
    if not result.get("sources"):
        # Fallback: map from retrieved chunks
        unique_sources = {}
        for c in chunks:
            meta = c.get("metadata", {})
            doc_id = meta.get("doc_id")
            if doc_id and doc_id not in unique_sources:
                unique_sources[doc_id] = {
                    "title": meta.get("title", "Unknown"),
                    "doc_id": doc_id,
                    "chunk_type": meta.get("chunk_type", "generic")
                }
        result["sources"] = list(unique_sources.values())[:5]
        
    return result
