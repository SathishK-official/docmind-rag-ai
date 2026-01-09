"""
Voice Handler Service
Text-to-speech conversion
"""

import edge_tts
import io


class VoiceHandler:
    """Handle text-to-speech"""
    
    def __init__(self):
        self.voices = {
            "en": "en-US-AriaNeural",
            "ta": "en-IN-NeerjaNeural"
        }
    
    async def text_to_speech(self, text: str, language: str = "en"):
        """Convert text to speech"""
        voice = self.voices.get(language, self.voices["en"])
        
        communicate = edge_tts.Communicate(text, voice)
        audio_data = io.BytesIO()
        
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.write(chunk["data"])
        
        audio_data.seek(0)
        return audio_data
