import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MousePointer2, StopCircle } from 'lucide-react';

interface AgentStatusPillProps {
    status: string;
    isWorking: boolean;
    onStop: () => void;
    onTakeControl: () => void;
}

export const AgentStatusPill: React.FC<AgentStatusPillProps> = ({ status, isWorking, onStop, onTakeControl }) => {
    return (
        <AnimatePresence>
            {isWorking && (
                <motion.div
                    initial={{ y: 50, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 50, opacity: 0, scale: 0.9 }}
                    className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[9999] flex items-center gap-3 bg-black text-white px-4 py-2 rounded-full shadow-2xl border border-white/10"
                >
                    {/* Status Icon/Spinner */}
                    <div className="relative w-5 h-5 flex items-center justify-center">
                        <div className="absolute inset-0 border-2 border-white/20 rounded-full"></div>
                        <div className="absolute inset-0 border-2 border-t-white rounded-full animate-spin"></div>
                        <img src="/favicon.ico" className="w-3 h-3 absolute" alt="" />
                    </div>

                    {/* Status Text */}
                    <span className="text-sm font-medium tracking-wide pr-2">
                        {status || "Fulfilling request..."}
                    </span>

                    {/* Divider */}
                    <div className="w-px h-4 bg-white/20 mx-1"></div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onTakeControl}
                            className="bg-white/10 hover:bg-white/20 text-xs font-medium px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
                        >
                            <MousePointer2 size={12} />
                            Take control
                        </button>

                        <button
                            onClick={onStop}
                            className="bg-red-500/20 hover:bg-red-500/40 text-red-200 text-xs font-medium px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 border border-red-500/50"
                        >
                            <StopCircle size={12} />
                            Stop
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
