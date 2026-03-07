import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, Globe, Layout, ChevronDown } from 'lucide-react';

interface Tab {
    id: string;
    title: string;
    url: string;
    isLoading: boolean;
    history: string[];
    currentIndex: number;
}

interface TabSearchMenuProps {
    isOpen: boolean;
    onClose: () => void;
    tabs: Tab[];
    closedTabs: Tab[];
    onSwitchTab: (id: string) => void;
    onRestoreTab: (id: string) => void;
}

export const TabSearchMenu: React.FC<TabSearchMenuProps> = ({
    isOpen, onClose, tabs, closedTabs, onSwitchTab, onRestoreTab
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Fast focus
            setTimeout(() => inputRef.current?.focus(), 50);
            setSearchQuery('');
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const filteredTabs = tabs.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.url.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredClosed = closedTabs.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.url.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[100] bg-transparent" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -15, transition: { duration: 0.1 } }}
                        transition={{ type: "spring", stiffness: 500, damping: 25, mass: 0.6 }} // Fast and snappy
                        className="absolute top-[48px] left-[8px] w-[340px] bg-white text-gray-800 rounded-xl z-[101] overflow-hidden flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-200 ring-1 ring-black/5 font-sans"
                        style={{ transformOrigin: 'top left' }}
                    >
                        {/* Search Header - Chrome Style */}
                        <div className="p-4 py-3 border-b border-gray-100">
                            <div className="relative group">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-600 transition-colors" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search Tabs"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-gray-100 hover:bg-gray-100/80 focus:bg-white border-2 border-transparent focus:border-blue-500 rounded-full pl-10 pr-3 py-1.5 text-[13px] text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 transition-all shadow-none"
                                    spellCheck={false}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-sm">
                                    Esc
                                </div>
                            </div>
                        </div>

                        {/* List Content */}
                        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">

                            {/* Open Tabs */}
                            {filteredTabs.length > 0 && (
                                <div className="py-2">
                                    <div className="px-5 py-2 text-[11px] font-bold text-gray-500 select-none flex items-center justify-between">
                                        <span>OPEN TABS</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        {filteredTabs.map(tab => (
                                            <div
                                                key={tab.id}
                                                onClick={() => { onSwitchTab(tab.id); onClose(); }}
                                                className="w-full text-left px-5 py-2.5 hover:bg-gray-100 flex items-center gap-3 group transition-colors cursor-pointer border-l-[3px] border-transparent hover:border-blue-500 relative"
                                            >
                                                <div className="w-5 h-5 flex items-center justify-center text-gray-500 shrink-0">
                                                    {tab.url.startsWith('eterx://') ? <Layout size={16} /> : <Globe size={16} />}
                                                </div>
                                                <div className="flex-1 min-w-0 pr-6">
                                                    <div className="font-medium text-gray-900 text-[13px] truncate leading-tight">{tab.title}</div>
                                                    <div className="text-[11px] text-gray-400 truncate leading-tight mt-0.5">
                                                        {tab.url.startsWith('eterx://') ? 'System Page' : new URL(tab.url.startsWith('http') ? tab.url : 'https://' + tab.url).hostname.replace('www.', '')}
                                                        <span className="mx-1">•</span>
                                                        <span>Active</span>
                                                    </div>
                                                </div>
                                                {/* Close Button styling matching image */}
                                                <button className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-all">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recently Closed */}
                            {filteredClosed.length > 0 && (
                                <div className="py-2 border-t border-gray-100">
                                    <div className="px-5 py-2 text-[11px] font-bold text-gray-500 select-none">
                                        RECENTLY CLOSED
                                    </div>
                                    <div className="space-y-0.5">
                                        {filteredClosed.map(tab => (
                                            <div
                                                key={tab.id}
                                                onClick={() => { onRestoreTab(tab.id); onClose(); }}
                                                className="w-full text-left px-5 py-2.5 hover:bg-gray-100 flex items-center gap-3 group transition-colors cursor-pointer opacity-80 hover:opacity-100 border-l-[3px] border-transparent hover:border-gray-400"
                                            >
                                                <div className="w-5 h-5 flex items-center justify-center text-gray-400 shrink-0">
                                                    <Clock size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-700 text-[13px] truncate leading-tight">{tab.title}</div>
                                                    <div className="text-[11px] text-gray-400 truncate leading-tight mt-0.5">
                                                        {tab.url.startsWith('eterx://') ? 'System Page' : new URL(tab.url.startsWith('http') ? tab.url : 'https://' + tab.url).hostname.replace('www.', '')}
                                                        <span className="mx-1">•</span>
                                                        <span>Closed</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {filteredTabs.length === 0 && filteredClosed.length === 0 && (
                                <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                                    <Search size={32} className="mb-3 opacity-20" />
                                    <span className="text-xs">No tabs found</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
