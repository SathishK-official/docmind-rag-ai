import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, AlertCircle } from 'lucide-react';

function FileUpload({ onUpload, processing }) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles[0]);
    }
  }, [onUpload]);
  
  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    multiple: false,
    disabled: processing
  });
  
  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
          ${isDragActive 
            ? 'border-orange-500 bg-orange-500/10 scale-105' 
            : 'border-red-500/30 hover:border-orange-500/50 hover:bg-gray-800/30'
          }
          ${processing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4">
          <div className={`p-4 rounded-full transition-all ${
            isDragActive 
              ? 'bg-orange-600 scale-110' 
              : processing 
              ? 'bg-gray-700' 
              : 'bg-red-600'
          }`}>
            {processing ? (
              <div className="animate-spin">
                <File size={48} />
              </div>
            ) : (
              <Upload size={48} />
            )}
          </div>
          
          <div>
            <p className="text-xl font-semibold mb-2">
              {processing 
                ? 'Processing document...' 
                : isDragActive 
                ? 'Drop your document here!' 
                : 'Drag & drop your document here'
              }
            </p>
            <p className="text-gray-400 text-sm">
              {processing ? 'Running OCR and Vision AI...' : 'or click to browse files'}
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
            <span className="px-3 py-1 bg-gray-800 rounded-full">.pdf</span>
            <span className="px-3 py-1 bg-gray-800 rounded-full">.docx</span>
            <span className="px-3 py-1 bg-gray-800 rounded-full">.xlsx</span>
            <span className="px-3 py-1 bg-gray-800 rounded-full">.pptx</span>
            <span className="px-3 py-1 bg-gray-800 rounded-full">.txt</span>
            <span className="px-3 py-1 bg-gray-800 rounded-full">.jpg</span>
            <span className="px-3 py-1 bg-gray-800 rounded-full">.png</span>
          </div>
          
          <p className="text-xs text-gray-600 mt-2">Maximum file size: 20MB</p>
        </div>
      </div>
      
      {fileRejections.length > 0 && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-500 font-semibold">Upload Error</p>
            <p className="text-red-400 text-sm mt-1">
              {fileRejections[0].errors[0].message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
