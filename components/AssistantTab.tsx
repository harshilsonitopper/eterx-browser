import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mic, Send, Square, ExternalLink, MoreHorizontal, Loader2, Zap, Video } from 'lucide-react';

interface AssistantTabProps {
    onStartAgent: (goal: string) => void;
    onNavigate: (url: string) => void;
    isAgentRunning: boolean;
    agentStatus: string;
    onStopAgent: () => void;
    currentTabTitle?: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    status?: string;
    isWorking?: boolean;
}

// EterX Logo SVG
const EterXLogo = () => (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4fd1c5" />
                <stop offset="100%" stopColor="#38a89d" />
            </linearGradient>
        </defs>
        <path
            d="M36 8C20.536 8 8 20.536 8 36s12.536 28 28 28c5.5 0 10.6-1.6 14.9-4.3"
            stroke="url(#logoGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
        />
        <path
            d="M36 18C26.059 18 18 26.059 18 36s8.059 18 18 18"
            stroke="url(#logoGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
        />
        <circle cx="52" cy="20" r="3" fill="#4fd1c5" />
    </svg>
);

export const AssistantTab: React.FC<AssistantTabProps> = ({
    onStartAgent,
    onNavigate,
    isAgentRunning,
    agentStatus,
    onStopAgent,
    currentTabTitle = 'New Tab'
}) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isListening, setIsListening] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, agentStatus]);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = '24px';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
        }
    }, [input]);

    // Update working status
    useEffect(() => {
        if (isAgentRunning && agentStatus) {
            setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg?.isWorking) {
                    lastMsg.status = agentStatus;
                }
                return updated;
            });
        }
    }, [agentStatus, isAgentRunning]);

    const handleSubmit = () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim()
        };

        const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Working...',
            status: 'Starting task...',
            isWorking: true
        };

        setMessages(prev => [...prev, userMessage, assistantMessage]);
        onStartAgent(input.trim());
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleVoice = () => {
        setIsListening(!isListening);
        // Voice recognition would go here
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#1a1a1d] text-white">
            {/* Header */}
            <div className="flex items-center justify-end p-3 gap-2">
                <button className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
                    <ExternalLink size={18} />
                </button>
                <button className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
                    <MoreHorizontal size={18} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
                {messages.length === 0 ? (
                    // Empty State - Centered Logo
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center"
                    >
                        <motion.div
                            animate={{
                                opacity: [0.5, 0.8, 0.5],
                            }}
                            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                        >
                            <EterXLogo />
                        </motion.div>
                        <h1 className="text-2xl font-medium text-white/60 mt-4">Assistant</h1>
                    </motion.div>
                ) : (
                    // Messages
                    <div className="w-full max-w-xl space-y-4 py-6">
                        <AnimatePresence>
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`${msg.role === 'user' ? 'flex justify-end' : ''}`}
                                >
                                    {msg.role === 'user' ? (
                                        <div className="bg-[#2a2a2e] rounded-2xl px-4 py-3 max-w-[85%]">
                                            <p className="text-[15px] text-white/90">{msg.content}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {msg.isWorking && (
                                                <>
                                                    <div className="flex items-center gap-2 text-white/70">
                                                        <motion.div
                                                            animate={msg.status?.includes('Fast') ? { scale: [1, 1.2, 1] } : { rotate: 360 }}
                                                            transition={{ repeat: Infinity, duration: msg.status?.includes('Fast') ? 0.5 : 2, ease: 'linear' }}
                                                        >
                                                            {msg.status?.includes('Fast') || msg.status?.includes('Research') ? (
                                                                <Zap size={16} className="text-amber-400 fill-amber-400" />
                                                            ) : msg.status?.includes('Video') ? (
                                                                <Video size={16} className="text-red-400" />
                                                            ) : (
                                                                <Loader2 size={16} />
                                                            )}
                                                        </motion.div>
                                                        <span className="text-sm font-medium">
                                                            {msg.status?.includes('Fast') ? 'Speed Mode' : 'Working...'}
                                                        </span>
                                                    </div>
                                                    {msg.status && (
                                                        <div className="flex items-start gap-2 text-white/50 ml-1">
                                                            <motion.div
                                                                animate={{ opacity: [0.3, 1, 0.3] }}
                                                                transition={{ repeat: Infinity, duration: 1.5 }}
                                                                className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${msg.status.includes('Fast') ? 'bg-amber-400' :
                                                                        msg.status.includes('Video') ? 'bg-red-400' : 'bg-cyan-400'
                                                                    }`}
                                                            />
                                                            <p className="text-sm leading-relaxed">{msg.status}</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            {!msg.isWorking && (
                                                <p className="text-[15px] text-white/70">{msg.content}</p>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="px-4 pb-4 pt-2">
                <div className="max-w-xl mx-auto">
                    {/* Context Chip */}
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2a2a2e]">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 4C7.582 4 4 7.582 4 12s3.582 8 8 8c2 0 3.85-.6 5.4-1.6" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                                    <circle cx="18" cy="6" r="2" fill="white" />
                                </svg>
                            </div>
                            <span className="text-sm text-white/60">{currentTabTitle}</span>
                        </div>
                    </div>

                    {/* Input Box */}
                    <div className="relative bg-[#2a2a2e] rounded-2xl border border-white/5 focus-within:border-cyan-500/30 transition-colors">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask anything..."
                            rows={1}
                            className="w-full bg-transparent border-none outline-none text-[15px] text-white placeholder-white/30 px-4 py-3 pr-32 resize-none min-h-[48px] max-h-[120px]"
                        />

                        <div className="absolute bottom-2 right-2 flex items-center gap-1">
                            <button
                                className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                                title="Add attachment"
                            >
                                <Plus size={20} />
                            </button>
                            {!isAgentRunning ? (
                                <>
                                    <button
                                        onClick={handleVoice}
                                        className={`p-2 rounded-lg transition-colors ${isListening
                                            ? 'text-cyan-400 bg-cyan-500/10'
                                            : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                                            }`}
                                        title="Voice input"
                                    >
                                        <Mic size={20} />
                                    </button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleSubmit}
                                        disabled={!input.trim()}
                                        className={`p-2.5 rounded-xl transition-all ${input.trim()
                                            ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                                            : 'bg-cyan-500/20 text-cyan-300/50'
                                            }`}
                                        title="Send"
                                    >
                                        {input.trim() ? (
                                            <Send size={18} />
                                        ) : (
                                            <div className="flex gap-0.5">
                                                <div className="w-1 h-4 bg-current rounded-full" />
                                                <div className="w-1 h-4 bg-current rounded-full" />
                                                <div className="w-1 h-4 bg-current rounded-full" />
                                            </div>
                                        )}
                                    </motion.button>
                                </>
                            ) : (
                                /* When agent is running, just show a disabled state - stop is in overlay */
                                <div className="p-2.5 rounded-xl bg-[#3a3a3e]/50 text-white/40">
                                    <Loader2 size={16} className="animate-spin" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
