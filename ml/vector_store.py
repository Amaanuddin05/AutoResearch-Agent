import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import uuid
import json
from typing import Any

# Initialize Chroma client (local persistent database)
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# Create or get collection
collection = chroma_client.get_or_create_collection("research_papers")

# Load lightweight embedding model
embedding_model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")


# ============ Helpers ============

def embed_text(text: str):
    """Generate embedding vector for a given text."""
    return embedding_model.encode(text).tolist()


def _ensure_insights_dict(insights: Any) -> dict:
    """Ensure insights is always a dict."""
    if isinstance(insights, dict):
        return insights
    return {"raw_output": str(insights)}


def _flatten_field(value: Any) -> str:
    """Convert any field type to a flat string for embedding."""
    if value is None:
        return ""
    if isinstance(value, list):
        return " ".join(map(str, value))
    if isinstance(value, dict):
        return json.dumps(value)
    return str(value)


def _sanitize_metadata(meta: dict) -> dict:
    """Ensure all metadata values are JSON-safe (convert lists/dicts to strings)."""
    safe_meta = {}
    for k, v in (meta or {}).items():
        if isinstance(v, (str, int, float, bool)) or v is None:
            safe_meta[k] = v
        else:
            safe_meta[k] = json.dumps(v)
    return safe_meta


# ============ Core Functions ============

def add_paper_to_db(title: str, summary: str, insights: Any, metadata: dict):
    """
    Store a paper summary + insights + metadata in ChromaDB.
    Stores insights as JSON string inside metadata for compatibility.
    """
    try:
        insights_dict = _ensure_insights_dict(insights)

        # Build combined text for embedding
        combined_text = "\n".join([
            _flatten_field(summary),
            _flatten_field(insights_dict.get("findings")),
            _flatten_field(insights_dict.get("methods")),
            _flatten_field(insights_dict.get("implications")),
        ]).strip()

        # Generate embedding
        embedding = embed_text(combined_text)

        # Make metadata safe
        metadata_with_insights = dict(metadata or {})
        metadata_with_insights["insights"] = json.dumps(insights_dict)  # ← JSON-encoded here
        metadata_with_insights = _sanitize_metadata(metadata_with_insights)

        # Use UUID as unique id
        uid = str(uuid.uuid4())

        # Store in ChromaDB
        collection.add(
            ids=[uid],
            documents=[combined_text],
            embeddings=[embedding],
            metadatas=[metadata_with_insights],
        )

        print(f"✅ Stored '{title}' (id={uid}) in ChromaDB.")
        print("   Metadata keys:", list(metadata_with_insights.keys()))
        print("   Combined text (first 200 chars):", combined_text[:200], "\n")

        print("   Combined text (first 200 chars):", combined_text[:200], "\n")
        
        return uid

    except Exception as e:
        print("⚠️ add_paper_to_db error:", e)
        return None


def query_papers(query: str, n_results: int = 3):
    """Retrieve top similar papers and normalize output for frontend."""
    query_emb = embed_text(query)
    results = collection.query(query_embeddings=[query_emb], n_results=n_results)

    ids = (results.get("ids") or [[]])[0]
    docs = (results.get("documents") or [[]])[0]
    metas = (results.get("metadatas") or [[]])[0]
    distances = (results.get("distances") or [[]])[0]

    items = []
    for i, _id in enumerate(ids):
        meta = metas[i] if i < len(metas) else {}
        insights_data = meta.get("insights", "{}")

        # Decode JSON if stored as string
        if isinstance(insights_data, str):
            try:
                insights_data = json.loads(insights_data)
            except Exception:
                insights_data = {"raw_output": insights_data}

        items.append({
            "id": _id,
            "title": meta.get("title") or _id,
            "authors": meta.get("authors", "Unknown"),
            "published": meta.get("published", "N/A"),
            "pdf_url": meta.get("pdf_url", "N/A"),
            "summary": docs[i] if i < len(docs) else "",
            "insights": insights_data,
            "distance": distances[i] if i < len(distances) else None,
            "metadata": meta
        })

    return {"papers": items}


def store_enriched_chunks(chunks: list, metadata: dict):
    """
    Store a list of enriched chunks (section summaries, paragraphs, concepts, etc.)
    into ChromaDB as separate documents.
    
    chunks: list of dicts, e.g. [{"chunk_type": "...", "content": "...", ...}]
    metadata: base metadata from the paper (title, authors, etc.)
    """
    if not chunks:
        return

    ids = []
    documents = []
    embeddings = []
    metadatas = []

    print(f"Storing {len(chunks)} enriched chunks...")

    for chunk in chunks:
        content = chunk.get("content", "").strip()
        if not content:
            continue

        # Merge base metadata with chunk-specific metadata
        chunk_meta = metadata.copy()
        chunk_meta.update(chunk)
        
        # Remove 'content' from metadata to avoid duplication/bloat
        chunk_meta.pop("content", None)
        
        # Sanitize metadata
        chunk_meta = _sanitize_metadata(chunk_meta)
        
        # Generate embedding
        emb = embed_text(content)
        
        # Generate ID
        uid = str(uuid.uuid4())
        
        ids.append(uid)
        documents.append(content)
        embeddings.append(emb)
        metadatas.append(chunk_meta)

    if ids:
        try:
            collection.add(
                ids=ids,
                documents=documents,
                embeddings=embeddings,
                metadatas=metadatas
            )
            print(f"Successfully stored {len(ids)} enriched chunks in ChromaDB.")
        except Exception as e:
            print(f"Failed to store enriched chunks: {e}")

            print(f"Failed to store enriched chunks: {e}")


def query_enriched_chunks(query: str, n_results: int = 5, doc_ids: list = None):
    """
    Retrieve enriched chunks for RAG.
    Supports filtering by doc_id (original paper ID).
    """
    query_emb = embed_text(query)
    
    where_filter = None
    if doc_ids:
        if len(doc_ids) == 1:
            where_filter = {"doc_id": doc_ids[0]}
        else:
            where_filter = {"doc_id": {"$in": doc_ids}}
            
    results = collection.query(
        query_embeddings=[query_emb],
        n_results=n_results,
        where=where_filter
    )
    
    ids = (results.get("ids") or [[]])[0]
    docs = (results.get("documents") or [[]])[0]
    metas = (results.get("metadatas") or [[]])[0]
    distances = (results.get("distances") or [[]])[0]
    
    chunks = []
    for i, _id in enumerate(ids):
        chunks.append({
            "id": _id,
            "content": docs[i] if i < len(docs) else "",
            "metadata": metas[i] if i < len(metas) else {},
            "distance": distances[i] if i < len(distances) else 0.0
        })
        
    return chunks
