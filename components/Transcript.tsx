import React from 'react';
import { TranscriptionItem } from '../types';

interface TranscriptProps {
  items: TranscriptionItem[];
}

const Transcript: React.FC<TranscriptProps> = ({ items }) => {
  return (
    <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center space-y-6 text-center">
        <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center border border-gray-800">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
             </svg>
        </div>
        <div>
            <h3 className="text-xl font-medium text-gray-300">Audio Translation Mode</h3>
            <p className="text-gray-500 mt-2 max-w-sm">
                Visual transcription is currently disabled for improved stability. 
                Speak naturally, and Gemini will translate your speech in real-time.
            </p>
        </div>
    </div>
  );
};

export default Transcript;