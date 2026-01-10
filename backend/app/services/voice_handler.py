"""
Voice Handler Service
Text-to-speech conversion with detailed error handling
"""

import edge_tts
import io
import asyncio


class VoiceHandler:
    """Handle text-to-speech with comprehensive error handling"""
    
    def __init__(self):
        self.voices = {
            "en": "en-US-AriaNeural",      # English - Female US voice
            "ta": "en-IN-NeerjaNeural"      # Tanglish - Female Indian English voice
        }
    
    async def text_to_speech(self, text: str, language: str = "en"):
        """
        Convert text to speech
        
        Args:
            text: Text to convert
            language: 'en' for English, 'ta' for Tanglish
            
        Returns:
            io.BytesIO: Audio data stream
        """
        try:
            # Select voice based on language
            voice = self.voices.get(language, self.voices["en"])
            
            print(f"🔊 TTS Request:")
            print(f"   Language: {language}")
            print(f"   Voice: {voice}")
            print(f"   Text length: {len(text)} chars")
            print(f"   Text preview: {text[:50]}...")
            
            # Limit text length to prevent errors
            if len(text) > 5000:
                text = text[:5000] + "..."
                print(f"   ⚠️ Text truncated to 5000 chars")
            
            # Create communicate object
            communicate = edge_tts.Communicate(text, voice)
            
            # Stream audio data
            audio_data = io.BytesIO()
            chunk_count = 0
            
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data.write(chunk["data"])
                    chunk_count += 1
            
            print(f"   ✓ Generated {chunk_count} audio chunks")
            print(f"   ✓ Total audio size: {audio_data.tell()} bytes")
            
            # Reset stream position to beginning
            audio_data.seek(0)
            
            if audio_data.tell() == 0 and chunk_count == 0:
                print("   ✗ ERROR: No audio data generated!")
                raise Exception("TTS failed to generate audio")
            
            # Verify we have data
            audio_size = len(audio_data.getvalue())
            if audio_size == 0:
                print("   ✗ ERROR: Audio buffer is empty!")
                raise Exception("TTS generated empty audio")
            
            print(f"   ✓ TTS Success! Audio ready ({audio_size} bytes)")
            return audio_data
            
        except Exception as e:
            print(f"   ✗ TTS ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Text-to-speech failed: {str(e)}")