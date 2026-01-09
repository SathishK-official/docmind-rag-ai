import axios from 'axios';
import { API_BASE } from '../config/constants';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

export const queryDocument = async (sessionId, question, language = 'en') => {
  const { data } = await api.post('/query', {
    session_id: sessionId,
    question,
    language
  });
  return data;
};

export const textToSpeech = async (text, language = 'en') => {
  const { data } = await api.post('/tts', { text, language }, {
    responseType: 'blob'
  });
  return data;
};

export default api;
