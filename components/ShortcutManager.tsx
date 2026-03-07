import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Search, Keyboard, Command, RotateCcw,
    Save, AlertCircle, Check, Edit2, Trash2
} from 'lucide-react';

interface Shortcut {
    id: string;
    action: string;
    description: string;
    keys: string[];
    category: string;
    customizable: boolean;
}

interface ShortcutManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

// Default shortcuts
const DEFAULT_SHORTCUTS: Shortcut[] = [
    // Navigation
    { id: 'new-tab', action: 'newTab', description: 'Open new tab', keys: ['Ctrl', 'T'], category: 'Navigation', customizable: true },
    { id: 'close-tab', action: 'closeTab', description: 'Close current tab', keys: ['Ctrl', 'W'], category: 'Navigation', customizable: true },
    { id: 'reopen-tab', action: 'reopenTab', description: 'Reopen closed tab', keys: ['Ctrl', 'Shift', 'T'], category: 'Navigation', customizable: true },
    { id: 'next-tab', action: 'nextTab', description: 'Switch to next tab', keys: ['Ctrl', 'Tab'], category: 'Navigation', customizable: true },
    { id: 'prev-tab', action: 'prevTab', description: 'Switch to previous tab', keys: ['Ctrl', 'Shift', 'Tab'], category: 'Navigation', customizable: true },
    { id: 'go-back', action: 'goBack', description: 'Go back', keys: ['Alt', '←'], category: 'Navigation', customizable: true },
    { id: 'go-forward', action: 'goForward', description: 'Go forward', keys: ['Alt', '→'], category: 'Navigation', customizable: true },
    { id: 'reload', action: 'reload', description: 'Reload page', keys: ['Ctrl', 'R'], category: 'Navigation', customizable: true },
    { id: 'hard-reload', action: 'hardReload', description: 'Hard reload (clear cache)', keys: ['Ctrl', 'Shift', 'R'], category: 'Navigation', customizable: true },

    // Address Bar
    { id: 'focus-url', action: 'focusUrl', description: 'Focus address bar', keys: ['Ctrl', 'L'], category: 'Address Bar', customizable: true },
    { id: 'search', action: 'search', description: 'Search in page', keys: ['Ctrl', 'F'], category: 'Address Bar', customizable: true },

    // Layouts
    { id: 'split-view', action: 'splitView', description: 'Toggle split view', keys: ['Ctrl', 'Shift', 'S'], category: 'Layouts', customizable: true },
    { id: 'grid-view', action: 'gridView', description: 'Switch to grid layout', keys: ['Ctrl', 'Shift', 'G'], category: 'Layouts', customizable: true },
    { id: 'single-view', action: 'singleView', description: 'Switch to single tab', keys: ['Escape'], category: 'Layouts', customizable: false },

    // AI & Tools
    { id: 'toggle-ai', action: 'toggleAI', description: 'Toggle AI sidebar', keys: ['Ctrl', 'Shift', 'A'], category: 'AI & Tools', customizable: true },
    { id: 'quick-ask', action: 'quickAsk', description: 'Quick AI query', keys: ['Ctrl', 'Shift', 'Space'], category: 'AI & Tools', customizable: true },

    // Window
    { id: 'fullscreen', action: 'fullscreen', description: 'Toggle fullscreen', keys: ['F11'], category: 'Window', customizable: false },
    { id: 'dev-tools', action: 'devTools', description: 'Open developer tools', keys: ['Ctrl', 'Shift', 'I'], category: 'Window', customizable: false },
    { id: 'zoom-in', action: 'zoomIn', description: 'Zoom in', keys: ['Ctrl', '+'], category: 'Window', customizable: true },
    { id: 'zoom-out', action: 'zoomOut', description: 'Zoom out', keys: ['Ctrl', '-'], category: 'Window', customizable: true },
    { id: 'zoom-reset', action: 'zoomReset', description: 'Reset zoom', keys: ['Ctrl', '0'], category: 'Window', customizable: true },
];

const STORAGE_KEY = 'eterx-shortcuts';

