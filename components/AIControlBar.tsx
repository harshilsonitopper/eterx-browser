
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FluidOrb } from './FluidOrb';
import { Square, Mic, MicOff, Volume2, Zap, RefreshCw } from 'lucide-react';
import { GeminiLiveService, GeminiLiveStatus } from '../services/GeminiLiveService';
import { SoundService } from '../services/SoundService';

interface AIControlBarProps {
    onClose: () => void;
    isMuted?: boolean;
    onToggleMute?: () => void;
    onSpeechResult?: (text: string) => void;
}

export const AIControlBar: React.FC<AIControlBarProps> = ({ onClose, isMuted = false, onToggleMute, onSpeechResult }) => {
    const [isHoveringStop, setIsHoveringStop] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [status, setStatus] = useState<GeminiLiveStatus>('disconnected');
    const [internalMuted, setInternalMuted] = useState(isMuted);

    useEffect(() => {
        // 1. Play Activation Sound
        SoundService.playActivation();

        // 2. Bind Service Callbacks (Multiple Listeners)
        const updateLevel = (level: number) => setAudioLevel(level);
        const updateStatus = (s: GeminiLiveStatus) => {
            setStatus(s);
            console.log(`[AIControlBar] Status: ${s}`);
        };
        const handleError = (err: string) => console.error('[AIControlBar] Error:', err);
        const handleTranscription = (text: string) => {
            console.log(`[AIControlBar] Transcription: ${text}`);
            if (onSpeechResult) onSpeechResult(text);
        };

        GeminiLiveService.addAudioLevelListener(updateLevel);
        GeminiLiveService.addStatusListener(updateStatus);
        GeminiLiveService.addErrorListener(handleError);
        GeminiLiveService.addInputTranscriptionListener(handleTranscription);

        // 3. Connect (Now Symmetrical)
        GeminiLiveService.connect();

        return () => {
            GeminiLiveService.removeAudioLevelListener(updateLevel);
            GeminiLiveService.removeStatusListener(updateStatus);
            GeminiLiveService.removeErrorListener(handleError);
            GeminiLiveService.removeInputTranscriptionListener(handleTranscription);
            GeminiLiveService.disconnect();
        };
    }, []);

    const handleStop = () => {
        SoundService.playDeactivation();
        GeminiLiveService.disconnect();
        onClose();
    };

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragConstraints={{ left: -window.innerWidth / 2, right: window.innerWidth / 2, top: -window.innerHeight, bottom: 50 }}
            initial={{ y: 150, opacity: 0, x: "-50%" }}
            animate={{
                y: 0,
                opacity: 1,
                boxShadow: (status === 'speaking' || status === 'listening')
                    ? `0 20px 40px -10px rgba(59, 130, 246, ${0.4 + audioLevel * 0.4})`
                    : "0 15px 35px -10px rgba(0,0,0,0.25)"
            }}
            exit={{ y: 150, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-10 left-1/2 z-[100] flex items-center justify-center cursor-grab active:cursor-grabbing select-none rounded-[9999px]"
            style={{
                touchAction: 'none',
                clipPath: 'inset(0 round 9999px)', // 🛡️ Level 1: Outer Clipping
                WebkitClipPath: 'inset(0 round 9999px)'
            }}
        >
            {/* 💎 THE LIQUID CRYSTAL CORE - ZERO CORNER ARCHITECTURE */}
            <div
                className="relative flex items-center h-[54px] w-[235px] px-3 rounded-[9999px] bg-gradient-to-tl from-white/30 via-white/80 to-white/95 backdrop-blur-[140px] saturate-[250%] border-[2px] border-white shadow-[inset_0_1px_2px_rgba(255,255,255,1),inset_0_-1px_1px_rgba(0,0,0,0.1),0_8px_20px_-5px_rgba(0,0,0,0.2)] pointer-events-auto group overflow-hidden"
                style={{
                    clipPath: 'inset(0 round 9999px)', // 🛡️ Level 2: Body Clipping
                    WebkitClipPath: 'inset(0 round 9999px)'
                }}
            >

                {/* 🌈 Sub-Surface Scattering Glow */}
                <motion.div
                    animate={{
                        opacity: (status === 'speaking' || status === 'listening') ? [0.2, 0.5 * (1 + audioLevel), 0.2] : 0,
                    }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="absolute inset-0 bg-[radial-gradient(circle_at_25%_50%,rgba(59,130,246,0.5)_0%,transparent_70%)] pointer-events-none"
                />

                {/* ✨ Physical Glass "Shine" Layer (Glaze) */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/20 to-transparent" />

                {/* 🌟 Refracting Aurora Beam */}
                <div className="absolute inset-0 pointer-events-none">
                    <motion.div
                        animate={{
                            x: ["-150%", "150%"],
                            opacity: [0.1, 0.6, 0.1]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="w-[120px] h-full bg-gradient-to-r from-transparent via-white to-transparent blur-[10px]"
                    />
                </div>

                {/* --- PROFESSIONAL LAYOUT: ULTRA-SOLID ELEMENTS --- */}
                <div className="relative flex items-center w-full gap-2.5">

                    {/* 🎙️ Solid Ceramic Mic Module */}
                    <div className="flex items-center gap-2 pl-0.5">
                        <motion.div
                            whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 255, 255, 1)", boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)" }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                const newMuted = GeminiLiveService.toggleMuted();
                                setInternalMuted(newMuted);
                            }}
                            className={`flex items-center justify-center w-[40px] h-[32px] rounded-[9999px] bg-white/95 backdrop-blur-3xl border border-white/40 transition-all cursor-pointer shadow-md ${internalMuted ? 'text-red-600' : 'text-blue-600'}`}
                        >
                            {internalMuted ? <MicOff size={16} strokeWidth={3} /> : <Mic size={16} strokeWidth={3} />}
                        </motion.div>

                        {/* Fluid Core Orb */}
                        <div className="relative flex items-center justify-center w-14 h-14 pointer-events-none">
                            <FluidOrb audioLevel={audioLevel} status={status} />

                            <motion.div
                                animate={{
                                    opacity: (status === 'speaking' || status === 'listening') ? [0.3, 0.6, 0.3] : 0.2,
                                }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="absolute inset-0 bg-blue-400/40 blur-[32px] rounded-full -z-10"
                            />
                        </div>
                    </div>

                    <div className="flex-1" />

                    {/* ⚙️ Solid Interaction Module */}
                    <div className="flex items-center gap-2 pr-0.5">
                        {/* Status Beacon (Ceramic Shell) */}
                        <div className="flex items-center justify-center w-7 h-7 rounded-[9999px] bg-white/95 border border-white/40 shadow-sm">
                            <motion.div
                                animate={{
                                    opacity: (status === 'connected' || status === 'listening' || status === 'speaking') ? [0.6, 1, 0.6] : 1,
                                    scale: (status === 'connected' || status === 'listening' || status === 'speaking') ? [1, 1.3, 1] : 1,
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className={`w-2.5 h-2.5 rounded-full ${status === 'error' ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-cyan-500 shadow-[0_0_12px_#22d3ee]'}`}
                            />
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 0, 0, 0.2)", boxShadow: "0 0 20px rgba(239, 68, 68, 0.5)" }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleStop}
                            className="flex items-center justify-center w-[40px] h-[32px] rounded-[9999px] bg-white/95 backdrop-blur-3xl border border-white/40 transition-all text-gray-900 hover:text-red-600 shadow-md"
                        >
                            <Square size={14} strokeWidth={3} className="fill-current" />
                        </motion.button>
                    </div>

                </div>
            </div>
        </motion.div>
    );
};
