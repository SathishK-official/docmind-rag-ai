"""
RAG Engine Service
Vector store and LLM query engine
"""

from groq import Groq
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
import chromadb
from chromadb.config import Settings

from app.config import settings


class RAGEngine:
    """RAG engine with vector database and LLM"""
    
    def __init__(self):
        self.groq_client = Groq(api_key=settings.groq_api_key)
        self.embeddings = HuggingFaceEmbeddings(
            model_name=settings.embedding_model
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            length_function=len
        )
        self.collection = None
        self.texts = []
    
    def create_vector_store(self, text: str):
        """Create vector store from text"""
        # Split text
        self.texts = self.text_splitter.split_text(text)
        
        # Create ChromaDB client
        client = chromadb.Client(Settings(
            anonymized_telemetry=False,
            allow_reset=True
        ))
        
        # Create collection
        collection_name = "documents"
        try:
            client.delete_collection(collection_name)
        except:
            pass
        
        self.collection = client.create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )
        
        # Add documents
        for i, chunk in enumerate(self.texts):
            embedding = self.embeddings.embed_query(chunk)
            self.collection.add(
                ids=[f"chunk_{i}"],
                embeddings=[embedding],
                documents=[chunk]
            )
        
        print(f"✓ Vector store: {len(self.texts)} chunks")
    
    def query(self, question: str, language: str = "en", k: int = 5) -> str:
        """Query vector store and generate answer"""
        
        # Search
        question_embedding = self.embeddings.embed_query(question)
        results = self.collection.query(
            query_embeddings=[question_embedding],
            n_results=min(k, len(self.texts))
        )
        
        context = "\n\n".join(results['documents'][0])
        
        # System prompt
        if language == "ta":
            system = "You are helpful. Answer in Tanglish (Tamil + English mix)."
        else:
            system = "You are helpful. Provide clear, accurate answers."
        
        prompt = f"""Context:
{context}

Question: {question}

Answer based on context. If not found, say so politely."""
        
        # Generate
        response = self.groq_client.chat.completions.create(
            model=settings.llm_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )
        
        return response.choices[0].message.content
