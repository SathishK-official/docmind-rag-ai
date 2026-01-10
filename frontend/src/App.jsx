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
  const shouldAutoListenRef = useRef(false);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleAudioEnd = () => {
      console.log('🔊 Audio playback ended');
      setSpeaking(false);
      
      if (shouldAutoListenRef.current && conversationMode && sessionId && !listening) {
        console.log('🔄 Auto-restarting voice input in 800ms...');
        setTimeout(() => {
          if (conversationMode) {
            handleVoiceInput();
          }
        }, 800);
      }
    };
    
    audio.addEventListener('ended', handleAudioEnd);
    return () => audio.removeEventListener('ended', handleAudioEnd);
  }, [conversationMode, sessionId, listening]);
  
  const handleFileUpload = async (file) => {
    setProcessing(true);
    setError('');
    
    try {
      const result = await uploadDocument(file);
      setSessionId(result.session_id);
      setFileName(result.filename);
      setMessages([{
        type: 'system',
        content: `Document "${result.filename}" processed! ${result.num_chunks} chunks created. ${result.num_images_processed} images processed with OCR and Vision AI.`,
        timestamp: new Date()
      }]);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to upload document');
    } finally {
      setProcessing(false);
    }
  };
  
  const handleSubmit = async (e, isVoiceInput = false) => {
    e?.preventDefault();
    
    const currentQuestion = question.trim();
    if (!currentQuestion || !sessionId || loading) {
      console.log('Cannot submit:', { currentQuestion, sessionId, loading });
      return;
    }
    
    console.log('📤 Submitting question:', currentQuestion);
    
    const userMessage = {
      type: 'user',
      content: currentQuestion,
      timestamp: new Date(),
      isVoice: isVoiceInput
    };
    
    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);
    setError('');
    
    try {
      console.log('🤖 Querying AI...');
      const response = await queryDocument(sessionId, currentQuestion, language);
      console.log('✅ Got response:', response.answer.substring(0, 50) + '...');
      
      const aiMessage = {
        type: 'ai',
        content: response.answer,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      if (isVoiceInput || conversationMode) {
        console.log('🔊 Playing voice response...');
        shouldAutoListenRef.current = true;
        await playVoiceResponse(response.answer);
      } else {
        shouldAutoListenRef.current = false;
      }
    } catch (err) {
      console.error('❌ Query error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to get response');
      setMessages(prev => [...prev, {
        type: 'error',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }]);
      shouldAutoListenRef.current = false;
    } finally {
      setLoading(false);
    }
  };
  
  const playVoiceResponse = async (text) => {
    try {
      setSpeaking(true);
      console.log('🎵 Generating audio...');
      const audioBlob = await textToSpeech(text, language);
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        console.log('▶️ Playing audio...');
        await audioRef.current.play();
      }
    } catch (err) {
      console.error('TTS error:', err);
      setSpeaking(false);
      shouldAutoListenRef.current = false;
    }
  };
  
  const handleVoiceInput = () => {
    if (listening) {
      console.log('🛑 Stopping voice recognition');
      stopVoiceRecognition();
      setListening(false);
      return;
    }
    
    console.log('🎤 Starting voice recognition...');
    const success = startVoiceRecognition(
      (transcript) => {
        console.log('✅ Voice recognized:', transcript);
        setQuestion(transcript);
        setListening(false);
        
        if (conversationMode || transcript) {
          console.log('📨 Auto-submitting in 500ms...');
          setTimeout(() => {
            handleSubmit({ preventDefault: () => {} }, true);
          }, 500);
        }
      },
      (error) => {
        console.error('❌ Speech recognition error:', error);
        setError(error);
        setListening(false);
        shouldAutoListenRef.current = false;
      }
    );
    
    if (success) {
      setListening(true);
      setError('');
    } else {
      setError('Failed to start voice recognition. Please check microphone permissions.');
      shouldAutoListenRef.current = false;
    }
  };
  
  const toggleConversationMode = () => {
    if (!conversationMode) {
      console.log('🔴 ENTERING CONVERSATION MODE');
      setConversationMode(true);
      setError('');
      shouldAutoListenRef.current = true;
      
      if (sessionId) {
        setTimeout(() => handleVoiceInput(), 800);
      }
    } else {
      console.log('⚫ EXITING CONVERSATION MODE');
      setConversationMode(false);
      shouldAutoListenRef.current = false;
      
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
  
  const handleManualVoiceOutput = async (text) => {
    if (speaking) {
      if (audioRef.current) {
        audioRef.current.pause();
        setSpeaking(false);
      }
    } else {
      shouldAutoListenRef.current = false;
      await playVoiceResponse(text);
    }
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };
  
  const downloadTranscript = () => {
    const transcript = messages
      .map(m => `[${m.type.toUpperCase()}] ${m.content}`)
      .join('\n\n');
    
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `volcanorag-transcript-${Date.now()}.txt`;
    a.click();
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black dark:from-black dark:via-gray-900 dark:to-gray-800 text-white transition-all duration-300">
      <header className="border-b border-red-500/20 bg-black/30 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🌋</div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                  VolcanoRAG
                </h1>
                <p className="text-sm text-gray-400">AI Document Assistant with Voice</p>
              </div>
            </div>
            
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all"
              title="Toggle theme"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          
          {sessionId && (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={toggleConversationMode}
                className={`px-6 py-3 rounded-lg transition-all flex items-center gap-3 text-base font-bold shadow-lg ${
                  conversationMode 
                    ? 'bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 text-white shadow-orange-500/50 animate-pulse scale-110' 
                    : 'bg-gradient-to-r from-gray-700 to-gray-800 text-gray-300 hover:from-gray-600 hover:to-gray-700 hover:scale-105'
                }`}
                title={conversationMode ? 'Click to stop conversation mode' : 'Click for hands-free voice conversation'}
              >
                {conversationMode ? (
                  <>
                    <Radio size={24} className="animate-pulse" />
                    <span>🔴 LIVE CONVERSATION</span>
                    <Zap size={20} className="animate-bounce" />
                  </>
                ) : (
                  <>
                    <Mic size={20} />
                    <span>Start Voice Conversation</span>
                  </>
                )}
              </button>
              
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-4 py-3 rounded-lg bg-gray-800 border border-orange-500/30 text-base font-semibold focus:border-orange-500 focus:outline-none shadow-md hover:bg-gray-700 transition-all"
              >
                <option value="en">🇺🇸 English</option>
                <option value="ta">🇮🇳 Tanglish</option>
              </select>
              
              {listening && (
                <div className="px-4 py-2 bg-red-600/80 rounded-lg flex items-center gap-2 animate-pulse">
                  <div className="w-3 h-3 bg-white rounded-full animate-ping" />
                  <span className="font-semibold">Listening...</span>
                </div>
              )}
              
              {loading && (
                <div className="px-4 py-2 bg-orange-600/80 rounded-lg flex items-center gap-2">
                  <Loader size={16} className="animate-spin" />
                  <span className="font-semibold">Thinking...</span>
                </div>
              )}
              
              {speaking && (
                <div className="px-4 py-2 bg-green-600/80 rounded-lg flex items-center gap-2 animate-pulse">
                  <Volume2 size={16} className="animate-bounce" />
                  <span className="font-semibold">Speaking...</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {conversationMode && (
          <div className="bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 py-3 px-4 text-center font-bold animate-pulse">
            🎤 CONVERSATION MODE ACTIVE - Speak naturally, I will respond automatically with voice! 🔊
          </div>
        )}
      </header>
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {!sessionId ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Upload Your Document</h2>
              <p className="text-gray-400">
                Supports PDF, DOCX, XLSX, PPTX, TXT, and Images (up to 20MB)
              </p>
            </div>
            
            <FileUpload 
              onUpload={handleFileUpload}
              processing={processing}
            />
            
            {processing && <ProcessingStatus />}
            
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                <span className="text-red-500">{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-red-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-500" size={24} />
                  <div>
                    <p className="font-semibold">Document Loaded</p>
                    <p className="text-sm text-gray-400">{fileName}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (conversationMode) toggleConversationMode();
                    setSessionId(null);
                    setMessages([]);
                    setFileName('');
                    setError('');
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-orange-600 transition-all rounded-lg text-sm font-semibold"
                >
                  Upload New
                </button>
              </div>
            </div>
            
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                <AlertCircle size={20} className="text-red-500" />
                <span className="text-red-500">{error}</span>
              </div>
            )}
            
            <div className="bg-gray-800/30 rounded-lg border border-orange-500/20 min-h-[400px] max-h-[500px] overflow-y-auto p-6">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">Ask me anything about your document!</p>
                    <p className="text-sm">💡 Click <strong>"Start Voice Conversation"</strong> for hands-free mode</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          msg.type === 'user'
                            ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                            : msg.type === 'ai'
                            ? 'bg-gray-700 text-white'
                            : msg.type === 'system'
                            ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                            : 'bg-red-600/20 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {msg.isVoice && (
                          <div className="text-xs opacity-70 mb-2 flex items-center gap-1">
                            <Mic size={12} /> Voice input
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                          <span className="text-xs opacity-70">
                            {msg.timestamp.toLocaleTimeString()}
                          </span>
                          {msg.type === 'ai' && (
                            <div className="flex items-center gap-2">
                              {!conversationMode && (
                                <button
                                  onClick={() => handleManualVoiceOutput(msg.content)}
                                  className="text-xs hover:text-green-400 transition-colors flex items-center gap-1 px-2 py-1 bg-white/10 rounded hover:bg-white/20"
                                  title={speaking ? 'Stop reading' : 'Read aloud'}
                                >
                                  {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                  <span>Read</span>
                                </button>
                              )}
                              <button
                                onClick={() => copyToClipboard(msg.content)}
                                className="text-xs hover:text-yellow-400 transition-colors flex items-center gap-1 px-2 py-1 bg-white/10 rounded hover:bg-white/20"
                                title="Copy to clipboard"
                              >
                                <Copy size={14} />
                                <span>Copy</span>
                              </button>
                            </div>
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
                  onClick={handleVoiceInput}
                  disabled={loading}
                  className={`p-3 rounded-lg transition-all ${
                    listening
                      ? 'bg-red-600 animate-pulse shadow-lg shadow-red-500/50'
                      : 'bg-gray-800 hover:bg-gray-700 disabled:opacity-50'
                  }`}
                  title={listening ? 'Listening... Click to stop' : 'Click to speak'}
                >
                  {listening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={listening ? "Listening..." : "Type your question or use voice..."}
                  className="flex-1 px-4 py-3 bg-gray-800 rounded-lg border border-orange-500/30 focus:border-orange-500 focus:outline-none text-white placeholder-gray-500"
                  disabled={loading || listening}
                />
                
                <button
                  type="submit"
                  disabled={loading || !question.trim() || listening}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all shadow-lg hover:shadow-orange-500/50"
                >
                  {loading ? (
                    <Loader size={20} className="animate-spin" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </form>
            )}
            
            {conversationMode && (
              <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-2 border-orange-500/50 rounded-lg p-6 text-center">
                <p className="text-lg font-bold mb-2">
                  🎤 I'm listening! Speak your question...
                </p>
                <p className="text-sm text-gray-300">
                  I will respond with voice automatically and continue listening
                </p>
                <p className="text-xs text-gray-400 mt-3">
                  Click the <strong>"🔴 LIVE CONVERSATION"</strong> button above to exit
                </p>
              </div>
            )}
            
            {messages.length > 0 && !conversationMode && (
              <div className="flex justify-end gap-2">
                <button
                  onClick={downloadTranscript}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all text-sm"
                >
                  <Download size={16} />
                  Download Transcript
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      
      <audio ref={audioRef} className="hidden" />
      
      <footer className="border-t border-gray-800 mt-12 py-6 text-center text-gray-500 text-sm">
        <p>🌋 VolcanoRAG v2.0 - AI Document Assistant with Voice Conversation</p>
        <p className="mt-1">Powered by Groq, Tesseract, and ChromaDB</p>
      </footer>
    </div>
  );
}

export default App;