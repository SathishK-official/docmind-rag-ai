# Troubleshooting Guide

## Common Issues

### API Key Not Found

**Error**: `GROQ_API_KEY not set`

**Solution**:
1. Check `.env` file exists in `backend/`
2. Verify key is correct
3. No quotes around key value
4. Restart backend after changing .env

### Port Already in Use

**Error**: `Address already in use`

**Solution**:
```bash
# Kill process on port
# Linux/Mac:
lsof -ti:8000 | xargs kill -9

# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Tesseract Not Found

**Error**: `TesseractNotFoundError`

**Solution**:
- Linux: `sudo apt-get install tesseract-ocr`
- Mac: `brew install tesseract`
- Windows: Download from GitHub

### Module Not Found

**Error**: `ModuleNotFoundError`

**Solution**:
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

## Getting Help

1. Check README.md
2. Search GitHub Issues
3. Open new Issue with details
4. Include error messages and logs
