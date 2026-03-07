import React, { useState } from 'react';
import { Command, Search, Keyboard, Zap, Layout, Monitor, Ghost } from 'lucide-react';

interface Shortcut {
    keys: string[];
    description: string;
    category: string;
}

const SHORTCUTS: Shortcut[] = [
    // Tabs & Windows
    { keys: ['Ctrl', 'T'], description: 'Open a new tab', category: 'Tabs & Windows' },
    { keys: ['Ctrl', 'W'], description: 'Close current tab', category: 'Tabs & Windows' },
    { keys: ['Ctrl', 'Shift', 'T'], description: 'Reopen last closed tab', category: 'Tabs & Windows' },
    { keys: ['Ctrl', 'Tab'], description: 'Switch to next tab', category: 'Tabs & Windows' },
    { keys: ['Ctrl', 'Shift', 'Tab'], description: 'Switch to previous tab', category: 'Tabs & Windows' },
    { keys: ['Ctrl', 'N'], description: 'Open a new window', category: 'Tabs & Windows' },
    { keys: ['Ctrl', '1-8'], description: 'Switch to specific tab', category: 'Tabs & Windows' },
    { keys: ['Ctrl', '9'], description: 'Switch to last tab', category: 'Tabs & Windows' },

    // Navigation
    { keys: ['Alt', 'Left'], description: 'Go back', category: 'Navigation' },
    { keys: ['Alt', 'Right'], description: 'Go forward', category: 'Navigation' },
    { keys: ['Ctrl', 'R'], description: 'Reload page', category: 'Navigation' },
    { keys: ['F5'], description: 'Reload page', category: 'Navigation' },
    { keys: ['Ctrl', 'L'], description: 'Focus address bar', category: 'Navigation' },

    // Page Content
    { keys: ['Ctrl', '+'], description: 'Zoom in', category: 'Page Content' },
    { keys: ['Ctrl', '-'], description: 'Zoom out', category: 'Page Content' },
    { keys: ['Ctrl', '0'], description: 'Reset zoom', category: 'Page Content' },
    { keys: ['Ctrl', 'F'], description: 'Find on page', category: 'Page Content' },
    { keys: ['F11'], description: 'Toggle Fullscreen', category: 'Page Content' },

    // Browser Features
    { keys: ['Ctrl', 'H'], description: 'Open History', category: 'Browser Features' },
    { keys: ['Ctrl', 'J'], description: 'Open Downloads', category: 'Browser Features' },
    { keys: ['Ctrl', 'Shift', 'O'], description: 'Open Bookmarks', category: 'Browser Features' },
    { keys: ['F12'], description: 'Open Developer Tools', category: 'Browser Features' },

    // EterX AI & Power User
    { keys: ['Ctrl', 'Space'], description: 'Toggle AI Sidebar', category: 'EterX AI' },
    { keys: ['Ctrl', '/'], description: 'Ask AI about selection', category: 'EterX AI' },
    { keys: ['Shift', '/'], description: 'Open Keyboard Shortcuts', category: 'EterX AI' },
    { keys: ['F'], description: 'Toggle Focus Mode', category: 'EterX AI' },
    { keys: ['Esc'], description: 'Close Sidebars / Focus Content', category: 'EterX AI' },
];

export const ShortcutsPage: React.FC<{ onNavigate: (url: string) => void }> = ({ onNavigate }) => {
    const [search, setSearch] = useState('');

    const filteredShortcuts = SHORTCUTS.filter(s =>
        s.description.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase()) ||
        s.keys.join(' ').toLowerCase().includes(search.toLowerCase())
    );

    const categories = Array.from(new Set(filteredShortcuts.map(s => s.category)));

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] text-[#1f2937] font-sans selection:bg-[var(--accent-soft)] selection:text-[var(--accent-primary)] overflow-hidden">

            {/* Background Ambient Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[var(--accent-soft)] filter blur-[100px] opacity-40"></div>
            </div>

            {/* Header */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-white/20 px-8 py-6 shadow-sm z-10">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl shadow-lg shadow-[var(--accent-glow)]">
                                <Keyboard size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Keyboard Shortcuts</h1>
                                <p className="text-gray-500 text-sm">Master your workflow with power user controls</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search shortcuts..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:bg-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 outline-none transition-all shadow-sm text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-8 pb-10">
                    {categories.map(category => (
                        <div key={category} className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/20 overflow-hidden">
                            <div className="px-6 py-3 bg-gradient-to-r from-gray-50/80 to-transparent border-b border-gray-100 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]"></span>
                                <h2 className="font-semibold text-gray-700 text-sm">{category}</h2>
                            </div>
                            <div className="divide-y divide-gray-100/50">
                                {filteredShortcuts.filter(s => s.category === category).map((shortcut, i) => (
                                    <div key={i} className="px-6 py-3.5 flex items-center justify-between hover:bg-[var(--accent-soft)] transition-colors group">
                                        <span className="text-gray-700 font-medium text-sm group-hover:text-gray-900">{shortcut.description}</span>
                                        <div className="flex gap-1.5">
                                            {shortcut.keys.map(key => (
                                                <kbd key={key} className="px-2.5 py-1.5 bg-gray-50 border-b-2 border-gray-200 rounded-lg text-xs font-bold text-gray-500 min-w-[28px] text-center shadow-sm group-hover:bg-white group-hover:text-[var(--accent-primary)] group-hover:border-[var(--accent-primary)]/30 transition-all">
                                                    {key}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {filteredShortcuts.length === 0 && (
                        <div className="text-center py-20 text-gray-400">
                            <Ghost size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No shortcuts found for "{search}"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
