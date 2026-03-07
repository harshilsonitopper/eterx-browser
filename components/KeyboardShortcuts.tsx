import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Command } from 'lucide-react';

interface KeyboardShortcutsProps {
    isOpen: boolean;
    onClose: () => void;
}

const SHORTCUTS = [
    {
        category: 'Navigation', shortcuts: [
            { keys: ['Ctrl', 'T'], action: 'New Tab' },
            { keys: ['Ctrl', 'W'], action: 'Close Tab' },
            { keys: ['Ctrl', 'Tab'], action: 'Next Tab' },
            { keys: ['Ctrl', 'Shift', 'T'], action: 'Reopen Closed Tab' },
            { keys: ['Alt', '←'], action: 'Go Back' },
            { keys: ['Alt', '→'], action: 'Go Forward' },
            { keys: ['F5'], action: 'Reload' },
        ]
    },
    {
        category: 'AI & Search', shortcuts: [
            { keys: ['CapsLock', 'Space'], action: 'Contextual AI Search' },
            { keys: ['Ctrl', 'L'], action: 'Focus Address Bar' },
        ]
    },
    {
        category: 'Window', shortcuts: [
            { keys: ['F11'], action: 'Toggle Fullscreen' },
            { keys: ['Ctrl', 'H'], action: 'Open History' },
            { keys: ['?'], action: 'Show Shortcuts' },
        ]
    },
];

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[600px] max-h-[80vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                                <Command size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h2>
                                <p className="text-sm text-gray-500">Master your browser with these shortcuts</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-5 overflow-y-auto max-h-[60vh] space-y-6">
                        {SHORTCUTS.map((section) => (
                            <div key={section.category}>
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{section.category}</h3>
                                <div className="space-y-2">
                                    {section.shortcuts.map((shortcut, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{shortcut.action}</span>
                                            <div className="flex items-center gap-1">
                                                {shortcut.keys.map((key, j) => (
                                                    <React.Fragment key={j}>
                                                        <kbd className="px-2 py-1 text-xs font-medium bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-sm text-gray-700 dark:text-gray-300">
                                                            {key}
                                                        </kbd>
                                                        {j < shortcut.keys.length - 1 && <span className="text-gray-400 text-xs">+</span>}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-center text-xs text-gray-500">Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border text-xs">Esc</kbd> or <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border text-xs">?</kbd> to close</p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
