import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, Share2, Sparkles, AlertCircle, Send, User, Bot, Globe } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { NewsArticle } from './NewsFeed';

interface NewsDetailProps {
    article: NewsArticle;
    onBack: () => void;
}

interface Source {
    name: string;
    url: string;
    favicon: string;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
}

const LoadingStep = ({ text, active, completed }: { text: string; active: boolean; completed: boolean }) => (
    <div className={`flex items-center gap-3 transition-opacity duration-300 ${ active || completed ? 'opacity-100' : 'opacity-40' }`}>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${ completed ? 'bg-teal-500 border-teal-500' :
            active ? 'border-teal-500 border-t-transparent animate-spin' :
                'border-gray-300'
            }`}>
            {completed && <div className="w-2 h-2 bg-white rounded-full" />}
        </div>
        <span className={`text-sm font-medium ${ active ? 'text-teal-700' : 'text-gray-600' }`}>{text}</span>
    </div>
);

export const NewsDetail: React.FC<NewsDetailProps> = ({ article, onBack }) => {
    const [content, setContent] = useState<string | null>(null);
    const [loadingStage, setLoadingStage] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [sources, setSources] = useState<Source[]>([]);

    // Chat State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [followUpInput, setFollowUpInput] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Simulation steps for "Real Loading"
    const steps = [
        "Analyzing topic...",
        "Searching reliable sources...",
        "Cross-referencing facts...",
        "Generating comprehensive report..."
    ];

    useEffect(() => {
        let mounted = true;
        let progressInterval: NodeJS.Timeout | null = null;

        const loadContent = async () => {
            try {
                const NewsService = (await import('../services/NewsService')).NewsService;

                // Check cache first (sync check essentially)
                const cached = await NewsService.getArticleContent(article.id);

                if (cached && cached.fullContent) {
                    // INSTANT LOAD
                    if (!mounted) return;
                    setContent(cached.fullContent);
                    setSources(cached.sources?.map((s: any) => ({
                        ...s,
                        favicon: `https://www.google.com/s2/favicons?domain=${ new URL(s.url).hostname }&sz=32`
                    })) || []);
                    setLoadingStage(steps.length);
                } else {
                    // Start simulation if not cached
                    progressInterval = setInterval(() => {
                        setLoadingStage(prev => {
                            if (prev < steps.length - 1) return prev + 1;
                            return prev;
                        });
                    }, 800);

                    // Wait for generation
                    const generated = await NewsService.getArticleContent(article.id);

                    if (progressInterval) clearInterval(progressInterval);

                    if (!mounted) return;

                    if (generated && generated.fullContent) {
                        setContent(generated.fullContent);
                        setSources(generated.sources?.map((s: any) => ({
                            ...s,
                            favicon: `https://www.google.com/s2/favicons?domain=${ new URL(s.url).hostname }&sz=32`
                        })) || []);
                        setLoadingStage(steps.length);
                    } else {
                        setError("Unable to retrieve article.");
                    }
                }
            } catch (err) {
                if (mounted) setError("Failed to load news article.");
            }
        };

        loadContent();

        return () => {
            mounted = false;
            if (progressInterval) clearInterval(progressInterval);
        };
    }, [article]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const handleAsk = async () => {
        if (!followUpInput.trim() || isAsking) return;

        const question = followUpInput;
        setFollowUpInput('');
        setIsAsking(true);

        // Add User Message
        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: question };
        setChatHistory(prev => [...prev, userMsg]);

        try {
            const NewsService = (await import('../services/NewsService')).NewsService;
            const answer = await NewsService.askAboutArticle(article.id, question);

            setChatHistory(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: answer
            }]);
        } catch (e) {
            setChatHistory(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: "Sorry, I couldn't process that right now."
            }]);
        } finally {
            setIsAsking(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white relative">

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32" ref={scrollRef}>
                <div className="max-w-[800px] mx-auto px-6 py-8">

                    {/* Header Controls */}
                    <div className="flex items-center justify-between mb-8 sticky top-0 bg-white/95 backdrop-blur-md py-4 z-20 border-b border-gray-100 transition-all">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-full hover:bg-gray-100"
                        >
                            <ArrowLeft size={18} />
                            <span className="text-sm font-medium">Back</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                                <Clock size={12} /> {article.timeAgo}
                            </span>
                        </div>
                    </div>

                    <div className="min-h-[600px]">
                        {!content && !error && (
                            /* Loading View */
                            <div className="flex flex-col justify-center items-center py-32">
                                <div className="w-full max-w-md space-y-6">
                                    {steps.map((text, i) => (
                                        <LoadingStep
                                            key={i}
                                            text={text}
                                            active={i === loadingStage}
                                            completed={i < loadingStage}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <AlertCircle className="text-red-500 mb-4" size={32} />
                                <p className="text-gray-500">{error}</p>
                            </div>
                        )}

                        {content && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                {/* Article Header */}
                                <h1 className="text-[32px] md:text-[40px] font-serif font-medium text-gray-900 leading-[1.2] mb-6 tracking-tight">
                                    {article.title}
                                </h1>

                                {article.imageUrl && (
                                    <div className="w-full h-64 md:h-80 rounded-2xl overflow-hidden mb-8 shadow-sm">
                                        <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
                                    </div>
                                )}

                                {/* Sources Chip Grid */}
                                {sources.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-10 pb-6 border-b border-gray-100">
                                        {sources.map((source, i) => (
                                            <a
                                                key={i}
                                                href={source.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all text-xs font-medium text-gray-700 no-underline border border-gray-200"
                                            >
                                                <img src={source.favicon} alt="" className="w-3 h-3 rounded-full opacity-80" />
                                                {source.name}
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* Main Article Content - Better Typography */}
                                <article className="prose prose-lg prose-gray max-w-none text-gray-800 leading-relaxed font-serif">
                                    <ReactMarkdown
                                        components={{
                                            h1: ({ node, ...props }) => <h1 className="hidden" {...props} />,
                                            h2: ({ node, ...props }) => <h2 className="text-2xl font-sans font-semibold text-gray-900 mt-12 mb-4" {...props} />,
                                            h3: ({ node, ...props }) => <h3 className="text-xl font-sans font-medium text-gray-900 mt-8 mb-3" {...props} />,
                                            p: ({ node, ...props }) => <p className="mb-6 text-[18px] leading-[1.8] text-gray-700 font-sans" {...props} />,
                                            ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-5 mb-6 space-y-2 text-gray-700 font-sans" {...props} />,
                                            li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                            strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
                                            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-teal-500 pl-4 py-1 italic text-gray-600 bg-gray-50 rounded-r-lg my-6" {...props} />,
                                        }}
                                    >
                                        {content}
                                    </ReactMarkdown>
                                </article>

                                {/* Chat History Section */}
                                {chatHistory.length > 0 && (
                                    <div className="mt-16 pt-10 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                                            <Sparkles size={18} className="text-teal-500" />
                                            Discussion
                                        </h3>
                                        <div className="space-y-6">
                                            {chatHistory.map(msg => (
                                                <div key={msg.id} className={`flex gap-4 ${ msg.role === 'user' ? 'flex-row-reverse' : '' }`}>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${ msg.role === 'user' ? 'bg-gray-200' : 'bg-teal-100 text-teal-700' }`}>
                                                        {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                                                    </div>
                                                    <div className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm leading-relaxed ${ msg.role === 'user'
                                                        ? 'bg-gray-100 text-gray-800 rounded-tr-sm'
                                                        : 'bg-teal-50 text-gray-800 rounded-tl-sm'
                                                        }`}>
                                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                                    </div>
                                                </div>
                                            ))}
                                            <div ref={chatEndRef} />
                                        </div>
                                    </div>
                                )}

                                {/* Spacer for bottom input */}
                                <div className="h-24" />
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sticky Interaction Bar */}
            {content && (
                <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center px-4">
                    <div className="bg-white border border-gray-200 shadow-2xl rounded-full p-1.5 pl-5 flex items-center gap-3 w-full max-w-[700px] transition-all focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500/50">
                        <Sparkles className="text-teal-500 flex-shrink-0" size={18} />
                        <input
                            value={followUpInput}
                            onChange={(e) => setFollowUpInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                            placeholder="Ask a question about this article..."
                            className="flex-1 bg-transparent border-none outline-none text-base text-gray-800 placeholder-gray-400 h-10 min-w-0"
                            disabled={isAsking}
                        />
                        <button
                            onClick={handleAsk}
                            disabled={!followUpInput.trim() || isAsking}
                            className={`p-2.5 rounded-full transition-all flex items-center justify-center ${ followUpInput.trim() && !isAsking
                                ? 'bg-teal-500 text-white shadow-md hover:bg-teal-600'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {isAsking ? (
                                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Send size={18} className={followUpInput.trim() ? "ml-0.5" : ""} />
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
