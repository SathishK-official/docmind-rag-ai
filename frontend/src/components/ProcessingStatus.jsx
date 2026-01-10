import React from 'react';
import { Loader, CheckCircle } from 'lucide-react';

function ProcessingStatus() {
  return (
    <div className="mt-6 bg-gray-800/50 rounded-lg p-6 border border-orange-500/20">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Loader className="animate-spin text-orange-500" size={20} />
        Processing Your Document
      </h3>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          <span className="text-sm text-white font-semibold">Extracting text from document...</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
          <span className="text-sm text-gray-400">Processing images with OCR...</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
          <span className="text-sm text-gray-400">Analyzing images with Vision AI...</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
          <span className="text-sm text-gray-400">Creating vector embeddings...</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
          <span className="text-sm text-gray-400">Building vector database...</span>
        </div>
      </div>
      
      <div className="mt-6">
        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 h-full animate-pulse" 
               style={{width: '60%', transition: 'width 0.5s'}} />
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          This may take 30-60 seconds for large documents...
        </p>
      </div>
    </div>
  );
}

export default ProcessingStatus;
