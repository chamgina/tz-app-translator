import React from 'react';
import { LANGUAGES } from '../constants';
import { Language } from '../types';

interface LanguageSelectProps {
  label: string;
  selected: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

const LanguageSelect: React.FC<LanguageSelectProps> = ({ label, selected, onChange, disabled }) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-gray-400 text-sm uppercase tracking-wider font-semibold">{label}</label>
      <div className="relative">
        <select
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl p-4 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {LANGUAGES.map((lang: Language) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelect;