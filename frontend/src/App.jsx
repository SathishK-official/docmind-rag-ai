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
  const [error, setError] = useState('');
  
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const conversationModeRef = useRef(false);
  
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
      setSpeaking(false);
      if (conversationModeRef.current && sessionId) {
        setTimeout(() => startListening(), 1000);
      }
    };
    
    audio.addEventListener('ended', handleAudioEnd);
    return () => audio.removeEventListener('ended', handleAudioEnd);
  }, [sessionId]);
  
  const handleFileUpload = async (file) => {
    setProcessing(true);
    setError('');
    
    try {
      const result = await uploadDocument(file);
      setSessionId(result.session_id);
      setFileName(result.filename);
      setMessages([{
        type: 'system',
        content: `✓ "${result.filename}" ready! ${result.num_chunks} chunks, ${result.num_images_processed} images processed.`,
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
  
  const startListening = () => {
    if (listening) return;
    
    const success = startVoiceRecognition(
      (transcript) => {
        setListening(false);
        
        // KEY FIX: Direct execution in conversation mode
        if (conversationModeRef.current) {
          // Don't set question state, directly ask
          askQuestion(transcript, true);
        } else {
          // Normal mode: put in text box
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
      setConversationMode(true);
      if (sessionId) {
        setTimeout(() => startListening(), 500);
      }
    } else {
      setConversationMode(false);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <header className="border-b border-red-500/20 bg-black/30 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🌋</div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                  VolcanoRAG
                </h1>
                <p className="text-sm text-gray-400">AI Voice Assistant</p>
              </div>
            </div>
            
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          
          {sessionId && (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={toggleConversationMode}
                className={`px-6 py-3 rounded-lg flex items-center gap-3 font-bold shadow-lg ${
                  conversationMode 
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white animate-pulse' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
                className="px-4 py-3 rounded-lg bg-gray-800 border border-orange-500/30 font-semibold"
              >
                <option value="en">🇺🇸 English</option>
                <option value="ta">🇮🇳 Tanglish</option>
              </select>
              
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
          <div className="bg-gradient-to-r from-red-600 to-orange-600 py-3 px-4 text-center font-bold">
            🎤 VOICE MODE ACTIVE - Speak naturally! 🔊
          </div>
        )}
      </header>
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {!sessionId ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Upload Document</h2>
              <p className="text-gray-400">PDF, DOCX, XLSX, PPTX, TXT, Images</p>
            </div>
            
            <FileUpload onUpload={handleFileUpload} processing={processing} />
            {processing && <ProcessingStatus />}
            
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle size={20} className="text-red-500 inline mr-2" />
                <span className="text-red-500">{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-red-500/20">
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
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle size={20} className="text-red-500 inline mr-2" />
                <span className="text-red-500">{error}</span>
              </div>
            )}
            
            <div className="bg-gray-800/30 rounded-lg border border-orange-500/20 min-h-[400px] max-h-[500px] overflow-y-auto p-6">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Ask about your document!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg p-4 ${
                        msg.type === 'user' ? 'bg-gradient-to-r from-orange-600 to-red-600' :
                        msg.type === 'ai' ? 'bg-gray-700' :
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
                  onClick={startListening}
                  disabled={loading || listening}
                  className={`p-3 rounded-lg ${listening ? 'bg-red-600 animate-pulse' : 'bg-gray-800 hover:bg-gray-700'}`}
                >
                  {listening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={listening ? "Listening..." : "Ask a question..."}
                  className="flex-1 px-4 py-3 bg-gray-800 rounded-lg border border-orange-500/30 focus:border-orange-500 focus:outline-none"
                  disabled={loading || listening}
                />
                
                <button
                  type="submit"
                  disabled={loading || !question.trim() || listening}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50 rounded-lg font-semibold"
                >
                  {loading ? <Loader size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </form>
            )}
            
            {conversationMode && (
              <div className="bg-orange-600/20 border-2 border-orange-500 rounded-lg p-6 text-center">
                <p className="text-xl font-bold">🎤 Speak now!</p>
                <p className="text-sm text-gray-300 mt-2">AI responds automatically</p>
              </div>
            )}
          </div>
        )}
      </main>
      
      <audio ref={audioRef} />
    </div>
  );
}

export default App;