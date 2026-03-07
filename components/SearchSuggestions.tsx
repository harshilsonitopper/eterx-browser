/**
 * SearchSuggestions.tsx - Query Suggestion Chips 🔍
 * 
 * Shows search suggestions as clickable chips
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Search, Play, Globe } from 'lucide-react';

interface SearchSuggestionsProps {
    suggestions: string[];
    onSelect: (suggestion: string) => void;
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
    suggestions,
    onSelect
}) => {
    if (!suggestions || suggestions.length === 0) return null;

    const getIcon = (suggestion: string) => {
        const s = suggestion.toLowerCase();
        if (s.includes('youtube') || s.includes('video')) {
            return <Play size={12} className="text-red-400" fill="currentColor" />;
        }
        return <Search size={12} className="text-white/50" />;
    };

    return (
        <div className="space-y-1.5">
            <div className="text-xs text-white/40 font-medium">Searching</div>
            <div className="flex flex-col gap-1.5">
                {suggestions.map((suggestion, idx) => (
                    <motion.button
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => onSelect(suggestion)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-sm text-white/80 hover:text-white transition-all text-left group"
                    >
                        {getIcon(suggestion)}
                        <span className="truncate">{suggestion}</span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

/**
 * ReviewingSources - Shows sources being reviewed
 */
interface ReviewingSourcesProps {
    count: number;
    sources: Array<{
        title: string;
        domain: string;
        type: 'video' | 'website';
    }>;
}

export const ReviewingSources: React.FC<ReviewingSourcesProps> = ({
    count,
    sources
}) => {
    if (sources.length === 0) return null;

    return (
        <div className="space-y-2">
            <div className="text-xs text-white/40 font-medium">
                Reviewing sources · {count}
            </div>
            <div className="space-y-1">
                {sources.map((source, idx) => (
                    <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm"
                    >
                        {source.type === 'video' ? (
                            <span className="text-red-400">▶</span>
                        ) : (
                            <Globe size={12} className="text-white/40" />
                        )}
                        <span className="text-white/80 truncate flex-1">
                            {source.title}
                        </span>
                        <span className={`text-xs ${source.type === 'video' ? 'text-red-400' : 'text-white/40'
                            }`}>
                            {source.domain}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SearchSuggestions;
