let recognition = null;
let isRecognizing = false;

export const startVoiceRecognition = (onResult, onError) => {
  // Check browser support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    onError('Speech recognition not supported. Please use Chrome or Edge.');
    return false;
  }

  // Stop any existing recognition
  if (recognition && isRecognizing) {
    try {
      recognition.stop();
    } catch (e) {
      console.log('Error stopping existing recognition:', e);
    }
  }

  // Create new recognition instance
  recognition = new SpeechRecognition();
  
  // Configuration - ALWAYS use English for recognition
  // This works for both English and Tanglish (Tamil words spoken in English)
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US'; // Keep English - it recognizes Tanglish too!
  recognition.maxAlternatives = 1;

  // Event: Recognition starts
  recognition.onstart = () => {
    isRecognizing = true;
    console.log('🎤 Voice recognition started. Speak in English or Tanglish...');
  };

  // Event: Speech recognized
  recognition.onresult = (event) => {
    isRecognizing = false;
    const transcript = event.results[0][0].transcript;
    const confidence = event.results[0][0].confidence;
    
    console.log('✓ Recognized:', transcript);
    console.log('✓ Confidence:', confidence);
    
    // Check if we got something
    if (transcript && transcript.trim().length > 0) {
      onResult(transcript);
    } else {
      console.log('⚠️ Empty transcript');
      onError('No speech detected. Please speak louder or try again.');
    }
  };

  // Event: No speech detected
  recognition.onspeechend = () => {
    console.log('Speech ended, processing...');
    // Don't stop immediately - let onresult handle it
  };

  // Event: Recognition ends
  recognition.onend = () => {
    isRecognizing = false;
    console.log('Voice recognition ended');
  };

  // Event: Error occurred
  recognition.onerror = (event) => {
    isRecognizing = false;
    console.error('Speech recognition error:', event.error);
    
    // Handle different error types
    let errorMessage = 'Voice recognition failed.';
    
    switch(event.error) {
      case 'no-speech':
        errorMessage = 'No speech detected. Please speak clearly and try again.';
        break;
      case 'audio-capture':
        errorMessage = 'No microphone found. Please check your microphone is connected.';
        break;
      case 'not-allowed':
        errorMessage = 'Microphone permission denied. Click the lock icon 🔒 in address bar and allow microphone.';
        break;
      case 'network':
        errorMessage = 'Network error. Speech recognition needs internet. Please check your connection.';
        break;
      case 'aborted':
        errorMessage = 'Speech recognition aborted.';
        break;
      case 'language-not-supported':
        errorMessage = 'Language not supported.';
        break;
      default:
        errorMessage = `Voice recognition error: ${event.error}. Please try again.`;
    }
    
    onError(errorMessage);
  };

  // Start recognition
  try {
    recognition.start();
    console.log('🎙️ Microphone activated - Start speaking...');
    return true;
  } catch (error) {
    isRecognizing = false;
    console.error('Failed to start recognition:', error);
    
    if (error.message && error.message.includes('already started')) {
      onError('Voice recognition already running. Please wait a moment and try again.');
    } else {
      onError('Failed to start voice recognition. Please refresh the page and try again.');
    }
    return false;
  }
};

export const stopVoiceRecognition = () => {
  if (recognition && isRecognizing) {
    try {
      recognition.stop();
      isRecognizing = false;
      console.log('🛑 Voice recognition stopped by user');
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }
  recognition = null;
};

// Check if browser supports speech recognition
export const isSpeechRecognitionSupported = () => {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
};

// Request microphone permission
export const requestMicrophonePermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    console.log('✓ Microphone permission granted');
    return true;
  } catch (error) {
    console.error('✗ Microphone permission denied:', error);
    return false;
  }
};