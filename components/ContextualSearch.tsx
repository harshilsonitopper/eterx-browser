import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Sparkles, Send, X, Mic, Volume2, VolumeX, Copy, Check, GripVertical, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GeminiService } from '../services/GeminiService';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface ContextualSearchProps {
    isOpen: boolean;
    x: number;
    y: number;
    onClose: () => void;
    onSearch?: (query: string) => Promise<string>;
    useDeepThinking?: boolean;
}

type SearchState = 'idle' | 'typing' | 'listening' | 'thinking' | 'responding';

// EterX System Prompt
const ETERX_PROMPT = `You are **EterX**, a smart AI assistant in EterX Browser.

**WHAT YOU CAN DO:**
• **Summarize** - Condense websites, articles, videos
• **Navigate** - Explain buttons, links, how to use pages
• **Learn** - Break down complex topics simply
• **Extract** - Pull data, prices, names from screens
• **Compare** - Help compare options shown
• **Assist** - Guide through forms, signups, checkouts
• **Code** - Explain code, debug, write snippets
• **Research** - Find information, answer questions

**YOUR RULES:**
1. Keep answers SHORT (2-5 sentences unless asked for more)
2. Use bullet points for lists
3. Bold **key terms** and important info
4. Be direct - no filler phrases
5. Use Markdown formatting
6. If you don't know, say so

**USER QUESTION:**`;

const HISTORY_KEY = 'eterx-chat-history';

