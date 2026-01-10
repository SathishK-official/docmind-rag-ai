let recognition = null;

export const startVoiceRecognition = (onResult, onError) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    onError('Browser not supported. Use Chrome.');
    return false;
  }

  if (recognition) {
    try {
      recognition.abort();
    } catch (e) {}
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    console.log('🎤 Listening...');
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    console.log('✅ Heard:', transcript);
    onResult(transcript);
  };

  recognition.onerror = (event) => {
    console.error('❌ Error:', event.error);
    
    if (event.error === 'no-speech') {
      onError('No speech heard. Speak louder and closer to mic.');
    } else if (event.error === 'not-allowed') {
      onError('Microphone blocked. Click lock icon 🔒 and allow microphone.');
    } else {
      onError('Error: ' + event.error);
    }
  };

  recognition.onend = () => {
    console.log('Recognition ended');
  };

  try {
    recognition.start();
    return true;
  } catch (error) {
    console.error('Start failed:', error);
    onError('Failed to start. Try again.');
    return false;
  }
};

export const stopVoiceRecognition = () => {
  if (recognition) {
    try {
      recognition.stop();
    } catch (e) {}
    recognition = null;
  }
};