import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, X, Trash2, Wifi, AlertCircle, CheckCircle, Mic, Terminal } from 'lucide-react';
import { DebugLogger, LogEntry } from '../services/DebugLogger';

export const StatusConsole: React.FC = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initial logs
        setLogs(DebugLogger.getLogs());

        // Subscribe to new logs
        const unsubscribe = DebugLogger.subscribe((entry) => {
            if (entry.id === 'clear') {
                setLogs([]);
            } else {
                setLogs(prev => [entry, ...prev].slice(0, 50));
            }
        });

        return unsubscribe;
    }, []);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/20 transition-all z-[9999] group"
                title="Open Debug Console"
            >
                <Terminal size={20} className="text-white/70 group-hover:text-white" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
            </button>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-4 right-4 w-96 max-h-80 flex flex-col rounded-2xl overflow-hidden z-[9999] font-sans"
            style={{
                background: 'rgba(20, 20, 25, 0.65)',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Activity size={16} className="text-indigo-400" />
                        <span className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full"></span>
                    </div>
                    <span className="text-xs font-semibold text-white/90 tracking-wide">SYSTEM STATUS</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => DebugLogger.clear()}
                        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        title="Clear Logs"
                    >
                        <Trash2 size={14} />
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        title="Minimize"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Logs Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                <AnimatePresence initial={false}>
                    {logs.length === 0 ? (
                        <div className="h-24 flex flex-col items-center justify-center text-white/20 text-xs">
                            <span className="mb-1">Systems Normal</span>
                            <span>Waiting for events...</span>
                        </div>
                    ) : (
                        logs.map((log) => (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`flex items-start gap-2 p-2 rounded-lg text-xs leading-relaxed ${log.type === 'error' ? 'bg-red-500/10 border border-red-500/20' :
                                        log.type === 'success' ? 'bg-green-500/10 border border-green-500/20' :
                                            log.type === 'warn' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                                                'hover:bg-white/5'
                                    }`}
                            >
                                <div className="mt-0.5 flex-shrink-0">
                                    {log.type === 'error' && <AlertCircle size={14} className="text-red-400" />}
                                    {log.type === 'success' && <CheckCircle size={14} className="text-green-400" />}
                                    {log.type === 'warn' && <AlertCircle size={14} className="text-yellow-400" />}
                                    {log.type === 'info' && <div className="w-3 h-3 rounded-full border-2 border-blue-400/30 mt-0.5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`font-bold text-[10px] uppercase tracking-wider ${log.type === 'error' ? 'text-red-400' :
                                                log.type === 'success' ? 'text-green-400' :
                                                    'text-indigo-300'
                                            }`}>
                                            {log.source || 'SYS'}
                                        </span>
                                        <span className="text-[10px] text-white/30">
                                            {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className={`break-words ${log.type === 'error' ? 'text-red-100' : 'text-white/80'}`}>
                                        {log.message}
                                    </p>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
                <div ref={logsEndRef} />
            </div>

            {/* Live Indicator Strip */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50"></div>
        </motion.div>
    );
};
