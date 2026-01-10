let recognition = null;
let isRecognizing = false;

export const startVoiceRecognition = (onResult, onError) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    onError('Voice not supported. Use Chrome or Edge.');
    return false;
  }

  if (recognition && isRecognizing) {
    try {
      recognition.stop();
      isRecognizing = false;
    } catch (e) {
      console.log('Stop error:', e);
    }
    // Wait a bit before starting new
    setTimeout(() => startNewRecognition(), 200);
    return true;
  }

  return startNewRecognition();
  
  function startNewRecognition() {
    recognition = new SpeechRecognition();
    
    // CRITICAL: Use English recognition for both English AND Tanglish
    // English recognition can pick up Tamil words spoken in English
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3; // Get multiple interpretations
    
    recognition.onstart = () => {
      isRecognizing = true;
      console.log('🎤 LISTENING - Speak now!');
    };

    recognition.onresult = (event) => {
      isRecognizing = false;
      
      // Get all alternatives
      const results = event.results[0];
      const alternatives = [];
      
      for (let i = 0; i < results.length; i++) {
        alternatives.push({
          transcript: results[i].transcript,
          confidence: results[i].confidence
        });
      }
      
      console.log('✅ RECOGNIZED:');
      alternatives.forEach((alt, i) => {
        console.log(`  ${i + 1}. "${alt.transcript}" (${(alt.confidence * 100).toFixed(0)}%)`);
      });
      
      // Use the best result
      const transcript = results[0].transcript;
      const confidence = results[0].confidence;
      
      if (transcript && transcript.trim().length > 0) {
        console.log(`✓ Using: "${transcript}"`);
        onResult(transcript);
      } else {
        console.log('⚠️ Empty result');
        onError('No speech detected. Try speaking louder.');
      }
    };

    recognition.onspeechend = () => {
      console.log('Speech ended');
    };

    recognition.onend = () => {
      isRecognizing = false;
      console.log('Recognition ended');
    };

    recognition.onerror = (event) => {
      isRecognizing = false;
      console.error('❌ Error:', event.error);
      
      const errors = {
        'no-speech': 'No speech detected. Please speak clearly within 5 seconds.',
        'audio-capture': 'Microphone not found. Please connect a microphone.',
        'not-allowed': 'Microphone blocked! Click 🔒 in address bar → Allow microphone → Refresh page.',
        'network': 'Internet error. Voice recognition needs internet connection.',
        'aborted': 'Recognition stopped.',
        'language-not-supported': 'Language not supported.',
      };
      
      const message = errors[event.error] || `Error: ${event.error}. Please try again.`;
      onError(message);
    };

    try {
      recognition.start();
      console.log('🎙️ Microphone ON');
      return true;
    } catch (error) {
      isRecognizing = false;
      console.error('Start failed:', error);
      
      if (error.message && error.message.includes('already started')) {
        onError('Already listening. Please wait.');
      } else {
        onError('Cannot start microphone. Refresh page and try again.');
      }
      return false;
    }
  }
};

export const stopVoiceRecognition = () => {
  if (recognition && isRecognizing) {
    try {
      recognition.stop();
      isRecognizing = false;
      console.log('🛑 Microphone OFF');
    } catch (error) {
      console.error('Stop error:', error);
    }
  }
  recognition = null;
};

export const isSpeechRecognitionSupported = () => {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
};

export const requestMicrophonePermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    console.log('✓ Microphone permission OK');
    return true;
  } catch (error) {
    console.error('✗ Microphone denied:', error);
    return false;
  }
};