export const ShortcutManager: React.FC<ShortcutManagerProps> = ({ isOpen, onClose }) => {
    const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [recordingKeys, setRecordingKeys] = useState<string[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    // Load custom shortcuts from storage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setShortcuts(prev => prev.map(s => {
                    const custom = parsed.find((p: Shortcut) => p.id === s.id);
                    return custom ? { ...s, keys: custom.keys } : s;
                }));
            }
        } catch (e) {
            console.error('Failed to load shortcuts:', e);
        }
    }, []);

    // Key recording handler
    useEffect(() => {
        if (!editingId) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            const keys: string[] = [];

            if (e.ctrlKey) keys.push('Ctrl');
            if (e.shiftKey) keys.push('Shift');
            if (e.altKey) keys.push('Alt');
            if (e.metaKey) keys.push('⌘');

            // Add the actual key
            const key = e.key;
            if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
                keys.push(key.length === 1 ? key.toUpperCase() : key);
            }

            setRecordingKeys(keys);
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (recordingKeys.length > 0) {
                // Save the recorded keys
                setShortcuts(prev => prev.map(s =>
                    s.id === editingId ? { ...s, keys: recordingKeys } : s
                ));
                setHasChanges(true);
                setEditingId(null);
                setRecordingKeys([]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [editingId, recordingKeys]);

    // Filter shortcuts by search
    const filteredShortcuts = shortcuts.filter(s =>
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.keys.join(' ').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group by category
    const groupedShortcuts = filteredShortcuts.reduce((acc, s) => {
        if (!acc[s.category]) acc[s.category] = [];
        acc[s.category].push(s);
        return acc;
    }, {} as Record<string, Shortcut[]>);

    // Save changes
    const handleSave = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
            setHasChanges(false);
            setSaveMessage('Shortcuts saved successfully!');
            setTimeout(() => setSaveMessage(null), 2000);
        } catch (e) {
            setSaveMessage('Failed to save shortcuts');
            setTimeout(() => setSaveMessage(null), 2000);
        }
    };

    // Reset to defaults
    const handleReset = () => {
        setShortcuts(DEFAULT_SHORTCUTS);
        localStorage.removeItem(STORAGE_KEY);
        setHasChanges(false);
        setSaveMessage('Reset to defaults');
        setTimeout(() => setSaveMessage(null), 2000);
    };

    // Reset single shortcut
    const handleResetSingle = (id: string) => {
        const defaultShortcut = DEFAULT_SHORTCUTS.find(s => s.id === id);
        if (defaultShortcut) {
            setShortcuts(prev => prev.map(s => s.id === id ? defaultShortcut : s));
            setHasChanges(true);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full max-w-3xl max-h-[85vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                    <Keyboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-lg text-gray-900 dark:text-white">Keyboard Shortcuts</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Customize your browser shortcuts</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Search & Actions */}
                        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search shortcuts..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <RotateCcw size={14} />
                                Reset
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${hasChanges
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                <Save size={14} />
                                Save
                            </button>
                        </div>

                        {/* Save message */}
                        <AnimatePresence>
                            {saveMessage && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-6 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm flex items-center gap-2"
                                >
                                    <Check size={14} />
                                    {saveMessage}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Shortcuts List */}
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {Object.entries(groupedShortcuts).map(([category, items]) => (
                                <div key={category} className="mb-6">
                                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                        {category}
                                    </h3>
                                    <div className="space-y-1">
                                        {items.map(shortcut => (
                                            <div
                                                key={shortcut.id}
                                                className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${editingId === shortcut.id
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                                    }`}
                                            >
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {shortcut.description}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {/* Keys display */}
                                                    <div className="flex items-center gap-1">
                                                        {(editingId === shortcut.id ? recordingKeys : shortcut.keys).map((key, i) => (
                                                            <React.Fragment key={i}>
                                                                <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600 shadow-sm">
                                                                    {key}
                                                                </kbd>
                                                                {i < (editingId === shortcut.id ? recordingKeys : shortcut.keys).length - 1 && (
                                                                    <span className="text-gray-400">+</span>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>

                                                    {/* Edit/Reset buttons */}
                                                    {shortcut.customizable && (
                                                        <>
                                                            <button
                                                                onClick={() => setEditingId(editingId === shortcut.id ? null : shortcut.id)}
                                                                className={`p-1.5 rounded transition-colors ${editingId === shortcut.id
                                                                        ? 'bg-blue-500 text-white'
                                                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                                    }`}
                                                            >
                                                                <Edit2 size={12} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleResetSingle(shortcut.id)}
                                                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                            >
                                                                <RotateCcw size={12} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer hint */}
                        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <AlertCircle size={12} />
                                <span>Click the edit icon, then press your desired key combination to change a shortcut</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ShortcutManager;
