import React, { useState } from 'react';
import { Shield, Check, X, MapPin, Mic, Video, Bell, Globe, MousePointer, ExternalLink, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PermissionPromptProps {
    origin: string;
    permission: string;
    onAllow: (persist: boolean) => void;
    onBlock: (persist: boolean) => void;
    onClose: () => void;
}

const getPermissionIcon = (permission: string) => {
    switch (permission) {
        case 'geolocation': return MapPin;
        case 'media': return Video;
        case 'camera': return Video;
        case 'microphone': return Mic;
        case 'notifications': return Bell;
        case 'midi': return Globe;
        case 'pointerLock': return MousePointer;
        case 'openExternal': return ExternalLink;
        default: return Shield;
    }
};

const getPermissionLabel = (permission: string) => {
    switch (permission) {
        case 'geolocation': return 'Know your location';
        case 'media': return 'Use your camera & microphone';
        case 'camera': return 'Use your camera';
        case 'microphone': return 'Use your microphone';
        case 'notifications': return 'Show notifications';
        case 'midi': return 'Access MIDI devices';
        case 'pointerLock': return 'Hide your cursor';
        case 'openExternal': return 'Open external app';
        default: return `Access ${permission}`;
    }
};

export const PermissionPrompt: React.FC<PermissionPromptProps> = ({
    origin,
    permission,
    onAllow,
    onBlock,
    onClose
}) => {
    const [remember, setRemember] = useState(true);
    const Icon = getPermissionIcon(permission);
    const label = getPermissionLabel(permission);

    // Parse domain
    let domain = origin;
    try {
        domain = new URL(origin).hostname;
    } catch (e) { }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9, rotateX: 10 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="absolute top-[52px] left-4 z-[200] w-[22rem] bg-[var(--bg-glass-panel)] backdrop-blur-xl rounded-2xl shadow-2xl border border-[var(--border-glass)] overflow-hidden font-sans"
            >
                {/* Decorative Shine */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500" />

                {/* Header Bubble Arrow */}
                <div className="absolute -top-2 left-8 w-4 h-4 bg-white transform rotate-45 border-l border-t border-white/40" />

                <div className="relative p-5">
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X size={16} />
                    </button>

                    <div className="flex flex-col items-center text-center gap-4 pt-1">
                        <div className="relative">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring" }}
                                className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner"
                            >
                                <Icon size={28} strokeWidth={1.5} />
                            </motion.div>
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                <Shield size={14} className="text-gray-400" />
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-[var(--text-primary)] text-base mb-1">
                                {domain} <span className="font-normal text-[var(--text-secondary)]">wants to</span>
                            </h3>
                            <p className="text-[var(--text-primary)] text-sm font-medium bg-[var(--accent)]/10 text-[var(--accent)] px-3 py-1 rounded-full inline-block border border-[var(--accent)]/20">
                                {label}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 flex items-center justify-center gap-2 mb-5">
                        <label className="flex items-center gap-2.5 text-xs font-medium text-gray-600 cursor-pointer select-none group">
                            <div className={`
                                w-4 h-4 rounded border transition-colors flex items-center justify-center
                                ${remember ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300 group-hover:border-gray-400'}
                            `}>
                                {remember && <Check size={10} className="text-white" />}
                            </div>
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                                className="hidden"
                            />
                            Remember my decision
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => onBlock(remember)}
                            className="px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors hover:shadow-sm"
                        >
                            Block
                        </button>
                        <button
                            onClick={() => onAllow(remember)}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all active:scale-95 shadow-md shadow-indigo-200"
                        >
                            Allow Access
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
