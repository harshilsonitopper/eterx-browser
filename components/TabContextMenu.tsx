import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, Copy, ArrowRight, ArrowLeft, Maximize, ExternalLink, Columns } from 'lucide-react';

interface TabContextMenuProps {
    x: number;
    y: number;
    tabId: string;
    onClose: () => void;
    onAction: (action: string, tabId: string) => void;
}

export const TabContextMenu: React.FC<TabContextMenuProps> = ({ x, y, tabId, onClose, onAction }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Prevent default context menu on this menu
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const navItems = [
        { type: 'header', label: 'Tab Actions' },
        { id: 'pin', label: 'Pin / Unpin Tab', icon: RefreshCw },
        { id: 'mute', label: 'Mute / Unmute Tab', icon: RefreshCw },
        { id: 'duplicate', label: 'Duplicate Tab', icon: Copy },
        { id: 'reload', label: 'Reload', icon: RefreshCw },
        { type: 'divider' },
        { type: 'header', label: 'Layout' },
        { id: 'split-view', label: 'Open in Split View', icon: Columns },
        { id: 'float-tab', label: 'Float as Window', icon: Maximize },
        { id: 'add-to-group', label: 'Add to Group', icon: ExternalLink },
        { type: 'divider' },
        { type: 'header', label: 'Window' },
        { id: 'new-tab-right', label: 'New Tab to Right', icon: ArrowRight },
        { id: 'move-to-window', label: 'Move to New Window', icon: ExternalLink },
        { type: 'divider' },
        { type: 'header', label: 'Close' },
        { id: 'close', label: 'Close Tab', icon: X, danger: true },
        { id: 'close-others', label: 'Close Other Tabs', icon: X },
        { id: 'close-right', label: 'Close Tabs to Right', icon: ArrowRight },
    ];

    return (
        <AnimatePresence>
            <motion.div
                ref={menuRef}
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="fixed z-[9999] bg-white/90 backdrop-blur-xl border border-white/20 shadow-xl rounded-lg w-48 py-1 overflow-hidden ring-1 ring-black/5"
                style={{ top: y, left: x }}
                onContextMenu={handleContextMenu}
            >
                {navItems.map((item, index) => {
                    if (item.type === 'divider') {
                        return <div key={index} className="h-[1px] bg-gray-200 my-1 mx-2" />;
                    }
                    if (item.type === 'header') {
                        return <div key={index} className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</div>;
                    }
                    const Icon = item.icon!;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                onAction(item.id!, tabId);
                                onClose();
                            }}
                            className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-[13px] hover:bg-black/5 transition-colors ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}`}
                        >
                            <Icon size={14} className={item.danger ? 'text-red-500' : 'text-gray-500'} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </motion.div>
        </AnimatePresence>
    );
};
