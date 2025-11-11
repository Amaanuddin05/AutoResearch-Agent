import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# Initialize Chroma client
chroma_client = chromadb.PersistentClient(path="./chroma_db")  # local DB folder

# Create or get collection
collection = chroma_client.get_or_create_collection("research_papers")

# Load lightweight embedding model
embedding_model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")

def embed_text(text: str):
    """Generate embedding vector for a given text."""
    return embedding_model.encode(text).tolist()

def add_paper_to_db(title: str, summary: str, insights: dict, metadata: dict):
    """Store a paper summary + insights + metadata in ChromaDB."""
    combined_text = summary + "\n" + " ".join(insights.get("findings", []))
    embedding = embed_text(combined_text)

    collection.add(
        ids=[title],
        documents=[combined_text],
        embeddings=[embedding],
        metadatas=[metadata]
    )
    print(f"✅ Stored '{title}' in ChromaDB.")

def query_papers(query: str, n_results: int = 3):
    """Retrieve top similar papers based on query text."""
    query_emb = embed_text(query)
    results = collection.query(query_embeddings=[query_emb], n_results=n_results)
    return results
