
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, Terminal, AlertTriangle, CheckCircle, Search, MousePointer2 } from 'lucide-react';
import { AgentManager, AgentActionLog, AgentState } from '../services/AgentManager';

interface AgentConsoleProps {
    tabId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const AgentConsole: React.FC<AgentConsoleProps> = ({ tabId, isOpen, onClose }) => {
    const [state, setState] = useState<AgentState>(AgentManager.getState(tabId));
    const [logs, setLogs] = useState<AgentActionLog[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const update = () => {
            const info = AgentManager.getAgentState(tabId);
            setState({
                status: info.status,
                message: info.message,
                isRunning: info.isRunning,
                streamingText: info.streamingText
            });
            if (info.logs) setLogs([...info.logs]);
        };

        update(); // Initial
        const unsubscribe = AgentManager.subscribe((id, s) => {
            if (id === tabId) update();
        });

        const interval = setInterval(update, 500); // Poll for logs since logs aren't in notify payload yet explicitly

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, [tabId]);

    useEffect(() => {
        if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [logs, state.message]);

    if (!isOpen) return null;

    const getIcon = (type: string) => {
        switch (type) {
            case 'navigate': return <Search size={14} className="text-blue-400" />;
            case 'click': return <MousePointer2 size={14} className="text-purple-400" />;
            case 'wait': return <Clock size={14} className="text-yellow-400" />;
            case 'error': return <AlertTriangle size={14} className="text-red-400" />;
            case 'complete': return <CheckCircle size={14} className="text-green-400" />;
            default: return <Terminal size={14} className="text-gray-400" />;
        }
    };

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 240, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full bg-slate-900 border-t border-slate-700 font-mono text-sm overflow-hidden flex flex-col"
        >
            {/* Header */}
            <div className="h-8 flex items-center justify-between px-4 bg-slate-800 border-b border-slate-700 select-none">
                <div className="flex items-center gap-2">
                    <Activity size={14} className="text-blue-400 animate-pulse" />
                    <span className="text-slate-200 font-semibold">Agent Console</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${state.isRunning ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-600/30 text-slate-400'}`}>
                        {state.status}
                    </span>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    ×
                </button>
            </div>

            {/* Logs Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {logs.length === 0 && !state.message && (
                    <div className="text-slate-500 italic text-center py-4">Ready for instructions...</div>
                )}

                {logs.map((log) => (
                    <div key={log.id} className="flex gap-3 text-slate-300">
                        <span className="text-slate-500 text-[10px] w-12 pt-0.5">
                            {new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}
                        </span>
                        <div className="pt-0.5">{getIcon(log.type)}</div>
                        <div className="flex-1">
                            <div className="text-xs font-semibold">{log.type.toUpperCase()}</div>
                            <div className="opacity-90 leading-relaxed">{log.description}</div>
                            {log.result && (
                                <div className="mt-1 p-1 bg-slate-800/50 rounded border border-slate-700/50 text-slate-400 text-xs">
                                    {log.result}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Current Action / Streaming */}
                {state.isRunning && (
                    <div className="flex gap-3 text-blue-300 animate-pulse">
                        <span className="text-slate-500 text-[10px] w-12">...</span>
                        <Activity size={14} />
                        <div>
                            {state.message}
                            {state.streamingText && (
                                <div className="mt-1 text-slate-400 border-l-2 border-slate-600 pl-2">
                                    {state.streamingText.slice(-100)}...
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>
        </motion.div>
    );
};
