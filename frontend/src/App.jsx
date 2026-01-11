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

// Import local images
import dayBg from './components/day_mode_bg.jpg';
import nightBg from './components/night_mode_bg.jpg';

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
  const [statusMessage, setStatusMessage] = useState('');
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
      console.log('✅ Voice finished playing');
      setSpeaking(false);
      setStatusMessage('');
      
      if (conversationModeRef.current && sessionId) {
        console.log('Starting 10 sec countdown...');
        start10SecCountdown();
      }
    };
    
    audio.addEventListener('ended', handleAudioEnd);
    return () => audio.removeEventListener('ended', handleAudioEnd);
  }, [sessionId]);
  
  const start10SecCountdown = () => {
    let count = 10;
    setCountdown(count);
    setStatusMessage('Ready to ask your next question in');
    
    countdownTimerRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      
      if (count === 0) {
        clearInterval(countdownTimerRef.current);
        setCountdown(0);
        setStatusMessage('');
        startListening7Sec();
      }
    }, 1000);
  };
  
  const startListening7Sec = () => {
    if (!conversationModeRef.current) return;
    
    console.log('🎤 Listening for 7 seconds...');
    setListening(true);
    setStatusMessage('Listening');
    let transcript = '';
    
    const success = startVoiceRecognition(
      (result) => {
        transcript = result;
        console.log('Got transcript:', result);
      },
      (errorMsg) => {
        console.log('Error:', errorMsg);
      }
    );
    
    if (success) {
      listeningTimeoutRef.current = setTimeout(() => {
        console.log('⏱️ 7 seconds up');
        stopVoiceRecognition();
        setListening(false);
        
        if (transcript && transcript.trim()) {
          console.log('✅ Speech detected:', transcript);
          setStatusMessage('');
          askQuestion(transcript, true);
        } else {
          console.log('❌ No speech detected');
          showNoSpeechMessage();
        }
      }, 7000);
    }
  };
  
  const showNoSpeechMessage = () => {
    setStatusMessage('No speech detected');
    
    setTimeout(() => {
      if (conversationModeRef.current) {
        setStatusMessage('');
        console.log('Restarting cycle...');
        start10SecCountdown();
      }
    }, 2000);
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
    setStatusMessage('Thinking');
    setError('');
    
    try {
      console.log('🤖 Calling API...');
      const response = await queryDocument(sessionId, q, language);
      console.log('✅ Got response:', response.answer.substring(0, 50));
      
      setMessages(prev => [...prev, {
        type: 'ai',
        content: response.answer,
        timestamp: new Date()
      }]);
      
      setLoading(false);
      
      // FORCE voice reading in conversation mode
      if (conversationModeRef.current) {
        console.log('🔊 FORCE READING RESPONSE');
        setStatusMessage('Reading response');
        setTimeout(() => {
          playVoice(response.answer);
        }, 500);
      } else if (isVoice) {
        playVoice(response.answer);
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
      setLoading(false);
      setStatusMessage('');
    }
  };
  
  const playVoice = async (text) => {
    try {
      setSpeaking(true);
      console.log('🎵 Generating TTS for:', text.substring(0, 50) + '...');
      const audioBlob = await textToSpeech(text, language);
      console.log('✅ TTS blob size:', audioBlob.size);
      
      if (audioBlob.size === 0) {
        throw new Error('Empty audio blob');
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        console.log('▶️ Starting playback...');
        
        try {
          await audioRef.current.play();
          console.log('🔊 Audio playing');
        } catch (playErr) {
          console.error('Play error:', playErr);
          throw playErr;
        }
      }
    } catch (err) {
      console.error('❌ TTS/Play error:', err);
      setSpeaking(false);
      setStatusMessage('Voice error, continuing...');
      
      // Continue loop even if voice fails
      if (conversationModeRef.current) {
        setTimeout(() => start10SecCountdown(), 2000);
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
      setStatusMessage('Ask your first question');
      if (sessionId) {
        setTimeout(() => startNormalListening(), 500);
      }
    } else {
      console.log('⚫ STOP conversation mode');
      setConversationMode(false);
      setCountdown(0);
      setStatusMessage('');
      
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
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
  
  // Theme colors
  const theme = darkMode ? {
    primary: '#FF4500',
    secondary: '#ff4747',
    bg: 'rgba(26, 26, 26, 0.95)',
    bgHeader: 'rgba(0, 0, 0, 0.9)',
    border: '#FF6347',
    text: '#ffffff',
    textSecondary: '#d1d5db',
    bgImage: nightBg,
    containerBg: 'rgba(26, 26, 26, 0.95)',
    shadow: '0 4px 6px -1px rgba(255, 69, 0, 0.3), 0 2px 4px -1px rgba(255, 69, 0, 0.2)'
  } : {
    primary: '#3B82F6',
    secondary: '#60A5FA',
    bg: 'rgba(243, 244, 246, 0.95)',
    bgHeader: 'rgba(239, 246, 255, 0.95)',
    border: '#3B82F6',
    text: '#1e3a8a',
    textSecondary: '#3b82f6',
    bgImage: dayBg,
    containerBg: 'rgba(255, 255, 255, 5)',
    shadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3), 0 2px 4px -1px rgba(59, 130, 246, 0.2)'
  };
  
  return (
    <div className="min-h-screen relative" style={{color: theme.text}}>
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${theme.bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: darkMode ? 'brightness(0.8)' : 'brightness(0.4)',
        }}
      />
      
      <div className="relative z-10">
        <header className="border-b sticky top-0 z-20" style={{
          backgroundColor: theme.bgHeader,
          borderColor: `${theme.border}50`,
          backdropFilter: 'blur(50px)',
          boxShadow: theme.shadow
        }}>
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">🧠</div>
                <div>
                  <h1 className="text-2xl font-bold" style={{color: theme.primary}}>
                    DocMind RAG AI
                  </h1>
                  <p className="text-sm" style={{color: theme.textSecondary}}>
                    Document Intelligence Assistant
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setDarkMode(!darkMode)} 
                className="p-2 rounded-lg border"
                style={{
                  backgroundColor: theme.bg,
                  borderColor: theme.border
                }}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
            
            {sessionId && (
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={toggleConversationMode}
                  className="px-6 py-3 rounded-lg flex items-center gap-3 font-bold"
                  style={{
                    background: conversationMode 
                      ? `linear-gradient(to right, ${theme.primary}, ${theme.secondary})`
                      : theme.bg,
                    border: conversationMode ? 'none' : `1px solid ${theme.border}`,
                    boxShadow: conversationMode ? theme.shadow : 'none'
                  }}
                >
                  {conversationMode ? (
                    <>
                      <Radio size={24} />
                      <span style={{color: '#fff'}}>🔴 LIVE</span>
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
                  className="px-4 py-3 rounded-lg border font-semibold"
                  style={{
                    backgroundColor: theme.bg,
                    borderColor: theme.border
                  }}
                >
                  <option value="en">🇺🇸 English</option>
                  <option value="ta">🇮🇳 Tanglish</option>
                </select>
                
                {countdown > 0 && (
                  <div className="px-4 py-2 rounded-lg flex items-center gap-2" style={{backgroundColor: theme.primary}}>
                    <span className="font-bold text-2xl text-white">{countdown}</span>
                  </div>
                )}
                
                {listening && (
                  <div className="px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse" style={{backgroundColor: theme.primary}}>
                    <div className="w-3 h-3 bg-white rounded-full animate-ping" />
                    <span className="font-bold text-white">LISTENING</span>
                  </div>
                )}
                
                {loading && (
                  <div className="px-4 py-2 rounded-lg flex items-center gap-2" style={{backgroundColor: theme.secondary}}>
                    <Loader size={16} className="animate-spin text-white" />
                    <span className="font-bold text-white">THINKING</span>
                  </div>
                )}
                
                {speaking && (
                  <div className="px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse" style={{backgroundColor: '#32CD32'}}>
                    <Volume2 size={16} className="animate-bounce text-white" />
                    <span className="font-bold text-white">SPEAKING</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {conversationMode && (
            <div className="py-3 px-4 text-center font-bold text-white" style={{
              background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})`
            }}>
              🎤 VOICE MODE - {statusMessage || 'Continuous conversation enabled'} 🔊
            </div>
          )}
        </header>
        
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          {!sessionId ? (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">Upload Document</h2>
                <p style={{color: theme.textSecondary}}>PDF, DOCX, XLSX, PPTX, TXT, Images</p>
              </div>
              
              <FileUpload onUpload={handleFileUpload} processing={processing} />
              {processing && <ProcessingStatus />}
              
              {error && (
                <div className="mt-4 p-4 rounded-lg border" style={{
                  backgroundColor: theme.containerBg,
                  borderColor: theme.primary,
                  boxShadow: theme.shadow
                }}>
                  <AlertCircle size={20} className="inline mr-2" style={{color: theme.primary}} />
                  <span style={{color: theme.primary}}>{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="rounded-lg p-4 border" style={{
                backgroundColor: theme.containerBg,
                borderColor: theme.border,
                boxShadow: theme.shadow
              }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-500" size={24} />
                    <div>
                      <p className="font-semibold">{fileName}</p>
                      <p className="text-sm" style={{color: theme.textSecondary}}>Ready</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (conversationMode) toggleConversationMode();
                      setSessionId(null);
                      setMessages([]);
                      setFileName('');
                    }}
                    className="px-4 py-2 rounded-lg font-semibold text-white"
                    style={{backgroundColor: theme.primary}}
                  >
                    New
                  </button>
                </div>
              </div>
              
              {error && (
                <div className="p-4 rounded-lg border" style={{
                  backgroundColor: theme.containerBg,
                  borderColor: theme.primary,
                  boxShadow: theme.shadow
                }}>
                  <AlertCircle size={20} className="inline mr-2" style={{color: theme.primary}} />
                  <span style={{color: theme.primary}}>{error}</span>
                </div>
              )}
              
              <div className="rounded-lg border min-h-[400px] max-h-[500px] overflow-y-auto p-6" style={{
                backgroundColor: theme.containerBg,
                borderColor: theme.border,
                boxShadow: theme.shadow
              }}>
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center" style={{color: theme.textSecondary}}>
                      <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Ask about your document!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div 
                          className="max-w-[80%] rounded-lg p-4"
                          style={{
                            background: msg.type === 'user' 
                              ? `linear-gradient(to right, ${theme.primary}, ${theme.secondary})`
                              : msg.type === 'ai' 
                              ? darkMode ? 'rgba(42, 42, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)'
                              : msg.type === 'system'
                              ? darkMode ? 'rgba(30, 58, 138, 0.9)' : 'rgba(219, 234, 254, 0.95)'
                              : darkMode ? 'rgba(127, 29, 29, 0.9)' : 'rgba(254, 226, 226, 0.95)',
                            border: msg.type === 'ai' ? `1px solid ${theme.border}` : 'none',
                            color: msg.type === 'user' ? '#FFFFFF' : theme.text,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                        >
                          {msg.isVoice && <div className="text-xs opacity-70 mb-2">🎤 Voice</div>}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                            <span className="text-xs opacity-70">{msg.timestamp.toLocaleTimeString()}</span>
                            {msg.type === 'ai' && !conversationMode && (
                              <button
                                onClick={() => readAloud(msg.content)}
                                className="text-xs flex items-center gap-1 px-2 py-1 rounded text-white"
                                style={{backgroundColor: theme.primary}}
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
                    className="p-3 rounded-lg border"
                    style={{
                      backgroundColor: listening ? theme.primary : theme.containerBg,
                      borderColor: theme.border,
                      boxShadow: theme.shadow
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
                    style={{
                      backgroundColor: theme.containerBg,
                      borderColor: theme.border,
                      color: theme.text,
                      boxShadow: theme.shadow
                    }}
                    disabled={loading || listening}
                  />
                  
                  <button
                    type="submit"
                    disabled={loading || !question.trim() || listening}
                    className="px-6 py-3 rounded-lg font-semibold disabled:opacity-50 text-white"
                    style={{
                      background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})`,
                      boxShadow: theme.shadow
                    }}
                  >
                    {loading ? <Loader size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                </form>
              )}
              
              {conversationMode && (
                <div className="rounded-lg p-6 text-center border-2" style={{
                  backgroundColor: theme.containerBg,
                  borderColor: theme.primary,
                  boxShadow: theme.shadow
                }}>
                  {countdown > 0 ? (
                    <>
                      <p className="text-xl font-bold mb-2">⏳ {statusMessage} {countdown}s</p>
                      <p className="text-sm" style={{color: theme.textSecondary}}>Get ready to speak</p>
                    </>
                  ) : listening ? (
                    <>
                      <p className="text-xl font-bold mb-2">🎤 Listening... (7 seconds)</p>
                      <p className="text-sm" style={{color: theme.textSecondary}}>Speak your question now</p>
                    </>
                  ) : statusMessage === 'No speech detected' ? (
                    <>
                      <p className="text-xl font-bold mb-2">❌ No speech detected</p>
                      <p className="text-sm" style={{color: theme.textSecondary}}>Restarting...</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl font-bold mb-2">🔊 {statusMessage || 'Processing...'}</p>
                      <p className="text-sm" style={{color: theme.textSecondary}}>Please wait</p>
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