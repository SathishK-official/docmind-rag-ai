# Deployment Guide

## Deploy to Render + Vercel (Free)

### Prerequisites
- GitHub account
- Render account (render.com)
- Vercel account (vercel.com)
- Configured .env files

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/volcanorag.git
git push -u origin main
```

### Step 2: Deploy Backend (Render)

1. Go to render.com
2. New Web Service
3. Connect GitHub repository
4. Configure:
   - Root: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `python -m app.main`
5. Add environment variable:
   - `GROQ_API_KEY`: your key
6. Deploy!

### Step 3: Deploy Frontend (Vercel)

1. Go to vercel.com
2. New Project
3. Import from GitHub
4. Configure:
   - Root: `frontend`
   - Framework: Vite
5. Add environment variable:
   - `VITE_API_URL`: your Render backend URL
6. Deploy!

### Step 4: Test

Visit your Vercel URL and test the application!

## Cost

- Render: Free (750 hours/month)
- Vercel: Free (unlimited)
- **Total: $0/month**
