import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { QuickLinksAlgorithm, QuickLinkItem } from '../services/QuickLinksAlgorithm';

interface QuickLinksProps {
    onNavigate: (url: string) => void;
}

export const QuickLinks: React.FC<QuickLinksProps> = ({ onNavigate }) => {
    const [links, setLinks] = useState<QuickLinkItem[]>([]);
    const [isAddShortcutOpen, setIsAddShortcutOpen] = useState(false);
    const [newShortcutUrl, setNewShortcutUrl] = useState('');
    const [newShortcutTitle, setNewShortcutTitle] = useState('');

    // Refresh links from the algorithm
    const refreshLinks = () => {
        const topLinks = QuickLinksAlgorithm.getInstance().getTopSites(7);
        setLinks(topLinks);
    };

    useEffect(() => {
        refreshLinks();

        // Listen for live updates from the background algorithm (tabs adding history)
        const unsubscribe = QuickLinksAlgorithm.getInstance().subscribe(() => {
            refreshLinks();
        });

        // Still keep a slow interval to decay scores visually over time if left open
        const interval = setInterval(refreshLinks, 60000);
        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, []);

    const handleAddShortcutSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let finalUrl = newShortcutUrl;
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = 'https://' + finalUrl;
        }

        if (finalUrl) {
            const title = newShortcutTitle || new URL(finalUrl).hostname.replace('www.', '');
            QuickLinksAlgorithm.getInstance().pinShortcut(title, finalUrl);
            setIsAddShortcutOpen(false);
            setNewShortcutUrl('');
            setNewShortcutTitle('');
        }
    };

    const handleRemoveShortcut = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        QuickLinksAlgorithm.getInstance().removeShortcut(id);
    };

    const getFaviconUrl = (link: QuickLinkItem) => {
        if (link.faviconUrl && link.faviconUrl.trim() !== '') {
            if (!link.faviconUrl.startsWith('data:') && !link.faviconUrl.startsWith('http')) {
                // Relative path, construct absolute if possible, or just return
                try {
                    const domain = new URL(link.url).origin;
                    return new URL(link.faviconUrl, domain).href;
                } catch {
                    return link.faviconUrl;
                }
            }
            return link.faviconUrl;
        }

        if (!link.url) return '';
        try {
            const domain = new URL(link.url).hostname;
            return `https://www.google.com/s2/favicons?domain=${ domain }&sz=256`;
        } catch {
            return '';
        }
    };

    return (
        <div className="w-full max-w-[640px] grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-4 sm:gap-6 mb-16 px-4 justify-items-center">
            <AnimatePresence mode="popLayout">
                {links.map((link, index) => (
                    <motion.button
                        key={link.id}
                        initial={{ opacity: 0, y: 15, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ delay: 0.1 + (index * 0.05), duration: 0.5, type: "spring", stiffness: 200, damping: 20 }}
                        onClick={() => onNavigate(link.url)}
                        className="flex flex-col items-center gap-3 group cursor-pointer w-[72px] relative"
                    >
                        <div className="w-[56px] h-[56px] rounded-full bg-white border border-black/5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] group-hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] group-hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex items-center justify-center">
                            <img
                                src={getFaviconUrl(link)}
                                alt={link.title}
                                className="w-8 h-8 object-contain transition-transform duration-300"
                                loading="eager"
                                onError={(e) => {
                                    // Fallback if favicon fails to load
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>';
                                }}
                            />
                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </div>
                        <span className="text-[12px] font-medium text-[#4a4a4a] truncate w-full text-center group-hover:text-[#111] py-1 px-1.5 rounded-lg group-hover:bg-black/[0.03] transition-colors duration-300">
                            {link.title}
                        </span>

                        {/* Subtle remove button visible on hover */}
                        <button
                            onClick={(e) => handleRemoveShortcut(e, link.id)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-gray-50 text-gray-400 border border-gray-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all z-10 shadow-sm"
                            title="Remove Shortcut"
                        >
                            <X size={10} strokeWidth={2.5} />
                        </button>
                    </motion.button>
                ))}

                {/* Always append the 'Add Shortcut' button at the end */}
                <motion.button
                    key="add-shortcut-btn"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + (links.length * 0.05), duration: 0.5, type: "spring", stiffness: 200, damping: 20 }}
                    onClick={() => setIsAddShortcutOpen(true)}
                    className="flex flex-col items-center gap-3 group cursor-pointer w-[72px]"
                >
                    <div className="w-[56px] h-[56px] rounded-full bg-white border border-gray-100 border-dashed shadow-sm group-hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] group-hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex items-center justify-center">
                        <Plus size={22} strokeWidth={1.5} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                        <div className="absolute inset-0 bg-black/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </div>
                    <span className="text-[12px] font-medium text-gray-400 truncate w-full text-center group-hover:text-blue-600 py-1 px-1.5 rounded-lg group-hover:bg-blue-50/50 transition-colors duration-300">
                        Add Shortcut
                    </span>
                </motion.button>
            </AnimatePresence>

            {/* Custom Add Shortcut Dialog */}
            <AnimatePresence>
                {isAddShortcutOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setIsAddShortcutOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden p-6 border border-gray-100"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setIsAddShortcutOpen(false)}
                                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={18} />
                            </button>

                            <h3 className="text-xl font-semibold text-gray-800 mb-1">Add Shortcut</h3>
                            <p className="text-sm text-gray-500 mb-5">Pin your favorite website for quick access.</p>

                            <form onSubmit={handleAddShortcutSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. EterX Studio"
                                        value={newShortcutTitle}
                                        onChange={(e) => setNewShortcutTitle(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm text-gray-800 placeholder-gray-400"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">URL</label>
                                    <input
                                        type="text"
                                        placeholder="https://example.com"
                                        value={newShortcutUrl}
                                        onChange={(e) => setNewShortcutUrl(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm text-gray-800 placeholder-gray-400"
                                        required
                                    />
                                </div>
                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddShortcutOpen(false)}
                                        className="flex-1 py-3 px-4 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!newShortcutUrl.trim()}
                                        className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors text-sm shadow-sm"
                                    >
                                        Add shortcut
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