export const ContextualSearch: React.FC<ContextualSearchProps> = ({ isOpen, x, y, onClose, useDeepThinking = false }) => {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchState, setSearchState] = useState<SearchState>('idle');
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const dragControls = useDragControls();

    const CONTAINER_WIDTH = 420;
    const CONTAINER_HEIGHT = 450;

    const safeX = Math.min(Math.max(x - CONTAINER_WIDTH / 2, 20), window.innerWidth - CONTAINER_WIDTH - 20);
    const safeY = Math.min(Math.max(y - 50, 20), window.innerHeight - CONTAINER_HEIGHT - 20);

    // Load history
    useEffect(() => {
        const saved = localStorage.getItem(HISTORY_KEY);
        if (saved) {
            try { setMessages(JSON.parse(saved)); } catch { }
        }
    }, []);

    // Save history
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-50)));
        }
    }, [messages]);

    // Auto-focus & scroll
    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // State updates
    useEffect(() => {
        if (isListening) setSearchState('listening');
        else if (isLoading) setSearchState('thinking');
        else if (query.length > 0) setSearchState('typing');
        else setSearchState('idle');
    }, [isListening, isLoading, query]);

    // Close handlers
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            setTimeout(() => window.addEventListener('mousedown', handleClickOutside), 200);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Submit using GeminiService (IPC to main process)
    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: query.trim(), timestamp: Date.now() };
        setMessages(prev => [...prev, userMessage]);
        const currentQuery = query.trim();
        setQuery('');
        setIsLoading(true);

        try {
            let result;
            if (useDeepThinking) {
                // Prepare Deep Thinking Prompt
                const deepPrompt = `${ETERX_PROMPT}\n\n**USER REQUEST:** ${currentQuery}\n\n**INSTRUCTION:** Think step by step before answering. Provide a detailed analysis.`;
                result = await GeminiService.generateDeepThinking(deepPrompt);
            } else {
                result = await GeminiService.generateContent(currentQuery, ETERX_PROMPT);
            }
            setMessages(prev => [...prev, { role: 'assistant', content: result, timestamp: Date.now() }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${error.message || 'Error occurred'}`, timestamp: Date.now() }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Voice
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
            recognition.onresult = (e: any) => { setQuery(e.results[0][0].transcript); setIsListening(false); };
            recognition.start();
        }
    };

    // TTS
    const speakMessage = (text: string) => {
        if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
        const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`_~]/g, ''));
        utterance.rate = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
    };

    // Copy
    const copyMessage = (text: string, idx: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
    };

    // Clear
    const clearHistory = () => {
        setMessages([]);
        localStorage.removeItem(HISTORY_KEY);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                ref={containerRef}
                drag
                dragControls={dragControls}
                dragMomentum={false}
                dragElastic={0.05}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                style={{ position: 'fixed', left: safeX, top: safeY, width: CONTAINER_WIDTH, height: CONTAINER_HEIGHT, zIndex: 99999 }}
                className="flex flex-col"
            >
                {/* Container with Ray Border */}
                <div className={`relative rounded-2xl overflow-hidden flex flex-col h-full bg-[var(--bg-glass-heavy)] backdrop-blur-3xl shadow-[var(--shadow-premium)] eterx-ray-border eterx-ray-border--${searchState}`}>

                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-3 border-b border-[var(--border-glass)] cursor-grab active:cursor-grabbing flex-shrink-0 bg-white/40"
                        onPointerDown={(e) => dragControls.start(e)}>
                        <div className="flex items-center gap-2">
                            <GripVertical size={12} className="text-gray-300" />
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                                <Sparkles size={12} className="text-white" />
                            </div>
                            <span className="text-xs font-bold text-gray-700">EterX AI</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {messages.length > 0 && (
                                <button onClick={clearHistory} className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors" title="Clear">
                                    <Trash2 size={12} />
                                </button>
                            )}
                            <button onClick={onClose} className="p-1 rounded text-gray-300 hover:text-gray-500 transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                        {messages.length === 0 && !isLoading && (
                            <div className="h-full flex flex-col items-center justify-center text-center py-8">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-4 shadow-lg">
                                    <Sparkles size={24} className="text-white" />
                                </div>
                                <p className="text-sm font-medium text-gray-700">Ask EterX anything</p>
                                <p className="text-xs text-gray-400 mt-1">Works on any page</p>
                                <div className="flex flex-wrap justify-center gap-1.5 mt-4">
                                    {['Summarize', 'How to...', 'Explain', 'Help me'].map(chip => (
                                        <button key={chip} onClick={() => setQuery(chip)}
                                            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-indigo-100 hover:text-indigo-600 rounded-full text-gray-600 transition-colors">
                                            {chip}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${msg.role === 'user'
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                                    : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {msg.role === 'user' ? (
                                        <p className="text-sm">{msg.content}</p>
                                    ) : (
                                        <div className="prose prose-sm prose-gray max-w-none text-gray-700">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    )}

                                    {msg.role === 'assistant' && (
                                        <div className="flex items-center gap-1 mt-2 pt-1 border-t border-gray-200">
                                            <button onClick={() => speakMessage(msg.content)} className="p-1 rounded text-gray-400 hover:text-gray-600">
                                                {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                                            </button>
                                            <button onClick={() => copyMessage(msg.content, idx)} className={`p-1 rounded ${copiedIdx === idx ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'}`}>
                                                {copiedIdx === idx ? <Check size={12} /> : <Copy size={12} />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                                    <div className="eterx-dots"><span></span><span></span><span></span></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-[var(--border-glass)] flex-shrink-0 bg-white/40 backdrop-blur-sm">
                        <form onSubmit={handleSubmit} className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Ask EterX..."
                                className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none text-gray-800 placeholder-gray-400 border border-gray-100 focus:border-indigo-300 transition-colors"
                                autoFocus
                            />
                            <button type="button" onClick={startListening}
                                className={`relative p-2.5 rounded-xl transition-all ${isListening ? 'eterx-mic-active' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
                                {isListening && <><span className="eterx-wave eterx-wave-1" /><span className="eterx-wave eterx-wave-2" /></>}
                                <Mic size={16} className="relative z-10" />
                            </button>
                            <button type="submit" disabled={!query.trim() || isLoading}
                                className={`p-2.5 rounded-xl transition-all ${query.trim() && !isLoading ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md' : 'text-gray-300 bg-gray-50'}`}>
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
