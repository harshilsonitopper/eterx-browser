import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Compass, Clock, MapPin, Search, Mic, MicOff, Plus, X, ArrowRight, Layout, Cloud, Zap, Cpu, Code, Palette, AudioLines, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavSidebar } from './NavSidebar';
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

const SUGGESTED_QUERIES = [
    "Help me map out training for my first marathon",
    "Compare leather sofas vs fabric sofas",
    "Compare HIIT, pilates, and barre for a full-body workout"
];

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
    const [selectedAttachments, setSelectedAttachments] = useState<{ file: File | null, preview: string, id: string }[]>([]);
    const [isDragging, setIsDragging] = useState(false);
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
    const { isListening, transcript, interimTranscript, startListening, stopListening, resetTranscript } = useSpeechRecognition({ continuous: true });
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

    const processFiles = useCallback((files: FileList | null) => {
        if (!files) return;

        const newAttachments = [...selectedAttachments];
        const remainingSlots = 10 - newAttachments.length;

        Array.from(files).slice(0, remainingSlots).forEach(file => {
            const id = Math.random().toString(36).substring(7);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setSelectedAttachments(prev => [...prev, { file, preview: reader.result as string, id }].slice(0, 10));
                };
                reader.readAsDataURL(file);
            } else {
                setSelectedAttachments(prev => [...prev, { file, preview: '', id }].slice(0, 10));
            }
        });
    }, [selectedAttachments]);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) setIsDragging(true);
    }, [isDragging]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        processFiles(e.dataTransfer.files);
    }, [processFiles]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(e.target.files);
    }, [processFiles]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) files.push(blob);
            }
        }
        if (files.length > 0) {
            const dt = new DataTransfer();
            files.forEach(f => dt.items.add(f));
            processFiles(dt.files);
        }
    }, [processFiles]);



    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    }, []);

    const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() || selectedAttachments.length > 0) {
                setSearchQuery(input.trim());
                setViewMode('results');
            }
        }
    }, [input, selectedAttachments]);

    const removeAttachment = useCallback((id: string) => {
        setSelectedAttachments(prev => prev.filter(a => a.id !== id));
    }, []);

    const handleAttachmentPreview = (att: { file: File | null, preview: string }) => {
        if (att.preview) {
            onOpenNewTab?.(att.preview);
        } else if (att.file) {
            const url = URL.createObjectURL(att.file);
            onOpenNewTab?.(url);
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
                initialImage={selectedAttachments.find(a => a.preview)?.preview || undefined}
                onNavigate={onNavigate}
                onOpenNewTab={onOpenNewTab}
                onClose={() => {
                    setViewMode('home');
                    setSelectedAttachments([]);
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
        <div className="flex h-full w-full overflow-hidden bg-[#FAFAFA] select-none">
            {/* Left Navigation Sidebar - New Tab Localized */}
            <NavSidebar
                onNewTab={() => onOpenNewTab?.('eterx://newtab')}
                onOpenAI={() => onNavigate('eterx://workspace')}
                onOpenHistory={() => onNavigate('eterx://history')}
                onOpenSettings={() => onNavigate('eterx://settings')}
            />

            {/* Main Content Area */}
            <div className="flex-1 relative h-full overflow-y-auto no-scrollbar flex flex-col items-center font-sans text-gray-900">
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
                        className="w-10 h-10 rounded-full bg-[#111] flex items-center justify-center text-white shadow-md hover:shadow-xl hover:-translate-y-0.5 active:scale-95 border-2 border-transparent transition-all duration-300 relative overflow-hidden group"
                        style={{ borderColor: 'transparent' }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = primaryColor}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <AudioLines size={18} strokeWidth={2.5} className="relative z-10" />
                    </button>

                    <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/70 backdrop-blur-xl rounded-full border border-gray-200/50 shadow-sm hover:bg-white hover:shadow-md transition-all duration-300 cursor-default text-gray-500 hover:text-gray-800">
                        <Clock size={13} strokeWidth={2.5} />
                        <span className="text-[11px] font-semibold tracking-wide uppercase mt-[1px]">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>

                <motion.div
                    initial={{ y: -30, opacity: 0, scale: 0.98 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 24 }}
                    className="w-full max-w-[1100px] flex flex-col items-center px-8 z-10 mt-[4vh] pb-24"
                >
                    {/* 1. Branding & Atmospheric Crystal Fume System (Upper Space Optimized) */}
                    <div className="relative w-full max-w-[1100px] mb-8 flex flex-col items-center justify-center pt-12 pb-12 overflow-hidden rounded-[40px] group pointer-events-none">
                        {/* Layered White Fume Bulge Orbs (Atmospheric Depth) */}
                        <motion.div
                            className="absolute w-[700px] h-[350px] blur-[140px] opacity-[0.06] z-0"
                            style={{
                                background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, transparent 85%)',
                                left: '-350px',
                                top: '50%',
                                y: '-50%'
                            }}
                            animate={{
                                x: ['-20%', '160%'],
                                scale: [1, 1.3, 1],
                            }}
                            transition={{
                                duration: 22,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                        />

                        {/* The Core Bulge (Dynamic Liquid Physics) */}
                        <motion.div
                            className="absolute w-[400px] h-[240px] blur-[90px] opacity-[0.11] z-0"
                            style={{
                                background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.4) 40%, transparent 80%)',
                                left: '-200px',
                                top: '50%',
                                y: '-50%',
                                borderRadius: '45% 55% 75% 25% / 35% 35% 65% 65%'
                            }}
                            animate={{
                                x: ['-40%', '170%'],
                                scale: [1, 1.4, 0.9],
                                borderRadius: [
                                    '45% 55% 75% 25% / 35% 35% 65% 65%',
                                    '75% 25% 25% 75% / 65% 75% 35% 45%',
                                    '45% 55% 75% 25% / 35% 35% 65% 65%'
                                ]
                            }}
                            transition={{
                                duration: 16,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />

                        {/* EterX Main Branding with Crystal Serif Texture */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative z-10 select-none"
                        >
                            <h1
                                className="text-8xl md:text-9xl font-[950] tracking-[-0.02em] flex items-center justify-center text-transparent bg-clip-text"
                                style={{
                                    fontFamily: '"Playfair Display", "Times New Roman", serif',
                                    backgroundImage: `linear-gradient(135deg, #000 0%, #333 38%, #f8f9fa 50%, #333 62%, #000 100%)`,
                                    backgroundSize: '280% 100%',
                                }}
                            >
                                <motion.span
                                    animate={{ backgroundPosition: ['140% 0%', '-140% 0%'] }}
                                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                                    className="bg-clip-text"
                                    style={{ WebkitBackgroundClip: 'text' }}
                                >
                                    EterX
                                </motion.span>
                            </h1>

                            {/* Perfect Glimmer & Reflection Overlays */}
                            <div className="absolute inset-0 pointer-events-none opacity-30 bg-gradient-to-tr from-white/15 via-transparent to-white/10 mix-blend-screen" />
                            <div className="absolute -inset-1 pointer-events-none opacity-40 blur-[0.4px] bg-gradient-to-r from-transparent via-white/10 to-transparent mix-blend-overlay" />
                        </motion.div>

                        {/* Subtle Brand Foundation */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-80 h-[1px] bg-gradient-to-r from-transparent via-black/10 to-transparent opacity-30" />
                    </div>

                    {/* Search Bar Container */}
                    <div className="w-full max-w-[800px] relative group mb-16">
                        {/* Premium Sleek Ray of Light Border */}
                        {/* 1. Initial Load Animation (Restore Original Glory) */}
                        <AnimatePresence>
                            {!animationComplete && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 1.5, ease: "easeInOut" }}
                                    className="absolute -inset-[2px] rounded-[34px] z-0 overflow-hidden pointer-events-none"
                                >
                                    <motion.div
                                        className="absolute top-1/2 left-1/2 w-[2000px] h-[2000px] origin-center -z-10"
                                        style={{
                                            background: `
                                            conic-gradient(
                                                from 180deg at 50% 50%, 
                                                transparent 0deg, 
                                                transparent 280deg, 
                                                ${ primaryColor } 340deg, 
                                                ${ secondaryColor } 360deg
                                            )
                                        `,
                                            x: "-50%",
                                            y: "-50%",
                                        }}
                                        animate={{ rotate: [0, 360] }}
                                        transition={{ duration: 3.5, ease: "linear", repeat: Infinity }}
                                    />
                                    <div className="absolute inset-[1.5px] rounded-[32.5px] bg-[#f8f9fa] z-0 border border-black/[0.03]" />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* 2. Active State Animations (Listening / Dragging) */}
                        <AnimatePresence mode="wait">
                            {(isListening || isDragging) && (
                                <motion.div
                                    key="active-ray"
                                    initial={{ opacity: 0, scale: 0.99 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.99 }}
                                    className="absolute -inset-[2.5px] rounded-[34px] z-0 overflow-hidden pointer-events-none"
                                >
                                    {/* 2a. Primary Core Ray (High-Luminance & Professional) */}
                                    <motion.div
                                        className="absolute top-1/2 left-1/2 w-[3000px] h-[3000px] origin-center shadow-[0_0_100px_rgba(251,191,36,0.3)]"
                                        style={{
                                            background: isDragging
                                                ? `conic-gradient(
                                                from 0deg at 50% 50%,
                                                transparent 0deg,
                                                transparent 260deg,
                                                rgba(252, 211, 77, 0.4) 280deg, 
                                                rgba(251, 146, 60, 0.8) 300deg, 
                                                #fbbf24 320deg, 
                                                #f59e0b 335deg, 
                                                #f97316 345deg,
                                                #fbbf24 355deg,
                                                #fde047 360deg
                                            )`
                                                : `conic-gradient(
                                                from 0deg at 50% 50%,
                                                transparent 0deg,
                                                transparent 280deg, 
                                                ${ primaryColor } 330deg, 
                                                ${ secondaryColor } 360deg
                                            )`,
                                            x: "-50%",
                                            y: "-50%",
                                            filter: isDragging ? "hue-rotate(0deg) brightness(1.2)" : "none"
                                        }}
                                        animate={{
                                            rotate: [0, 360],
                                            scale: isDragging ? [1.02, 1.05, 1.02] : 1,
                                            filter: isDragging ? ["hue-rotate(0deg) brightness(1.2)", "hue-rotate(720deg) brightness(1.4)", "hue-rotate(1440deg) brightness(1.2)"] : "none"
                                        }}
                                        transition={{
                                            rotate: { duration: isDragging ? 1.4 : 3, ease: "linear", repeat: Infinity },
                                            scale: { duration: 3, ease: "easeInOut", repeat: Infinity },
                                            filter: { duration: 8, ease: "linear", repeat: Infinity }
                                        }}
                                    />

                                    {/* 2b. Secondary Luminous Mist Glow (Soft Bloom) */}
                                    {isDragging && (
                                        <motion.div
                                            className="absolute top-1/2 left-1/2 w-[2500px] h-[2500px] origin-center blur-[60px] opacity-80"
                                            style={{
                                                background: `conic-gradient(
                                                from 0deg at 50% 50%,
                                                transparent 0deg,
                                                transparent 210deg,
                                                rgba(251, 191, 36, 0.45) 240deg,
                                                rgba(249, 115, 22, 0.7) 280deg,
                                                rgba(251, 191, 36, 0.45) 320deg,
                                                transparent 350deg
                                            )`,
                                                x: "-50%",
                                                y: "-50%",
                                            }}
                                            animate={{
                                                rotate: [360, 0],
                                                opacity: [0.6, 0.8, 0.6]
                                            }}
                                            transition={{
                                                rotate: { duration: 7, ease: "linear", repeat: Infinity },
                                                opacity: { duration: 3, ease: "easeInOut", repeat: Infinity }
                                            }}
                                        />
                                    )}
                                    <div className={`absolute inset-[2.5px] rounded-[32px] z-0 border border-black/5 ${ isDragging ? 'bg-[#f0f9ff]/85 backdrop-blur-lg shadow-[inset_0_0_20px_rgba(251,191,36,0.1)]' : 'bg-[#f8f9fa]' } transition-all duration-300`} />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div
                            onDragEnter={handleDragEnter}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`relative z-10 flex flex-col w-full transition-all duration-300 rounded-[32px] ${ isListening || isDragging
                                ? 'shadow-[0_12px_48px_rgba(0,0,0,0.12)] scale-[1.005] bg-white'
                                : 'bg-[#f4f7f9] hover:bg-[#ebf1f5] shadow-inner border border-transparent hover:border-black/5'
                                } ${ isDragging ? 'ring-2 ring-blue-500/30' : '' }`}
                            style={isListening ? { boxShadow: `0 0 0 3px ${ primaryColor }33`, borderColor: primaryColor } : {}}
                        >
                            {selectedAttachments.length > 0 && (
                                <div className="px-4 pt-4 pb-1 overflow-x-auto no-scrollbar flex items-center gap-3 w-full scroll-smooth">
                                    <div className="flex gap-3 pr-4">
                                        {selectedAttachments.map((att) => (
                                            <div
                                                key={att.id}
                                                onDoubleClick={() => handleAttachmentPreview(att)}
                                                className={`relative group flex items-center bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer hover:shadow-md transition-all flex-shrink-0 ${ att.preview ? 'p-1' : 'gap-3 pr-4 pl-1.5 py-1.5 w-fit max-w-[200px]' }`}
                                                title="Double click to preview"
                                            >
                                                <div className={`${ att.preview ? 'w-14 h-14' : 'w-9 h-9' } rounded-xl overflow-hidden shadow-sm flex-shrink-0 relative flex items-center justify-center ${ (att.file?.type.includes('pdf') || att.file?.name.endsWith('.pdf')) ? 'bg-[#ef4444] text-white' : (att.file?.type.includes('word') || att.file?.name.endsWith('.docx') || att.file?.name.endsWith('.doc')) ? 'bg-[#2563eb] text-white' : (att.file?.type.includes('code') || att.file?.name.match(/\.(ts|js|py|html|css|json)$/)) ? 'bg-gray-800 text-white' : 'bg-gray-50' }`}>
                                                    {att.preview ? (
                                                        <img src={att.preview} alt="Preview" className="w-full h-full object-cover" />
                                                    ) : (att.file?.type.includes('pdf') || att.file?.name.endsWith('.pdf') || att.file?.type.includes('word') || att.file?.name.endsWith('.docx') || att.file?.name.endsWith('.doc') || att.file?.type.includes('code') || att.file?.name.match(/\.(ts|js|py|html|css|json)$/)) ? (
                                                        <FileText size={18} strokeWidth={2} />
                                                    ) : (
                                                        <Layout size={18} strokeWidth={1.5} className="text-gray-400" />
                                                    )}
                                                    <div className="absolute inset-0 border border-black/5 rounded-xl pointer-events-none" />
                                                </div>

                                                {!att.preview && (
                                                    <div className="flex flex-col overflow-hidden min-w-0 py-0.5">
                                                        <span className="text-[12px] font-medium text-gray-800 truncate leading-tight">
                                                            {att.file?.name || 'File'}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5 font-medium">
                                                            {(att.file?.type.includes('pdf') || att.file?.name.endsWith('.pdf')) ? 'PDF' : (att.file?.type.includes('word') || att.file?.name.endsWith('.docx') || att.file?.name.endsWith('.doc')) ? 'DOCX' : att.file?.type.split('/')[1]?.toUpperCase() || 'FILE'}
                                                        </span>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeAttachment(att.id); }}
                                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#111] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-105 transition-all z-10 shadow-md"
                                                >
                                                    <X size={11} strokeWidth={3} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col w-full min-h-[140px] p-2 pl-4 pt-5 relative">
                                <textarea
                                    ref={inputRef as any}
                                    value={input}
                                    onChange={handleInputChange}
                                    onPaste={handlePaste}
                                    onKeyDown={handleInputKeyDown}
                                    placeholder={isDragging ? "Drop files to upload" : isListening ? "Listening..." : "Ask anything"}
                                    className={`flex-1 bg-transparent border-none outline-none text-[17px] text-[#111] placeholder:text-gray-400 font-normal w-full resize-none min-h-[56px] overflow-hidden leading-relaxed pr-4 transition-opacity select-text ${ isDragging ? 'opacity-40' : 'opacity-100' }`}
                                    autoFocus
                                    rows={1}
                                />

                                <div className="flex items-center justify-between w-full mt-auto pt-2 pb-2 pr-2">
                                    {/* Plus (+) Icon with Steel Effect Hover */}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-10 h-10 rounded-full text-gray-500 bg-transparent transition-all duration-300 flex items-center justify-center -ml-1 border border-transparent hover:text-gray-800 hover:bg-gradient-to-b hover:from-white hover:to-gray-200 hover:border-gray-300 hover:shadow-[0_2px_5px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)] active:scale-95"
                                        title="Upload a file or image"
                                    >
                                        <Plus size={20} strokeWidth={2.5} />
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            multiple
                                            accept="image/*,application/pdf,text/*,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                            onChange={handleFileSelect}
                                        />
                                    </button>

                                    {/* Mic Icon with Steel Effect & Modern Voice Animation */}
                                    {isListening ? (
                                        <button
                                            onClick={handleMicClick}
                                            className="w-10 h-10 rounded-full flex items-center justify-center relative group"
                                            title="Stop listening"
                                        >
                                            {/* Glowing animated background */}
                                            <div className="absolute inset-0 rounded-full animate-ping opacity-25" style={{ backgroundColor: primaryColor }} />
                                            <div className="absolute -inset-0.5 rounded-full animate-pulse opacity-40" style={{ backgroundColor: primaryColor }} />

                                            {/* Button Core */}
                                            <div className="relative w-full h-full rounded-full flex items-center justify-center text-white z-10 scale-105 transition-all duration-300 group-hover:scale-100 group-hover:bg-gray-800" style={{ backgroundColor: primaryColor, boxShadow: `0 4px 12px ${ primaryColor }60` }}>
                                                {/* Waveform Animation (Hidden on hover) */}
                                                <div className="flex items-center gap-[2.5px] h-3.5 cursor-pointer group-hover:hidden">
                                                    <motion.div animate={{ height: ["3px", "12px", "3px"] }} transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut" }} className="w-[2px] bg-white rounded-full" />
                                                    <motion.div animate={{ height: ["6px", "14px", "6px"] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0.2, ease: "easeInOut" }} className="w-[2px] bg-white rounded-full" />
                                                    <motion.div animate={{ height: ["3px", "10px", "3px"] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0.4, ease: "easeInOut" }} className="w-[2px] bg-white rounded-full" />
                                                </div>
                                                {/* Stop Icon (Reveals on hover) */}
                                                <div className="hidden group-hover:flex items-center justify-center text-white w-full h-full">
                                                    <div className="w-2.5 h-2.5 bg-white rounded-sm shadow-inner" />
                                                </div>
                                            </div>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleMicClick}
                                            className="w-10 h-10 rounded-full text-gray-500 bg-[#f4f7f9] border border-gray-200/60 shadow-sm transition-all duration-300 flex items-center justify-center hover:text-gray-800 hover:bg-gradient-to-b hover:from-white hover:to-gray-200 hover:border-gray-300 hover:shadow-[0_2px_5px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)] active:scale-95"
                                            title="Search by voice"
                                        >
                                            <Mic size={18} strokeWidth={2.5} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <QuickLinks onNavigate={onNavigate} />

                    {/* Optional Decorative Line or Spacing before News */}
                    {themeSettings?.showNews !== false && (
                        <div className="w-full max-w-[800px] h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent mt-8 mb-10 opacity-50" />
                    )}

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
        </div>
    );
};