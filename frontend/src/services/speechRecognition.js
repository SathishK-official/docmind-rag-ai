let recognition = null;

export const startVoiceRecognition = (onResult, onError) => {
  // Check browser support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    onError('Speech recognition not supported in this browser. Please use Chrome or Edge.');
    return false;
  }
  
  // Create recognition instance
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;
  
  recognition.onstart = () => {
    console.log('Voice recognition started. Speak now...');
  };
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    console.log('Recognized:', transcript);
    onResult(transcript);
  };
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    onError(event.error);
  };
  
  recognition.onend = () => {
    console.log('Voice recognition ended');
  };
  
  try {
    recognition.start();
    return true;
  } catch (error) {
    console.error('Failed to start recognition:', error);
    onError(error);
    return false;
  }
};

export const stopVoiceRecognition = () => {
  if (recognition) {
    try {
      recognition.stop();
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
    recognition = null;
  }
};
