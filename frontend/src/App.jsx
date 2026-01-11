import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, MessageSquare, Mic, Volume2, Sun, Moon, 
  Copy, Download, Send, Loader, AlertCircle, CheckCircle,
  MicOff, VolumeX, Radio, Zap
} from 'lucide-react';
import FileUpload from './components/FileUpload';
import ProcessingStatus from './components/ProcessingStatus';
import { uploadDocument, queryDocument, textToSpeech } from './services/api';
import { startVoiceRecognition, stopVoiceRecognition } from './services/speechRecognition';
import backgroundImage from './components/background_image.jpg';

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [fileName, setFileName] = useState('');
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('en');
  const [conversationMode, setConversationMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const conversationModeRef = useRef(false);
  const countdownTimerRef = useRef(null);
  const listeningTimeoutRef = useRef(null);
  
  useEffect(() => {
    conversationModeRef.current = conversationMode;
  }, [conversationMode]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleAudioEnd = () => {
      console.log('✅ Audio finished playing');
      setSpeaking(false);
      
      if (conversationModeRef.current && sessionId) {
        console.log('Starting 5 second countdown...');
        startCountdownAndListen();
      }
    };
    
    audio.addEventListener('ended', handleAudioEnd);
    return () => audio.removeEventListener('ended', handleAudioEnd);
  }, [sessionId]);
  
  const startCountdownAndListen = () => {
    let count = 5;
    setCountdown(count);
    
    countdownTimerRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      console.log('Countdown:', count);
      
      if (count === 0) {
        clearInterval(countdownTimerRef.current);
        setCountdown(0);
        startListeningCycle();
      }
    }, 1000);
  };
  
  const startListeningCycle = () => {
    if (!conversationModeRef.current) return;
    
    console.log('🎤 Listening for 5 seconds...');
    setListening(true);
    
    const success = startVoiceRecognition(
      (transcript) => {
        console.log('✅ Got transcript:', transcript);
        clearTimeout(listeningTimeoutRef.current);
        setListening(false);
        
        if (transcript && transcript.trim()) {
          console.log('Asking question...');
          askQuestion(transcript, true);
        } else {
          console.log('Empty, retrying...');
          setTimeout(() => startListeningCycle(), 500);
        }
      },
      (errorMsg) => {
        console.log('❌ Error:', errorMsg);
        clearTimeout(listeningTimeoutRef.current);
        setListening(false);
        
        if (conversationModeRef.current) {
          console.log('Retrying in 1 sec...');
          setTimeout(() => startListeningCycle(), 1000);
        }
      }
    );
    
    if (success) {
      listeningTimeoutRef.current = setTimeout(() => {
        console.log('⏱️ 5 sec up, no speech');
        stopVoiceRecognition();
        setListening(false);
        
        if (conversationModeRef.current) {
          console.log('Retrying...');
          setTimeout(() => startListeningCycle(), 1000);
        }
      }, 5000);
    }
  };
  
  const handleFileUpload = async (file) => {
    setProcessing(true);
    setError('');
    
    try {
      const result = await uploadDocument(file);
      setSessionId(result.session_id);
      setFileName(result.filename);
      setMessages([{
        type: 'system',
        content: `✓ "${result.filename}" ready!`,
        timestamp: new Date()
      }]);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Upload failed');
    } finally {
      setProcessing(false);
    }
  };
  
  const askQuestion = async (text, isVoice) => {
    if (!text || !text.trim() || !sessionId || loading) return;
    
    const q = text.trim();
    console.log('📤 Asking:', q);
    
    setMessages(prev => [...prev, {
      type: 'user',
      content: q,
      timestamp: new Date(),
      isVoice
    }]);
    
    setQuestion('');
    setLoading(true);
    setError('');
    
    try {
      console.log('🤖 Querying API...');
      const response = await queryDocument(sessionId, q, language);
      console.log('✅ Got response');
      
      setMessages(prev => [...prev, {
        type: 'ai',
        content: response.answer,
        timestamp: new Date()
      }]);
      
      // ALWAYS play voice in conversation mode
      if (conversationModeRef.current) {
        console.log('🔊 Playing voice...');
        await playVoice(response.answer);
      } else if (isVoice) {
        await playVoice(response.answer);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed';
      console.error('Error:', msg);
      setError(msg);
      setMessages(prev => [...prev, {
        type: 'error',
        content: msg,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };
  
  const playVoice = async (text) => {
    try {
      setSpeaking(true);
      console.log('🎵 Generating TTS...');
      const audioBlob = await textToSpeech(text, language);
      console.log('✅ TTS ready, size:', audioBlob.size);
      
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        console.log('▶️ Playing...');
        await audioRef.current.play();
        console.log('🔊 Audio started');
      }
    } catch (err) {
      console.error('❌ TTS error:', err);
      setSpeaking(false);
      
      // If TTS fails, continue loop anyway
      if (conversationModeRef.current) {
        setTimeout(() => startCountdownAndListen(), 1000);
      }
    }
  };
  
  const startNormalListening = () => {
    if (listening) return;
    
    const success = startVoiceRecognition(
      (transcript) => {
        setListening(false);
        
        if (conversationModeRef.current) {
          askQuestion(transcript, true);
        } else {
          setQuestion(transcript);
        }
      },
      (errorMsg) => {
        setError(errorMsg);
        setListening(false);
      }
    );
    
    if (success) {
      setListening(true);
      setError('');
    }
  };
  
  const toggleConversationMode = () => {
    if (!conversationMode) {
      console.log('🔴 START conversation mode');
      setConversationMode(true);
      if (sessionId) {
        setTimeout(() => startNormalListening(), 500);
      }
    } else {
      console.log('⚫ STOP conversation mode');
      setConversationMode(false);
      setCountdown(0);
      
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
      }
      if (listening) {
        stopVoiceRecognition();
        setListening(false);
      }
      if (speaking && audioRef.current) {
        audioRef.current.pause();
        setSpeaking(false);
      }
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (question.trim()) {
      askQuestion(question, false);
    }
  };
  
  const readAloud = async (text) => {
    if (speaking && audioRef.current) {
      audioRef.current.pause();
      setSpeaking(false);
    } else {
      await playVoice(text);
    }
  };
  
  return (
    <div className="min-h-screen text-white relative">
      {/* Lava Background */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.5)',
        }}
      />
      
      <div className="relative z-10">
        <header className="border-b border-orange-600/50 bg-black/80 sticky top-0 z-20">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">🌋</div>
                <div>
                  <h1 className="text-2xl font-bold" style={{color: '#FF4500'}}>VolcanoRAG</h1>
                  <p className="text-sm text-gray-300">AI Voice Assistant</p>
                </div>
              </div>
              
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 border border-orange-600/30">
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
            
            {sessionId && (
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={toggleConversationMode}
                  className={`px-6 py-3 rounded-lg flex items-center gap-3 font-bold shadow-lg ${
                    conversationMode 
                      ? 'animate-pulse' 
                      : 'bg-gray-900 hover:bg-gray-800 border border-orange-600/30'
                  }`}
                  style={conversationMode ? {background: 'linear-gradient(to right, #FF4500, #FF6347)'} : {}}
                >
                  {conversationMode ? (
                    <>
                      <Radio size={24} className="animate-pulse" />
                      <span>🔴 LIVE</span>
                      <Zap size={20} />
                    </>
                  ) : (
                    <>
                      <Mic size={20} />
                      <span>Voice Mode</span>
                    </>
                  )}
                </button>
                
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-4 py-3 rounded-lg bg-gray-900 border border-orange-600/30 font-semibold"
                >
                  <option value="en">🇺🇸 English</option>
                  <option value="ta">🇮🇳 Tanglish</option>
                </select>
                
                {countdown > 0 && (
                  <div className="px-4 py-2 rounded-lg flex items-center gap-2" style={{backgroundColor: '#FF4500'}}>
                    <span className="font-bold text-2xl">{countdown}</span>
                  </div>
                )}
                
                {listening && (
                  <div className="px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse" style={{backgroundColor: '#FF4500'}}>
                    <div className="w-3 h-3 bg-white rounded-full animate-ping" />
                    <span className="font-bold">LISTENING</span>
                  </div>
                )}
                
                {loading && (
                  <div className="px-4 py-2 rounded-lg flex items-center gap-2" style={{backgroundColor: '#FF6347'}}>
                    <Loader size={16} className="animate-spin" />
                    <span className="font-bold">THINKING</span>
                  </div>
                )}
                
                {speaking && (
                  <div className="px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse" style={{backgroundColor: '#32CD32'}}>
                    <Volume2 size={16} className="animate-bounce" />
                    <span className="font-bold">SPEAKING</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {conversationMode && (
            <div className="py-3 px-4 text-center font-bold" style={{background: 'linear-gradient(to right, #FF4500, #FF6347)'}}>
              🎤 CONTINUOUS MODE - Auto-listening after response! 🔊
            </div>
          )}
        </header>
        
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          {!sessionId ? (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">Upload Document</h2>
                <p className="text-gray-300">PDF, DOCX, XLSX, PPTX, TXT, Images</p>
              </div>
              
              <FileUpload onUpload={handleFileUpload} processing={processing} />
              {processing && <ProcessingStatus />}
              
              {error && (
                <div className="mt-4 p-4 rounded-lg border" style={{backgroundColor: '#1a1a1a', borderColor: '#FF4500'}}>
                  <AlertCircle size={20} className="inline mr-2" style={{color: '#FF4500'}} />
                  <span style={{color: '#FF4500'}}>{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="rounded-lg p-4 border" style={{backgroundColor: '#1a1a1a', borderColor: '#FF6347'}}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-500" size={24} />
                    <div>
                      <p className="font-semibold">{fileName}</p>
                      <p className="text-sm text-gray-400">Ready</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (conversationMode) toggleConversationMode();
                      setSessionId(null);
                      setMessages([]);
                      setFileName('');
                    }}
                    className="px-4 py-2 rounded-lg font-semibold"
                    style={{backgroundColor: '#FF4500'}}
                  >
                    New
                  </button>
                </div>
              </div>
              
              {error && (
                <div className="p-4 rounded-lg border" style={{backgroundColor: '#1a1a1a', borderColor: '#FF4500'}}>
                  <AlertCircle size={20} className="inline mr-2" style={{color: '#FF4500'}} />
                  <span style={{color: '#FF4500'}}>{error}</span>
                </div>
              )}
              
              <div className="rounded-lg border min-h-[400px] max-h-[500px] overflow-y-auto p-6" style={{backgroundColor: '#1a1a1a', borderColor: '#FF6347'}}>
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Ask about your document!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div 
                          className={`max-w-[80%] rounded-lg p-4`}
                          style={{
                            background: msg.type === 'user' 
                              ? 'linear-gradient(to right, #FF4500, #FF6347)' 
                              : msg.type === 'ai' 
                              ? '#2a2a2a' 
                              : msg.type === 'system'
                              ? '#1e3a8a'
                              : '#7f1d1d',
                            border: msg.type === 'ai' ? '1px solid #FF6347' : 'none'
                          }}
                        >
                          {msg.isVoice && <div className="text-xs opacity-70 mb-2">🎤 Voice</div>}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                            <span className="text-xs opacity-70">{msg.timestamp.toLocaleTimeString()}</span>
                            {msg.type === 'ai' && !conversationMode && (
                              <button
                                onClick={() => readAloud(msg.content)}
                                className="text-xs flex items-center gap-1 px-2 py-1 rounded"
                                style={{backgroundColor: '#FF4500'}}
                              >
                                {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                Read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              
              {!conversationMode && (
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <button
                    type="button"
                    onClick={startNormalListening}
                    disabled={loading || listening}
                    className={`p-3 rounded-lg border ${listening ? 'animate-pulse' : ''}`}
                    style={{
                      backgroundColor: listening ? '#FF4500' : '#1a1a1a',
                      borderColor: '#FF6347'
                    }}
                  >
                    {listening ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                  
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={listening ? "Listening..." : "Ask a question..."}
                    className="flex-1 px-4 py-3 rounded-lg border focus:outline-none"
                    style={{backgroundColor: '#1a1a1a', borderColor: '#FF6347'}}
                    disabled={loading || listening}
                  />
                  
                  <button
                    type="submit"
                    disabled={loading || !question.trim() || listening}
                    className="px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
                    style={{background: 'linear-gradient(to right, #FF4500, #FF6347)'}}
                  >
                    {loading ? <Loader size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                </form>
              )}
              
              {conversationMode && (
                <div className="rounded-lg p-6 text-center border-2" style={{backgroundColor: '#1a1a1a', borderColor: '#FF4500'}}>
                  {countdown > 0 ? (
                    <>
                      <p className="text-xl font-bold mb-2">⏳ Get ready... {countdown}</p>
                      <p className="text-sm text-gray-300">Listening starts in {countdown} seconds</p>
                    </>
                  ) : listening ? (
                    <>
                      <p className="text-xl font-bold mb-2">🎤 Speak now! (5 seconds)</p>
                      <p className="text-sm text-gray-300">Ask your question</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl font-bold mb-2">🔊 AI responding...</p>
                      <p className="text-sm text-gray-300">Listen to answer</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      
      <audio ref={audioRef} />
    </div>
  );
}

export default App;