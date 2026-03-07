import React from 'react';
import { AgentActionLog } from '../services/AgentManager';
import { Check, Loader2, X, AlertTriangle, Play, ChevronRight, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    log: AgentActionLog;
}

export const AgentActionLogItem: React.FC<Props> = ({ log }) => {
    const isThinking = log.type === 'thought';

    // Thought Card (Collapsible style)
    if (isThinking) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg text-sm"
            >
                <div className="flex items-center gap-2 text-indigo-600 font-medium mb-1">
                    <MessageSquare size={14} />
                    <span>{log.title}</span>
                </div>
                <div className="text-gray-700 leading-relaxed font-mono text-xs opacity-90">
                    {log.data}
                </div>
            </motion.div>
        );
    }

    // Action Card
    return (
        <motion.div
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-2 flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md group"
        >
            {/* Status Icon */}
            <div className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 border border-gray-200">
                {log.status === 'running' && <Loader2 size={12} className="animate-spin text-blue-600" />}
                {log.status === 'completed' && <Check size={12} className="text-green-600" />}
                {log.status === 'failed' && <X size={12} className="text-red-500" />}
                {log.status === 'pending' && <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                {log.status === 'waiting_confirmation' && <AlertTriangle size={12} className="text-orange-500" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                    {log.title}
                </div>
                {log.data?.selector && (
                    <div className="text-[10px] text-gray-500 font-mono truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {log.data.selector}
                    </div>
                )}
            </div>

            {/* Time */}
            <div className="text-[10px] text-gray-400 tabular-nums">
                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
        </motion.div>
    );
};
