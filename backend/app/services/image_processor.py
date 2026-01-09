"""
Image Processor Service
OCR and Vision AI for image understanding
"""

import os
import base64
from groq import Groq
import pytesseract
from PIL import Image

from app.config import settings


class ImageProcessor:
    """Process images with OCR and Vision AI"""
    
    def __init__(self):
        self.groq_client = Groq(api_key=settings.groq_api_key)
    
    def extract_text_ocr(self, image_path: str) -> str:
        """Extract text using Tesseract OCR"""
        try:
            img = Image.open(image_path)
            text = pytesseract.image_to_string(img)
            return text.strip()
        except Exception as e:
            print(f"OCR Error: {e}")
            return ""
    
    def analyze_image_vision(self, image_path: str) -> str:
        """Analyze image with Groq Vision AI"""
        try:
            # Encode to base64
            with open(image_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode('utf-8')
            
            # Get MIME type
            ext = os.path.splitext(image_path)[1].lower()
            mime_types = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png'
            }
            mime_type = mime_types.get(ext, 'image/jpeg')
            
            # Call Vision API
            response = self.groq_client.chat.completions.create(
                model=settings.vision_model,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Describe this image. If it has charts, graphs, or tables, explain the data. If it has text, transcribe it."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{image_data}"
                            }
                        }
                    ]
                }],
                max_tokens=1000,
                temperature=0.7
            )
            
            return response.choices[0].message.content
        except Exception as e:
            print(f"Vision AI Error: {e}")
            return ""
