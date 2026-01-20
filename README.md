# VolcanoRAG – AI Document Assistant

VolcanoRAG is a full-stack Retrieval-Augmented Generation (RAG) application that allows users to upload documents and interact with them using AI-powered question answering. It supports multiple document formats, OCR, and vision-based understanding for charts and images.

## 🌐 Live Demo

**Deployed URL:**
[https://docmind-fft8.onrender.com/](https://docmind-fft8.onrender.com/)

> **Note:** This application is hosted on Render’s free tier.
> The service may be in a **sleep state initially**. Please wait for **about 1 minute** after opening the URL and then **refresh the page** if it does not load immediately.

## 🚀 Key Features

* Multi-format document support (PDF, DOCX, XLSX, PPTX, TXT, JPG, PNG)
* OCR text extraction using Tesseract
* Vision-based document understanding (charts, diagrams, images)
* Semantic search using a RAG pipeline
* AI-powered question answering
* Optional voice input and output
* English and Tanglish language support
* Modern, responsive UI with dark and light modes
* Docker-based deployment support
* Fully deployable using free-tier services

## 🧠 How It Works

1. Upload a document through the web interface
2. The system extracts text using OCR and document parsers
3. Content is chunked, embedded, and stored in a vector database
4. User queries are matched semantically against the document
5. AI generates accurate, context-aware responses

## 🛠️ Tech Stack

### Backend

* FastAPI
* Groq LLM (Llama 3.1)
* ChromaDB
* LangChain
* Tesseract OCR
* HuggingFace Embeddings

### Frontend

* React 18
* Vite
* Tailwind CSS
* Axios

### Deployment

* Docker
* Render (Backend – Free Tier)
* Vercel (Frontend – Free Tier)

## 📂 Project Structure

```
volcanorag/
├── backend/        # FastAPI backend
├── frontend/       # React frontend
├── docs/           # Documentation
├── scripts/        # Utility scripts
└── docker-compose.yml
```

## ⚙️ Local Setup (Quick Overview)

### Prerequisites

* Python 3.9+
* Node.js 18+
* Tesseract OCR
* Groq API key

### Basic Steps

1. Clone the repository
2. Configure environment variables
3. Install backend and frontend dependencies
4. Run backend and frontend servers
5. Access the application via browser

(Detailed setup steps are available in the documentation.)

## 📦 Docker Support

The entire application can be started using Docker Compose for easy local or cloud deployment.

## 🧪 Testing

* Backend tests using `pytest`
* Frontend tests using standard React testing tools

## 🤝 Contributions

Contributions, bug reports, and feature requests are welcome.
Please follow standard GitHub pull request practices.

## 📄 License

This project is licensed under the MIT License.

---

**VolcanoRAG is designed as a practical, production-ready AI document assistant with a focus on simplicity, scalability, and real-world usability.**
