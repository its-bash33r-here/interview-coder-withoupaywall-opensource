import React from 'react';

const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'golang', label: 'Go (golang)' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'sql', label: 'SQL' },
  { value: 'r', label: 'R' },
];

interface LanguageDropdownProps {
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
}

export function LanguageDropdown({ currentLanguage, onLanguageChange }: LanguageDropdownProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onLanguageChange(e.target.value);
  };

  return (
    <select
      value={currentLanguage}
      onChange={handleChange}
      className="w-full bg-black/50 text-white rounded-md px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/20 cursor-pointer"
      style={{ WebkitAppearance: 'menulist', MozAppearance: 'menulist', appearance: 'menulist' }}
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.value} value={lang.value} className="bg-black text-white">
          {lang.label}
        </option>
      ))}
    </select>
  );
}

