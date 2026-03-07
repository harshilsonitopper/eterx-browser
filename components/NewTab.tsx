import React, { useState, useRef, useEffect } from 'react';
import {
    Sparkles, Compass, Clock, MapPin, Search, Mic, MicOff, Plus, X, ArrowRight,
    Layout, Cloud, Zap, Cpu, Code, Palette, AudioLines
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { AIResponseView } from './AIResponseView';
import { NewsFeed, NewsArticle } from './NewsFeed';
import { NewsDetail } from './NewsDetail';
import { QuickLinks } from './QuickLinks';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useLocation } from '../hooks/useLocation';
import { GeminiService } from '../services/GeminiService';
import { THEME_COLORS } from './ThemeConstants';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface NewTabProps {
    onNavigate: (url: string) => void;
    onStartAgent?: (goal: string) => void;
    onToggleSidebar: () => void;
    onOpenNewTab?: (url: string) => void;
    themeSettings?: any;
    onUpdateTheme?: (settings: any) => void;
    aiSettings?: any;
    userName?: string;
}

const MOCK_NEWS: NewsArticle[] = [
    {
        id: '1',
        title: 'DeepMind Strikes Gold: New AI Model Solves 50-Year-Old Math Problem',
        description: 'AlphaGeometry demonstrates breakthrough reasoning capabilities, matching gold-medalist performance.',
        source: 'TechCrunch',
        timeAgo: '2h ago',
        category: 'AI Research',
    },
    {
        id: '2',
        title: 'SpaceX Starship Successfully Reaches Orbit in Historic 4th Test Flight',
        description: 'The massive rocket achieved all mission milestones, splashing down in the Indian Ocean as planned.',
        source: 'SpaceNews',
        timeAgo: '4h ago',
        category: 'Space',
    },
    {
        id: '3',
        title: 'Global Markets Rally as Inflation Data Shows Unexpected Drop',
        description: 'Major indices hit record highs following the release of the latest CPI report.',
        source: 'Bloomberg',
        timeAgo: '30m ago',
        category: 'Finance',
    }
];

