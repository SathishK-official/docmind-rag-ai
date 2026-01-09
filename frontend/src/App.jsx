import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { uploadDocument, queryDocument } from './services/api';

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const result = await uploadDocument(file);
      setSessionId(result.session_id);
      setMessages([{
        type: 'system',
        content: `Document processed: ${result.filename}`
      }]);
    } catch (error) {
      alert('Upload failed: ' + error.message);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || !sessionId) return;

    const userMsg = { type: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);

    try {
      const response = await queryDocument(sessionId, question);
      setMessages(prev => [...prev, {
        type: 'ai',
        content: response.answer
      }]);
    } catch (error) {
      alert('Query failed: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold text-center mb-8">
          🌋 VolcanoRAG
        </h1>

        {!sessionId ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <Upload size={48} className="mx-auto mb-4 text-orange-500" />
            <p className="mb-4">Upload a document to get started</p>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={loading}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg cursor-pointer inline-block"
            >
              {loading ? 'Processing...' : 'Choose File'}
            </label>
          </div>
        ) : (
          <div>
            <div className="bg-gray-800 rounded-lg p-4 mb-4 min-h-[400px] max-h-[500px] overflow-y-auto">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`mb-4 p-4 rounded-lg ${
                    msg.type === 'user'
                      ? 'bg-orange-600 ml-auto max-w-[80%]'
                      : msg.type === 'ai'
                      ? 'bg-gray-700 mr-auto max-w-[80%]'
                      : 'bg-gray-600 text-center'
                  }`}
                >
                  {msg.content}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 px-4 py-3 bg-gray-800 rounded-lg text-white"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50"
              >
                {loading ? '...' : 'Send'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
