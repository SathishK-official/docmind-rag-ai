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
  
  // Configuration
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;

  // Event: Recognition starts
  recognition.onstart = () => {
    isRecognizing = true;
    console.log('🎤 Voice recognition started. Please speak...');
  };

  // Event: Speech recognized
  recognition.onresult = (event) => {
    isRecognizing = false;
    const transcript = event.results[0][0].transcript;
    const confidence = event.results[0][0].confidence;
    
    console.log('✓ Recognized:', transcript, 'Confidence:', confidence);
    onResult(transcript);
  };

  // Event: No speech detected
  recognition.onspeechend = () => {
    console.log('Speech ended, processing...');
    recognition.stop();
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
        errorMessage = 'No speech detected. Please try again.';
        break;
      case 'audio-capture':
        errorMessage = 'No microphone found. Please check your microphone.';
        break;
      case 'not-allowed':
        errorMessage = 'Microphone permission denied. Please allow microphone access.';
        break;
      case 'network':
        errorMessage = 'Network error. Please check your internet connection.';
        break;
      case 'aborted':
        errorMessage = 'Speech recognition aborted.';
        break;
      case 'language-not-supported':
        errorMessage = 'Language not supported.';
        break;
      default:
        errorMessage = `Voice recognition error: ${event.error}`;
    }
    
    onError(errorMessage);
  };

  // Start recognition
  try {
    recognition.start();
    console.log('Starting speech recognition...');
    return true;
  } catch (error) {
    isRecognizing = false;
    console.error('Failed to start recognition:', error);
    
    if (error.message.includes('already started')) {
      onError('Voice recognition already running. Please wait.');
    } else {
      onError('Failed to start voice recognition. Please try again.');
    }
    return false;
  }
};

export const stopVoiceRecognition = () => {
  if (recognition && isRecognizing) {
    try {
      recognition.stop();
      isRecognizing = false;
      console.log('Voice recognition stopped by user');
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
    return true;
  } catch (error) {
    console.error('Microphone permission denied:', error);
    return false;
  }
};