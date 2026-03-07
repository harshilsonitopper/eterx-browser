/**
 * AgentVisualOverlay.tsx - Calm Agentic Browser Animation 🧠
 * 
 * Features:
 * - Corner blur clouds that breathe when agent is active
 * - Directional flow border (blue/cyan/white)
 * - Minimal floating indicator with Stop button
 * - Purpose: Communicate authority, intelligence, and trust
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentStatus, AgentMetadata } from '../services/AgentManager';
import { Loader2, Brain, MousePointer2, CheckCircle2, AlertCircle, Square, Zap, Video, ShieldCheck } from 'lucide-react';

interface AgentVisualOverlayProps {
    isActive: boolean;
    status: AgentStatus;
    statusMessage: string;
    currentURL?: string;
    metadata?: AgentMetadata;
    onStop?: () => void;
}

export const AgentVisualOverlay: React.FC<AgentVisualOverlayProps> = ({
    isActive,
    status,
    statusMessage,
    currentURL,
    metadata,
    onStop,
}) => {
    const [animState, setAnimState] = React.useState<'init' | 'active'>('init');

    // Handle Animation State Transition (Init -> Active after 3s)
    React.useEffect(() => {
        if (isActive) {
            setAnimState('init');
            const timer = setTimeout(() => {
                setAnimState('active');
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            setAnimState('init');
        }
    }, [isActive]);

    if (!isActive) return null;

    const getIcon = () => {
        // Metadata overrides
        if (metadata?.mode === 'video') return <Video className="w-4 h-4 text-red-500 fill-red-500/20" />;
        if (metadata?.mode === 'research') return <Brain className="w-4 h-4 text-purple-400" />;

        // Fallback to text matching
        if (statusMessage.includes('Fast Path')) {
            return <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />;
        }

        switch (status) {
            case 'thinking': return (
                <div className="flex gap-0.5 items-center h-4">
                    {[0, 1, 2].map(i => (
                        <motion.div
                            key={i}
                            className="w-1 h-1 bg-white rounded-full"
                            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                    ))}
                </div>
            );
            case 'analyzing': return <Brain className="w-4 h-4 text-cyan-400" />;
            case 'capturing': return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
            case 'executing': return <MousePointer2 className="w-4 h-4 text-blue-300" />;
            case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
            case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
            default: return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
        }
    };

    const getBorderClass = () => {
        if (metadata?.mode === 'fast') return 'agentic-border-container agentic-border-fast';
        if (statusMessage.includes('Fast Path')) return 'agentic-border-container agentic-border-fast';
        return animState === 'init'
            ? 'agentic-border-container agentic-border-init'
            : 'agentic-border-container agentic-border-active';
    };

    return (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-visible">

            {/* AGENTIC BORDER: Calm directional flow animation */}
            <div className={`absolute inset-0 ${getBorderClass()}`} />

            {/* CORNER BLUR CLOUDS: Breathing effect on all 4 corners */}
            <div className="absolute top-0 left-0 w-32 h-32 agentic-corner-cloud" />
            <div className="absolute top-0 right-0 w-32 h-32 agentic-corner-cloud" style={{ animationDelay: '0.5s' }} />
            <div className="absolute bottom-0 left-0 w-32 h-32 agentic-corner-cloud" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-0 right-0 w-32 h-32 agentic-corner-cloud" style={{ animationDelay: '1.5s' }} />

            {/* FLOATING CONTROL BAR with Stop Button */}
            <AnimatePresence>
                {status !== 'idle' && status !== 'completed' && (
                    <motion.div
                        key="control-bar"
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl shadow-black/30 pointer-events-auto"
                    >
                        {/* Pulse Dot */}
                        <div className="agentic-indicator-dot" />

                        {/* Status Info */}
                        <div className="flex flex-col min-w-[120px]">
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                {status.replace('_', ' ')}
                                {/* MODE BADGE */}
                                {metadata?.mode && (
                                    <span className={`px-1.5 py-0.5 rounded-[3px] text-[9px] font-bold uppercase tracking-tight ${metadata.mode === 'deep' ? 'bg-purple-500/20 text-purple-300' :
                                            metadata.mode === 'research' ? 'bg-indigo-500/20 text-indigo-300' :
                                                metadata.mode === 'video' ? 'bg-red-500/20 text-red-300' :
                                                    'bg-amber-500/20 text-amber-300'
                                        }`}>
                                        {metadata.mode}
                                    </span>
                                )}
                            </span>
                            <span className="text-sm font-medium text-white/90 truncate max-w-[250px]">
                                {statusMessage || 'Working...'}
                            </span>
                        </div>

                        {/* Confidence Badge (If available during processing, or just icon) */}
                        {metadata?.confidence && (
                            <div className={`p-1 px-2 rounded-lg flex items-center gap-1.5 border ${metadata.confidence === 'high' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                    metadata.confidence === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                                        'bg-red-500/10 border-red-500/30 text-red-400'
                                }`}>
                                <ShieldCheck size={10} strokeWidth={3} />
                                <span className="text-[10px] font-bold uppercase">{metadata.confidence}</span>
                            </div>
                        )}

                        {/* Icon */}
                        {!metadata?.confidence && (
                            <div className="p-1.5 bg-white/5 rounded-full">
                                {getIcon()}
                            </div>
                        )}

                        {/* Divider */}
                        <div className="w-px h-6 bg-white/10" />

                        {/* STOP BUTTON - Modern Design */}
                        <button
                            onClick={onStop}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-full text-red-400 hover:text-red-300 transition-all duration-200 group"
                        >
                            <Square size={14} fill="currentColor" className="group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">Stop</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AgentVisualOverlay;
