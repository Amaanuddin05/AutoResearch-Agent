import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import uuid
import json
from typing import Any

class VectorStore:
    def __init__(self):
        # Initialize Chroma client (local persistent database)
        self.client = chromadb.PersistentClient(path="./chroma_db")
        # Load lightweight embedding model
        self.embedding_model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")

    def get_collection(self, uid: str):
        """Get or create a collection for a specific user."""
        name = f"user_{uid}"
        return self.client.get_or_create_collection(
            name=name,
            metadata={"owner": uid}
        )

    def embed_text(self, text: str):
        """Generate embedding vector for a given text."""
        return self.embedding_model.encode(text).tolist()

    def _ensure_insights_dict(self, insights: Any) -> dict:
        """Ensure insights is always a dict."""
        if isinstance(insights, dict):
            return insights
        return {"raw_output": str(insights)}

    def _flatten_field(self, value: Any) -> str:
        """Convert any field type to a flat string for embedding."""
        if value is None:
            return ""
        if isinstance(value, list):
            return " ".join(map(str, value))
        if isinstance(value, dict):
            return json.dumps(value)
        return str(value)

    def _sanitize_metadata(self, meta: dict) -> dict:
        """Ensure all metadata values are JSON-safe (convert lists/dicts to strings)."""
        safe_meta = {}
        for k, v in (meta or {}).items():
            if isinstance(v, (str, int, float, bool)) or v is None:
                safe_meta[k] = v
            else:
                safe_meta[k] = json.dumps(v)
        return safe_meta

    def add_paper_to_db(self, uid: str, title: str, summary: str, insights: Any, metadata: dict, doc_id: str = None):
        """
        Store a paper summary + insights + metadata in ChromaDB for a specific user.
        """
        try:
            collection = self.get_collection(uid)
            insights_dict = self._ensure_insights_dict(insights)

            # Build combined text for embedding
            combined_text = "\n".join([
                self._flatten_field(summary),
                self._flatten_field(insights_dict.get("findings")),
                self._flatten_field(insights_dict.get("methods")),
                self._flatten_field(insights_dict.get("implications")),
            ]).strip()

            # Generate embedding
            embedding = self.embed_text(combined_text)

            # Use provided doc_id or generate new UUID
            paper_uid = doc_id if doc_id else str(uuid.uuid4())

            # Make metadata safe
            metadata_with_insights = dict(metadata or {})
            metadata_with_insights["title"] = title
            metadata_with_insights["insights"] = json.dumps(insights_dict)
            metadata_with_insights["doc_id"] = paper_uid
            metadata_with_insights["entry_type"] = "paper"
            metadata_with_insights["uid"] = uid # Explicitly store uid in metadata too
            metadata_with_insights = self._sanitize_metadata(metadata_with_insights)

            # Store in ChromaDB
            collection.upsert(
                ids=[paper_uid],
                documents=[combined_text],
                embeddings=[embedding],
                metadatas=[metadata_with_insights],
            )

            print(f"✅ Stored '{title}' (id={paper_uid}) in ChromaDB for user {uid}.")
            return paper_uid

        except Exception as e:
            print("⚠️ add_paper_to_db error:", e)
            return None

    def query_papers(self, uid: str, query: str, n_results: int = 3):
        """Retrieve top similar papers for a user."""
        collection = self.get_collection(uid)
        query_emb = self.embed_text(query)
        
        results = collection.query(
            query_embeddings=[query_emb], 
            n_results=n_results,
            where={"entry_type": "paper"} 
        )

        ids = (results.get("ids") or [[]])[0]
        docs = (results.get("documents") or [[]])[0]
        metas = (results.get("metadatas") or [[]])[0]
        distances = (results.get("distances") or [[]])[0]

        items = []
        for i, _id in enumerate(ids):
            meta = metas[i] if i < len(metas) else {}
            insights_data = meta.get("insights", "{}")

            if isinstance(insights_data, str):
                try:
                    insights_data = json.loads(insights_data)
                except Exception:
                    insights_data = {"raw_output": insights_data}

            paper_id = meta.get("doc_id") or _id

            items.append({
                "id": paper_id,
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

    def store_enriched_chunks(self, uid: str, chunks: list, metadata: dict):
        """Store enriched chunks for a user."""
        if not chunks:
            return

        collection = self.get_collection(uid)
        ids = []
        documents = []
        embeddings = []
        metadatas = []

        print(f"Storing {len(chunks)} enriched chunks for user {uid}...")

        for chunk in chunks:
            content = chunk.get("content", "").strip()
            if not content:
                continue

            chunk_meta = metadata.copy()
            chunk_meta.update(chunk)
            chunk_meta["entry_type"] = "chunk"
            chunk_meta["uid"] = uid
            chunk_meta.pop("content", None)
            chunk_meta = self._sanitize_metadata(chunk_meta)
            
            emb = self.embed_text(content)
            chunk_uid = str(uuid.uuid4())
            
            ids.append(chunk_uid)
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
                print(f"Successfully stored {len(ids)} enriched chunks.")
            except Exception as e:
                print(f"Failed to store enriched chunks: {e}")

    def query_enriched_chunks(self, uid: str, query: str, n_results: int = 5, doc_ids: list = None):
        """Retrieve enriched chunks for RAG for a user."""
        collection = self.get_collection(uid)
        query_emb = self.embed_text(query)
        
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

    def get_enriched_paper(self, uid: str, paper_id: str):
        """
        Fetch a paper and all its enriched chunks.
        Returns structured data organized by chunk type.
        """
        collection = self.get_collection(uid)
        
        # 1. Fetch the main paper entry
        paper_results = collection.get(
            where={"$and": [
                {"entry_type": "paper"},
                {"doc_id": paper_id}
            ]},
            limit=1
        )
        
        if not paper_results or not paper_results.get("ids"):
            # Try fetching by ID directly
            try:
                paper_results = collection.get(ids=[paper_id])
            except:
                return None
        
        if not paper_results or not paper_results.get("ids"):
            return None
            
        # Parse paper data
        paper_meta = paper_results["metadatas"][0] if paper_results.get("metadatas") else {}
        paper_doc = paper_results["documents"][0] if paper_results.get("documents") else ""
        
        insights_data = paper_meta.get("insights", "{}")
        if isinstance(insights_data, str):
            try:
                insights_data = json.loads(insights_data)
            except:
                insights_data = {}
        
        paper_data = {
            "id": paper_id,
            "title": paper_meta.get("title", "Untitled"),
            "authors": paper_meta.get("authors", "Unknown"),
            "published": paper_meta.get("published", "N/A"),
            "pdf_url": paper_meta.get("pdf_url", "N/A"),
            "summary": paper_doc,
            "insights": insights_data,
            "metadata": paper_meta
        }
        
        # 2. Fetch all enriched chunks for this paper
        chunk_results = collection.get(
            where={"$and": [
                {"entry_type": "chunk"},
                {"doc_id": paper_id}
            ]},
            limit=1000  # Reasonable limit for chunks
        )
        
        # Organize chunks by type
        chunks_by_type = {
            "paragraph_rewrite": [],
            "finding": [],
            "method": [],
            "dataset": [],
            "implication": [],
            "concept": [],
            "section_summary": [],
            "limitation": [],
            "citation": []
        }
        
        if chunk_results and chunk_results.get("ids"):
            for i, chunk_id in enumerate(chunk_results["ids"]):
                chunk_meta = chunk_results["metadatas"][i] if i < len(chunk_results.get("metadatas", [])) else {}
                chunk_doc = chunk_results["documents"][i] if i < len(chunk_results.get("documents", [])) else ""
                
                chunk_type = chunk_meta.get("chunk_type", "unknown")
                
                chunk_data = {
                    "id": chunk_id,
                    "content": chunk_doc,
                    "metadata": chunk_meta
                }
                
                if chunk_type in chunks_by_type:
                    chunks_by_type[chunk_type].append(chunk_data)
        
        return {
            "paper": paper_data,
            "enriched_chunks": chunks_by_type
        }

    def delete_paper(self, uid: str, paper_id: str):
        """Delete a paper for a user."""
        collection = self.get_collection(uid)
        # Delete paper entry
        collection.delete(where={"doc_id": paper_id})
        # Also delete associated chunks? The current implementation deletes by ID list, 
        # but here we might want to delete all chunks associated with this paper_id.
        # Since we store doc_id in metadata, we can use 'where' clause.
        # The previous implementation used ids=[paper_id], which implies paper_id matches the ID in Chroma.
        # But enriched chunks have different IDs.
        # So deleting by doc_id is safer if we want to remove everything.
        # However, the original code only deleted by ID. Let's support both.
        
        # Delete by ID (main entry usually has ID=paper_id)
        collection.delete(ids=[paper_id])
        
        # Delete by metadata doc_id (chunks and main entry if ID matches)
        collection.delete(where={"doc_id": paper_id})
        
        print(f"🗑️ Deleted paper {paper_id} for user {uid}")

# Global instance
vector_store = VectorStore()
