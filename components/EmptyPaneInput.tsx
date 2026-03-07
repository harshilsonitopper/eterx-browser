import React, { useState, useRef, useEffect } from 'react';
import { Search, Globe, ArrowRight } from 'lucide-react';

interface EmptyPaneInputProps {
    onNavigate: (url: string) => void;
    onFocus?: () => void;
    placeholder?: string;
}

const QUICK_SUGGESTIONS = [
    { label: 'Google', url: 'https://google.com' },
    { label: 'YouTube', url: 'https://youtube.com' },
    { label: 'GitHub', url: 'https://github.com' },
    { label: 'Twitter', url: 'https://x.com' },
];

export const EmptyPaneInput: React.FC<EmptyPaneInputProps> = ({ onNavigate, onFocus, placeholder = "Search or enter URL" }) => {
    const [inputValue, setInputValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        let url = inputValue.trim();
        if (!url.startsWith('http') && !url.startsWith('eterx://')) {
            if (url.includes('.') && !url.includes(' ')) {
                url = 'https://' + url;
            } else {
                url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
            }
        }
        onNavigate(url);
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
            <div className="w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center">Open in this Pane</h3>

                <form onSubmit={handleSubmit} className="mb-6">
                    <div className={`
                        flex items-center bg-white rounded-2xl border-2 transition-all shadow-sm
                        ${isFocused ? 'border-blue-400 ring-4 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}
                    `}>
                        <div className="pl-4 text-gray-400">
                            <Search size={18} />
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onFocus={() => { setIsFocused(true); onFocus?.(); }}
                            onBlur={() => setIsFocused(false)}
                            placeholder={placeholder}
                            className="flex-1 p-4 bg-transparent outline-none text-gray-800 placeholder:text-gray-400"
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="p-3 mr-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                            disabled={!inputValue.trim()}
                        >
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </form>

                <div className="text-xs text-gray-400 uppercase tracking-wider mb-3 text-center">Quick Access</div>
                <div className="flex flex-wrap gap-2 justify-center">
                    {QUICK_SUGGESTIONS.map(s => (
                        <button
                            key={s.url}
                            onClick={() => onNavigate(s.url)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-700 text-sm hover:border-blue-300 hover:bg-blue-50 transition-colors shadow-sm"
                        >
                            <Globe size={14} className="text-gray-400" />
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
