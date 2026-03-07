import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, Search, Trash2, MoreVertical, Calendar, Globe, ArrowUpRight } from 'lucide-react';
import { clsx } from 'clsx';

import { HistoryItem } from '../types';

interface HistoryPageProps {
    onNavigate: (url: string) => void;
    history: HistoryItem[];
    onClear?: () => void;
    onRemoveItem?: (id: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onNavigate, history, onClear, onRemoveItem }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredHistory = useMemo(() => {
        return history.filter(item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.url.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [history, searchQuery]);

    const groupedHistory = useMemo(() => {
        const groups: { [key: string]: HistoryItem[] } = {
            'Today': [],
            'Yesterday': [],
            'This Week': [],
            'Older': []
        };

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterday = today - 86400000;
        const weekAgo = today - 86400000 * 7;

        filteredHistory.forEach(item => {
            if (item.timestamp >= today) groups['Today'].push(item);
            else if (item.timestamp >= yesterday) groups['Yesterday'].push(item);
            else if (item.timestamp >= weekAgo) groups['This Week'].push(item);
            else groups['Older'].push(item);
        });

        return groups;
    }, [filteredHistory]);

    return (
        <div className="flex flex-col h-full bg-[#f8f9fa] text-gray-900 overflow-hidden">
            {/* Header - Liquid Glass Style */}
            <div className="glass-toolbar px-8 py-6 flex items-center justify-between z-10 relative">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/50 backdrop-blur-md rounded-xl text-blue-600 shadow-sm border border-white/60">
                        <Clock size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-light text-gray-900">History</h1>
                        <p className="text-gray-500 text-sm">Manage your browsing activity</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full max-w-md">
                    <div className="relative flex-1 group">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search history..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-white/60 rounded-xl focus:bg-white focus:border-blue-500/50 outline-none transition-all shadow-sm focus:shadow-md"
                        />
                    </div>
                    <button
                        className="px-4 py-2.5 bg-white/50 border border-white/60 hover:bg-red-50 hover:border-red-200 hover:text-red-600 rounded-xl transition-all text-sm font-medium flex items-center gap-2 shadow-sm"
                        onClick={onClear}
                    >
                        <Trash2 size={16} />
                        Clear data
                    </button>
                </div>
            </div>

            {/* Content to Scroll */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    {Object.entries(groupedHistory).map(([label, items]) => (
                        items.length > 0 && (
                            <motion.div
                                key={label}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider pl-2 sticky top-0 bg-gray-50/95 backdrop-blur-sm py-2 z-10">
                                    {label}
                                </h2>
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    {items.map((item, index) => (
                                        <div
                                            key={`${item.timestamp}-${item.url}`}
                                            className={clsx(
                                                "group flex items-center gap-4 p-4 hover:bg-blue-50/30 transition-colors cursor-pointer relative",
                                                index !== items.length - 1 && "border-b border-gray-100"
                                            )}
                                            onClick={() => onNavigate(item.url)}
                                        >
                                            <div className="text-gray-400 text-xs w-16 text-right font-medium">
                                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>

                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200 text-gray-500 font-bold text-sm">
                                                {item.favicon ? (
                                                    <img src={item.favicon} alt="" className="w-6 h-6 object-contain" />
                                                ) : (
                                                    <Globe size={18} />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-gray-900 font-medium truncate group-hover:text-blue-600 transition-colors">{item.title}</h3>
                                                <p className="text-gray-400 text-sm truncate hover:underline">{item.url}</p>
                                            </div>

                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onRemoveItem?.(item.url); }}
                                                    className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                                                    title="Remove from history"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <button className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )
                    ))}

                    {history.length === 0 && (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <Clock size={32} />
                            </div>
                            <h3 className="text-xl font-medium text-gray-800">No history here</h3>
                            <p className="text-gray-500 mt-2">Pages you visit will appear here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
