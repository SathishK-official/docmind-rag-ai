export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_BASE = `${API_URL}/api/v1`;

export const SUPPORTED_FORMATS = [
  '.pdf', '.docx', '.xlsx', '.pptx', '.txt', '.jpg', '.jpeg', '.png'
];

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
