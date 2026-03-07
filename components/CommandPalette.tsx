import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Monitor, Layout, Columns, Square, Command, Sun, Moon, Palette, Plus, Settings, Sidebar } from 'lucide-react';
import { UserSettings } from './SettingsPage';

export interface CommandAction {
    id: string;
    label: string;
    icon: React.ElementType;
    shortcut?: string;
    group: 'General' | 'Layout' | 'Appearance' | 'Tabs';
    action: () => void;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    actions: CommandAction[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, actions }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initial Focus
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Filtering
    const filteredActions = actions.filter(action =>
        action.label.toLowerCase().includes(query.toLowerCase()) ||
        action.group.toLowerCase().includes(query.toLowerCase())
    );

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredActions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredActions.length) % filteredActions.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredActions[selectedIndex]) {
                    filteredActions[selectedIndex].action();
                    onClose();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredActions, selectedIndex, onClose]);

    // Grouping for Render
    const groupedActions: Record<string, CommandAction[]> = {};
    filteredActions.forEach(action => {
        if (!groupedActions[action.group]) groupedActions[action.group] = [];
        groupedActions[action.group].push(action);
    });

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                    />

                    {/* Palette */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-[600px] bg-white rounded-2xl shadow-2xl z-[101] overflow-hidden border border-gray-200 ring-1 ring-black/5 flex flex-col max-h-[60vh]"
                    >
                        {/* Search Input */}
                        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 bg-white/50">
                            <Search className="w-5 h-5 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                                placeholder="Type a command or search..."
                                className="flex-1 bg-transparent text-lg text-gray-800 placeholder:text-gray-400 outline-none"
                                autoFocus
                            />
                            <div className="bg-gray-100 text-gray-500 text-xs font-medium px-2 py-1 rounded">ESC to close</div>
                        </div>

                        {/* List */}
                        <div className="overflow-y-auto p-2 scrollbar-hide">
                            {filteredActions.length === 0 ? (
                                <div className="py-8 text-center text-gray-400 text-sm">No results found.</div>
                            ) : (
                                Object.entries(groupedActions).map(([group, groupActions]) => (
                                    <div key={group} className="mb-2">
                                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 bg-gray-50/50 mb-1 rounded-md mx-1">
                                            {group}
                                        </div>
                                        {groupActions.map((action, idx) => {
                                            // Calculate global index for selection
                                            const globalIndex = filteredActions.findIndex(a => a.id === action.id);
                                            const isSelected = globalIndex === selectedIndex;

                                            return (
                                                <button
                                                    key={action.id}
                                                    onClick={() => { action.action(); onClose(); }}
                                                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all text-left ${isSelected
                                                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                                                        : 'text-gray-700 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                            <action.icon size={18} />
                                                        </div>
                                                        <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>{action.label}</span>
                                                    </div>
                                                    {action.shortcut && (
                                                        <span className={`text-xs ${isSelected ? 'text-blue-400' : 'text-gray-400'}`}>
                                                            {action.shortcut}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
