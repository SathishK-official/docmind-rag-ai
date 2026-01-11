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
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleAudioEnd = () => {
      console.log('🔊 Audio finished');
      setSpeaking(false);
      
      if (conversationModeRef.current && sessionId) {
        startCountdownAndListen();
      }
    };
    
    audio.addEventListener('ended', handleAudioEnd);
    return () => audio.removeEventListener('ended', handleAudioEnd);
  }, [sessionId]);
  
  const startCountdownAndListen = () => {
    console.log('⏳ Starting 5 second countdown...');
    let count = 5;
    setCountdown(count);
    
    countdownTimerRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      
      if (count === 0) {
        clearInterval(countdownTimerRef.current);
        setCountdown(0);
        startListeningCycle();
      }
    }, 1000);
  };
  
  const startListeningCycle = () => {
    if (!conversationModeRef.current) return;
    
    console.log('🎤 Starting listening (5 sec window)...');
    setListening(true);
    
    const success = startVoiceRecognition(
      (transcript) => {
        console.log('✅ Got input:', transcript);
        clearTimeout(listeningTimeoutRef.current);
        setListening(false);
        
        if (transcript && transcript.trim()) {
          askQuestion(transcript, true);
        } else {
          console.log('⚠️ Empty transcript, retrying...');
          setTimeout(() => startListeningCycle(), 500);
        }
      },
      (errorMsg) => {
        console.log('❌ Error:', errorMsg);
        clearTimeout(listeningTimeoutRef.current);
        setListening(false);
        
        if (conversationModeRef.current) {
          console.log('🔄 Retrying in 1 second...');
          setTimeout(() => startListeningCycle(), 1000);
        }
      }
    );
    
    if (success) {
      listeningTimeoutRef.current = setTimeout(() => {
        console.log('⏱️ 5 seconds up, stopping...');
        stopVoiceRecognition();
        setListening(false);
        
        if (conversationModeRef.current) {
          console.log('🔄 No speech detected, retrying...');
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
      const response = await queryDocument(sessionId, q, language);
      
      setMessages(prev => [...prev, {
        type: 'ai',
        content: response.answer,
        timestamp: new Date()
      }]);
      
      if (conversationModeRef.current || isVoice) {
        await playVoice(response.answer);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed';
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
      console.log('🔊 Playing response...');
      const audioBlob = await textToSpeech(text, language);
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      }
    } catch (err) {
      console.error('TTS error:', err);
      setSpeaking(false);
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
      console.log('🔴 Entering conversation mode');
      setConversationMode(true);
      if (sessionId) {
        setTimeout(() => startNormalListening(), 500);
      }
    } else {
      console.log('⚫ Exiting conversation mode');
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
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Volcanic Lava Background */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1603794067602-9feaa4f70e0c?q=80&w=2070)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'brightness(0.4) contrast(1.2)',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        <header className="border-b border-red-600/30 bg-black/60 backdrop-blur-xl sticky top-0 z-20">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">🌋</div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent">
                    VolcanoRAG
                  </h1>
                  <p className="text-sm text-gray-300">AI Voice Assistant</p>
                </div>
              </div>
              
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg bg-gray-900/80 hover:bg-gray-800/80 border border-orange-500/30">
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
            
            {sessionId && (
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={toggleConversationMode}
                  className={`px-6 py-3 rounded-lg flex items-center gap-3 font-bold shadow-lg ${
                    conversationMode 
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-orange-500/50 animate-pulse' 
                      : 'bg-gray-900/80 text-gray-300 hover:bg-gray-800/80 border border-orange-500/30'
                  }`}
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
                  className="px-4 py-3 rounded-lg bg-gray-900/80 border border-orange-500/30 font-semibold"
                >
                  <option value="en">🇺🇸 English</option>
                  <option value="ta">🇮🇳 Tanglish</option>
                </select>
                
                {countdown > 0 && (
                  <div className="px-4 py-2 bg-orange-600 rounded-lg flex items-center gap-2">
                    <span className="font-bold text-2xl">{countdown}</span>
                  </div>
                )}
                
                {listening && (
                  <div className="px-4 py-2 bg-red-600 rounded-lg flex items-center gap-2 animate-pulse">
                    <div className="w-3 h-3 bg-white rounded-full animate-ping" />
                    <span className="font-bold">LISTENING</span>
                  </div>
                )}
                
                {loading && (
                  <div className="px-4 py-2 bg-orange-600 rounded-lg flex items-center gap-2">
                    <Loader size={16} className="animate-spin" />
                    <span className="font-bold">THINKING</span>
                  </div>
                )}
                
                {speaking && (
                  <div className="px-4 py-2 bg-green-600 rounded-lg flex items-center gap-2 animate-pulse">
                    <Volume2 size={16} className="animate-bounce" />
                    <span className="font-bold">SPEAKING</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {conversationMode && (
            <div className="bg-gradient-to-r from-orange-600 to-red-600 py-3 px-4 text-center font-bold">
              🎤 CONTINUOUS MODE - Auto-listening after each response! 🔊
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
                <div className="mt-4 p-4 bg-red-600/20 border border-red-500 rounded-lg backdrop-blur-sm">
                  <AlertCircle size={20} className="text-red-400 inline mr-2" />
                  <span className="text-red-400">{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="bg-gray-900/60 backdrop-blur-xl rounded-lg p-4 border border-orange-500/30">
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
                    className="px-4 py-2 bg-red-600 hover:bg-orange-600 rounded-lg font-semibold"
                  >
                    New
                  </button>
                </div>
              </div>
              
              {error && (
                <div className="p-4 bg-red-600/20 border border-red-500 rounded-lg backdrop-blur-sm">
                  <AlertCircle size={20} className="text-red-400 inline mr-2" />
                  <span className="text-red-400">{error}</span>
                </div>
              )}
              
              <div className="bg-gray-900/60 backdrop-blur-xl rounded-lg border border-orange-500/30 min-h-[400px] max-h-[500px] overflow-y-auto p-6">
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
                        <div className={`max-w-[80%] rounded-lg p-4 backdrop-blur-sm ${
                          msg.type === 'user' ? 'bg-gradient-to-r from-orange-600 to-red-600' :
                          msg.type === 'ai' ? 'bg-gray-800/80 border border-orange-500/30' :
                          msg.type === 'system' ? 'bg-blue-600/20 border border-blue-500/30' :
                          'bg-red-600/20 border border-red-500/30'
                        }`}>
                          {msg.isVoice && <div className="text-xs opacity-70 mb-2">🎤 Voice</div>}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                            <span className="text-xs opacity-70">{msg.timestamp.toLocaleTimeString()}</span>
                            {msg.type === 'ai' && !conversationMode && (
                              <button
                                onClick={() => readAloud(msg.content)}
                                className="text-xs flex items-center gap-1 px-2 py-1 bg-white/10 rounded hover:bg-white/20"
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
                    className={`p-3 rounded-lg ${listening ? 'bg-red-600 animate-pulse' : 'bg-gray-900/80 hover:bg-gray-800/80 border border-orange-500/30'}`}
                  >
                    {listening ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                  
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={listening ? "Listening..." : "Ask a question..."}
                    className="flex-1 px-4 py-3 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-orange-500/30 focus:border-orange-500 focus:outline-none"
                    disabled={loading || listening}
                  />
                  
                  <button
                    type="submit"
                    disabled={loading || !question.trim() || listening}
                    className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-50 rounded-lg font-semibold"
                  >
                    {loading ? <Loader size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                </form>
              )}
              
              {conversationMode && (
                <div className="bg-orange-600/20 border-2 border-orange-500 rounded-lg p-6 text-center backdrop-blur-sm">
                  {countdown > 0 ? (
                    <>
                      <p className="text-xl font-bold mb-2">⏳ Get ready... {countdown}</p>
                      <p className="text-sm text-gray-300">Listening starts in {countdown} seconds</p>
                    </>
                  ) : listening ? (
                    <>
                      <p className="text-xl font-bold mb-2">🎤 Speak now! (5 seconds)</p>
                      <p className="text-sm text-gray-300">Ask your question clearly</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl font-bold mb-2">🔊 AI is responding...</p>
                      <p className="text-sm text-gray-300">Listen to the answer</p>
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