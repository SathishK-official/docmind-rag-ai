#!/usr/bin/env python3
"""
VolcanoRAG Setup Wizard
Interactive configuration and dependency checker
"""

import os
import sys
import subprocess
from pathlib import Path


def print_header(text):
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)


def check_python():
    """Check Python version"""
    version = sys.version_info
    if version >= (3, 9):
        print(f"✓ Python {version.major}.{version.minor}.{version.micro}")
        return True
    print(f"✗ Python {version.major}.{version.minor} (Need 3.9+)")
    return False


def check_node():
    """Check Node.js"""
    try:
        result = subprocess.run(['node', '--version'], 
                              capture_output=True, text=True)
        version = result.stdout.strip()
        print(f"✓ Node.js {version}")
        return True
    except:
        print("✗ Node.js not found")
        return False


def check_tesseract():
    """Check Tesseract OCR"""
    try:
        result = subprocess.run(['tesseract', '--version'],
                              capture_output=True, text=True)
        version = result.stdout.split('\n')[0]
        print(f"✓ {version}")
        return True
    except:
        print("✗ Tesseract not found")
        return False


def get_api_key():
    """Get Groq API key from user"""
    print("\n📝 Groq API Key Setup")
    print("Get your free key at: https://console.groq.com")
    
    api_key = input("\nEnter your GROQ_API_KEY (or press Enter to skip): ").strip()
    
    if not api_key:
        print("⚠️  Skipping API key setup")
        return None
    
    if len(api_key) < 20:
        print("⚠️  Key seems too short. Please verify.")
        return None
    
    return api_key


def create_env_file(api_key):
    """Create .env file"""
    backend_env = Path("backend/.env")
    
    content = f"""# Groq API Key
GROQ_API_KEY={api_key}

# Server Configuration
PORT=8000
HOST=0.0.0.0
LOG_LEVEL=INFO
"""
    
    backend_env.write_text(content)
    print(f"✓ Created {backend_env}")


def install_backend():
    """Install backend dependencies"""
    print("\n📦 Installing backend dependencies...")
    os.chdir("backend")
    result = subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    os.chdir("..")
    return result.returncode == 0


def install_frontend():
    """Install frontend dependencies"""
    print("\n📦 Installing frontend dependencies...")
    os.chdir("frontend")
    result = subprocess.run(["npm", "install"])
    os.chdir("..")
    return result.returncode == 0


def main():
    """Main setup wizard"""
    print_header("🌋 VolcanoRAG Setup Wizard")
    
    # Check dependencies
    print("\n🔍 Checking dependencies...")
    
    checks = {
        "Python 3.9+": check_python(),
        "Node.js": check_node(),
        "Tesseract OCR": check_tesseract()
    }
    
    missing = [name for name, ok in checks.items() if not ok]
    
    if missing:
        print(f"\n⚠️  Missing: {', '.join(missing)}")
        print("\nPlease install missing dependencies and run again.")
        print("\nInstallation guides:")
        print("- Python: https://python.org")
        print("- Node.js: https://nodejs.org")
        print("- Tesseract: See README.md")
        sys.exit(1)
    
    # Get API key
    api_key = get_api_key()
    
    if api_key:
        create_env_file(api_key)
    else:
        print("\n⚠️  You'll need to configure .env manually")
    
    # Install dependencies
    print_header("📦 Installing Dependencies")
    
    choice = input("\nInstall dependencies now? (y/n): ").lower()
    
    if choice == 'y':
        backend_ok = install_backend()
        frontend_ok = install_frontend()
        
        if backend_ok and frontend_ok:
            print("\n✓ All dependencies installed!")
        else:
            print("\n⚠️  Some installations failed. Check errors above.")
    
    # Final instructions
    print_header("✅ Setup Complete!")
    
    print("""
To start VolcanoRAG:

1. Backend:
   cd backend
   python -m app.main

2. Frontend (new terminal):
   cd frontend
   npm run dev

3. Open: http://localhost:3000

Need help? Check README.md or open an issue!
""")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup cancelled")
        sys.exit(1)
