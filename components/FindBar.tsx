import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronUp, ChevronDown, CaseSensitive } from 'lucide-react';

interface FindBarProps {
    isOpen: boolean;
    onClose: () => void;
    webviewRef: React.RefObject<any> | null;
}

export const FindBar: React.FC<FindBarProps> = ({ isOpen, onClose, webviewRef }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [matchCount, setMatchCount] = useState(0);
    const [currentMatch, setCurrentMatch] = useState(0);
    const [caseSensitive, setCaseSensitive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setSearchQuery('');
            setMatchCount(0);
            setCurrentMatch(0);
            // Stop find in page when closing
            if (webviewRef?.current) {
                try {
                    webviewRef.current.stopFindInPage('clearSelection');
                } catch (e) {
                    console.log('[FindBar] Could not clear selection');
                }
            }
        }
    }, [isOpen, webviewRef]);

    // Perform search with debounce
    useEffect(() => {
        if (!isOpen || !webviewRef?.current) return;

        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                try {
                    webviewRef.current?.findInPage(searchQuery, {
                        matchCase: caseSensitive,
                        forward: true
                    });
                } catch (e) {
                    console.log('[FindBar] Find in page not available');
                }
            } else {
                try {
                    webviewRef.current?.stopFindInPage('clearSelection');
                } catch (e) { }
                setMatchCount(0);
                setCurrentMatch(0);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [searchQuery, caseSensitive, isOpen, webviewRef]);

    // Listen for find results
    useEffect(() => {
        const webview = webviewRef?.current;
        if (!webview) return;

        const handleFoundInPage = (event: any) => {
            if (event.result) {
                setMatchCount(event.result.matches);
                setCurrentMatch(event.result.activeMatchOrdinal);
            }
        };

        webview.addEventListener('found-in-page', handleFoundInPage);
        return () => {
            webview.removeEventListener('found-in-page', handleFoundInPage);
        };
    }, [webviewRef]);

    const handleNext = useCallback(() => {
        if (!webviewRef?.current || !searchQuery.trim()) return;
        try {
            webviewRef.current.findInPage(searchQuery, {
                matchCase: caseSensitive,
                forward: true,
                findNext: true
            });
        } catch (e) { }
    }, [webviewRef, searchQuery, caseSensitive]);

    const handlePrevious = useCallback(() => {
        if (!webviewRef?.current || !searchQuery.trim()) return;
        try {
            webviewRef.current.findInPage(searchQuery, {
                matchCase: caseSensitive,
                forward: false,
                findNext: true
            });
        } catch (e) { }
    }, [webviewRef, searchQuery, caseSensitive]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                handlePrevious();
            } else {
                handleNext();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-2 right-4 z-[200] flex items-center gap-2 px-3 py-2 bg-[#1e1e20]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl"
                >
                    {/* Search Input */}
                    <div className="relative flex items-center">
                        <Search size={14} className="absolute left-2 text-gray-500" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Find in page..."
                            className="w-48 pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                        />
                    </div>

                    {/* Match Count */}
                    {searchQuery && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-gray-400 min-w-[60px] text-center"
                        >
                            {matchCount > 0 ? (
                                <span>{currentMatch} / {matchCount}</span>
                            ) : (
                                <span className="text-orange-400">No matches</span>
                            )}
                        </motion.div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handlePrevious}
                            disabled={matchCount === 0}
                            className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Previous (Shift+Enter)"
                        >
                            <ChevronUp size={14} />
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={matchCount === 0}
                            className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Next (Enter)"
                        >
                            <ChevronDown size={14} />
                        </button>
                    </div>

                    {/* Case Sensitive Toggle */}
                    <button
                        onClick={() => setCaseSensitive(!caseSensitive)}
                        className={`p-1.5 rounded-md transition-colors ${ caseSensitive
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'hover:bg-white/10 text-gray-400 hover:text-white'
                            }`}
                        title="Match Case"
                    >
                        <CaseSensitive size={14} />
                    </button>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={14} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
