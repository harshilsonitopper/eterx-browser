import React from 'react';
import {
    Plus, Copy, Clock, Download, Bookmark, Puzzle, Settings,
    Printer, Moon, Sun, LogOut, ZoomIn, ZoomOut, Maximize, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BrowserMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onNewTab: () => void;
    onNewIncognitoTab: () => void;
    onNewWindow: () => void;
    onHistory: () => void;
    onDownloads: () => void;
    onBookmarks: () => void;
    onExtensions: () => void;
    onSettings: () => void;
    onPrint: () => void;
    onToggleTheme: () => void;
    theme: 'dark' | 'light' | 'system';
}

const MenuItem = ({ icon: Icon, label, shortcut, onClick }: any) => (
    <button
        onClick={onClick}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg-glass-hover)] cursor-pointer transition-colors group text-left"
    >
        <div className="flex items-center gap-3">
            <Icon size={16} className="text-gray-500 group-hover:text-gray-700" />
            <span className="text-gray-700">{label}</span>
        </div>
        {shortcut && <span className="text-xs text-gray-400">{shortcut}</span>}
    </button>
);

export const BrowserMenu: React.FC<BrowserMenuProps> = ({
    isOpen, onClose, onNewTab, onNewIncognitoTab, onNewWindow, onHistory,
    onDownloads, onBookmarks, onSettings, onPrint, onToggleTheme, theme
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[100]" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -8 }}
                        transition={{ type: "spring", duration: 0.2 }}
                        className="absolute top-12 right-2 w-64 glass-panel rounded-xl z-[101] overflow-hidden text-sm"
                    >
                        {/* Core Actions */}
                        <div className="py-1.5 border-b border-[var(--border-glass)]">
                            <MenuItem icon={Plus} label="New tab" shortcut="Ctrl+T" onClick={onNewTab} />
                            <MenuItem icon={EyeOff} label="New incognito tab" shortcut="Ctrl+Shift+N" onClick={onNewIncognitoTab} />
                            <MenuItem icon={Copy} label="New window" shortcut="Ctrl+N" onClick={onNewWindow} />
                        </div>

                        {/* Navigation */}
                        <div className="py-1.5 border-b border-[var(--border-glass)]">
                            <MenuItem icon={Clock} label="History" shortcut="Ctrl+H" onClick={onHistory} />
                            <MenuItem icon={Download} label="Downloads" shortcut="Ctrl+J" onClick={onDownloads} />
                            <MenuItem icon={Bookmark} label="Bookmarks" shortcut="Ctrl+D" onClick={onBookmarks} />
                            <MenuItem icon={Puzzle} label="Extensions" onClick={() => { }} />
                        </div>

                        {/* Zoom */}
                        <div className="py-1.5 border-b border-[var(--border-glass)]">
                            <div className="flex items-center justify-between px-4 py-2">
                                <span className="text-gray-700">Zoom</span>
                                <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden">
                                    <button className="p-1.5 hover:bg-gray-200 transition-colors">
                                        <ZoomOut size={14} className="text-gray-600" />
                                    </button>
                                    <span className="px-2 text-xs text-gray-600 font-medium">100%</span>
                                    <button className="p-1.5 hover:bg-gray-200 transition-colors">
                                        <ZoomIn size={14} className="text-gray-600" />
                                    </button>
                                    <button className="p-1.5 hover:bg-gray-200 border-l border-gray-200 transition-colors">
                                        <Maximize size={12} className="text-gray-600" />
                                    </button>
                                </div>
                            </div>
                            <MenuItem icon={Printer} label="Print..." shortcut="Ctrl+P" onClick={onPrint} />
                        </div>

                        {/* Settings */}
                        <div className="py-1.5 border-b border-[var(--border-glass)]">
                            <MenuItem icon={Settings} label="Settings" onClick={onSettings} />
                        </div>

                        {/* Theme & Exit */}
                        <div className="py-1.5">
                            <div className="px-4 py-2 flex items-center justify-between">
                                <span className="text-xs text-gray-500">Theme</span>
                                <button
                                    onClick={onToggleTheme}
                                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-xs text-gray-600"
                                >
                                    {theme === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
                                    <span className="capitalize">{theme}</span>
                                </button>
                            </div>
                            <MenuItem icon={LogOut} label="Exit" onClick={() => window.close()} />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
