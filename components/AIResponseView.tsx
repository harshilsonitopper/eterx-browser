
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Globe, Sparkles, Copy, RefreshCw, MoreHorizontal, Plus, Library, Layout, AlertCircle, Mic, ArrowRight, Check, Code as CodeIcon, Terminal, ChevronLeft, ChevronRight, X, Image as ImageIcon, ExternalLink
} from 'lucide-react';
import { GeminiService } from '../services/GeminiService';
import { SearchService } from '../services/SearchService';
import SourceCard, { SourceCardProps } from './SourceCard';
import SourceGroup from './SourceGroup';

interface AIResponseViewProps {
    initialQuery: string;
    initialImage?: string; // Base64 image
    onNavigate: (url: string) => void;
    onOpenNewTab?: (url: string) => void;
    onClose: () => void;
}

interface ChatTurn {
    id: string;
    query: string;
    answer: string;
    sources: SourceCardProps[];
    relatedQuestions: string[];
    status: 'thinking' | 'searching' | 'generating' | 'done' | 'error';
    image?: string; // Image attached to this turn
    thinkingSteps?: string[];
    mode?: 'fast' | 'deep' | 'research' | 'extreme';
}

// Custom Icons
const MicIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
);

const CodeBlock = ({ className, children }: { className?: string, children: React.ReactNode }) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'text';
    const [copied, setCopied] = useState(false);
    const textRef = useRef<string>('');

    useEffect(() => {
        if (typeof children === 'string') {
            textRef.current = children;
        } else if (Array.isArray(children)) {
            textRef.current = children.map(c => (typeof c === 'string' ? c : '')).join('');
        }
    }, [children]);

    const handleCopy = () => {
        const textToCopy = String(children).replace(/\n$/, '');
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-6 rounded-2xl overflow-hidden glass-liquid-white group relative z-10">
            <div className="flex items-center justify-between px-4 py-3 bg-white/40 border-b border-white/30 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    {/* Mac-style Window Controls */}
                    <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-sm" />
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-sm" />
                        <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-sm" />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 ml-2 font-mono tracking-wide">
                        {language}
                    </span>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white/50 hover:bg-white/80 px-2 py-1 rounded-md"
                >
                    {copied ? (
                        <>
                            <Check size={13} className="text-green-600" />
                            <span className="text-green-600">Copied</span>
                        </>
                    ) : (
                        <>
                            <Copy size={13} />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>
            <div className="overflow-x-auto p-5 custom-scrollbar bg-white/30">
                <code className={`font-mono text-[13.5px] leading-relaxed text-[#24292f] whitespace-pre tab-4 ${ className }`}>
                    {children}
                </code>
            </div>
        </div>
    );
};

// Inline Citation Component (Professional Style)
const CitationPill = ({ index, source, onClick }: { index: number, source?: SourceCardProps, onClick?: () => void }) => {
    if (!source) return null;
    return (
        <span
            onClick={onClick}
            className="inline-flex items-center justify-center align-baseline mx-0.5 text-[0.75em] font-bold text-[#1a73e8] bg-[#e8f0fe] w-5 h-5 rounded-full cursor-pointer hover:bg-[#d2e3fc] transition-colors select-none relative -top-0.5"
            title={source.title}
        >
            {index + 1}
        </span>
    );
};

export const AIResponseView: React.FC<AIResponseViewProps> = ({ initialQuery, initialImage, onNavigate, onClose }) => {
    const [turns, setTurns] = useState<ChatTurn[]>([]);
    const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
    const [isSourceSidebarOpen, setIsSourceSidebarOpen] = useState(false);
    const scrollEndRef = useRef<HTMLDivElement>(null);
    const hasRunRef = useRef(false);

    // Auto-scroll
    useEffect(() => {
        scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [turns]);

    // Update active turn based on scrolling or new turns
    useEffect(() => {
        if (turns.length > 0 && !activeTurnId) {
            setActiveTurnId(turns[0].id);
        }
        // If a new turn is added, switch to it
        if (turns.length > 0) {
            setActiveTurnId(turns[turns.length - 1].id);
        }
    }, [turns.length]);

    // Initial Run
    useEffect(() => {
        if (!hasRunRef.current && initialQuery) {
            hasRunRef.current = true;
            processQuery(initialQuery, initialImage);
        }
    }, [initialQuery, initialImage]);

    const processQuery = async (q: string, img?: string, mode?: 'fast' | 'deep' | 'research' | 'extreme') => {
        const newTurnId = Date.now().toString();
        setIsSourceSidebarOpen(false);

        // 1. Add Turn
        setTurns(prev => [...prev, {
            id: newTurnId,
            query: q,
            answer: '',
            sources: [],
            relatedQuestions: [],
            status: 'thinking',
            image: img,
            mode: mode,
            thinkingSteps: []
        }]);

        const updateTurn = (updates: Partial<ChatTurn>) => {
            setTurns(prev => prev.map(t => t.id === newTurnId ? { ...t, ...updates } : t));
        };

        try {
            // 2. Multimodal Analysis (Image/File)
            if (img) {
                updateTurn({ status: 'generating' });
                // Prepare attachment
                const isImage = img.startsWith('data:image');
                let mimeType = 'application/pdf'; // Default
                if (img.startsWith('data:') && img.indexOf(';') > 5) {
                    mimeType = img.substring(5, img.indexOf(';'));
                } else if (isImage) {
                    mimeType = 'image/png';
                }
                const base64Data = img.includes(',') ? img.split(',')[1] : img;

                const result = await GeminiService.generateContent(
                    q || (isImage ? "Describe this image" : "Analyze this file"),
                    "You are a helpful analyst. Be precise and detailed.",
                    false, // Not forceFast
                    [{
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType
                        }
                    }]
                );
                updateTurn({ answer: result.text, status: 'done' });
                return;
            }

            // 3. Text Intent Check
            const detectedIntent = await GeminiService.checkIntent(q);

            if (detectedIntent === 'GENERATE' && mode === 'fast') {
                updateTurn({ status: 'generating' });
                const result = await GeminiService.generateContent(
                    `You are a creative AI assistant. Reply to: "${ q }"`,
                    'Be helpful, creative, and direct.'
                );
                updateTurn({ answer: result.text, status: 'done' });
            } else {
                updateTurn({ status: 'searching' });

                // DIRECT GEMINI AGENT
                // mode defaults to 'deep' if undefined, similar to AgentToolkit logic
                const agentResult = await GeminiService.integratedSearchAndAnswer(
                    q,
                    mode || 'deep',
                    (thought) => {
                        updateTurn({ status: thought.toLowerCase().includes('search') ? 'searching' : 'thinking' });
                        setTurns(prev => prev.map(t => t.id === newTurnId ? {
                            ...t,
                            thinkingSteps: [...(t.thinkingSteps || []), thought]
                        } : t));
                    }
                );

                const processedSources: SourceCardProps[] = agentResult.sources.map(s => ({
                    type: 'website',
                    title: s.title,
                    url: s.url,
                    domain: new URL(s.url).hostname.replace('www.', ''),
                    favicon: s.favicon || `https://www.google.com/s2/favicons?domain=${ new URL(s.url).hostname }&sz=128`,
                    description: s.snippet
                }));

                updateTurn({
                    answer: agentResult.answer,
                    sources: processedSources,
                    relatedQuestions: agentResult.relatedQuestions || [],
                    status: 'done'
                });

                if (processedSources.length > 0) setIsSourceSidebarOpen(true);
            }

        } catch (error: any) {
            console.error(error);
            updateTurn({ answer: `Error: ${ error.message }`, status: 'error' });
        }
    };

    const activeTurn = turns.find(t => t.id === activeTurnId) || turns[turns.length - 1];

    return (
        <div className="flex h-full w-full bg-[var(--bg-base)] overflow-hidden font-sans text-[var(--text-primary)]">

            {/* MAIN CHAT AREA */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                    <div className="w-full max-w-[820px] mx-auto pt-8 pb-40 px-8">
                        {turns.map((turn) => (
                            <div key={turn.id} className="mb-20 group relative" onClick={() => setActiveTurnId(turn.id)}>
                                {/* User Message */}
                                <div className="flex justify-end mb-6">
                                    <div className="flex flex-col items-end gap-2 max-w-[85%]">
                                        {turn.image && (
                                            <div className="w-full max-w-md p-3 bg-white rounded-xl border border-gray-200 text-xs text-gray-500 font-mono overflow-hidden">
                                                {turn.image.length > 500 ? (turn.query.includes('File:') ? 'File Content attached' : 'Image attached') : 'Content attached'}
                                            </div>
                                        )}
                                        <div className="bg-[#f0f2f5] px-6 py-3.5 rounded-2xl rounded-tr-sm text-[16px] text-[#1f1f1f] shadow-sm leading-relaxed tracking-normal font-medium">
                                            {turn.query}
                                        </div>
                                    </div>
                                </div>



                                {/* AI Response */}
                                <div className="flex-1 min-w-0">
                                    {/* AI Response */}
                                    <div className="flex-1 min-w-0">
                                        {/* Status - Proud Bright Ray bulge */}
                                        {turn.status !== 'done' && turn.status !== 'error' && (
                                            <div className="mb-6 flex justify-start">
                                                <div className="thinking-ray-container">
                                                    <div className="thinking-ray-bulge" />
                                                    <span className="relative z-10 text-[14px] font-medium text-gray-700 tracking-tight shimmer-text-anim">
                                                        {(() => {
                                                            const lastStep = turn.thinkingSteps && turn.thinkingSteps.length > 0
                                                                ? turn.thinkingSteps[turn.thinkingSteps.length - 1].toLowerCase()
                                                                : '';

                                                            if (lastStep.includes('search')) return 'Searching...';
                                                            return 'Thinking...';
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Markdown Content */}
                                        {turn.answer && (
                                            <div className="prose prose-lg max-w-none text-[#1f1f1f] leading-relaxed">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        p: (props) => <p className="text-[16px] leading-8 text-[#2c2c2c] mb-6 tracking-wide font-[450]" {...props} />,
                                                        a: ({ href, children }) => {
                                                            if (href?.startsWith('source:')) {
                                                                const idx = parseInt(href.split(':')[1]);
                                                                const source = turn.sources[idx];
                                                                return (
                                                                    <CitationPill
                                                                        index={idx}
                                                                        source={source}
                                                                        onClick={() => {
                                                                            setActiveTurnId(turn.id);
                                                                            setIsSourceSidebarOpen(true);
                                                                        }}
                                                                    />
                                                                );
                                                            }
                                                            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">{children}</a>;
                                                        },
                                                        code: ({ inline, className, children, ...props }: any) => {
                                                            const match = /language-(\w+)/.exec(className || '');
                                                            if (!inline && match) return <CodeBlock className={className}>{children}</CodeBlock>;
                                                            if (!inline) return <CodeBlock className={className}>{children}</CodeBlock>;
                                                            return <code className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-sm font-mono border border-gray-200" {...props}>{children}</code>;
                                                        },
                                                        // Headings - Distinct & Professional
                                                        h1: (props) => <h3 className="text-[22px] font-bold mt-10 mb-5 text-[#1a1a1a] border-b-2 border-gray-100 pb-2 flex items-center gap-2" {...props} />,
                                                        h2: (props) => <h4 className="text-[19px] font-bold mt-8 mb-4 text-[#202124] flex items-center gap-2 relative pl-3 border-l-4 border-blue-500 rounded-sm" {...props} />,
                                                        h3: (props) => <h5 className="text-[17px] font-bold mt-6 mb-3 text-[#333]" {...props} />,

                                                        // Lists - Spaced & Clean
                                                        ul: (props) => <ul className="mb-6 space-y-3 list-disc list-outside ml-6 text-gray-800 marker:text-gray-400" {...props} />,
                                                        ol: (props) => <ol className="mb-6 space-y-3 list-decimal list-outside ml-6 text-gray-800 marker:text-gray-500 font-medium" {...props} />,
                                                        li: (props) => <li className="pl-2 leading-7" {...props} />,

                                                        // Separator - Styled
                                                        hr: (props) => <hr className="my-8 border-t border-gray-200" {...props} />,

                                                        // Tables - Modern & Clean
                                                        table: (props) => (
                                                            <div className="overflow-x-auto my-6 rounded-xl border border-gray-200 shadow-sm">
                                                                <table className="min-w-full divide-y divide-gray-200" {...props} />
                                                            </div>
                                                        ),
                                                        thead: (props) => <thead className="bg-[#fcfdfd]" {...props} />,
                                                        th: (props) => <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100" {...props} />,
                                                        td: (props) => <td className="px-5 py-4 text-sm text-gray-700 border-b border-gray-50 leading-relaxed whitespace-pre-wrap" {...props} />,
                                                        blockquote: (props) => <blockquote className="border-l-4 border-blue-500 pl-4 py-1 my-4 text-gray-700 italic bg-gray-50 rounded-r-lg" {...props} />,
                                                    }}
                                                >
                                                    {turn.answer}
                                                </ReactMarkdown>
                                            </div>
                                        )}

                                        {/* Action Bar - Perplexity Style */}
                                        {turn.status === 'done' && (
                                            <div className="flex items-center gap-2 mt-6 pb-2">
                                                <div className="flex items-center gap-1">
                                                    <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors" title="Copy">
                                                        <Copy size={16} />
                                                    </button>
                                                    <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors" title="Helpful">
                                                        <div className="rotate-0"><ArrowRight size={16} className="-rotate-90" /></div> {/* Thumbs up hack if icon missing, replacing with valid lucide */}
                                                    </button>
                                                    <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors" title="Not Helpful">
                                                        <div className="rotate-0"><ArrowRight size={16} className="rotate-90" /></div> {/* Thumbs down hack */}
                                                    </button>
                                                    <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors" title="Share">
                                                        <ExternalLink size={16} />
                                                    </button>
                                                </div>

                                                <div className="h-4 w-px bg-gray-200 mx-2" />

                                                {/* Sources Button */}
                                                <button
                                                    onClick={() => {
                                                        setActiveTurnId(turn.id);
                                                        setIsSourceSidebarOpen(!isSourceSidebarOpen);
                                                    }}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border ${ isSourceSidebarOpen && activeTurnId === turn.id ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50' }`}
                                                >
                                                    <div className="flex -space-x-1.5">
                                                        {turn.sources.slice(0, 3).map((s, i) => (
                                                            <img key={i} src={s.favicon} className="w-4 h-4 rounded-full ring-2 ring-white bg-gray-100" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
                                                        ))}
                                                        {turn.sources.length === 0 && <Globe size={14} />}
                                                    </div>
                                                    <span className="text-sm font-medium">Sources</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Fixed Input Area */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)] to-transparent">
                    <div className="max-w-[820px] mx-auto bg-[var(--bg-glass-heavy)] backdrop-blur-xl rounded-[24px] shadow-[var(--shadow-float)] border border-[var(--border-glass)] p-2 flex flex-col relative z-20 transition-all hover:border-[var(--border-glass-strong)] hover:shadow-[var(--shadow-premium)] focus-within:shadow-xl focus-within:border-indigo-500/30">
                        <input
                            className="w-full bg-transparent outline-none text-[16px] px-4 py-3 min-h-[50px] placeholder-gray-400 font-medium"
                            placeholder="Ask follow-up..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    processQuery((e.target as HTMLInputElement).value);
                                    (e.target as HTMLInputElement).value = '';
                                }
                            }}
                        />
                        <div className="flex items-center justify-between px-2 pb-1">
                            <div className="flex gap-1">
                                <button className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-50 transition-colors">
                                    <Plus size={18} />
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        const input = document.querySelector('input') as HTMLInputElement;
                                        if (input.value) {
                                            processQuery(input.value);
                                            input.value = '';
                                        }
                                    }}
                                    className="p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors shadow-sm"
                                >
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* R SIDE: CONTROL CENTER (Sources Sidebar) */}
            <AnimatePresence>
                {isSourceSidebarOpen && activeTurnId && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 380, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                        className="h-[95%] my-auto mr-4 rounded-3xl bg-white/70 backdrop-blur-[30px] border border-white/50 flex flex-col flex-shrink-0 z-50 overflow-hidden shadow-[-20px_0_60px_rgba(0,0,0,0.05)]"
                    >
                        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-800">Sources</h3>
                            <button onClick={() => setIsSourceSidebarOpen(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 scrollbar-thin">
                            <SourceGroup
                                sources={turns.find(t => t.id === activeTurnId)?.sources.map(s => ({
                                    title: s.title,
                                    link: s.url,
                                    snippet: s.description || '',
                                    pagemap: s.favicon ? { cse_image: [{ src: s.favicon.replace('sz=128', 'sz=256') }] } : undefined
                                })) as any || []}
                                onSourceClick={(url) => window.open(url, '_blank')}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
