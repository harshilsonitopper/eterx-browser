import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, Search, Trash2, ExternalLink, Calendar,
    ChevronDown, ChevronRight, X
} from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (url: string) => void;
    history?: HistoryItem[];
}

// Mock history data for demonstration
const generateMockHistory = (): HistoryItem[] => {
    const sites = [
        { url: 'https://google.com', title: 'Google', favicon: '' },
        { url: 'https://github.com', title: 'GitHub: Let\'s build from here', favicon: '' },
        { url: 'https://youtube.com', title: 'YouTube', favicon: '' },
        { url: 'https://stackoverflow.com/questions', title: 'Stack Overflow - Questions', favicon: '' },
        { url: 'https://twitter.com', title: 'X (formerly Twitter)', favicon: '' },
        { url: 'https://reddit.com', title: 'Reddit - Pair programming with AI', favicon: '' },
        { url: 'https://developer.mozilla.org', title: 'MDN Web Docs', favicon: '' },
        { url: 'https://vercel.com', title: 'Vercel: Build and deploy', favicon: '' },
    ];

    const now = Date.now();
    return sites.map((site, i) => ({
        id: `hist-${i}`,
        ...site,
        visitedAt: now - i * 3600000 * Math.random() * 24,
        timestamp: now - i * 3600000 * Math.random() * 24
    })).sort((a, b) => b.visitedAt - a.visitedAt);
};

// Group history by date
const groupByDate = (items: HistoryItem[]): Map<string, HistoryItem[]> => {
    const groups = new Map<string, HistoryItem[]>();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const lastWeek = new Date(today.getTime() - 7 * 86400000);

    items.forEach(item => {
        const itemDate = new Date(item.timestamp);
        let key: string;

        if (itemDate >= today) {
            key = 'Today';
        } else if (itemDate >= yesterday) {
            key = 'Yesterday';
        } else if (itemDate >= lastWeek) {
            key = 'This Week';
        } else {
            key = 'Earlier';
        }

        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(item);
    });

    return groups;
};

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
    isOpen,
    onClose,
    onNavigate,
    history: providedHistory
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Today', 'Yesterday']));

    // Use provided history or mock data
    const history = providedHistory || generateMockHistory();

    // Filter and group history
    const filteredHistory = useMemo(() => {
        if (!searchQuery.trim()) return history;
        const query = searchQuery.toLowerCase();
        return history.filter(item =>
            item.title.toLowerCase().includes(query) ||
            item.url.toLowerCase().includes(query)
        );
    }, [history, searchQuery]);

    const groupedHistory = useMemo(() => groupByDate(filteredHistory), [filteredHistory]);

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(group)) {
                next.delete(group);
            } else {
                next.add(group);
            }
            return next;
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const handleClearAll = () => {
        // TODO: Implement clear all history
        console.log('[History] Clear all - Coming soon');
    };

    if (!isOpen) return null;

    return (
        <div className="h-full flex flex-col bg-[#0c0c0e]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Clock size={18} className="text-blue-400" />
                    <span className="font-medium text-white">History</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search history..."
                        className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
                {Array.from(groupedHistory.entries()).map(([group, items]) => (
                    <div key={group} className="mb-2">
                        {/* Group Header */}
                        <button
                            onClick={() => toggleGroup(group)}
                            className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            {expandedGroups.has(group) ? (
                                <ChevronDown size={14} />
                            ) : (
                                <ChevronRight size={14} />
                            )}
                            <Calendar size={12} />
                            <span className="font-medium">{group}</span>
                            <span className="text-xs text-gray-600">({items.length})</span>
                        </button>

                        {/* Group Items */}
                        <AnimatePresence>
                            {expandedGroups.has(group) && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    {items.map((item, index) => (
                                        <motion.button
                                            key={item.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            onClick={() => onNavigate(item.url)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 group transition-colors text-left"
                                        >
                                            {/* Favicon placeholder */}
                                            <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
                                                <ExternalLink size={12} className="text-gray-500" />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-gray-200 truncate group-hover:text-white transition-colors">
                                                    {item.title}
                                                </div>
                                                <div className="text-xs text-gray-600 truncate">
                                                    {new URL(item.url).hostname}
                                                </div>
                                            </div>

                                            {/* Time */}
                                            <div className="text-xs text-gray-600 flex-shrink-0">
                                                {formatTime(new Date(item.timestamp))}
                                            </div>
                                        </motion.button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}

                {filteredHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Clock size={32} className="mb-3 opacity-50" />
                        <p className="text-sm">No history found</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/5">
                <button
                    onClick={handleClearAll}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 text-sm transition-colors"
                >
                    <Trash2 size={14} />
                    Clear browsing history
                </button>
            </div>
        </div>
    );
};
