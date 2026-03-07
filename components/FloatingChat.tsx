import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, X, ChevronUp, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GeminiService } from '../services/GeminiService';

interface FloatingChatProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ChatMessage {
    id: string;
    query: string;
    answer: string;
    timestamp: number;
    isLoading?: boolean;
}

type ChatState = 'idle' | 'hover' | 'typing' | 'listening' | 'thinking' | 'responding';

export const FloatingChat: React.FC<FloatingChatProps> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [chatState, setChatState] = useState<ChatState>('idle');
    const [isHovered, setIsHovered] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input
    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
    }, [isOpen]);

    // Update chat state based on conditions
    useEffect(() => {
        if (isListening) setChatState('listening');
        else if (messages.some(m => m.isLoading)) setChatState('thinking');
        else if (input.length > 0) setChatState('typing');
        else if (isHovered) setChatState('hover');
        else setChatState('idle');
    }, [isListening, messages, input, isHovered]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const query = input.trim();
        setInput('');

        const msgId = Date.now().toString();
        setMessages(prev => [...prev, { id: msgId, query, answer: '', timestamp: Date.now(), isLoading: true }]);

        try {
            const response = await GeminiService.generateContent(query);
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, answer: response.text, isLoading: false } : m));
        } catch (error: any) {
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, answer: `Error: ${error.message}`, isLoading: false } : m));
        }
    };

    const startListening = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onerror = () => setIsListening(false);
            recognition.onresult = (e: any) => setInput(e.results[0][0].transcript);
            recognition.start();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    const latestMessage = messages[messages.length - 1];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 8 }}
                transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="fixed bottom-6 right-6 z-[9999]"
                style={{ width: 420 }}
            >
                {/* Main Container - Frosted Glass */}
                <div className={`
                    relative rounded-[24px] overflow-hidden
                    bg-white/95 backdrop-blur-xl
                    shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]
                    premium-border premium-border--${chatState}
                `}>

                    {/* Header - Minimal */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
                                <Bot size={14} className="text-white" />
                            </div>
                            <span className="text-sm font-medium text-gray-800 tracking-tight">EterX</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {messages.length > 1 && (
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    <ChevronUp size={14} className={`transition-transform ${isExpanded ? '' : 'rotate-180'}`} />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Response Area - Only Latest or Expanded */}
                    <AnimatePresence mode="wait">
                        {latestMessage && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className={`px-4 py-3 max-h-[300px] overflow-y-auto ${isExpanded ? 'space-y-4' : ''}`}>
                                    {(isExpanded ? messages : [latestMessage]).map((msg) => (
                                        <div key={msg.id} className="space-y-2">
                                            {/* User Query */}
                                            <div className="flex justify-end">
                                                <div className="px-3 py-2 rounded-2xl rounded-br-md bg-gray-100 text-sm text-gray-800 max-w-[85%]">
                                                    {msg.query}
                                                </div>
                                            </div>

                                            {/* AI Response */}
                                            <div className="flex justify-start">
                                                <div className="text-sm text-gray-700 max-w-[90%]">
                                                    {msg.isLoading ? (
                                                        <div className="flex items-center gap-2 text-gray-400">
                                                            <div className="thinking-shimmer w-4 h-4 rounded-full" />
                                                            <span className="text-xs">Thinking</span>
                                                        </div>
                                                    ) : (
                                                        <div className="prose prose-sm prose-gray max-w-none">
                                                            <ReactMarkdown>{msg.answer}</ReactMarkdown>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Input Bar - Small Pill */}
                    <div className="p-3">
                        <div className="flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2 border border-gray-100 transition-all focus-within:border-gray-200 focus-within:bg-white">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask anything..."
                                className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400"
                            />

                            {/* Mic Button - Organic Wave */}
                            <button
                                onClick={startListening}
                                className={`relative p-1.5 rounded-full transition-all ${isListening
                                    ? 'text-gray-800'
                                    : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {isListening && (
                                    <span className="absolute inset-0 mic-organic-wave" />
                                )}
                                <Mic size={16} />
                            </button>

                            {/* Send Button */}
                            <button
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className={`p-1.5 rounded-full transition-all ${input.trim()
                                    ? 'bg-gray-900 text-white'
                                    : 'text-gray-300'
                                    }`}
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
