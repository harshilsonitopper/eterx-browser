import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, RotateCw, Lock, Globe, Search, X } from 'lucide-react';
import { Tab } from '../types';

interface PaneToolbarProps {
    tab: Tab;
    isActive: boolean;
    onNavigate: (url: string) => void;
    onBack: () => void;
    onForward: () => void;
    onReload: () => void;
    onFocus: () => void;
}

export const PaneToolbar: React.FC<PaneToolbarProps> = ({
    tab,
    isActive,
    onNavigate,
    onBack,
    onForward,
    onReload,
    onFocus
}) => {
    const [inputUrl, setInputUrl] = useState(tab.url);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) setInputUrl(tab.url === 'eterx://newtab' ? '' : tab.url);
    }, [tab.url, isFocused]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputUrl.trim()) {
            onNavigate(inputUrl);
            (document.activeElement as HTMLElement)?.blur();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 px-2 py-1.5 border-b border-gray-100 transition-colors
                ${isActive ? 'bg-white' : 'bg-gray-50/50'}
            `}
            onClick={onFocus}
        >
            {/* Navigation Controls */}
            <div className="flex items-center gap-0.5">
                <button
                    onClick={(e) => { e.stopPropagation(); onBack(); }}
                    className="p-1.5 rounded-full hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-colors"
                >
                    <ArrowLeft size={14} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onForward(); }}
                    className="p-1.5 rounded-full hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-colors"
                >
                    <ArrowRight size={14} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onReload(); }}
                    className={`p-1.5 rounded-full hover:bg-gray-200 text-gray-600 transition-colors ${tab.isLoading ? 'animate-spin' : ''}`}
                >
                    <RotateCw size={14} />
                </button>
            </div>

            {/* Address Input */}
            <form onSubmit={handleSubmit} className="flex-1 min-w-0">
                <div className={`
                    relative flex items-center h-8 px-3 rounded-full border transition-all
                    ${isFocused
                        ? 'bg-white border-blue-400 shadow-[0_0_0_2px_rgba(59,130,246,0.1)]'
                        : 'bg-gray-100 border-transparent hover:bg-gray-200/50'
                    }
                `}>
                    <div className="flex-shrink-0 text-gray-400 mr-2">
                        {inputUrl.startsWith('https://') ? <Lock size={10} className="text-green-600" /> : <Globe size={12} />}
                    </div>

                    <input
                        type="text"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        onFocus={() => { setIsFocused(true); onFocus(); }}
                        onBlur={() => setIsFocused(false)}
                        placeholder="Search or enter URL"
                        className="flex-1 bg-transparent text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 outline-none w-full font-medium"
                    />

                    {inputUrl && isFocused && (
                        <button
                            type="button"
                            onClick={() => setInputUrl('')}
                            className="p-0.5 rounded-full hover:bg-gray-300 text-gray-400 transition-colors"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </form>
        </motion.div>
    );
};
