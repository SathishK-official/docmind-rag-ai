# 🌋 VolcanoRAG - AI Document Assistant

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Node 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A production-ready, full-stack RAG (Retrieval-Augmented Generation) application with multi-modal AI processing. Upload documents in any format and chat with them using AI!

## ✨ Features

- 📄 **Multi-format Support**: PDF, DOCX, XLSX, PPTX, TXT, Images (JPG, PNG)
- 🔍 **OCR Processing**: Extract text from images using Tesseract
- 👁️ **Vision AI**: Understand charts and diagrams with Groq Llama Vision
- 🧠 **RAG Pipeline**: Semantic search with ChromaDB + HuggingFace embeddings
- 💬 **Smart Q&A**: Powered by Groq Llama 3.1 70B
- 🎤 **Voice I/O**: Speech-to-text input and text-to-speech output
- 🌍 **Multilingual**: English and Tanglish support
- 🎨 **Beautiful UI**: Modern volcanic-themed interface with dark/light modes
- 🐳 **Docker Ready**: One-command deployment
- ☁️ **Free Hosting**: Deploy to Render + Vercel for $0/month

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/volcanorag.git
cd volcanorag

# Run setup wizard
python SETUP_WIZARD.py
```

The wizard will:
- Check all dependencies
- Configure your API keys
- Install packages
- Start the application

### Option 2: Manual Setup

#### Prerequisites
- Python 3.9+
- Node.js 18+
- Tesseract OCR
- Poppler (for PDFs)

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Start server
python -m app.main
```

Backend runs at: http://localhost:8000

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env if needed (default points to localhost:8000)

# Start development server
npm run dev
```

Frontend runs at: http://localhost:3000

### Option 3: Docker (Easiest!)

```bash
# Start everything with one command
docker-compose up

# Access at:
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

## 🔑 Getting API Keys

### Groq API (Required)
1. Visit: https://console.groq.com
2. Sign up for free account
3. Navigate to API Keys section
4. Create new API key
5. Copy and add to `.env` file

**Free Tier**: 14,400 requests/day (600/hour)

### Optional: Other Services
- All other features work without additional API keys!
- Tesseract OCR: Open source, no key needed
- Edge TTS: Free Microsoft service
- ChromaDB: Local vector database

## 📖 Usage

1. **Upload Document**: Drag & drop any supported file
2. **Processing**: Wait for OCR, Vision AI, and vector embedding
3. **Ask Questions**: Type or speak your questions
4. **Get Answers**: Receive AI-powered responses with optional voice output

### Example Questions
- "What is this document about?"
- "Summarize the key points"
- "What data is shown in the chart on page 5?"
- "List all the action items mentioned"

## 🏗️ Architecture

```
User → Frontend (React) → Backend (FastAPI) → Groq API
                              ↓
                    Document Processing
                    ├── Text Extraction
                    ├── OCR (Tesseract)
                    ├── Vision AI (Groq)
                    └── RAG Pipeline
                        ├── Text Chunking
                        ├── Embeddings (HuggingFace)
                        └── Vector Store (ChromaDB)
```

## 🛠️ Tech Stack

**Backend**
- FastAPI - Web framework
- Groq - LLM & Vision AI
- ChromaDB - Vector database
- LangChain - Text processing
- Tesseract - OCR
- Edge TTS - Text-to-speech

**Frontend**
- React 18 - UI framework
- Vite - Build tool
- Tailwind CSS - Styling
- Axios - HTTP client

**Deployment**
- Docker - Containerization
- Render - Backend hosting (Free)
- Vercel - Frontend hosting (Free)

## 📊 Project Structure

```
volcanorag/
├── backend/              # Python FastAPI server
│   ├── app/
│   │   ├── main.py      # Application entry
│   │   ├── config.py    # Configuration
│   │   ├── api/         # API routes
│   │   └── services/    # Business logic
│   └── tests/           # Unit tests
├── frontend/            # React application
│   └── src/
│       ├── components/  # UI components
│       ├── services/    # API calls
│       └── config/      # Configuration
├── docs/                # Documentation
├── scripts/             # Utility scripts
└── docker-compose.yml   # Docker setup
```

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## 🚀 Deployment

### Deploy to Render + Vercel (Free)

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

**Quick Summary:**
1. Push to GitHub
2. Connect Render to backend folder
3. Connect Vercel to frontend folder
4. Add environment variables
5. Deploy!

**Cost**: $0/month with free tiers

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Groq](https://groq.com) - Fast LLM inference
- [Anthropic Claude](https://anthropic.com) - Project assistance
- [Tesseract](https://github.com/tesseract-ocr/tesseract) - OCR engine
- All open-source contributors!

## 📧 Contact

- GitHub Issues: [Report bugs](https://github.com/yourusername/volcanorag/issues)
- Discussions: [Ask questions](https://github.com/yourusername/volcanorag/discussions)

## ⭐ Star History

If you find this project useful, please consider giving it a star!

---

**Built with ❤️ for the AI community**
