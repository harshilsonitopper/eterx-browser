import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, ExternalLink, Folder, ChevronRight, Star } from 'lucide-react';
import { clsx } from 'clsx';

interface SavedLink {
    id: string;
    title: string;
    url: string;
    folder?: string;
}

interface SavedLinksMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (url: string) => void;
}

const MOCK_LINKS: SavedLink[] = [
    { id: '1', title: 'YouTube', url: 'https://youtube.com', folder: 'Entertainment' },
    { id: '2', title: 'GitHub - EterX', url: 'https://github.com', folder: 'Development' },
    { id: '3', title: 'React Documentation', url: 'https://react.dev', folder: 'Development' },
    { id: '4', title: 'Gmail', url: 'https://gmail.com', folder: 'Work' },
    { id: '5', title: 'Twitter / X', url: 'https://twitter.com', folder: 'Social' },
];

export const SavedLinksMenu: React.FC<SavedLinksMenuProps> = ({ isOpen, onClose, onNavigate }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[100]" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10, x: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10, x: -10 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="absolute top-10 left-2 w-72 glass-liquid rounded-2xl z-[101] overflow-hidden flex flex-col"
                        style={{ transformOrigin: 'top left' }}
                    >
                        <div className="p-3 border-b border-white/50 bg-white/50 backdrop-blur-md flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700 pl-2 flex items-center gap-2">
                                <Star size={14} className="text-amber-500 fill-amber-500" />
                                Saved Links
                            </span>
                            <span className="text-xs text-gray-400 bg-white/50 px-2 py-0.5 rounded-full border border-white/50">
                                {MOCK_LINKS.length} items
                            </span>
                        </div>

                        <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-1">
                            {/* Group by folder (simple mock impl) */}
                            {['Development', 'Entertainment', 'Work', 'Social'].map(folder => {
                                const folderLinks = MOCK_LINKS.filter(l => l.folder === folder);
                                if (!folderLinks.length) return null;

                                return (
                                    <div key={folder} className="mb-2 last:mb-0">
                                        <div className="px-2 py-1 text-xs font-medium text-gray-500 flex items-center gap-1 opacity-80">
                                            <Folder size={12} />
                                            {folder}
                                        </div>
                                        <div className="space-y-0.5">
                                            {folderLinks.map(link => (
                                                <button
                                                    key={link.id}
                                                    onClick={() => { onNavigate(link.url); onClose(); }}
                                                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/80 hover:shadow-sm transition-all flex items-center gap-3 group"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-500 shadow-sm group-hover:scale-105 transition-transform">
                                                        <ExternalLink size={14} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-gray-800 text-sm truncate">{link.title}</div>
                                                        <div className="text-xs text-gray-400 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {new URL(link.url).hostname}
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