export const NewTab: React.FC<NewTabProps> = ({ onNavigate, onStartAgent, onOpenNewTab, themeSettings, onUpdateTheme, userName = 'Harshil' }) => {
    const [viewMode, setViewMode] = useState<'home' | 'results' | 'news-detail'>('home');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [animationComplete, setAnimationComplete] = useState(false);

    // News State
    const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]); // Start empty for skeleton
    const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
    const [loadingNews, setLoadingNews] = useState(true);

    const [currentTime, setCurrentTime] = useState(new Date());
    const { city, loading: locationLoading } = useLocation();

    // Speech Hook
    const { isListening, transcript, interimTranscript, startListening, stopListening, resetTranscript } = useSpeechRecognition();
    const baseInputRef = useRef('');

    // Theme Resolution
    const activeColor = themeSettings?.color || 'blue';
    const themeColorObj = THEME_COLORS.find(c => c.value === activeColor);
    const primaryColor = themeColorObj ? themeColorObj.primary : (activeColor.startsWith('#') ? activeColor : '#3b82f6');
    const secondaryColor = themeColorObj ? themeColorObj.secondary : (activeColor.startsWith('#') ? activeColor : '#d946ef');

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // 1. Fetch Headlines Autonomous
    useEffect(() => {
        // DISABLED: Auto-generation off to save API calls per user request
        // To re-enable, uncomment the code below or set a flag
        /*
        let mounted = true;
        const initNews = async () => {
            // Only fetch if news is enabled
            if (themeSettings?.showNews === false) return;

            // Wait for location to be ready or timeout after 2s to default to 'Global'
            if (locationLoading && !city) return;

            try {
                // If no city found after wait, default to 'Global'
                const location = city || 'Global';

                // Fetch from NewsService
                import('../services/NewsService').then(async ({ NewsService }) => {
                    const articles = await NewsService.fetchHeadlines(location);
                    if (mounted) {
                        setNewsArticles(articles);
                        setLoadingNews(false);
                    }
                });
            } catch (e) {
                console.error("News init failed", e);
                setLoadingNews(false);
            }
        };

        // Debounce location loading slightly
        const t = setTimeout(initNews, 1000);
        return () => { mounted = false; clearTimeout(t); };
        */
        setLoadingNews(false); // Just stop loading state
    }, [city, locationLoading, themeSettings?.showNews]);

    const handleMicClick = () => {
        if (isListening) {
            stopListening();
        } else {
            baseInputRef.current = input; // Capture current text
            resetTranscript();
            startListening();
        }
    };

    // Update input display while listening
    useEffect(() => {
        if (isListening) {
            const spacer = baseInputRef.current && transcript ? ' ' : '';
            setInput(baseInputRef.current + spacer + transcript + interimTranscript);
        }
    }, [isListening, transcript, interimTranscript]);

    // Finalize input when listening stops & Auto-Send
    useEffect(() => {
        if (!isListening && transcript) {
            const spacer = baseInputRef.current && transcript ? ' ' : '';
            const finalQuery = baseInputRef.current + spacer + transcript;
            setInput(finalQuery);

            // Auto-Send Logic (Comet Style)
            if (finalQuery.trim()) {
                setSearchQuery(finalQuery.trim());
                setViewMode('results');
            }
        }
    }, [isListening]);

    // Initial focus and timer for ending animations
    useEffect(() => {
        const timer = setTimeout(() => setAnimationComplete(true), 2400);
        return () => clearTimeout(timer);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (input.trim() || selectedImage)) {
            setSearchQuery(input.trim());
            setViewMode('results');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleArticleSelect = (article: NewsArticle) => {
        setSelectedArticle(article);
        setViewMode('news-detail');
    };

    if (viewMode === 'results') {
        return (
            <AIResponseView
                initialQuery={searchQuery}
                initialImage={selectedImage || undefined}
                onNavigate={onNavigate}
                onOpenNewTab={onOpenNewTab}
                onClose={() => {
                    setViewMode('home');
                    setSelectedImage(null);
                    setSearchQuery('');
                }}
            />
        );
    }

    if (viewMode === 'news-detail' && selectedArticle) {
        return (
            <NewsDetail
                article={selectedArticle}
                onBack={() => {
                    setViewMode('home');
                    setSelectedArticle(null);
                }}
            />
        );
    }

    return (
        <div className="relative h-full w-full bg-white font-sans text-gray-900 overflow-y-auto no-scrollbar flex flex-col items-center">
            {/* 0. Background Image Layer */}
            {themeSettings?.backgroundImage && (
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-1000"
                    style={{ backgroundImage: `url(${ themeSettings.backgroundImage })` }}
                >
                    <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]" />
                </div>
            )}


            {/* Top Right Widgets */}
            <div className="absolute top-6 right-6 flex items-center gap-4 text-gray-500 z-20">


                {/* Waveform Icon (Live AI) - As requested in uploaded image */}
                <button
                    onClick={() => themeSettings?.onOpenCustomize?.()} // For now opening customize, or we can open AI sidebar
                    className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform active:scale-95 border-2 border-transparent transition-colors duration-300"
                    style={{ borderColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = primaryColor}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                >
                    <AudioLines size={20} strokeWidth={2.5} />
                </button>

                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100 hover:bg-gray-100 transition-colors cursor-default">
                    <Clock size={14} />
                    <span className="text-xs font-medium">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>

            {/* Main Content Wrapper with Fly-In Animation */}
            <motion.div
                initial={{ y: -40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="w-full max-w-[1000px] flex flex-col items-center px-8 z-10 mt-24 md:mt-40 pb-32"
            >
                {/* Greeting with Dual Layer Animation */}
                <h1 className="text-[40px] md:text-[52px] font-semibold text-[#111111] tracking-tight text-center mb-10 relative">
                    Hi{" "}
                    <span className="relative inline-block">
                        <span
                            className={cn(
                                "bg-clip-text text-transparent bg-[length:200%_auto] block",
                                !animationComplete && "animate-gradient-x"
                            )}
                            style={{
                                backgroundImage: `linear-gradient(to right, ${ primaryColor }, ${ secondaryColor }, ${ primaryColor })`
                            }}
                        >
                            {userName}
                        </span>
                        <motion.span
                            className="absolute inset-0 bg-white mix-blend-screen"
                            style={{
                                color: primaryColor,
                                background: 'transparent',
                                mixBlendMode: 'normal'
                            }}
                            initial={{ clipPath: "inset(100% 0 0 0)" }}
                            animate={{ clipPath: "inset(0% 0 0 0)" }}
                            transition={{ delay: 2.0, duration: 0.6, ease: "easeOut" }}
                        >
                            {userName}
                        </motion.span>
                    </span>
                    , where to next?
                </h1>

                {/* Search Bar Container */}
                <div className="w-full max-w-[800px] relative group mb-16">
                    {/* SVG Border Beam Animation */}
                    <div className="absolute -inset-[3px] pointer-events-none z-0">
                        {/* Only render SVG while animation is active or fading out */}
                        {!animationComplete && (
                            <svg className="w-full h-full" width="100%" height="100%" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor={primaryColor} />
                                        <stop offset="50%" stopColor={secondaryColor} />
                                        <stop offset="100%" stopColor={primaryColor} />
                                    </linearGradient>
                                </defs>
                                <motion.rect
                                    x="3" y="3"
                                    width="calc(100% - 6px)"
                                    height="calc(100% - 6px)"
                                    rx="28" ry="28"
                                    fill="none"
                                    stroke="url(#beam-gradient)"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0, pathOffset: 0, opacity: 0 }}
                                    animate={{
                                        pathLength: [0.1, 0.5, 0.1], // Grow then shrink
                                        pathOffset: [0, 2], // 2 Full Cycles
                                        opacity: [0, 1, 1, 0] // Fade in, stay, fade out
                                    }}
                                    transition={{
                                        duration: 2.0,
                                        ease: "easeInOut",
                                        delay: 0.4
                                    }}
                                />
                            </svg>
                        )}
                    </div>

                    {/* Actual Search Bar */}
                    <div className={`relative z-10 flex flex-col w-full transition-all duration-300 rounded-[32px] ${ isListening ? 'shadow-lg' : 'bg-[#f0f2f5] hover:bg-white hover:shadow-xl hover:ring-1 hover:ring-gray-200' }`}
                        style={isListening ? { backgroundColor: `${ primaryColor }10`, boxShadow: `0 0 0 2px ${ primaryColor }40` } : {}}
                    >
                        {selectedImage && (
                            <div className="px-4 pt-4 pb-0 flex">
                                <div className="relative group">
                                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 shadow-sm relative flex items-center justify-center bg-gray-50">
                                        {selectedImage?.startsWith('data:image') ? (
                                            <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-gray-400">
                                                <div className="rotate-0"><Layout size={24} strokeWidth={1.5} /></div>
                                                <span className="text-[9px] font-medium mt-1 uppercase tracking-wider">File</span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setSelectedImage(null)}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center w-full px-4 py-4">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 mr-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                            >
                                <Plus size={22} strokeWidth={2} />
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*,application/pdf,text/*"
                                    onChange={handleFileSelect}
                                />
                            </button>

                            <input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={isListening ? "Listening..." : "Ask anything..."}
                                className="flex-1 bg-transparent border-none outline-none text-[18px] text-gray-900 placeholder-gray-400 font-normal h-full min-h-[44px] ml-1"
                                autoFocus
                            />

                            <button
                                onClick={handleMicClick}
                                className={`p-2 ml-1 rounded-full transition-all duration-300 ${ isListening ? 'text-white shadow-md scale-110 animate-pulse' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900' }`}
                                style={isListening ? { backgroundColor: primaryColor } : {}}
                            >
                                {isListening ? <MicOff size={20} strokeWidth={2} /> : <Mic size={20} strokeWidth={2} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <QuickLinks onNavigate={onNavigate} />

                {/* News Feed - Only if enabled */}
                {themeSettings?.showNews !== false && (
                    <NewsFeed
                        articles={newsArticles}
                        onSelectArticle={handleArticleSelect}
                        loading={loadingNews}
                    />
                )}

            </motion.div>

            {/* Customize Button - Floating Modern Glass Style */}
            <div className="fixed bottom-8 right-8 z-30">
                <button
                    onClick={() => themeSettings?.onOpenCustomize?.()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/70 backdrop-blur-xl border border-white/50 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-white hover:shadow-[0_12px_48px_rgba(0,0,0,0.15)] transition-all group group-hover:scale-105 active:scale-95"
                >
                    <Palette size={18} className="text-gray-700 transition-colors" style={{ color: undefined }} onMouseEnter={e => e.currentTarget.style.color = primaryColor} onMouseLeave={e => e.currentTarget.style.color = ''} />
                    <span className="text-[13px] font-medium text-gray-800">Customize</span>
                </button>
            </div>
        </div>
    );
};