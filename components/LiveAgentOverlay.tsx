import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GeminiLiveService, GeminiLiveStatus } from '../services/GeminiLiveService';
import { X, Zap, Square, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveAgentOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onCaptureScreen?: () => Promise<string>;
}

export const LiveAgentOverlay: React.FC<LiveAgentOverlayProps> = ({ isOpen, onClose, onCaptureScreen }) => {
    const [status, setStatus] = useState<GeminiLiveStatus>('disconnected');
    const [audioLevel, setAudioLevel] = useState(0);
    const [transcription, setTranscription] = useState<{ text: string, type: 'user' | 'ai' } | null>(null);
    const [isVisionEnabled, setIsVisionEnabled] = useState(true);
    const visionIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isConnectedRef = useRef(false);

    // ========== SESSION MANAGEMENT ==========
    const startSession = useCallback(async () => {
        try {
            console.log('[LiveAgent] Starting session...');

            const updateStatus = (s: GeminiLiveStatus) => {
                setStatus(s);
                isConnectedRef.current = s === 'connected' || s === 'listening' || s === 'speaking';
            };
            const updateLevel = (l: number) => setAudioLevel(l);
            const handleInput = (text: string) => setTranscription({ text, type: 'user' });
            const handleOutput = (text: string) => setTranscription({ text, type: 'ai' });

            GeminiLiveService.addStatusListener(updateStatus);
            GeminiLiveService.addAudioLevelListener(updateLevel);
            GeminiLiveService.addInputTranscriptionListener(handleInput);
            GeminiLiveService.addOutputTranscriptionListener(handleOutput);

            await GeminiLiveService.resume();
            await GeminiLiveService.connect();

            return () => {
                GeminiLiveService.removeStatusListener(updateStatus);
                GeminiLiveService.removeAudioLevelListener(updateLevel);
                GeminiLiveService.removeInputTranscriptionListener(handleInput);
                GeminiLiveService.removeOutputTranscriptionListener(handleOutput);
            };
        } catch (e: any) {
            console.error('[LiveAgent] Failed to start:', e);
            setStatus('disconnected');
        }
    }, []);

    const stopSession = useCallback(() => {
        GeminiLiveService.disconnect();
        setStatus('disconnected');
        isConnectedRef.current = false;
    }, []);

    // NOTE: Vision Loop is now handled natively in main.ts at 3 FPS for higher performance.
    // Renderer side capture is disabled to prevent IPC congestion.

    // ========== LIFECYCLE ==========
    useEffect(() => {
        if (isOpen) {
            startSession();
            return () => stopSession();
        }
    }, [isOpen, startSession, stopSession]);

    if (!isOpen) return null;

    // ========== UI ==========
    const isActive = status === 'listening' || status === 'speaking' || status === 'connected' || status === 'agentic';
    const orbColor = status === 'speaking'
        ? 'from-violet-500 to-fuchsia-500'
        : status === 'agentic'
            ? 'from-emerald-400 to-teal-500'
            : status === 'listening'
                ? 'from-cyan-400 to-blue-500'
                : 'from-gray-400 to-gray-500';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-black"
            >
                {/* Top Bar */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-6 z-50">
                    <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                        <span className="text-white/70 text-sm font-medium tracking-wide uppercase">
                            {status === 'speaking' ? 'Speaking' : status === 'listening' ? 'Listening' : status === 'agentic' ? 'Working on it...' : status}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Vision Toggle */}
                        <button
                            onClick={() => setIsVisionEnabled(!isVisionEnabled)}
                            className={`p-2.5 rounded-full transition-all ${isVisionEnabled ? 'bg-white/10 text-cyan-400' : 'bg-white/5 text-white/40'}`}
                            title={isVisionEnabled ? 'Vision ON' : 'Vision OFF'}
                        >
                            {isVisionEnabled ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                        <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all">
                            <X size={20} className="text-white" />
                        </button>
                    </div>
                </div>

                {/* Central Orb */}
                <div className="relative flex items-center justify-center">
                    {/* Glow */}
                    <motion.div
                        animate={{ scale: 1 + audioLevel * 0.8, opacity: 0.4 + audioLevel * 0.3 }}
                        className={`absolute w-48 h-48 rounded-full bg-gradient-to-br ${orbColor} blur-3xl`}
                    />
                    {/* Core */}
                    <motion.div
                        animate={{ scale: 1 + audioLevel * 0.3 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${orbColor} shadow-2xl flex items-center justify-center`}
                    >
                        <div className="w-24 h-24 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
                            {status === 'speaking' && <Zap size={36} className="text-white" />}
                            {status === 'listening' && (
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <motion.div
                                            key={i}
                                            animate={{ scaleY: 0.3 + Math.random() * audioLevel * 3 }}
                                            transition={{ duration: 0.1 }}
                                            className="w-1.5 bg-white rounded-full"
                                            style={{ height: 24 }}
                                        />
                                    ))}
                                </div>
                            )}
                            {status === 'agentic' && (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full"
                                />
                            )}
                            {!['speaking', 'listening', 'agentic'].includes(status) && (
                                <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Transcription */}
                <div className="absolute bottom-32 left-0 right-0 flex justify-center px-8">
                    <AnimatePresence mode="wait">
                        {transcription && (
                            <motion.div
                                key={transcription.text.slice(0, 20)}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`text-2xl md:text-3xl font-medium text-center max-w-2xl leading-relaxed ${transcription.type === 'user' ? 'text-white/60 italic' : 'text-white'
                                    }`}
                            >
                                "{transcription.text}"
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-8 flex items-center gap-4">
                    {status === 'speaking' && (
                        <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            onClick={() => GeminiLiveService.interrupt()}
                            className="p-4 bg-red-500/80 hover:bg-red-500 rounded-full text-white shadow-xl transition-all active:scale-95"
                        >
                            <Square size={20} fill="currentColor" />
                        </motion.button>
                    )}
                    <button
                        onClick={() => status === 'disconnected' ? startSession() : stopSession()}
                        className={`px-8 py-4 rounded-full font-semibold text-lg shadow-xl transition-all active:scale-95 ${status === 'disconnected'
                            ? 'bg-white text-black hover:bg-gray-100'
                            : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                            }`}
                    >
                        {status === 'disconnected' ? 'Start Live' : 'End Session'}
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
