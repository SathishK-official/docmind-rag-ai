import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, MessageSquare, Mic, Volume2, Sun, Moon, 
  Copy, Download, Send, Loader, AlertCircle, CheckCircle,
  MicOff, VolumeX, Radio
} from 'lucide-react';
import FileUpload from './components/FileUpload';
import ProcessingStatus from './components/ProcessingStatus';
import { uploadDocument, queryDocument, textToSpeech } from './services/api';
import { startVoiceRecognition, stopVoiceRecognition } from './services/speechRecognition';

function App() {
  // State
  const [sessionId, setSessionId] = useState(null);
  const [fileName, setFileName] = useState('');
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('en');
  const [conversationMode, setConversationMode] = useState(false); // NEW: Auto voice mode
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');
  
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  
  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Toggle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  // Audio ended event - restart listening in conversation mode
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleAudioEnd = () => {
      setSpeaking(false);
      
      // Auto-restart listening in conversation mode
      if (conversationMode && sessionId) {
        setTimeout(() => {
          console.log('🔄 Auto-restarting voice input...');
          handleVoiceInput();
        }, 500); // Small delay before restarting
      }
    };
    
    audio.addEventListener('ended', handleAudioEnd);
    return () => audio.removeEventListener('ended', handleAudioEnd);
  }, [conversationMode, sessionId]);
  
  // Handle file upload
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
  
  // Handle query submission
  const handleSubmit = async (e, isVoiceInput = false) => {
    e?.preventDefault();
    if (!question.trim() || !sessionId || loading) return;
    
    const userMessage = {
      type: 'user',
      content: question,
      timestamp: new Date(),
      isVoice: isVoiceInput
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentQuestion = question;
    setQuestion('');
    setLoading(true);
    setError('');
    
    try {
      const response = await queryDocument(sessionId, currentQuestion, language);
      
      const aiMessage = {
        type: 'ai',
        content: response.answer,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Auto-play voice response if user used voice OR conversation mode is on
      if (isVoiceInput || conversationMode) {
        await playVoiceResponse(response.answer);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to get response');
      setMessages(prev => [...prev, {
        type: 'error',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };
  
  // Play voice response
  const playVoiceResponse = async (text) => {
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
  
  // Handle voice input
  const handleVoiceInput = () => {
    if (listening) {
      stopVoiceRecognition();
      setListening(false);
      return;
    }
    
    const success = startVoiceRecognition(
      (transcript) => {
        setQuestion(transcript);
        setListening(false);
        
        // Auto-submit in conversation mode
        if (conversationMode) {
          setTimeout(() => {
            handleSubmit(null, true);
          }, 300);
        }
      },
      (error) => {
        console.error('Speech recognition error:', error);
        setError(error);
        setListening(false);
      }
    );
    
    if (success) {
      setListening(true);
      setError('');
    }
  };
  
  // Toggle conversation mode
  const toggleConversationMode = () => {
    if (!conversationMode) {
      // Entering conversation mode
      setConversationMode(true);
      setError('');
      
      // Auto-start listening
      if (sessionId) {
        setTimeout(() => handleVoiceInput(), 500);
      }
    } else {
      // Exiting conversation mode
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
  
  // Manual voice output (for text input)
  const handleManualVoiceOutput = async (text) => {
    if (speaking) {
      // Stop current speech
      if (audioRef.current) {
        audioRef.current.pause();
        setSpeaking(false);
      }
    } else {
      // Play speech
      await playVoiceResponse(text);
    }
  };
  
  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };
  
  // Download transcript
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
      {/* Header */}
      <header className="border-b border-red-500/20 bg-black/30 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🌋</div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                VolcanoRAG
              </h1>
              <p className="text-sm text-gray-400">AI Document Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-gray-800 border border-orange-500/30 text-sm focus:border-orange-500 focus:outline-none"
            >
              <option value="en">English</option>
              <option value="ta">Tanglish</option>
            </select>
            
            {/* Conversation Mode Toggle - NEW */}
            {sessionId && (
              <button
                onClick={toggleConversationMode}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 text-sm font-semibold ${
                  conversationMode 
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-orange-500/50 animate-pulse' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                title={conversationMode ? 'Conversation mode ON - Click to disable' : 'Click for hands-free conversation'}
              >
                <Radio size={16} className={conversationMode ? 'animate-pulse' : ''} />
                {conversationMode ? 'LIVE' : 'Voice Mode'}
              </button>
            )}
            
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all"
              title="Toggle theme"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
        
        {/* Conversation Mode Banner */}
        {conversationMode && (
          <div className="bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 py-2 px-4 text-center text-sm font-semibold animate-pulse">
            🎤 Conversation Mode Active - Speak naturally, AI will respond with voice automatically
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {!sessionId ? (
          // Upload Section
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
          // Chat Section
          <div className="grid grid-cols-1 gap-6">
            {/* Document Info */}
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
            
            {/* Status Indicators */}
            {(listening || speaking || loading) && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-orange-500/30">
                <div className="flex items-center justify-center gap-4">
                  {listening && (
                    <div className="flex items-center gap-2 text-red-500">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="font-semibold">Listening...</span>
                    </div>
                  )}
                  {loading && (
                    <div className="flex items-center gap-2 text-orange-500">
                      <Loader size={16} className="animate-spin" />
                      <span className="font-semibold">Thinking...</span>
                    </div>
                  )}
                  {speaking && (
                    <div className="flex items-center gap-2 text-green-500">
                      <Volume2 size={16} className="animate-pulse" />
                      <span className="font-semibold">Speaking...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                <AlertCircle size={20} className="text-red-500" />
                <span className="text-red-500">{error}</span>
              </div>
            )}
            
            {/* Messages */}
            <div className="bg-gray-800/30 rounded-lg border border-orange-500/20 min-h-[400px] max-h-[500px] overflow-y-auto p-6">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Ask me anything about your document!</p>
                    <p className="text-sm mt-2">💡 Enable Voice Mode for hands-free conversation</p>
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
                              {/* Read Aloud Button for Text Inputs */}
                              {!conversationMode && (
                                <button
                                  onClick={() => handleManualVoiceOutput(msg.content)}
                                  className="text-xs hover:text-green-400 transition-colors flex items-center gap-1"
                                  title={speaking ? 'Stop reading' : 'Read aloud'}
                                >
                                  {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                </button>
                              )}
                              <button
                                onClick={() => copyToClipboard(msg.content)}
                                className="text-xs hover:text-yellow-400 transition-colors flex items-center gap-1"
                                title="Copy to clipboard"
                              >
                                <Copy size={14} />
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
            
            {/* Input - Hidden in Conversation Mode */}
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
            
            {/* Conversation Mode Instructions */}
            {conversationMode && (
              <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-lg p-4 text-center">
                <p className="text-sm">
                  🎤 <strong>Speak naturally</strong> - I'm listening and will respond automatically
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Click "LIVE" button above to exit conversation mode
                </p>
              </div>
            )}
            
            {/* Actions */}
            {messages.length > 0 && (
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
      
      {/* Audio Element for TTS */}
      <audio ref={audioRef} className="hidden" />
      
      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12 py-6 text-center text-gray-500 text-sm">
        <p>🌋 VolcanoRAG v2.0 - AI Document Assistant with Voice Conversation</p>
        <p className="mt-1">Powered by Groq, Tesseract, and ChromaDB</p>
      </footer>
    </div>
  );
}

export default App;