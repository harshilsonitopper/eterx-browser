import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Sparkles, Plus, Globe, ChevronDown, ChevronUp, ArrowUp, Bot,
    ArrowLeft, StopCircle, Search, Eye, MousePointer, Brain, Check,
    AlertCircle, X, Zap
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { StorageService } from '../services/StorageService';
import { AgentInfo } from '../services/AgentManager';

interface UniversalAIProps {
    isOpen: boolean;
    onClose: () => void;
    onSendMessage: (message: string, context?: string) => Promise<string>;
    onExecuteAction?: (type: string, target: string) => void;
    activeTabUrl?: string;
    isAgentRunning?: boolean;
    agentStatus?: string;
    agentStatusMessage?: string;
    onStartAgent?: (goal: string) => void;
    onStopAgent?: () => void;
    onStartLive?: () => void;
    incomingMessage?: { id: string; role: 'user' | 'assistant'; content: string } | null;
    agentLogs?: Array<{ id: string; type: string; title: string; status: string; data?: any; timestamp: number }>;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date | string;
}

export const UniversalAI: React.FC<UniversalAIProps> = ({
    isOpen,
    onClose,
    onSendMessage,
    onStartLive,
    isAgentRunning = false,
    onStopAgent,
    incomingMessage,
    agentLogs = []
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Welcome
    useEffect(() => {
        const history = StorageService.loadAIHistory();
        if (history.length > 0) {
            setMessages(history);
        } else {
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: "Hi. I'm Comet. I can browse the web, research topics, and help you get things done.",
                timestamp: new Date()
            }]);
        }
    }, []);

    // Save history
    useEffect(() => {
        if (messages.length > 0) StorageService.saveAIHistory(messages);
    }, [messages]);

    // Handle Incoming Messages
    useEffect(() => {
        if (incomingMessage) {
            setMessages(prev => {
                if (prev.some(m => m.id === incomingMessage.id)) return prev;
                return [...prev, { ...incomingMessage, timestamp: new Date() }];
            });
        }
    }, [incomingMessage]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, agentLogs, isAgentRunning]);

    const handleSend = async () => {
        if (!input.trim() || isAgentRunning) return;
        const text = input;
        setInput('');

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date()
        }]);

        await onSendMessage(text);
    };

    // Render Logic for Steps
    const renderStepIcon = (type: string) => {
        switch (type) {
            case 'search': return <Search size={14} className="text-blue-500" />;
            case 'reading': return <Eye size={14} className="text-green-500" />;
            case 'action': return <MousePointer size={14} className="text-orange-500" />;
            case 'thought': return <Brain size={14} className="text-purple-500" />;
            case 'error': return <AlertCircle size={14} className="text-red-500" />;
            default: return <Sparkles size={14} className="text-gray-400" />;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="h-full flex flex-col bg-white border-l border-gray-100 shadow-xl w-full max-w-[450px]">
            {/* Header - Oracle Style */}
            <div className="h-14 flex items-center justify-between px-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 opacity-80">
                        {/* Abstract 'Comet' Icon */}
                        <svg viewBox="0 0 24 24" fill="none" className="text-black">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />
                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span className="font-sans text-[16px] font-semibold text-gray-900">Assistant</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onStartLive}
                        className="flex items-center gap-1.5 px-3 py-1 bg-black text-white rounded-full text-xs font-medium hover:bg-gray-800 transition-colors"
                    >
                        <Zap size={12} fill="currentColor" />
                        <span>Live</span>
                    </button>
                    <button title="New Chat" className="text-gray-400 hover:text-gray-600"><Plus size={18} /></button>
                    <button title="History" className="text-gray-400 hover:text-gray-600"><Bot size={18} /></button>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors ml-2">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Sub-Header Tabs (Oracle Style) */}
            <div className="px-6 py-2 border-b border-gray-100 flex gap-6 text-[13px] font-medium text-gray-500">
                <span className="text-black border-b-2 border-black pb-2 cursor-pointer">Answer</span>
                <span className="hover:text-black cursor-pointer transition-colors">Sources</span>
                <span className="hover:text-black cursor-pointer transition-colors">Related</span>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-200 bg-[#FAFAFA]">
                {messages.map((msg, idx) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={msg.id}
                        className={`flex flex-col ${ msg.role === 'user' ? 'items-end' : 'items-start' }`}
                    >
                        <div className={`
                            max-w-[90%] rounded-2xl px-5 py-3 text-[15px] leading-relaxed
                            ${ msg.role === 'user'
                                ? 'bg-[#F3F4F6] text-gray-800 font-medium'
                                : 'bg-transparent text-gray-700 pl-0' }
                        `}>
                            {msg.role === 'user' ? (
                                msg.content
                            ) : (
                                <div className="prose prose-sm prose-slate max-w-none">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}

                {/* Steps / Thinking Process */}
                <AnimatePresence>
                    {isAgentRunning && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col pl-4 border-l-2 border-gray-100 ml-2 space-y-4 py-2"
                        >
                            {/* Live Steps */}
                            {agentLogs.map((log) => (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-start gap-3 group"
                                >
                                    <div className="mt-1 flex-shrink-0 bg-white ring-4 ring-white">
                                        {renderStepIcon(log.type)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-700">{log.title}</span>
                                        {log.data && typeof log.data === 'string' && ( // Only show string data snippets
                                            <span className="text-xs text-gray-400 mt-0.5 line-clamp-2">{log.data}</span>
                                        )}
                                        {log.data?.url && ( // Helper for search/reading logs
                                            <span className="text-xs text-blue-500 mt-0.5 line-clamp-1">{log.data.url}</span>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {/* Thinking Pulse */}
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse ml-0.5" />
                                <span className="text-sm text-gray-400 font-medium animate-pulse">Thinking...</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="px-6 pb-6 pt-2 bg-gradient-to-t from-white via-white to-transparent">
                <div className="relative group shadow-sm hover:shadow-md transition-shadow duration-300 rounded-[24px] bg-white border border-gray-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                        placeholder="Ask anything..."
                        className="w-full bg-transparent border-none outline-none px-5 py-3 text-[16px] text-gray-800 placeholder-gray-400 resize-none min-h-[52px] max-h-[120px]"
                        rows={1}
                        disabled={isAgentRunning}
                    />

                    <div className="flex items-center justify-between px-3 pb-2">
                        <div className="flex items-center gap-1">
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="Attach">
                                <Plus size={18} />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="Browse">
                                <Globe size={18} />
                            </button>
                        </div>

                        {(isAgentRunning) ? (
                            <button
                                onClick={onStopAgent}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                                <StopCircle size={18} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 
                                    ${ input.trim() ? 'bg-black text-white' : 'bg-gray-100 text-gray-300' }`}
                            >
                                <ArrowUp size={18} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-3 flex justify-center items-center gap-2">
                    <span className="text-[11px] text-gray-400 font-medium">Powered by Gemini 2.0</span>
                </div>
            </div>
        </div>
    );
};
