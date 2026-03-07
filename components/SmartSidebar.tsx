
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, ArrowDown, Menu, Plus, Globe, ArrowUp, Bot, X, Sparkles, Zap, Image as ImageIcon,
    Copy, ThumbsUp, ThumbsDown, Share, RotateCcw, MoreHorizontal, Mic, AudioLines, FileText, Square, ChevronDown, Send, Lightbulb, Search, Volume2, Settings, Zap as Lightning, Check, MessageSquare,
    MousePointer2, Type, ScrollText, CheckCircle2, XCircle, Play, ChevronRight, ExternalLink, Loader2, ArrowRight
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { SidebarGeminiService as GeminiService } from '../services/GeminiService';
import { StorageService } from '../services/StorageService';

// --- Types ---

interface Attachment {
    id: string;
    type: 'image' | 'file';
    url?: string;
    name?: string;
    file?: File;
}

interface SmartSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onStartLive?: () => void;
    activeTabUrl?: string;
    tabId?: number;
    onNavigate?: (url: string) => void;
    onCaptureScreen?: () => Promise<string>;
}

interface ChatTurn {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    thoughtText?: string;
    sources?: { url: string, title: string, snippet?: string }[];
    inlineImage?: string;
    timestamp: number;
    status?: 'thinking' | 'done' | 'error' | 'stopped';
    context?: string; // e.g., "Instacart"
    attachments?: { id: string, file: File, preview?: string, type: string }[];
}

// --- TypewriterText Component ---
// Reveals text word-by-word with a pulsing cursor for a live typing feel.
const TypewriterText = ({ text, isTyping }: { text: string; isTyping: boolean }) => {
    const [displayedWords, setDisplayedWords] = useState(0);
    const words = (text || '').split(' ');

    useEffect(() => {
        if (!isTyping) {
            setDisplayedWords(words.length);
            return;
        }
        setDisplayedWords(0);
        let i = 0;
        const interval = setInterval(() => {
            i++;
            setDisplayedWords(i);
            if (i >= words.length) clearInterval(interval);
        }, 45); // ~45ms per word = fast but readable
        return () => clearInterval(interval);
    }, [text, isTyping]);

    if (!isTyping || displayedWords >= words.length) {
        return <>{text}</>;
    }

    return (
        <>
            {words.slice(0, displayedWords).join(' ')}
            {displayedWords < words.length && (
                <span className="inline-block w-[5px] h-[13px] bg-blue-400 ml-0.5 rounded-sm align-middle" style={{ animation: 'skeleton-dot-pulse 1s ease-in-out infinite' }} />
            )}
        </>
    );
};

// --- Greeting Carousel Component ---

const ALL_GREETING_PHRASES = [
    "Synthesizing\ninsights.", "Strategic\nresearch.", "Intelligent\nnavigation.", "Analyze\ncomplex data.", "Your research\npartner.", "Decoding\ncomplexity.", "Accelerating\ndiscovery.", "Precision\non demand.", "Empowering\nresults.", "Explore. Solve.\nInnovate.", "Visionary\nassistance.", "Data-driven\nwisdom.", "Streamlining\nknowledge.", "Optimize your\nworkflow.", "Seamless\nintegration.", "Unlocking\npotential.", "Building the\nfuture.", "Intelligence\nredefined.", "Bridging\nthe gap.", "Insights\nin motion.", "Contextual\nawareness.", "Advanced\nreasoning.", "Your digital\nmentor.", "Shaping the\nunknown.", "Direct knowledge\naccess.", "Elevating\nintelligence.", "Smart\nsynthesis.", "Navigating\nthe web.", "Real-time\nresearch.", "Deep technical\naudits.", "Strategic\nforesight.", "Intuitive\ndiscovery.", "Mastering\nthe flow.", "Your cognitive\nedge.", "Refined\nlogic.", "High-fidelity\nanswers.", "Information\nat scale.", "Digital\nsynergy.", "Dynamic\nassistance.", "Empowering\nclarity.", "Resolving\nambiguity.", "The future,\ndecoded.", "Effortless\ndiscovery.", "Precision\nsearch.", "Knowledge\nsynthesis.", "Your growth\npartner.", "Insightful\nagency.", "Autonomous\nresearch.", "Catalyzing\nresults.", "Smarter\nbrowsing.", "Infinite\npossibilities.", "Your daily\nexpert.", "Rapid\nevaluation.", "Decoding the\ninternet.", "Your strategic\nally.", "Intelligent\nworkflows.", "Mastering\ncomplexity.", "Data-led\ndecisions.", "Efficiency\noptimized.", "Your cognitive\nboost.", "Seamlessly\nhelpful.", "Expertly\nguided.", "Information\narchitect.", "Knowledge\ncatalyst.", "Your digital\nbrain.", "Discovery,\nstreamlined.", "Precision\ninsights.", "Intelligent\noutreach.", "Exploring\nthe edge.", "Your technical\nguide.", "Smarter\nactions.", "High-speed\ninsights.", "Your research\nhub.", "The intelligence\nlayer.", "Decoding the\nworld."
];

// --- Static Logo Component ---

const StaticLogo = () => {
    return (
        <div className="w-full h-full flex items-center justify-center select-none pointer-events-none overflow-visible">
            {/* Import Professional Serif Font */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&display=swap');
                
                @keyframes white-fume-sweep {
                    0% { transform: translateX(-250%) skewX(-20deg); opacity: 0; }
                    10% { opacity: 0; }
                    20% { opacity: 1; }
                    40% { opacity: 0; }
                    50% { transform: translateX(250%) skewX(-20deg); opacity: 0; }
                    100% { transform: translateX(250%) skewX(-20deg); opacity: 0; }
                }
                
                .fume-cloud-overlay {
                    position: absolute;
                    top: -20%;
                    bottom: -20%;
                    left: 0;
                    right: 0;
                    width: 100%;
                    background: radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.4) 40%, transparent 70%);
                    filter: blur(12px);
                    animation: white-fume-sweep 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                    mix-blend-mode: screen;
                }
            `}</style>

            <div className="relative flex items-center justify-center px-6 py-4 overflow-hidden">
                <h1
                    className="relative z-10 text-[80px] text-[#2D2D2D] tracking-tight leading-none"
                    style={{
                        fontFamily: "var(--font-serif)",
                        fontWeight: 500,
                        letterSpacing: '-0.02em',
                    }}
                >
                    EterX
                </h1>

                {/* Modern white smoke/fume overlay */}
                <div className="absolute inset-0 z-20 pointer-events-none">
                    <div className="fume-cloud-overlay"></div>
                </div>
            </div>
        </div>
    );
};

const GreetingCarousel = () => {
    // Pick 5 random phrases for this session
    const [displayPhrases] = useState(() => {
        const shuffled = [...ALL_GREETING_PHRASES].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 5);
    });

    const [index, setIndex] = useState(0);
    const [showLogo, setShowLogo] = useState(false);

    useEffect(() => {
        if (index === displayPhrases.length - 1) {
            // Wait for godly arrival, then transition to logo
            const t = setTimeout(() => setShowLogo(true), 3500);
            return () => clearTimeout(t);
        };

        const interval = setInterval(() => {
            setIndex((prev) => {
                const next = prev + 1;
                if (next >= displayPhrases.length) {
                    clearInterval(interval);
                    return prev;
                }
                return next;
            });
        }, 2200);
        return () => clearInterval(interval);
    }, [index, displayPhrases.length]);

    return (
        <div className="h-32 flex items-center justify-center overflow-visible relative w-full perspective-text">
            <style>{`
                .perspective-text {
                    perspective: 1500px;
                }
                .gradient-text-1 { background: linear-gradient(135deg, #00C6FF 0%, #0072FF 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .gradient-text-2 { background: linear-gradient(135deg, #F093FB 0%, #F5576C 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .gradient-text-3 { background: linear-gradient(135deg, #FF0844 0%, #FFB199 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .gradient-text-4 { background: linear-gradient(135deg, #43E97B 0%, #38F9D7 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .gradient-text-5 { background: linear-gradient(135deg, #FA709A 0%, #FEE140 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .gradient-text-6 { background: linear-gradient(135deg, #30CFD0 0%, #330867 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .gradient-text-7 { background: linear-gradient(135deg, #A8EDEA 0%, #FED6E3 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .gradient-text-8 { background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .gradient-text-9 { background: linear-gradient(135deg, #FAD0C4 0%, #FFD1FF 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .gradient-text-10 { background: linear-gradient(135deg, #89F7FE 0%, #66A6FF 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .halo-glow {
                    background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, rgba(255,255,255,0) 70%);
                }
            `}</style>

            {/* Static Logo Container - Allow overflow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none z-0 flex items-center justify-center">
                <AnimatePresence>
                    {showLogo && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className="w-full h-full flex items-center justify-center"
                        >
                            <StaticLogo />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence mode="popLayout">
                {!showLogo && (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8, y: 30, rotateX: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -20, transition: { duration: 0.8 } }}
                        transition={{
                            type: "spring",
                            stiffness: index === displayPhrases.length - 1 ? 40 : 100, // Godly slow final arrival
                            damping: 20,
                            duration: index === displayPhrases.length - 1 ? 2.5 : 0.5
                        }}
                        className="absolute w-full flex justify-center z-10"
                    >
                        <h2
                            className={`text-[48px] font-black tracking-tighter text-center leading-[1.05] drop-shadow-sm whitespace-pre-line ${ `gradient-text-${ (index % 10) + 1 }`
                                } ${ index === displayPhrases.length - 1 ? 'animate-pulse scale-105 filter drop-shadow-[0_0_15px_rgba(255,107,107,0.4)] transition-all duration-1000' : '' }`}
                        >
                            {displayPhrases[index]}
                        </h2>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Agent Step Types ---
interface AgentStep {
    id: number;
    type: 'thought' | 'action' | 'result' | 'done' | 'error' | 'turn_start';
    text?: string;
    tool?: string;
    detail?: string;
    success?: boolean;
    error?: string;
    turn?: number;
    maxTurns?: number;
    model?: string;
    url?: string;
    timestamp: number;
}

// --- Tool Icon & Label Resolver ---
type ToolIconComponent = typeof Globe;
const getToolMeta = (tool: string): { Icon: ToolIconComponent; label: string; color: string } => {
    const t = (tool || '').toLowerCase();
    if (t.includes('go_back') || t.includes('back')) return { Icon: ArrowLeft, label: 'Back', color: 'text-gray-500' };
    if (t.includes('navigate') || t.includes('go_to')) return { Icon: Globe, label: 'Navigating', color: 'text-blue-500' };
    if (t.includes('search') || t.includes('fast_search') || t.includes('shadow_search')) return { Icon: Search, label: 'Searching', color: 'text-violet-500' };
    if (t.includes('click') || t.includes('find_and_click')) return { Icon: MousePointer2, label: 'Clicking', color: 'text-emerald-500' };
    if (t.includes('type') || t.includes('fill') || t.includes('batch_fill')) return { Icon: Type, label: 'Typing', color: 'text-amber-500' };
    if (t.includes('scroll')) return { Icon: ScrollText, label: 'Scrolling', color: 'text-purple-500' };
    if (t.includes('screenshot') || t.includes('capture')) return { Icon: ImageIcon, label: 'Capturing', color: 'text-pink-500' };
    if (t.includes('analyze') || t.includes('map_full')) return { Icon: Globe, label: 'Analyzing', color: 'text-indigo-500' };
    if (t.includes('read') || t.includes('extract') || t.includes('fast_read')) return { Icon: FileText, label: 'Reading', color: 'text-sky-500' };
    if (t.includes('research') || t.includes('fast_research')) return { Icon: Search, label: 'Researching', color: 'text-indigo-500' };
    if (t.includes('execute') || t.includes('shadow_execute') || t.includes('evaluate') || t.includes('parallel')) return { Icon: Play, label: 'Executing', color: 'text-orange-500' };
    if (t.includes('task_complete')) return { Icon: CheckCircle2, label: 'Complete', color: 'text-emerald-600' };
    if (t.includes('task_failed')) return { Icon: XCircle, label: 'Failed', color: 'text-red-500' };
    if (t.includes('shadow')) return { Icon: Bot, label: 'Processing', color: 'text-gray-500' };
    if (t.includes('hover')) return { Icon: MousePointer2, label: 'Hovering', color: 'text-teal-500' };
    if (t.includes('select') || t.includes('dropdown')) return { Icon: ChevronDown, label: 'Selecting', color: 'text-cyan-500' };
    if (t.includes('press_key') || t.includes('key')) return { Icon: ArrowRight, label: 'Key Press', color: 'text-indigo-500' };
    if (t.includes('tab') || t.includes('new_tab')) return { Icon: ExternalLink, label: 'Tab', color: 'text-blue-400' };
    if (t.includes('wait')) return { Icon: Loader2, label: 'Waiting', color: 'text-gray-400' };
    if (t.includes('dismiss') || t.includes('close') || t.includes('popup')) return { Icon: X, label: 'Dismissing', color: 'text-gray-400' };
    return { Icon: Globe, label: tool?.replace(/_/g, ' ') || 'Action', color: 'text-gray-500' };
};

// --- Next-Gen Agent Execution UI ---
const AgentExecutionUI = ({ steps, isActive }: { steps: AgentStep[], isActive: boolean }) => {
    const [expanded, setExpanded] = useState(true);
    const reasoningEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Auto-expand while active, keep state when done
    useEffect(() => {
        if (isActive) setExpanded(true);
    }, [isActive]);

    // Auto-scroll reasoning container
    useEffect(() => {
        if (expanded && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [steps.length, expanded]);

    // Data derivation
    const visibleSteps = steps.filter(s => s.type === 'thought' || s.type === 'action');
    const lastAction = [...steps].reverse().find(s => s.type === 'action');
    const lastActionMeta = lastAction ? getToolMeta(lastAction.tool || '') : null;
    const doneStep = steps.find(s => s.type === 'done');
    const errorStep = steps.find(s => s.type === 'error');
    const isComplete = !!doneStep;
    const hasError = !!errorStep;
    const latestTurn = steps.filter(s => s.turn).pop();
    const turnNum = latestTurn?.turn || 0;

    return (
        <div className="flex flex-col w-full font-sans mt-1 mb-1.5">

            {/* ─── Reasoning Container ─── */}
            <div className="rounded-2xl border border-gray-100 bg-gradient-to-b from-gray-50/80 to-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">

                {/* Inline keyframes for animations */}
                <style>{`
@keyframes cloud-sweep {
    0% { left: -40%; }
    100% { left: 110%; }
}
@keyframes ambient-glow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
}
@keyframes dotted-line-pulse {
    0% { background-position: 0 0; }
    100% { background-position: 0 16px; }
}
@keyframes skeleton-dot-pulse {
    0%, 100% { background-color: #d1d5db; transform: scale(1); }
    50% { background-color: #93c5fd; transform: scale(1.3); }
}
@keyframes skeleton-bar-sweep {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(300%); }
}
`}</style>

                {/* Header bar — always visible, clickable to toggle */}
                <button
                    onClick={() => setExpanded(v => !v)}
                    className={`relative flex items-center gap-2.5 w-full px-3.5 py-2.5 text-left select-none transition-all duration-500 overflow-hidden ${ isActive && !isComplete && !hasError
                        ? 'bg-gradient-to-r from-[#f0f4ff] via-[#f8faff] to-[#f0f4ff]'
                        : isComplete
                            ? 'bg-gradient-to-r from-emerald-50/60 via-white to-emerald-50/40'
                            : hasError
                                ? 'bg-gradient-to-r from-red-50/50 via-white to-red-50/30'
                                : 'hover:bg-gray-50/60'
                        }`}
                >
                    {/* Status indicator */}
                    <div className="relative z-10">
                        {isActive && !isComplete && !hasError ? (
                            <div className="w-5 h-5 relative flex items-center justify-center shrink-0">
                                <div className="w-4 h-4 border-[1.5px] border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                            </div>
                        ) : isComplete ? (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0"
                            >
                                <CheckCircle2 size={12} className="text-emerald-600" strokeWidth={2.5} />
                            </motion.div>
                        ) : hasError ? (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0"
                            >
                                <XCircle size={12} className="text-red-500" strokeWidth={2.5} />
                            </motion.div>
                        ) : (
                            <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                <div className="w-2 h-2 rounded-full bg-gray-300" />
                            </div>
                        )}
                    </div>

                    {/* Title — with animated text transition and white fume orb on text only */}
                    <div className="flex-1 min-w-0 relative overflow-hidden">
                        {/* White foam orb — sweeps ONLY across the text area */}
                        {isActive && !isComplete && !hasError && (
                            <div
                                className="absolute top-0 bottom-0 pointer-events-none z-20"
                                style={{
                                    width: '50%',
                                    background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 40%, transparent 70%)',
                                    animation: 'cloud-sweep 3s ease-in-out infinite',
                                    filter: 'blur(6px)',
                                }}
                            />
                        )}
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={isActive && !isComplete && !hasError
                                    ? (lastActionMeta?.label || 'reasoning')
                                    : isComplete ? 'complete' : hasError ? 'error' : 'idle'}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.2 }}
                                className={`text-[12.5px] font-semibold tracking-tight relative z-10 block truncate ${ isComplete ? 'text-emerald-700' : hasError ? 'text-red-600' : 'text-gray-700' }`}
                            >
                                {isActive && !isComplete && !hasError
                                    ? (lastActionMeta ? lastActionMeta.label : 'Reasoning')
                                    : isComplete ? 'Task Complete' : hasError ? 'Error' : 'Reasoning'}
                            </motion.span>
                        </AnimatePresence>
                    </div>

                    {/* Step counter */}
                    {turnNum > 0 && (
                        <span className="text-[9.5px] font-semibold text-gray-400 tabular-nums relative z-10">
                            {turnNum} {turnNum === 1 ? 'step' : 'steps'}
                        </span>
                    )}

                    {/* Expand/collapse chevron */}
                    <ChevronDown size={13} className={`text-gray-400 transition-transform duration-200 relative z-10 ${ expanded ? 'rotate-180' : '' }`} />
                </button>

                {/* Expandable content */}
                <AnimatePresence initial={false}>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden"
                        >
                            <div className="border-t border-gray-100/60">
                                {/* Scrollable timeline — thoughts + actions interleaved */}
                                <div
                                    ref={scrollContainerRef}
                                    className="px-3.5 py-2.5 max-h-[320px] overflow-y-auto custom-scrollbar"
                                >
                                    {/* Minimal loading — waiting for first real step */}
                                    {isActive && steps.filter(s => s.type === 'thought' || s.type === 'action').length === 0 && !isComplete && !hasError && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex items-center gap-2.5 py-2"
                                        >
                                            <div className="w-[11px] h-[11px] border-[1.5px] border-gray-200 border-t-blue-500 rounded-full animate-spin shrink-0" />
                                            <span className="text-[11.5px] text-gray-400 font-medium">Working...</span>
                                        </motion.div>
                                    )}

                                    {/* Timeline — mixed chronological feed */}
                                    <div className="relative">
                                        {/* Dotted timeline connector — animated when active */}
                                        {steps.filter(s => s.type === 'thought' || s.type === 'action').length > 1 && (
                                            <div className="absolute left-[5px] top-3 bottom-3 w-px"
                                                style={{
                                                    backgroundImage: isActive && !isComplete && !hasError
                                                        ? 'repeating-linear-gradient(to bottom, #93c5fd 0px, #93c5fd 3px, transparent 3px, transparent 8px)'
                                                        : 'repeating-linear-gradient(to bottom, #d1d5db 0px, #d1d5db 3px, transparent 3px, transparent 8px)',
                                                    maskImage: 'linear-gradient(to bottom, transparent, black 8px, black calc(100% - 8px), transparent)',
                                                    WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 8px, black calc(100% - 8px), transparent)',
                                                    ...(isActive && !isComplete && !hasError ? {
                                                        animation: 'dotted-line-pulse 0.8s linear infinite',
                                                    } : {}),
                                                }}
                                            />
                                        )}

                                        {steps.filter(s => s.type === 'thought' || s.type === 'action').map((step, idx, arr) => {
                                            const isLast = idx === arr.length - 1;

                                            if (step.type === 'thought') {
                                                return (
                                                    <motion.div
                                                        key={step.id}
                                                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                                        className="flex gap-3 py-1.5 relative"
                                                    >
                                                        {/* Timeline dot — loading spinner when active, solid circle when done */}
                                                        {isLast && isActive ? (
                                                            <div className="w-[13px] h-[13px] shrink-0 mt-1 z-10 relative flex items-center justify-center">
                                                                <div className="w-[11px] h-[11px] border-[1.5px] border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-[11px] h-[11px] rounded-full border-2 border-gray-200 bg-white shrink-0 mt-1.5 z-10 relative" />
                                                        )}
                                                        <p className={`text-[12.5px] leading-[1.7] flex-1 ${ isLast && isActive ? 'text-gray-700 font-medium' : 'text-gray-500'
                                                            }`}>
                                                            <TypewriterText text={step.text || ''} isTyping={isLast && isActive} />
                                                        </p>
                                                    </motion.div>
                                                );
                                            }

                                            // Action step
                                            const meta = getToolMeta(step.tool || '');
                                            const nextStep = steps[steps.indexOf(step) + 1];
                                            const result = nextStep?.type === 'result' ? nextStep : null;
                                            const isRunning = isLast && isActive && !result;
                                            return (
                                                <motion.div
                                                    key={step.id}
                                                    initial={{ opacity: 0, x: -6 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ duration: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
                                                    className={`flex gap-3 py-[5px] relative items-center rounded-lg ${ isRunning ? 'bg-blue-50/30' : '' }`}
                                                >
                                                    {/* Timeline dot — spinner when running, colored circle when done */}
                                                    <div className="relative shrink-0 z-10">
                                                        {isRunning ? (
                                                            <div className="w-[13px] h-[13px] flex items-center justify-center">
                                                                <div className="w-[11px] h-[11px] border-[1.5px] border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                                                            </div>
                                                        ) : (
                                                            <div className={`w-[11px] h-[11px] rounded-full border-2 ${ result?.success === false
                                                                ? 'border-red-300 bg-red-50'
                                                                : 'border-emerald-300 bg-emerald-50'
                                                                }`} />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                        <meta.Icon size={11} strokeWidth={2} className={`shrink-0 ${ isRunning ? meta.color : result?.success === false ? 'text-red-400' : 'text-gray-400'
                                                            }`} />
                                                        <span className={`text-[11.5px] font-medium shrink-0 ${ isRunning ? 'text-gray-700' : 'text-gray-400'
                                                            }`}>
                                                            {meta.label}
                                                            {/* Animated trailing dots for active action */}
                                                            {isRunning && (
                                                                <span className="inline-flex w-[14px] text-gray-400">
                                                                    <motion.span
                                                                        animate={{ opacity: [0, 1, 0] }}
                                                                        transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                                                                    >.</motion.span>
                                                                    <motion.span
                                                                        animate={{ opacity: [0, 1, 0] }}
                                                                        transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                                                                    >.</motion.span>
                                                                    <motion.span
                                                                        animate={{ opacity: [0, 1, 0] }}
                                                                        transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                                                                    >.</motion.span>
                                                                </span>
                                                            )}
                                                        </span>
                                                        {step.detail && (
                                                            <span className={`text-[10.5px] truncate flex-1 min-w-0 ${ isRunning ? 'text-gray-400' : 'text-gray-300' }`}>
                                                                {step.detail.length > 40 ? step.detail.substring(0, 40) + '…' : step.detail}
                                                            </span>
                                                        )}
                                                        {result && (
                                                            result.success
                                                                ? <CheckCircle2 size={9} className="text-emerald-500 shrink-0" strokeWidth={2.5} />
                                                                : <XCircle size={9} className="text-red-400 shrink-0" strokeWidth={2.5} />
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>

                                    <div ref={reasoningEndRef} />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ─── Answer / Completion — rendered OUTSIDE the reasoning box ─── */}
            {isComplete && doneStep && (
                <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 }}
                    className="mt-3 rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50/50 via-white to-emerald-50/20 p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden"
                >
                    <div className="flex items-center gap-2.5 mb-2">
                        <motion.div
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.3 }}
                            className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0"
                        >
                            <CheckCircle2 size={14} className="text-emerald-600" strokeWidth={2.5} />
                        </motion.div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Completed</span>
                        <div className="flex-1" />
                        <span className="text-[9px] text-gray-400 font-medium tabular-nums">
                            {steps.filter(s => s.type === 'action').length} actions
                        </span>
                    </div>
                    {/* Rich markdown outcome */}
                    <div className="max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                        <div className="text-[12.5px] text-gray-800 leading-[1.7] [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:space-y-0.5 [&_li]:text-[12px] [&_h1]:text-[13px] [&_h1]:font-bold [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-[12.5px] [&_h2]:font-bold [&_h2]:mt-1.5 [&_h2]:mb-0.5 [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:mt-1 [&_strong]:font-semibold [&_a]:text-emerald-600 [&_a]:underline [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[11px] [&_p]:mb-1">
                            <MarkdownRenderer content={doneStep.text || ''} />
                        </div>
                    </div>
                </motion.div>
            )}

            {hasError && errorStep && (
                <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 }}
                    className="mt-3 rounded-xl border border-red-100 bg-gradient-to-r from-red-50/50 via-white to-red-50/30 p-3 flex items-start gap-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.3 }}
                        className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5"
                    >
                        <XCircle size={14} className="text-red-500" strokeWidth={2.5} />
                    </motion.div>
                    <div className="flex-1">
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Error</span>
                        <p className="text-[13px] text-red-600 leading-[1.7] font-medium mt-0.5">{errorStep.text}</p>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

let lastDocClick = 0;

// --- Main Component ---

export const SmartSidebar: React.FC<SmartSidebarProps> = ({
    isOpen,
    onClose,
    onStartLive,
    activeTabUrl,
    tabId,
    onNavigate,
    onCaptureScreen
}) => {
    // State
    const [turns, setTurns] = useState<ChatTurn[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [activeTab, setActiveTab] = useState<'Chat' | 'Search' | 'Agent'>('Chat');
    const [queryMode, setQueryMode] = useState<'Default' | 'Search' | 'Agent'>('Default');
    const [activeContext, setActiveContext] = useState<string | null>(null);
    const [activeSourceTurnId, setActiveSourceTurnId] = useState<string | null>(null);
    const [popoverDirection, setPopoverDirection] = useState<'up' | 'down'>('up');
    const [activePageTitle, setActivePageTitle] = useState<string>("Reading page context...");
    const [isPdf, setIsPdf] = useState(false);
    const [attachments, setAttachments] = useState<{ id: string, file: File, preview?: string, base64: string, type: string }[]>([]);
    const [selectedModel, setSelectedModel] = useState<'Auto' | 'Think Deep' | 'Fast'>('Auto');
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const inputFileRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const modelMenuRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const isUserScrolledUp = useRef(false);

    // --- Computer Use State ---
    const [computerUseActive, setComputerUseActive] = useState(false);
    const [zeroClickMode, setZeroClickMode] = useState(false);
    const [agentLogs, setAgentLogs] = useState<string[]>([]);
    const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
    let _stepIdCounter = useRef(0);

    // --- Action Bar State ---
    const [ttsState, setTtsState] = useState<Record<string, 'loading' | 'playing' | 'paused'>>({});
    const [copiedTurnId, setCopiedTurnId] = useState<string | null>(null);
    const [feedbackMap, setFeedbackMap] = useState<Record<string, 'up' | 'down' | null>>({});
    const ttsAudioCtxRef = useRef<AudioContext | null>(null);
    const ttsSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const ttsCacheRef = useRef<Map<string, AudioBuffer>>(new Map()); // Cache generated audio per turn
    const ttsActiveTurnRef = useRef<string | null>(null);

    // Clear TTS cache when chat resets (new conversation)
    useEffect(() => {
        if (turns.length === 0) {
            ttsCacheRef.current.clear();
            setTtsState({});
            ttsActiveTurnRef.current = null;
            try { ttsSourceRef.current?.stop(); } catch (_) { }
        }
    }, [turns.length === 0]);

    // Decode base64 PCM to AudioBuffer
    const decodePCMToBuffer = (base64: string): AudioBuffer => {
        const pcmBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const int16 = new Int16Array(pcmBytes.buffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
        const ctx = ttsAudioCtxRef.current || new AudioContext({ sampleRate: 24000 });
        ttsAudioCtxRef.current = ctx;
        const buf = ctx.createBuffer(1, float32.length, 24000);
        buf.copyToChannel(float32, 0);
        return buf;
    };

    // Play an AudioBuffer from cache
    const playBuffer = async (turnId: string, buffer: AudioBuffer) => {
        const ctx = ttsAudioCtxRef.current || new AudioContext({ sampleRate: 24000 });
        ttsAudioCtxRef.current = ctx;
        if (ctx.state === 'suspended') await ctx.resume();
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => {
            if (ttsActiveTurnRef.current === turnId) {
                ttsActiveTurnRef.current = null;
                setTtsState(prev => { const n = { ...prev }; delete n[turnId]; return n; });
            }
        };
        ttsSourceRef.current = source;
        ttsActiveTurnRef.current = turnId;
        setTtsState(prev => ({ ...prev, [turnId]: 'playing' }));
        source.start();
    };

    // TTS handler — cache + pause/resume + Gemini API
    const handleSpeak = async (turnId: string, text: string) => {
        const currentState = ttsState[turnId];

        // PAUSE: if this turn is playing → pause via AudioContext.suspend()
        if (currentState === 'playing') {
            try { await ttsAudioCtxRef.current?.suspend(); } catch (_) { }
            setTtsState(prev => ({ ...prev, [turnId]: 'paused' }));
            return;
        }

        // RESUME: if this turn is paused → resume via AudioContext.resume()
        if (currentState === 'paused') {
            try { await ttsAudioCtxRef.current?.resume(); } catch (_) { }
            setTtsState(prev => ({ ...prev, [turnId]: 'playing' }));
            return;
        }

        // STOP any other turn that might be playing
        if (ttsActiveTurnRef.current && ttsActiveTurnRef.current !== turnId) {
            try { ttsSourceRef.current?.stop(); } catch (_) { }
            try { await ttsAudioCtxRef.current?.resume(); } catch (_) { } // Ensure not suspended
            const prevTurn = ttsActiveTurnRef.current;
            setTtsState(prev => { const n = { ...prev }; delete n[prevTurn]; return n; });
        }
        window.speechSynthesis?.cancel();

        // CHECK CACHE: if already generated, play instantly (no API call)
        const cached = ttsCacheRef.current.get(turnId);
        if (cached) {
            await playBuffer(turnId, cached);
            return;
        }

        // GENERATE: call Gemini TTS API
        setTtsState(prev => ({ ...prev, [turnId]: 'loading' }));
        try {
            // @ts-ignore — electron preload bridge
            const result = await window.electron?.generateTTS(text, 'Kore');
            if (result?.success && result.audio) {
                const buffer = decodePCMToBuffer(result.audio);
                ttsCacheRef.current.set(turnId, buffer); // Cache for reuse
                await playBuffer(turnId, buffer);
                return;
            }
        } catch (_) { }

        // Fallback: browser speechSynthesis (no cache for this)
        setTtsState(prev => ({ ...prev, [turnId]: 'playing' }));
        const cleanText = text
            .replace(/```[\s\S]*?```/g, ' code block ')
            .replace(/[#*_~`>|\-\[\]()]/g, '')
            .replace(/\n{2,}/g, '. ')
            .replace(/\n/g, ', ')
            .trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.onend = () => setTtsState(prev => { const n = { ...prev }; delete n[turnId]; return n; });
        utterance.onerror = () => setTtsState(prev => { const n = { ...prev }; delete n[turnId]; return n; });
        ttsActiveTurnRef.current = turnId;
        window.speechSynthesis?.speak(utterance);
    };

    // Copy helper
    const handleCopy = (turnId: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedTurnId(turnId);
        setTimeout(() => setCopiedTurnId(null), 2000);
    };

    // Feedback helper
    const handleFeedback = (turnId: string, type: 'up' | 'down') => {
        setFeedbackMap(prev => ({
            ...prev,
            [turnId]: prev[turnId] === type ? null : type,
        }));
    };

    useEffect(() => {
        // @ts-ignore
        const removeLogListener = window.electron?.on('agent:log', (log: string) => {
            setTurns(prev => {
                if (prev.length === 0) return prev;
                const lastTurn = prev[prev.length - 1];
                if (lastTurn.role === 'assistant' && lastTurn.context === 'Agent Worker') {
                    return prev.map((t, i) => i === prev.length - 1 ? { ...t, text: t.text + '\n> ' + log } : t);
                }
                return prev;
            });
        });

        // @ts-ignore — Structured step events from NextGenAgent
        const removeStepListener = window.electron?.on('agent:step', (step: any) => {
            setAgentSteps(prev => [...prev, {
                id: ++_stepIdCounter.current,
                type: step.type,
                text: step.text,
                tool: step.tool,
                detail: step.detail,
                success: step.success,
                error: step.error,
                turn: step.turn,
                maxTurns: step.maxTurns,
                model: step.model,
                url: step.url,
                timestamp: Date.now(),
            }]);
            // When agent completes, push the rich outcome into the chat as the assistant's response
            if (step.type === 'done' && step.text) {
                setTurns(prev => {
                    if (prev.length === 0) return prev;
                    const last = prev[prev.length - 1];
                    if (last.role === 'assistant') {
                        return prev.map((t, i) => i === prev.length - 1
                            ? { ...t, text: step.text, status: 'done' as const }
                            : t);
                    }
                    return prev;
                });
            }
        });

        // @ts-ignore
        const removeStatusListener = window.electron?.on('agent:status', (status: string) => {
            if (status === 'running') {
                setComputerUseActive(true);
                setIsThinking(true);
                setAgentSteps([]); // Clear steps for new task
                _stepIdCounter.current = 0;
            } else if (status === 'stopped' || status === 'idle' || status === 'error' || status === 'success') {
                setComputerUseActive(false);
                setIsThinking(false);
                setTurns(prev => {
                    if (prev.length === 0) return prev;
                    return prev.map((t, i) => i === prev.length - 1 && t.role === 'assistant' && t.context === 'Agent Worker'
                        ? { ...t, status: status === 'error' ? 'error' : 'done' }
                        : t);
                });
            }
        });

        return () => {
            removeLogListener?.();
            removeStepListener?.();
            removeStatusListener?.();
        };
    }, []);

    // --- Active Context Poller ---
    useEffect(() => {
        if (!isOpen) return;

        const fetchContext = async () => {
            // @ts-ignore
            if (window.electron && window.electron.captureActiveTab) {
                try {
                    // @ts-ignore
                    const context = await window.electron.captureActiveTab();
                    if (context && context.url) {
                        // Check if PDF
                        if (context.url.toLowerCase().endsWith('.pdf') || context.url.startsWith('file://')) {
                            setIsPdf(true);
                        } else {
                            setIsPdf(false);
                        }

                        // Set Title
                        if (context.title) {
                            setActivePageTitle(context.title);
                        } else {
                            setActivePageTitle(context.url.replace(/^https?:\/\//i, '').split('/')[0]);
                        }
                    } else {
                        setActivePageTitle("New Tab");
                        setIsPdf(false);
                    }
                } catch (e) {
                    console.error("Failed to fetch active tab context", e);
                }
            }
        };

        fetchContext();
        const interval = setInterval(fetchContext, 3000); // Poll every 3 seconds for title changes
        return () => clearInterval(interval);
    }, [isOpen]);

    // Handle outside click for Model Menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
                setIsModelMenuOpen(false);
            }
        };
        if (isModelMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isModelMenuOpen]);

    // Initial Load
    useEffect(() => {
        const saved = StorageService.load('custom_sidebar_sessions', []);
        if (saved && saved.length > 0) {
            // Restore last session if needed, for now start fresh or keep empty
        }
    }, []);

    // Scroll to bottom
    const scrollToBottom = (force = false) => {
        if (!force && isUserScrolledUp.current) return;
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        if (force) {
            isUserScrolledUp.current = false;
            setShowScrollToBottom(false);
        }
    };

    useEffect(() => {
        scrollToBottom(false);
    }, [turns, isThinking, attachments, agentSteps]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
        isUserScrolledUp.current = !isNearBottom;
        setShowScrollToBottom(!isNearBottom);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();

            reader.onload = (event) => {
                const base64Raw = event.target?.result as string;
                // Remove data:image/png;base64, prefix for Gemini
                const base64 = base64Raw.split(',')[1];

                setAttachments(prev => [...prev, {
                    id: Date.now().toString(),
                    file,
                    preview: file.type.startsWith('image') ? base64Raw : undefined,
                    base64,
                    type: file.type
                }]);
            };

            reader.readAsDataURL(file);
        }
    };

    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        let hasImage = false;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                hasImage = true;
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64Raw = event.target?.result as string;
                        const base64 = base64Raw.split(',')[1];
                        setAttachments(prev => [...prev, {
                            id: Date.now().toString(),
                            file,
                            preview: base64Raw,
                            base64,
                            type: file.type
                        }]);
                    };
                    reader.readAsDataURL(file);
                }
            }
        }

        // Intercept large text pastes to avoid clogging the text box
        if (!hasImage) {
            const textData = e.clipboardData.getData('text');
            if (textData && textData.length > 1000) {
                e.preventDefault();

                const existingCopies = attachments.filter(a => a.file.name.startsWith('copy') && a.file.name.endsWith('.txt'));
                const copyName = existingCopies.length > 0 ? `copy ${ existingCopies.length }.txt` : 'copy.txt';
                const file = new File([textData], copyName, { type: 'text/plain' });

                // Convert to base64 for unified handling outside the state updater 
                // to prevent React Strict Mode from firing this side-effect twice.
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64Raw = event.target?.result as string;
                    const base64 = base64Raw.split(',')[1];
                    setAttachments(prev => [...prev, {
                        id: Date.now().toString() + Math.random().toString(),
                        file,
                        base64,
                        type: file.type
                    }]);
                };
                reader.readAsDataURL(file);
            }
        }
    };

    // Auto-resize Input
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
        }
    }, [input]);

    // EterX System Identity — World-Class Agentic AI
    const ETERX_SYSTEM_PROMPT = `You are EterX, an elite agentic AI in a browser sidebar. You are NOT just a chatbot — you are a powerful agent that can search the web, generate professional documents, create reports, and execute tasks. You write like the world's best expert -- clear, direct, natural prose with bold key terms. No templates. No filler. Every response reads like a perfectly written article.

## YOUR CAPABILITIES (USE THEM):

1. **WEB SEARCH**: You have Google Search grounding. You CAN and SHOULD search for real-time data — stock prices, news, weather, sports scores, latest events. NEVER say "I cannot access real-time data" — you CAN.

2. **FILE GENERATION**: You CAN create downloadable PDF, Markdown, Code, and Text files. Use <file> blocks (see FILE GENERATION section). When user asks for a report/document — CREATE IT. Never say "I cannot generate files".

3. **REPORT CREATION**: You can create professional reports: financial reports, research papers, technical docs, stock analysis, business plans, project summaries. Search for data FIRST, then create a comprehensive <file> block.

4. **AGENTIC WORKFLOW** — For reports, analysis, or any complex request:
   Step 1: UNDERSTAND what the user needs (report type, topic, format)
   Step 2: SEARCH — Use your web search to find real-time data, facts, numbers, prices, statistics
   Step 3: ANALYZE — Process the data, identify trends, key points, comparisons
   Step 4: STRUCTURE — Organize into a professional document with headings, tables, analysis
   Step 5: CREATE — Output a <file> block with the complete professional document
   Step 6: SUMMARIZE — Give a brief summary of key findings OUTSIDE the file block

5. **NEVER REFUSE** tasks you can do. You CAN:
   - Create stock/financial reports with real current prices (SEARCH for them)
   - Generate research papers on any topic
   - Build comparison tables with real specifications
   - Create business plans, technical documentation, project proposals
   - Analyze trends from search results and present findings
   - Convert data into formatted tables, charts descriptions, and visualizations

## HOW TO WRITE:

1. **ANSWER FIRST**: The answer goes in the FIRST sentence. Not after a preamble.

2. **NATURAL PROSE, NOT TEMPLATES**: Write in flowing paragraphs with **bold** key terms. NEVER use generic template headings like "Overview", "Definition", "Key Points", "Steps", "Summary", "Conclusion", "Context". If you need headings, make them SPECIFIC and interesting -- use em dashes for style.

3. **ZERO FILLER**: Never start with "Great question!", "Sure!", "Here is...", "I'd be happy to...". Never restate the question. Jump straight to the answer.

4. **BOLD the right things**: Bold **key terms**, **app names**, **shortcuts**, **important actions**. Not entire sentences. Readers scan -- bold helps them find what matters.

5. **HEADINGS -- only when earned**: Use headings ONLY when the answer has 3+ genuinely distinct sections. Short answers (under 150 words) should NEVER have headings.

6. **LISTS -- only when parallel**: Bullet points for genuinely parallel items (minimum 3). Two items = prose. Don't bullet-point everything.

7. **TABLES**: Use for comparing 3+ options across 3+ attributes. Alternating data looks great in our renderer. Never use when prose would be clearer.

8. **INLINE CODE**: Use backticks for commands, filenames, shortcuts: \`Ctrl+Shift+Esc\`, \`npm install\`.

9. **HORIZONTAL RULES** (---): Use between major sections only. Not after every paragraph.

## MATH -- CRITICAL RULES

ALL mathematics MUST use LaTeX with dollar sign delimiters. This is NON-NEGOTIABLE:

- **Inline math**: $x^2 + y^2 = r^2$ -- use $...$
- **Display math**: on its own line use $$...$$ -- Example: $$\\\\sum_{i=1}^{n} i = \\\\frac{n(n+1)}{2}$$

NEVER use these (they WILL NOT render):
- \\\\( ... \\\\) -- BROKEN
- ( \\\\frac{a}{b} ) -- BROKEN
- backtick code blocks for math
- Plain text for Greek letters (write $\\\\alpha$, not "alpha")

Use LaTeX for ALL of these:
- Fractions: $\\\\frac{a}{b}$, $\\\\dfrac{\\\\partial f}{\\\\partial x}$
- Greek: $\\\\alpha, \\\\beta, \\\\gamma, \\\\theta, \\\\omega, \\\\Sigma, \\\\Delta$
- Operators: $\\\\sin, \\\\cos, \\\\tan, \\\\log, \\\\ln, \\\\lim$
- Integrals: $\\\\int_a^b f(x)\\\\,dx$
- Sums/Products: $\\\\sum_{i=0}^n$, $\\\\prod_{k=1}^N$
- Sets: $\\\\mathbb{R}, \\\\mathbb{N}, \\\\in, \\\\subseteq, \\\\cup, \\\\cap$
- Logic: $\\\\forall, \\\\exists, \\\\Rightarrow, \\\\Leftrightarrow$
- Matrices: \\\\begin{pmatrix}...\\\\end{pmatrix}
- Cases: \\\\begin{cases}...\\\\end{cases}
- Boxed final answers: $\\\\boxed{answer}$
- Aligned equations: \\\\begin{aligned}...\\\\end{aligned} inside $$

For step-by-step math, use display math ($$) for each major step with brief prose between steps.

ABSOLUTE RULE FOR MATH ANSWERS — ZERO EXCEPTIONS:
- EVERY LaTeX command (\\frac, \\int, \\sum, \\alpha, \\omega, \\text, etc.) MUST be inside $...$ or $$...$$. Writing \\frac{a}{b} without dollar signs is CATASTROPHICALLY BROKEN — it will NOT render.
- Every variable with subscript/superscript: $P_{avg}$, $\\omega_0$, $E_{kinetic}$, $v^2$ — ALWAYS use $..$, never write P_{avg} bare.
- For solving problems, use this EXACT format:

  One short sentence of context.

  $$equation$$

  One sentence to explain the next step.

  $$next equation$$

  Therefore $\\boxed{final answer}$.

- NEVER mix equations inside a prose paragraph. Each equation gets its OWN display line with $$.
- Keep explanations between steps to ONE sentence. No paragraphs.
- WRONG: "The average power dissipated is P_{avg} = \\frac{1}{T} \\int_0^T"
- RIGHT: "The average power dissipated is"
  $$P_{\\text{avg}} = \\frac{1}{T}\\int_0^T \\frac{(Blv)^2}{R}\\,dt$$

## SCIENTIFIC & DATA FORMATTING

- **Chemical equations**: $2H_2 + O_2 \\\\rightarrow 2H_2O$
- **Physics**: $F = ma$, $E = mc^2$, $\\\\vec{F} = q(\\\\vec{E} + \\\\vec{v} \\\\times \\\\vec{B})$
- **Statistics**: $\\\\bar{x} = \\\\frac{1}{n}\\\\sum x_i$, $\\\\sigma = \\\\sqrt{\\\\frac{\\\\sum(x_i - \\\\mu)^2}{N}}$
- **Units**: $9.8 \\\\text{ m/s}^2$, $3 \\\\times 10^8 \\\\text{ m/s}$
- **Truth tables**: Use markdown tables with P, Q columns
- **Number formatting**: Commas for thousands (1,234,567)


## FILE GENERATION — PROACTIVE AGENTIC WORKFLOW

You CAN generate downloadable files. Use this XML syntax:
<file name="filename.ext" type="pdf|docx|markdown|code|text">
Full content in Markdown format. Will be converted to a professionally styled document.
</file>

## TERMINAL EXECUTION — YOUR MOST POWERFUL TOOL 🛠️
You have a REAL terminal. Commands you put in \`<terminal>\` blocks are ACTUALLY EXECUTED on the user's machine and the output is returned to you. This is your superpower.

**Syntax:**
\`<terminal>\`command here\`</terminal>\`

**Available commands — you can run ANYTHING:**
- **Python scripts**: \`python script.py\` — for PDF generation, data processing, charts
- **pip install**: \`pip install package-name\` — install any Python package
- **File operations**: \`copy\`, \`move\`, \`del\`, \`mkdir\`, \`type\` (Windows commands)
- **Node.js**: \`node -e "console.log('hello')"\`
- **Any CLI tool**: curl, git, ffmpeg, etc.

### 🔥 PROFESSIONAL PDF GENERATION (USE THIS!)
For reports, stock analysis, documents with charts/tables — use the Python PDF generator:

\`<terminal>\`python "C:/Harshil projects/eterx-browser/scripts/eterx_pdf_gen.py" '{"title":"Report Title","subtitle":"Optional","author":"EterX","sections":[{"heading":"Section","type":"text","content":"Paragraph text here"},{"heading":"Data","type":"table","data":[["Col1","Col2"],["val1","val2"]]},{"heading":"Chart","type":"chart","chart_type":"bar","chart_data":{"labels":["A","B","C"],"datasets":[{"label":"Series","data":[10,20,30]}]}},{"type":"callout","content":"Key insight","callout_type":"info"}]}' report.pdf\`</terminal>\`

**Section types available:**
- \`"type":"text"\` — paragraphs (supports **bold** with \`**text**\`)
- \`"type":"table"\` — styled table with \`"data":[["headers"],["row1"],["row2"]]\`
- \`"type":"chart"\` — \`chart_type\`: "bar", "line", "pie". Data format: \`{"labels":[...],"datasets":[{"data":[...]}]}\`
- \`"type":"callout"\` — highlight box. \`callout_type\`: "info", "success", "warning", "danger"
- \`"type":"page_break"\` — insert a page break

### 📊 WHEN TO USE TERMINAL vs FILE BLOCKS:
- **USE \`<terminal>\`** for: PDFs with CHARTS, complex tables, stock data, professional reports, code execution, file conversion, any real work
- **USE \`<file>\`** for: quick text documents, markdown exports, simple code files
- **ALWAYS prefer terminal** for any document the user wants as a "real PDF" with professional formatting

### 💡 SMART EXAMPLES:
**Stock report with chart:**
\`<terminal>\`python "C:/Harshil projects/eterx-browser/scripts/eterx_pdf_gen.py" '{"title":"NIFTY 50 Analysis","sections":[{"heading":"Market Overview","type":"text","content":"Current market..."},{"heading":"Price History","type":"chart","chart_type":"line","chart_data":{"labels":["Jan","Feb","Mar"],"datasets":[{"data":[21000,21500,22000]}]}},{"heading":"Top Stocks","type":"table","data":[["Stock","Price","Change"],["TCS","3500","+2.1%"],["Infosys","1580","-0.5%"]]}]}' nifty_report.pdf\`</terminal>\`

**Run user's code:**
\`<terminal>\`python -c "print('Hello from EterX!')" \`</terminal>\`

**Install a package:**
\`<terminal>\`pip install numpy\`</terminal>\`

**Create a file:**
\`<terminal>\`python -c "with open('data.csv','w') as f: f.write('Name,Score\\nAlice,95\\nBob,87')" \`</terminal>\`

### CRITICAL RULES:
1. The terminal runs in the EterX workspace directory. Output files appear there.
2. After generating a PDF, the system auto-downloads it for the user.
3. You can chain multiple \`<terminal>\` blocks — they execute sequentially.
4. ALWAYS use full paths for the Python scripts: "C:/Harshil projects/eterx-browser/scripts/eterx_pdf_gen.py"
5. For JSON with quotes inside, use single quotes for the outer JSON wrapper on Windows.
6. The output of each command is captured and shown to the user.


**CRITICAL RULE — DOCUMENT GENERATION:**
When the user asks for a "report", "document", "pdf", "analysis", "deep research", "5 page report", etc., you MUST use the terminal to generate a REAL PDF:
1. Search the web for data.
2. Build a JSON spec with title, sections (text, table, chart, callout, kpi, summary).
3. Write the JSON to a file using a \`<terminal>\` block.
4. Run the PDF generator using another \`<terminal>\` block.
5. The system auto-downloads the PDF for the user.
6. Reply with ONE sentence: "I've generated your report."

**Example — user asks "create a stock market report":**
<terminal>python -c "import json; data={'title':'Stock Market Report','subtitle':'Live Analysis','author':'EterX','sections':[{'heading':'Executive Summary','type':'summary','content':'Market analysis...'},{'heading':'Market Data','type':'table','data':[['Metric','Value'],['Sensex','78500'],['Nifty','23800']]},{'heading':'Trend','type':'chart','chart_type':'line','chart_data':{'labels':['Mon','Tue','Wed','Thu','Fri'],'datasets':[{'data':[78200,78400,78100,78600,78500]}]}},{'type':'callout','content':'Key insight here','callout_type':'info'}]}; f=open('spec.json','w'); json.dump(data,f); f.close(); print('JSON written')"</terminal>
<terminal>python "C:/Harshil projects/eterx-browser/scripts/eterx_pdf_gen.py" spec.json stock_report.pdf</terminal>

**DO NOT use \`<file type="pdf">\` for reports anymore.** Use \`<file>\` ONLY for quick text, markdown, or code files.
**DO NOT print the entire report as raw text in chat.** Use terminal to generate a real PDF.


## RESPONSE CALIBRATION
- Simple fact: 1-3 sentences. No headers. No bullets.
- How-to: Prose with **bold actions** and \`inline code\`.
- Code question: Code block FIRST with language tag, then 2-4 line explanation.
- Math: Step-by-step with LaTeX display math. Bold final answer with $\\\\boxed{}$.
- Deep analysis: As long as needed, with specific headers and prose.
- Chat/casual: Match user energy. Short question = short answer.
- **REPORTS/DOCUMENTS**: Search for real data FIRST. Create a <file> block with comprehensive content. Include tables with real numbers. Give a brief summary outside the file block.
- **Comparison/Product info**: Use tables with real specifications from search. Include prices, features, ratings.
- **News/Current events**: Search for latest info. Present with dates, sources, key facts.

## ULTIMATE CREATIVE FREEDOM & EXPERT DESIGN FOR PDFS:
When creating a <file type="pdf">, you have ABSOLUTE CREATIVE FREEDOM to design the document. You are a master of typography, layout, and data visualization. 
- You can generate MASSIVE reports (up to 50 pages equivalent of content) if the user asks for comprehensive analysis or a "deep report".
- **COLORS & HIGHLIGHTS**: You MUST use inline HTML/CSS to inject color and highlights into your markdown! 
  - Example: \`<span style="color: #ea580c; font-weight: bold;">Critical Finding</span>\`
  - Example: \`<div style="background: #eff6ff; padding: 15px; border-left: 4pt solid #3b82f6;">Key Takeaway Here</div>\`
  - Example: \`<mark style="background: #fef08a;">Highlighted text</mark>\`
- **BEAUTIFUL TABLES**: Create massive, comprehensive tables. Use inline styling on table cells if you want to color-code data logic (e.g., green for positive, red for negative).
- **MANDATORY FOR REPORTS**: Include a massive Title Page, an Executive Summary, and deep Data Analysis. Do NOT hallucinate data. Do NOT output standard chat text outside of the file block if the user strictly asked for a document.

## BANNED
- Generic headings: "Overview", "Key Points", "Summary", "Steps", "Context"
- Filler words, restating the question
- \\\\( \\\\) or ( \\\\command ) for math. ALWAYS use $...$ or $$...$$
- Tables with only 2 rows or columns
- "In conclusion...", "To summarize..."
- NEVER include markdown images ![](url) in your responses. System handles images separately.
- NEVER say "I cannot provide real-time data" — you HAVE web search, USE IT
- NEVER say "I cannot generate files/PDFs/documents" — you CAN with <file> blocks
- NEVER say "I cannot access" or "My capabilities are limited" — you are an agentic AI with search, file generation, and analysis tools
- NEVER refuse to create reports/documents. If user asks for one, CREATE IT with real data from search.
- 🚨 NEVER OUTPUT A REPORT, LONG DOCUMENT, OR DEEP ANALYSIS AS PLAIN CHAT TEXT. IT MUST BE INSIDE A \`<file type="pdf">\` BLOCK. IF YOU PRINT A MASSIVE ESSAY OR REPORT IN THE CHAT, YOU FAIL. Chat is only for short answers.


## SIDEBAR NOTE:
This is a narrow sidebar. Keep lines compact. Use --- between big sections. Blockquotes (>) only for Final Answer or Key Insight callouts.

## TONE: Direct. Professional. Warm. Like Claude but sharper and more scientific.`;



    // Auto-resize textarea
    React.useLayoutEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
        }
    }, [input]);

    const streamText = async (id: string, fullText: string) => {
        // Line-based streaming â€” much fewer React re-renders = no lag
        // Each line is one state update (vs. hundreds for word-by-word)
        const lines = fullText.split('\n');
        let current = '';

        for (let i = 0; i < lines.length; i++) {
            current += (i === 0 ? '' : '\n') + lines[i];
            setTurns(prev => prev.map(t => t.id === id ? { ...t, text: current } : t));
            // Fast delay â€” just enough for smooth visual flow
            await new Promise(r => setTimeout(r, 12));
        }
        setTurns(prev => prev.map(t => t.id === id ? { ...t, text: fullText, status: 'done' } : t));
    };

    const handleSend = async () => {
        if (!input.trim() && attachments.length === 0) return;
        const text = input;
        const currentAttachments = [...attachments];
        setInput('');
        setAttachments([]);
        setIsThinking(true);
        abortControllerRef.current = new AbortController();

        // --- Computer Use Detection ---
        // If "AGENT ON" toggle is active, we force computer use for ANY query that isn't empty.
        // Otherwise, we fall back to keyword heuristic + optional LLM classification (if we add it back later).

        // Final Decision: Only trigger if the user explicitly has the AGENT ON toggle active
        const shouldTriggerAgent = computerUseActive;

        console.log(`[SmartSidebar] Agent Trigger Check: Toggle=${ computerUseActive } -> ${ shouldTriggerAgent }`);

        if (shouldTriggerAgent) {
            console.log("Triggering Computer Use Agent");
            // Ensure visual state is active
            if (!computerUseActive) setComputerUseActive(true);

            // Add User Message
            const computerUseTurn: ChatTurn = {
                id: Date.now().toString(),
                role: 'user',
                text: text,
                timestamp: Date.now(),
                context: 'Computer Use'
            };

            const aiTurnId = (Date.now() + 1).toString();
            const aiTurn: ChatTurn = {
                id: aiTurnId,
                role: 'assistant',
                text: '',
                timestamp: Date.now(),
                status: 'thinking',
                context: 'Agent Worker'
            };

            setTurns(prev => [...prev, computerUseTurn, aiTurn]);

            console.log("[SmartSidebar] V2 Agent will be invoked here.");

            // @ts-ignore
            if (window.electron && window.electron.startBrowserAgent) {
                // @ts-ignore
                window.electron.startBrowserAgent(text, zeroClickMode).then(result => {
                    if (result && result.error) {
                        setTurns(prev => prev.map(t => t.id === aiTurnId ? { ...t, text: t.text + `\n❌ Error: ${ result.error }`, status: 'error' } : t));
                        setComputerUseActive(false);
                        setIsThinking(false);
                    }
                }).catch(err => {
                    setTurns(prev => prev.map(t => t.id === aiTurnId ? { ...t, text: t.text + `\n❌ IPC Error: ${ err.message }`, status: 'error' } : t));
                    setComputerUseActive(false);
                    setIsThinking(false);
                });
            }
            return;
        }

        // --- Context Capture (Conditional) ---
        let contextText = '';
        const lowerText = text.toLowerCase();
        const contextKeywords = ['page', 'site', 'website', 'screen', 'look', 'see', 'analyze', 'this', 'summary', 'check', 'read'];

        try {
            // @ts-ignore
            if (window.electron && window.electron.captureActiveTab && contextKeywords.some(k => lowerText.includes(k))) {
                // @ts-ignore
                const context = await window.electron.captureActiveTab();
                if (context) {
                    if (context.screenshot) {
                        // Add screenshot as attachment if specifically requested
                        if (lowerText.includes('screen') || lowerText.includes('look') || lowerText.includes('see') || lowerText.includes('this')) {
                            currentAttachments.push({
                                id: 'ctx-' + Date.now(),
                                file: new File([''], 'screenshot.jpg', { type: 'image/jpeg' }),
                                base64: context.screenshot,
                                type: 'image/jpeg',
                                preview: `data:image/jpeg;base64,${ context.screenshot }`
                            });
                        }
                    }
                    if (context.url) {
                        contextText = `\n\n[System - Active Tab Context]\nTitle: ${ context.title }\nURL: ${ context.url }`;
                    }
                }
            }
        } catch (e) {
            console.error("Context capture failed", e);
        }
        // -----------------------------

        // Add User Message
        const normalUserTurn: ChatTurn = {
            id: Date.now().toString(),
            role: 'user',
            text: text,
            timestamp: Date.now(),
            context: activePageTitle,
            attachments: currentAttachments // Persist attachments in history
        };

        setTurns(prev => [...prev, normalUserTurn]);
        setActiveContext(activePageTitle);

        // Initialize AI Turn ID early for error handling access
        const aiTurnId = (Date.now() + 1).toString();

        try {
            // Simulate AI Response
            setTurns(prev => [...prev, {
                id: aiTurnId,
                role: 'assistant',
                text: '',
                thoughtText: '',
                sources: [],
                timestamp: Date.now(),
                status: 'thinking'
            }]);

            const isImageGen = /^(generate|create|draw|make|render|imagine)\b.*\b(image|picture|photo|logo|drawing|art)/i.test(text.toLowerCase().trim());

            if (isImageGen && currentAttachments.length === 0) {
                const base64Image = await GeminiService.generateImage(text);
                setTurns(prev => prev.map(t => t.id === aiTurnId ? {
                    ...t,
                    text: "Here is your generated image:",
                    inlineImage: base64Image,
                    status: 'done'
                } : t));
                setIsThinking(false);
                return;
            }

            // Construct Gemini Payload
            const geminiAttachments = currentAttachments.map(a => ({
                data: a.base64,
                mimeType: a.type
            }));

            // Construct Memory Context (Last 10 turns for Native history representation)
            const recentHistory = turns
                .filter(t => t.status === 'done' && t.context !== 'Agent Worker')
                .slice(-10)
                .map(t => ({
                    role: t.role === 'user' ? 'user' : 'model',
                    parts: [{ text: t.text }]
                }));

            const stream = GeminiService.streamChat(
                recentHistory,
                text + contextText,
                ETERX_SYSTEM_PROMPT,
                true, // API-level thinking
                geminiAttachments,
                true  // API-level search
            );

            let accumulatedText = '';
            let accumulatedThoughts = '';
            let accumulatedSources: { url: string, title: string, snippet?: string }[] = [];

            for await (const chunk of stream) {
                if (abortControllerRef.current?.signal.aborted) {
                    break;
                }

                if (chunk.type === 'thought') {
                    accumulatedThoughts += chunk.text;
                } else if (chunk.type === 'content') {
                    accumulatedText += chunk.text;
                } else if (chunk.type === 'source' && chunk.url) {
                    // Only add if source isn't already present
                    if (!accumulatedSources.some(s => s.url === chunk.url)) {
                        accumulatedSources.push({ url: chunk.url, title: chunk.title || 'Source', snippet: (chunk as any).snippet });
                    }
                }

                setTurns(prev => prev.map(t => t.id === aiTurnId ? {
                    ...t,
                    text: accumulatedText,
                    thoughtText: accumulatedThoughts,
                    sources: accumulatedSources
                } : t));

                // Keep smooth UI rendering by deferring Event Loop
                await new Promise(r => setTimeout(r, 0));
            }

            if (abortControllerRef.current?.signal.aborted) {
                setTurns(prev => prev.map(t => t.id === aiTurnId ? { ...t, text: accumulatedText + " [Stopped]", status: 'stopped' } : t));
            } else {
                // ──── TERMINAL BLOCK EXECUTION ────
                // Scan for <terminal>...</terminal> blocks and execute them
                const terminalRegex = /<terminal\b[^>]*>([\s\S]*?)<\/terminal>/g;
                let termMatch;
                let executionResults = '';

                while ((termMatch = terminalRegex.exec(accumulatedText)) !== null) {
                    const command = termMatch[1].trim();
                    if (!command) continue;

                    console.log('[SmartSidebar] ▶ Executing terminal command:', command);

                    // Update turn to show execution status
                    setTurns(prev => prev.map(t => t.id === aiTurnId ? {
                        ...t,
                        text: accumulatedText + `\n\n> ⚡ Executing: \`${ command.substring(0, 80) }${ command.length > 80 ? '...' : '' }\`\n`,
                        status: 'thinking'
                    } : t));

                    try {
                        // @ts-ignore
                        if (window.electron?.executeTerminal) {
                            // @ts-ignore
                            const result = await window.electron.executeTerminal(command);

                            if (result.success) {
                                console.log('[SmartSidebar] ✅ Terminal success:', result.stdout.substring(0, 200));

                                // Check if a file was generated (look for PDF_OUTPUT marker)
                                const outputMatch = result.stdout.match(/PDF_OUTPUT:(.+)/);
                                if (outputMatch) {
                                    const filePath = outputMatch[1].trim();
                                    const fileName = filePath.split(/[/\\]/).pop() || 'document.pdf';
                                    executionResults += `\n\n✅ **Generated:** \`${ fileName }\`\n`;

                                    // Read the file for download
                                    // @ts-ignore
                                    const fileData = await window.electron.readWorkspaceFile(fileName);
                                    if (fileData?.success && fileData.data) {
                                        // Create a blob URL for download
                                        const binary = atob(fileData.data);
                                        const bytes = new Uint8Array(binary.length);
                                        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                                        const blob = new Blob([bytes], { type: fileData.mimeType || 'application/pdf' });
                                        const url = URL.createObjectURL(blob);

                                        // Auto-trigger download
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = fileName;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);

                                        executionResults += `📥 Download started for **${ fileName }** (${ (fileData.size / 1024).toFixed(1) } KB)\n`;
                                    }
                                } else {
                                    // Show stdout as terminal output
                                    const stdout = result.stdout.trim();
                                    if (stdout) {
                                        executionResults += `\n\n\`\`\`\n${ stdout.substring(0, 2000) }\n\`\`\`\n`;
                                    }
                                    executionResults += '\n✅ Command completed successfully.\n';
                                }
                            } else {
                                console.error('[SmartSidebar] ❌ Terminal error:', result.stderr);
                                executionResults += `\n\n❌ **Error:** \`${ result.stderr.substring(0, 300) }\`\n`;
                            }
                        } else {
                            executionResults += '\n\n⚠️ Terminal execution not available.\n';
                        }
                    } catch (e: any) {
                        console.error('[SmartSidebar] Terminal exception:', e);
                        executionResults += `\n\n❌ **Execution failed:** ${ e.message }\n`;
                    }
                }

                // Append any terminal execution results
                if (executionResults) accumulatedText += executionResults;

                // ──── AGENTIC AUTO-DETECT: Generate PDF when user asks for documents ────
                const docKeywords = /\b(report|pdf|document|analysis|paper|generate.*doc|deep.*research|stock.*report|market.*report|create.*report)\b/i;
                const userAskedForDoc = docKeywords.test(text);

                // @ts-ignore
                if (userAskedForDoc && !executionResults && window.electron?.executeTerminal) {
                    console.log('[SmartSidebar] 📄 Auto-detected document request. Generating PDF agentically...');

                    setTurns(prev => prev.map(t => t.id === aiTurnId ? {
                        ...t, text: accumulatedText + '\n\n---\n> 📄 **Generating professional PDF...**', status: 'thinking'
                    } : t));
                    await new Promise(r => setTimeout(r, 400));

                    try {
                        // Parse AI text into sections
                        const aiLines = accumulatedText.split('\n');
                        const sections: any[] = [];
                        let currentContent = '';
                        let docTitle = '';

                        for (const line of aiLines) {
                            const t = line.trim();
                            if (!t) { currentContent += '\n'; continue; }
                            if (t.startsWith('# ') && !docTitle) { docTitle = t.substring(2); continue; }
                            if (t.startsWith('## ') || t.startsWith('### ')) {
                                if (currentContent.trim()) sections.push({ type: 'text', heading: '', content: currentContent.trim() });
                                currentContent = '';
                                sections.push({ type: 'text', heading: t.replace(/^#+\s*/, ''), content: '' });
                            } else if (t.startsWith('|') && t.endsWith('|') && !t.match(/^\|[\s-|]+\|$/)) {
                                const last = sections[sections.length - 1];
                                const cells = t.split('|').filter((c: string) => c.trim()).map((c: string) => c.trim());
                                if (last?.type === 'table') { last.data.push(cells); }
                                else {
                                    if (currentContent.trim()) sections.push({ type: 'text', heading: '', content: currentContent.trim() });
                                    currentContent = '';
                                    sections.push({ type: 'table', heading: '', data: [cells] });
                                }
                            } else {
                                const last = sections[sections.length - 1];
                                if (last?.type === 'text' && last.heading && !last.content) last.content += t + '\n';
                                else currentContent += t + '\n';
                            }
                        }
                        if (currentContent.trim()) sections.push({ type: 'text', heading: '', content: currentContent.trim() });
                        if (!docTitle) docTitle = text.substring(0, 60);

                        const spec = JSON.stringify({
                            title: docTitle.substring(0, 80),
                            subtitle: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                            author: 'EterX Intelligence',
                            sections: sections.filter(s => s.content?.trim() || (s.data && s.data.length > 1))
                        });

                        setTurns(prev => prev.map(t => t.id === aiTurnId ? {
                            ...t, text: accumulatedText + '\n\n---\n> 📊 **Building document structure** (' + sections.length + ' sections)...', status: 'thinking'
                        } : t));
                        await new Promise(r => setTimeout(r, 300));

                        // Write spec via base64 to avoid all quoting issues
                        const b64Spec = btoa(unescape(encodeURIComponent(spec)));
                        // @ts-ignore
                        await window.electron.executeTerminal(`python -u -c "import base64;d=base64.b64decode('${ b64Spec }');f=open('eterx_spec.json','wb');f.write(d);f.close();print('SPEC_OK',flush=True)"`);

                        setTurns(prev => prev.map(t => t.id === aiTurnId ? {
                            ...t, text: accumulatedText + '\n\n---\n> 🖨️ **Rendering PDF with charts & tables...**', status: 'thinking'
                        } : t));
                        await new Promise(r => setTimeout(r, 300));

                        const pdfName = docTitle.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_').substring(0, 40) + '.pdf';
                        // @ts-ignore
                        const genResult = await window.electron.executeTerminal(
                            `python -u "C:/Harshil projects/eterx-browser/scripts/eterx_pdf_gen.py" eterx_spec.json "${ pdfName }"`
                        );

                        if (genResult?.stdout?.includes('PDF_OUTPUT:')) {
                            const fName = genResult.stdout.match(/PDF_OUTPUT:(.+)/)?.[1]?.trim().split(/[/\\]/).pop() || pdfName;
                            const pages = genResult.stdout.match(/PDF_PAGES:(\d+)/)?.[1] || '?';
                            // @ts-ignore
                            const fileData = await window.electron.readWorkspaceFile(fName);
                            if (fileData?.success && fileData.data) {
                                const binary = atob(fileData.data);
                                const bytes = new Uint8Array(binary.length);
                                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                                const blob = new Blob([bytes], { type: 'application/pdf' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a'); a.href = url; a.download = fName;
                                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                                accumulatedText += `\n\n---\n✅ **PDF Generated:** \`${ fName }\` — ${ pages } pages\n📥 Download started automatically.`;
                            }
                        } else {
                            console.warn('[SmartSidebar] PDF gen output:', genResult?.stdout, genResult?.stderr);
                        }
                    } catch (e: any) {
                        console.error('[SmartSidebar] Agentic PDF error:', e);
                    }
                }

                setTurns(prev => prev.map(t => t.id === aiTurnId ? { ...t, text: accumulatedText, status: 'done' } : t));
            }

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log("Request aborted");
                setTurns(prev => prev.map(t => t.id === aiTurnId ? { ...t, text: "Generation stopped by user.", status: 'stopped' } : t));
                return;
            }
            console.error(error);
            setTurns(prev => [...prev, {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                text: "I encountered an error processing your request.",
                timestamp: Date.now(),
                status: 'error'
            }]);
        } finally {
            setIsThinking(false);
            abortControllerRef.current = null;
        }
    };



    const handleStop = () => {
        if (computerUseActive) {
            // @ts-ignore
            if (window.electron && window.electron.stopComputerUse) {
                // @ts-ignore
                window.electron.stopComputerUse();
            }
            setComputerUseActive(false);
            setIsThinking(false);
            return;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsThinking(false);
        }
    };


    const handleTabChange = (tab: 'Chat' | 'Search' | 'Agent') => {
        if (tab === activeTab) return;

        setActiveTab(tab);
        // CRITICAL DECOUPLING: Top Bar ALWAYS starts a fresh chat/context
        setTurns([]);
        setAgentLogs([]);
        setAgentSteps([]); // Clear agent steps when switching tabs
        setIsThinking(false);

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        if (tab === 'Agent' && !computerUseActive) {
            console.log("[SmartSidebar] Starting V2 Agent Mode...");
            setComputerUseActive(true);
            setQueryMode('Agent'); // Sync local query mode for UX
        } else if (tab !== 'Agent' && computerUseActive) {
            console.log("[SmartSidebar] Halting V2 Agent...");
            // @ts-ignore
            if (window.electron && window.electron.stopBrowserAgent) {
                // @ts-ignore
                window.electron.stopBrowserAgent();
            }
            setComputerUseActive(false);
            setQueryMode(tab === 'Search' ? 'Search' : 'Default');
        } else {
            // General sync styling
            setQueryMode(tab === 'Search' ? 'Search' : 'Default');
        }
    };

    // --- Render ---

    if (!isOpen) return null;

    return (
        <div
            className="relative w-[420px] h-full bg-white flex flex-col font-sans overflow-hidden"
        >
            {/* --- Rainbow Cursor Styles --- */}
            <style>{`
                @keyframes rainbow-caret {
                    0% { caret-color: #EF4444; } /* Red */
                    25% { caret-color: #EAB308; } /* Yellow */
                    50% { caret-color: #22C55E; } /* Green */
                    75% { caret-color: #3B82F6; } /* Blue */
                    100% { caret-color: #EF4444; } /* Red */
                }
                .rainbow-cursor {
                    animation: rainbow-caret 4s infinite linear;
                    caret-width: 3px;
                }
                .input-glass-container {
                    background: transparent;
                    position: relative;
                }
                .input-glass-container:focus-within {
                    /* Removed block background on focus */
                }
            `}</style>

            {/* ZONE A: TOPBAR - Pure White Minimalist */}
            <div className="h-[52px] flex items-center justify-between px-5 bg-white border-b border-gray-100 sticky top-0 z-30 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-1.5 -ml-1.5 hover:bg-gray-50 rounded-lg transition-colors text-gray-500">
                        <ArrowLeft size={18} strokeWidth={1.5} />
                    </button>
                    {/* Dynamic Wordmark */}
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={activeTab}
                            initial={{ opacity: 0, y: 2 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -2 }}
                            transition={{ duration: 0.15 }}
                            className="text-[17.5px] text-black font-semibold tracking-tight leading-none pt-0.5"
                            style={{ fontFamily: "var(--font-serif)" }}
                        >
                            {activeTab}
                        </motion.span>
                    </AnimatePresence>
                </div>

                <div className="flex items-center gap-3">
                    {/* Mode Switcher Pill */}
                    <div className="relative flex items-center bg-[#F4F4F5] rounded-full p-[4px] border border-gray-100/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.03)]">
                        {(['Chat', 'Search', 'Agent'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => handleTabChange(tab)}
                                className={`relative px-3.5 py-1 text-[11.5px] tracking-wide rounded-full transition-all focus:outline-none z-10 ${ activeTab === tab ? 'text-black font-bold' : 'text-gray-400 hover:text-gray-800 font-semibold'
                                    }`}
                            >
                                <span className="flex items-center gap-1.5">
                                    {tab === 'Agent' && activeTab === 'Agent' && <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></span>}
                                    {tab.toUpperCase()}
                                </span>
                                {activeTab === tab && (
                                    <motion.div
                                        layoutId="activeTabPill"
                                        className="absolute inset-0 bg-white rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.08)] border border-gray-100/80 -z-10"
                                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    <button className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors text-gray-500">
                        <Menu size={18} strokeWidth={1.5} />
                    </button>
                </div>
            </div>

            {/* TOP FUMES (White Fade) floating over content */}
            <div className="absolute top-[52px] left-0 right-0 h-10 bg-gradient-to-b from-white to-transparent z-20 pointer-events-none" />

            {/* 2. Chat Area */}
            <div
                className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-10 pb-4 space-y-4 custom-scrollbar relative z-10"
                onClick={() => setActiveSourceTurnId(null)}
                onScroll={handleScroll}
            >

                {/* ZONE C: CONTENT STAGE - Empty State */}
                {turns.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6">
                        <div className="pointer-events-auto w-full max-w-[320px] flex flex-col gap-3 -mt-16">
                            {/* Watermark Logo */}
                            <div className="mb-12 text-center select-none opacity-[0.06]">
                                <h1 className="text-[100px] font-bold tracking-tighter leading-none" style={{ fontFamily: "var(--font-serif)" }}>EterX</h1>
                            </div>

                        </div>
                    </div>
                )}

                {turns.map((turn) => (
                    <div key={turn.id} className={`flex flex-col ${ turn.role === 'user' ? 'items-end' : 'items-start' } animate-in fade-in slide-in-from-bottom-2 duration-300`}>

                        {/* Message Bubble */}
                        <div
                            className={`
                                text-[14.5px] leading-[1.65] font-medium tracking-normal group break-words whitespace-pre-wrap font-sans
                                ${ turn.role === 'user'
                                    ? 'max-w-[85%] bg-[#F4F4F5] text-gray-900 rounded-2xl rounded-tr-[4px] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
                                    : 'bg-transparent text-gray-800 px-0 w-full max-w-full'
                                }
                            `}
                        >
                            {/* Render User Attachments in Chat */}
                            {turn.attachments && turn.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {turn.attachments.map(att => {
                                        const isImg = att.type.includes('image');
                                        if (isImg && att.preview) {
                                            return (
                                                <div
                                                    key={att.id}
                                                    className="relative w-[140px] h-[140px] rounded-[16px] overflow-hidden border border-gray-100/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer hover:shadow-md transition-shadow"
                                                    onClick={() => setPreviewImage(att.preview!)}
                                                >
                                                    <img src={att.preview} alt="attached" className="w-full h-full object-cover rounded-[16px]" />
                                                </div>
                                            );
                                        }
                                        return (
                                            <div
                                                key={att.id}
                                                className="flex items-center gap-3 p-1.5 pr-5 bg-white rounded-2xl border border-gray-100 shadow-sm w-fit max-w-[260px] cursor-pointer hover:bg-gray-50 transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const now = Date.now();
                                                    if (now - lastDocClick < 1000) return;
                                                    lastDocClick = now;
                                                    // Save to temp and open via local HTTP server
                                                    if (window.electron?.saveTempFile) {
                                                        att.file.arrayBuffer().then(buffer => {
                                                            window.electron.saveTempFile(att.file.name, buffer).then((httpUrl: string) => {
                                                                if (httpUrl) {
                                                                    const finalUrl = httpUrl + `#name=${ encodeURIComponent(att.file.name) }&type=${ encodeURIComponent(att.type) }`;
                                                                    if (onNavigate) onNavigate(finalUrl);
                                                                    else window.open(finalUrl, '_blank');
                                                                }
                                                            });
                                                        });
                                                    }
                                                }}
                                            >
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white ${ att.type.includes('pdf') ? 'bg-[#EF4444]' : 'bg-[#0F76EA]' }`}>
                                                    <FileText size={18} strokeWidth={2.5} />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <p className="text-[13px] font-semibold text-gray-800 truncate leading-tight">{att.file.name.replace(/\.[^/.]+$/, "")}</p>
                                                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">{att.type.split('/')[1] || 'DOC'}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {turn.role === 'assistant' ? (
                                turn.context === 'Agent Worker' ? (
                                    <>
                                        <AgentExecutionUI steps={agentSteps} isActive={computerUseActive} />
                                        {/* Rich final answer below timeline when task is done */}
                                        {turn.text && turn.status === 'done' && !computerUseActive && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.4, delay: 0.2 }}
                                                className="mt-3 rounded-xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/30 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                                            >
                                                <MarkdownRenderer content={turn.text} />
                                            </motion.div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {/* Top sticky TTS pill removed as requested by user - functionality now handled entirely in bottom bar */}
                                        {/* Thinking Signature UI */}
                                        {turn.thoughtText && (
                                            <div className="mb-3 rounded-2xl border border-gray-100 overflow-hidden w-fit max-w-[90%] bg-gradient-to-b from-gray-50/80 to-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                                                <details className="group">
                                                    <summary className="flex items-center gap-2 px-3.5 py-2.5 cursor-pointer select-none outline-none list-none [&::-webkit-details-marker]:hidden">
                                                        <ChevronRight size={11} className="text-gray-400 group-open:rotate-90 transition-transform duration-200" strokeWidth={2.5} />
                                                        <span className="text-[12px] font-semibold text-gray-600 group-hover:text-gray-800 transition-colors flex-1">Thought process</span>
                                                    </summary>
                                                    <div className="px-3.5 pb-3.5 pt-1.5 text-[12px] text-gray-500 leading-[1.7] whitespace-pre-wrap border-t border-gray-100/50">
                                                        {turn.thoughtText}
                                                    </div>
                                                </details>
                                            </div>
                                        )}

                                        {/* Main Text Content */}
                                        <MarkdownRenderer content={turn.text} />

                                        {/* Inline Image Generated by Assistant */}
                                        {turn.inlineImage && (
                                            <div className="mt-4 mb-2 rounded-xl overflow-hidden shadow-sm border border-gray-100 group relative">
                                                <img src={`data:image/png;base64,${ turn.inlineImage }`} alt="Generated" className="w-full h-auto object-cover transform transition-transform duration-700 hover:scale-105" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                                                    <button onClick={() => {
                                                        const link = document.createElement('a');
                                                        link.href = `data:image/png;base64,${ turn.inlineImage }`;
                                                        link.download = `Generated_${ Date.now() }.png`;
                                                        link.click();
                                                    }} className="bg-white/90 hover:bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all shadow-lg active:scale-95">
                                                        <Zap size={15} className="text-purple-600" />
                                                        Save Image
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Bar & Source Pill (Unified Modern Row) */}
                                        {turn.status !== 'thinking' && turn.status !== 'stopped' && (
                                            <div className="relative flex items-center justify-between mt-3 pt-2 transition-all duration-300 w-full">

                                                {/* Left Side: Modern Action Icons */}
                                                <div className="flex items-center gap-1">
                                                    {/* Speaker — modern consistent */}
                                                    <button
                                                        onClick={() => handleSpeak(turn.id, turn.text)}
                                                        disabled={ttsState[turn.id] === 'loading'}
                                                        className={`flex items-center justify-center w-[34px] h-[34px] rounded-[10px] transition-all duration-200 active:scale-95 ${ ttsState[turn.id] === 'loading'
                                                            ? 'text-[#7B85FF] bg-[#EDF1F8] cursor-wait'
                                                            : ttsState[turn.id] === 'playing' || ttsState[turn.id] === 'paused'
                                                                ? 'text-[#7B85FF] bg-[#EDF1F8]'
                                                                : 'text-[#64748B] hover:text-[#7B85FF] bg-transparent hover:bg-[#F4F6FB]'
                                                            }`}
                                                        title={
                                                            ttsState[turn.id] === 'loading' ? 'Generating...'
                                                                : ttsState[turn.id] === 'playing' ? 'Pause'
                                                                    : ttsState[turn.id] === 'paused' ? 'Resume'
                                                                        : 'Read Aloud'
                                                        }
                                                    >
                                                        {ttsState[turn.id] === 'loading'
                                                            ? <svg className="animate-spin text-[#7B85FF]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                                            : ttsState[turn.id] === 'playing'
                                                                ? <svg width="10" height="12" viewBox="0 0 10 14" fill="currentColor"><rect x="0" y="0" width="3" height="14" rx="1.5" /><rect x="7" y="0" width="3" height="14" rx="1.5" /></svg>
                                                                : ttsState[turn.id] === 'paused'
                                                                    ? <Play size={14} strokeWidth={2.5} fill="currentColor" />
                                                                    : <Volume2 size={16} strokeWidth={2.5} />
                                                        }
                                                    </button>
                                                    {/* Copy */}
                                                    <button
                                                        onClick={() => handleCopy(turn.id, turn.text)}
                                                        className={`flex items-center justify-center w-[34px] h-[34px] rounded-[10px] transition-all duration-200 active:scale-95 ${ copiedTurnId === turn.id
                                                            ? 'text-[#475569] bg-[#E2E8F0] shadow-sm'
                                                            : 'text-[#64748B] hover:text-[#475569] bg-transparent hover:bg-[#F1F5F9]'
                                                            }`}
                                                        title={copiedTurnId === turn.id ? 'Copied!' : 'Copy'}
                                                    >
                                                        {copiedTurnId === turn.id
                                                            ? <Check size={16} strokeWidth={3} />
                                                            : <Copy size={16} strokeWidth={2.5} />
                                                        }
                                                    </button>

                                                    {/* Like */}
                                                    <button
                                                        onClick={() => handleFeedback(turn.id, 'up')}
                                                        className={`flex items-center justify-center w-[34px] h-[34px] rounded-[10px] transition-all duration-200 active:scale-95 ${ feedbackMap[turn.id] === 'up'
                                                            ? 'text-[#475569] bg-[#E2E8F0]'
                                                            : 'text-[#64748B] hover:text-[#475569] bg-transparent hover:bg-[#F1F5F9]'
                                                            }`}
                                                        title="Helpful"
                                                    >
                                                        <ThumbsUp size={15} strokeWidth={feedbackMap[turn.id] === 'up' ? 0 : 2} fill={feedbackMap[turn.id] === 'up' ? 'currentColor' : 'none'} className={feedbackMap[turn.id] === 'up' ? 'scale-110 transition-transform stroke-none' : ''} />
                                                    </button>
                                                    {/* Dislike */}
                                                    <button
                                                        onClick={() => handleFeedback(turn.id, 'down')}
                                                        className={`flex items-center justify-center w-[34px] h-[34px] rounded-[10px] transition-all duration-200 active:scale-95 ${ feedbackMap[turn.id] === 'down'
                                                            ? 'text-[#475569] bg-[#E2E8F0]'
                                                            : 'text-[#64748B] hover:text-[#475569] bg-transparent hover:bg-[#F1F5F9]'
                                                            }`}
                                                        title="Not Helpful"
                                                    >
                                                        <ThumbsDown size={15} strokeWidth={feedbackMap[turn.id] === 'down' ? 0 : 2} fill={feedbackMap[turn.id] === 'down' ? 'currentColor' : 'none'} className={feedbackMap[turn.id] === 'down' ? 'scale-110 transition-transform stroke-none' : ''} />
                                                    </button>
                                                </div>

                                                {/* Right Side: Modern Stacked Favicon Sources Pill Trigger */}
                                                <div className="flex items-center">
                                                    {turn.sources && turn.sources.length > 0 && (
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                if (activeSourceTurnId === turn.id) {
                                                                    setActiveSourceTurnId(null);
                                                                } else {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    const spaceBelow = window.innerHeight - rect.bottom;
                                                                    setPopoverDirection(spaceBelow > 400 ? 'down' : 'up');
                                                                    setActiveSourceTurnId(turn.id);
                                                                }
                                                            }}
                                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 font-semibold text-[13px] outline-none border hover:border-gray-300/80 hover:shadow-sm
                                                                ${ activeSourceTurnId === turn.id
                                                                    ? 'bg-white border-gray-200 text-gray-900 shadow-sm ring-2 ring-indigo-500/20'
                                                                    : 'bg-[#F4F4F5] border-transparent text-[#334155]' }`}
                                                        >
                                                            <div className="flex items-center -space-x-1.5 mr-0.5 opacity-90 group-hover/btn:opacity-100">
                                                                {turn.sources.slice(0, 3).map((source, idx) => {
                                                                    const domainUrl = new URL(source.url).hostname;
                                                                    return (
                                                                        <div key={idx} className="w-[18px] h-[18px] rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative z-10" style={{ zIndex: 10 - idx }}>
                                                                            <img
                                                                                src={`https://icons.duckduckgo.com/ip3/${ domainUrl }.ico`}
                                                                                alt={domainUrl}
                                                                                className="w-[12px] h-[12px] object-cover"
                                                                                onError={(e) => {
                                                                                    (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiPjwvY2lyY2xlPjxwYXRoIGQ9Ik0xMiAyQTYgNiAwIDAwMTIuNjgxIDEybDIuOTMxIDIuOTMxQTggOCAwIDAxMTIgMjIiPjwvcGF0aD48L3N2Zz4=';
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            <span>Sources</span>
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Stunning Source Popover Layer - Google Style with Smart Positioning */}
                                                <AnimatePresence>
                                                    {activeSourceTurnId === turn.id && turn.sources && turn.sources.length > 0 && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95, y: popoverDirection === 'up' ? 10 : -10, filter: 'blur(4px)' }}
                                                            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                                                            exit={{ opacity: 0, scale: 0.95, y: popoverDirection === 'up' ? 10 : -10, filter: 'blur(4px)' }}
                                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                            className={`absolute left-0 w-[360px] z-50 bg-white border border-gray-100 rounded-[16px] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] ring-1 ring-black/5 overflow-hidden flex flex-col ${ popoverDirection === 'up' ? 'bottom-full mb-3 origin-bottom-left' : 'top-full mt-3 origin-top-left' }`}
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            <div className="px-5 py-4 border-b border-gray-100/80 flex items-center justify-between bg-[#FAFAFA]">
                                                                <span className="text-[11px] font-bold text-gray-800 tracking-wide uppercase">Cited Context</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setActiveSourceTurnId(null); }} className="text-gray-400 hover:text-black transition-colors bg-white p-1 rounded-full shadow-sm border border-gray-100">
                                                                    <X size={10} strokeWidth={3} />
                                                                </button>
                                                            </div>
                                                            <div className="flex flex-col max-h-[340px] overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                                                {turn.sources.map((s: any, i) => {
                                                                    const domain = new URL(s.url).hostname.replace('www.', '');
                                                                    return (
                                                                        <a key={i} href={s.url} target="_blank" rel="noreferrer" className="flex flex-col p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group/source">
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <div className="w-[18px] h-[18px] bg-white border border-gray-100 group-hover/source:bg-blue-50 text-gray-500 group-hover/source:text-blue-500 transition-colors rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                                                                                    <img
                                                                                        src={`https://icons.duckduckgo.com/ip3/${ domain }.ico`}
                                                                                        alt={domain}
                                                                                        className="w-[12px] h-[12px] object-cover"
                                                                                        onError={(e) => {
                                                                                            (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiPjwvY2lyY2xlPjxwYXRoIGQ9Ik0xMiAyQTYgNiAwIDAwMTIuNjgxIDEybDIuOTMxIDIuOTMxQTggOCAwIDAxMTIgMjIiPjwvcGF0aD48L3N2Zz4=';
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                                <span className="text-[12px] font-medium text-gray-600 truncate">{domain}</span>
                                                                            </div>
                                                                            <span className="text-[15px] font-medium text-[#1A0DAB] group-hover/source:underline leading-snug mb-1">{s.title || domain}</span>
                                                                            <span className="text-[13px] text-[#4D5156] leading-relaxed line-clamp-3">
                                                                                {s.snippet || s.description || "Includes relevant findings and extracted contextual information related to the specific topic generated by EterX during its active reasoning pass."}
                                                                            </span>
                                                                        </a>
                                                                    )
                                                                })}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </>
                                )
                            ) : (
                                turn.status === 'stopped' ? (
                                    <div className="flex items-center gap-2 text-gray-400 italic text-[13px]">
                                        <Square size={10} fill="currentColor" strokeWidth={0} />
                                        <span>Generation stopped by user.</span>
                                    </div>
                                ) : (
                                    turn.text
                                )
                            )}
                        </div>
                    </div>
                ))
                }

                {
                    isThinking && !computerUseActive && (
                        <div className="flex items-center gap-2.5 px-2 py-4 mb-2">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-2.5"
                            >
                                {/* Professional pulsing dots */}
                                <div className="flex items-center gap-[3px]">
                                    {[0, 1, 2].map(i => (
                                        <motion.div
                                            key={i}
                                            className="w-[5px] h-[5px] rounded-full bg-gray-400"
                                            animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
                                            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                                        />
                                    ))}
                                </div>
                                <span className="text-[13px] text-gray-400 font-medium tracking-tight">
                                    {queryMode === 'Search' ? 'Searching' : 'Thinking'}
                                </span>
                            </motion.div>
                        </div>
                    )
                }



                <div ref={messagesEndRef} className="h-4" />

                {/* Bottom Spacer for smooth scrolling into fumes */}
                <div className="h-24 shrink-0 pointer-events-none" />
            </div >

            {/* Scroll to Bottom Button */}
            <AnimatePresence>
                {showScrollToBottom && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 15 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        onClick={() => scrollToBottom(true)}
                        className="absolute bottom-[130px] right-5 z-40 flex items-center justify-center w-[36px] h-[36px] rounded-full bg-white/90 backdrop-blur-md border border-gray-200/80 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.15)] text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-[0_6px_20px_-4px_rgba(0,0,0,0.2)] active:scale-95 transition-all duration-300 pointer-events-auto"
                        title="Scroll to bottom"
                    >
                        <ArrowDown size={18} strokeWidth={2.5} />
                    </motion.button>
                )}
            </AnimatePresence>


            {/* 3. Input Area - True Floating with Fumes */}
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-3 pt-10 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA]/95 to-transparent z-20 pointer-events-none flex flex-col items-center">

                {/* Hidden File Input */}
                <input
                    type="file"
                    ref={inputFileRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf,.txt,.md"
                />

                {/* Input Field - Form Block Style */}
                <div className="w-full flex flex-col items-center pointer-events-auto relative z-30">
                    <div className={`
                                w-full bg-white shadow-[0_8px_30px_-5px_rgba(0,0,0,0.08)] ring-1 ring-black/5 focus-within:shadow-[0_12px_40px_-5px_rgba(0,0,0,0.12)] focus-within:ring-black/10 transition-all duration-300 relative z-10
                                ${ attachments.length > 0 ? 'rounded-[28px] p-2' : 'rounded-[32px] px-2 flex flex-col' }
                            `}>
                        {/* Attachments Preview - Split Image vs File Logic */}
                        {
                            attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2.5 px-3 pt-3 pb-1 w-full max-h-[160px] overflow-y-auto custom-scrollbar">
                                    {attachments.map(file => {
                                        const isImg = file.type.includes('image');
                                        return (
                                            <div key={file.id} className="relative group shrink-0 animate-in zoom-in-95 duration-200">
                                                {isImg && file.preview ? (
                                                    /* Image Style: Simple Square Thumbnail */
                                                    <div
                                                        className="relative w-[60px] h-[60px] rounded-[14px] overflow-hidden border border-gray-200 shadow-sm flex items-center justify-center cursor-pointer hover:border-gray-300"
                                                        onClick={(e) => { e.stopPropagation(); setPreviewImage(file.preview!); }}
                                                    >
                                                        <img src={file.preview} alt="preview" className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    /* Document Style: Pill Card */
                                                    <div
                                                        className="flex items-center gap-3 py-1.5 px-2 pr-6 bg-white border border-gray-200 rounded-[14px] shadow-sm max-w-[220px] cursor-pointer hover:bg-gray-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const now = Date.now();
                                                            if (now - lastDocClick < 1000) return;
                                                            lastDocClick = now;
                                                            // Save to temp and open via local HTTP server
                                                            if (window.electron?.saveTempFile) {
                                                                file.file.arrayBuffer().then(buffer => {
                                                                    window.electron.saveTempFile(file.file.name, buffer).then((httpUrl: string) => {
                                                                        if (httpUrl) {
                                                                            const finalUrl = httpUrl + `#name=${ encodeURIComponent(file.file.name) }&type=${ encodeURIComponent(file.type) }`;
                                                                            if (onNavigate) onNavigate(finalUrl);
                                                                            else window.open(finalUrl, '_blank');
                                                                        }
                                                                    });
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        {/* Blue Square Icon Wrapper */}
                                                        <div className="w-8 h-8 rounded-lg bg-[#0F76EA] flex items-center justify-center text-white shrink-0">
                                                            {file.type.includes('pdf') ? <FileText size={16} strokeWidth={2.5} /> : <FileText size={16} strokeWidth={2.5} />}
                                                        </div>
                                                        <div className="flex flex-col min-w-0 pr-2">
                                                            <span className="text-[13px] font-semibold text-gray-800 truncate leading-tight">{file.file.name.replace(/\.[^/.]+$/, "")}</span>
                                                            <span className="text-[11px] text-gray-500 font-medium tracking-wide uppercase mt-0.5">{file.type.split('/')[1] || 'DOC'}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Universal Remove Button styled as modern black circle 'X' */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeAttachment(file.id); }}
                                                    className="absolute -top-2 -right-2 w-5 h-5 bg-black text-white hover:bg-gray-800 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95 z-10"
                                                >
                                                    <X size={12} strokeWidth={3} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        }

                        <div className="flex flex-col w-full px-1.5 pb-1.5 pt-0.5">

                            {/* Top Row: Full Width Textarea */}
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                onPaste={handlePaste}
                                placeholder="Ask EterX..."
                                className="w-full bg-transparent outline-none resize-none mx-0 py-3 text-[15px] text-gray-800 font-medium placeholder-gray-400 font-sans overflow-y-auto px-2 leading-relaxed [&::-webkit-scrollbar]:hidden"
                                rows={1}
                                style={{
                                    minHeight: '52px',
                                    maxHeight: '200px',
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none'
                                }}
                            />

                            {/* Bottom Row: Actions & Submit */}
                            <div className="flex justify-between items-center w-full mt-2 pl-1 pr-1">

                                {/* Left Action Group (Plus, Chat, Search, Agent) */}
                                <div className="flex items-center gap-2">
                                    {/* Upload/Plus Button */}
                                    <button
                                        onClick={() => inputFileRef.current?.click()}
                                        className="flex items-center justify-center w-[38px] h-[38px] rounded-full border border-gray-100 bg-transparent text-gray-500 hover:bg-white hover:text-gray-900 transition-all duration-300 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] active:scale-95 group"
                                        title="Attach file"
                                    >
                                        <Plus size={18} strokeWidth={2.5} className="group-hover:-rotate-90 group-hover:scale-110 transition-transform duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]" />
                                    </button>

                                    {/* 1. Chat (Default) */}
                                    <button
                                        onClick={() => setQueryMode('Default')}
                                        className={`flex items-center justify-center w-[38px] h-[38px] rounded-full transition-all duration-300 active:scale-95 group hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)]
                                            ${ queryMode === 'Default'
                                                ? 'text-black bg-gray-100/50'
                                                : 'bg-transparent text-gray-400 hover:bg-white hover:text-gray-800'
                                            }`}
                                        title="Chat & Brainstorm"
                                    >
                                        <MessageSquare size={18} strokeWidth={queryMode === 'Default' ? 2.5 : 2} className={`${ queryMode === 'Default' ? 'scale-110' : 'group-hover:-rotate-12 group-hover:scale-125' } transition-all duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]`} />
                                    </button>

                                    {/* 2. Search Toggle */}
                                    <button
                                        onClick={() => setQueryMode(queryMode === 'Search' ? 'Default' : 'Search')}
                                        className={`flex items-center justify-center w-[38px] h-[38px] rounded-full transition-all duration-300 active:scale-95 group hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)]
                                            ${ queryMode === 'Search'
                                                ? 'text-black bg-gray-100/50'
                                                : 'bg-transparent text-gray-400 hover:bg-white hover:text-gray-800'
                                            }`}
                                        title={queryMode === 'Search' ? "Chat Mode" : "Web Search"}
                                    >
                                        <Search size={18} strokeWidth={queryMode === 'Search' ? 2.5 : 2} className={`${ queryMode === 'Search' ? 'scale-110' : 'group-hover:-rotate-12 group-hover:scale-125' } transition-all duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]`} />
                                    </button>

                                    {/* 3. Agent / Custom Pointer */}
                                    <button
                                        onClick={() => setQueryMode(queryMode === 'Agent' ? 'Default' : 'Agent')}
                                        className={`flex items-center justify-center w-[38px] h-[38px] rounded-full transition-all duration-300 active:scale-95 group hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)]
                                            ${ queryMode === 'Agent'
                                                ? 'text-black bg-gray-100/50'
                                                : 'bg-transparent text-gray-400 hover:bg-white hover:text-gray-800'
                                            }`}
                                        title={queryMode === 'Agent' ? "Agent Mode Active" : "Enable Agent"}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={queryMode === 'Agent' ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round" className={`${ queryMode === 'Agent' ? 'scale-110' : 'group-hover:-rotate-12 group-hover:scale-125' } transition-all duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]`}>
                                            <path d="M4 4l7.07 17 2.51-7.39L21 11.07z" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Right Action Group (Model Selector + Submit/Stop) */}
                                <div className="flex items-center gap-2">

                                    {/* Model Selector Pill & Menu */}
                                    <div className="relative" ref={modelMenuRef}>
                                        <button
                                            onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] border border-gray-100/80 bg-[#FAFAFA] hover:bg-white hover:border-gray-200 hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.1)] text-gray-600 transition-all duration-[400ms] font-semibold text-[13px] tracking-tight group relative overflow-hidden active:scale-95"
                                        >
                                            <span className="text-gray-900 group-hover:-translate-x-[1px] transition-transform duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]">{selectedModel}</span>
                                            <ChevronDown size={14} className={`text-gray-400 group-hover:text-gray-600 transition-all duration-[500ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${ isModelMenuOpen ? '-rotate-180 scale-110' : 'group-hover:translate-x-[1px] group-hover:scale-110' }`} strokeWidth={2.5} />
                                        </button>

                                        <AnimatePresence>
                                            {isModelMenuOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, y: 15, rotateX: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15 } }}
                                                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                                                    className="absolute bottom-full right-0 mb-3 w-[160px] bg-white/95 backdrop-blur-md border border-gray-100 rounded-[16px] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.15)] overflow-hidden z-50 p-1.5 origin-bottom"
                                                >
                                                    {[
                                                        { id: 'Auto', desc: 'Balanced response' },
                                                        { id: 'Think Deep', desc: 'Complex reasoning' },
                                                        { id: 'Fast', desc: 'Quick answers' }
                                                    ].map((model, idx) => (
                                                        <motion.button
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: idx * 0.05 + 0.05, type: 'spring', damping: 15 }}
                                                            key={model.id}
                                                            onClick={() => { setSelectedModel(model.id as any); setIsModelMenuOpen(false); }}
                                                            className={`relative w-full flex items-center justify-between px-3 py-2.5 rounded-[12px] transition-all duration-[300ms] ease-out group
                                                                ${ selectedModel === model.id ? 'bg-[#F4F4F5] text-gray-900 shadow-sm' : 'hover:bg-gray-50 text-gray-600' }
                                                            `}
                                                        >
                                                            <div className="flex flex-col items-start leading-none gap-1 relative z-10 transition-transform duration-[300ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1">
                                                                <span className={`text-[13px] font-semibold tracking-tight ${ selectedModel === model.id ? 'text-gray-900' : 'text-gray-700' }`}>{model.id}</span>
                                                                <span className="text-[10px] filter opacity-70 font-medium">{model.desc}</span>
                                                            </div>
                                                            {selectedModel === model.id && (
                                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.15 }} className="relative z-10">
                                                                    <Check size={14} strokeWidth={3} className="text-gray-400" />
                                                                </motion.div>
                                                            )}
                                                        </motion.button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <button
                                        onClick={handleSend}
                                        disabled={(!input.trim() && attachments.length === 0) && !isThinking}
                                        className={`
                                            flex items-center justify-center w-[36px] h-[36px] rounded-full transition-all duration-300 shrink-0 focus:outline-none shadow-sm
                                            ${ (!input.trim() && attachments.length === 0) && !isThinking
                                                ? 'bg-[#F4F4F5] text-[#D4D4D8] cursor-not-allowed'
                                                : isThinking
                                                    ? 'bg-white border border-gray-200 hover:bg-gray-50 active:scale-95 cursor-pointer text-black'
                                                    : 'bg-black hover:bg-gray-800 active:scale-95 text-white shadow-md'
                                            }
                                        `}
                                    >
                                        {isThinking ? (
                                            /* Stop Icon (Square) - White background, Black square inside */
                                            <div className="w-[12px] h-[12px] bg-black rounded-[2px]" />
                                        ) : (
                                            /* Send Icon (Strict Up Arrow) */
                                            <ArrowUp size={18} strokeWidth={2.5} className="relative top-[1px]" />
                                        )}
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>
                    {/* Removed bottom padding to sink input completely */}
                </div>
            </div>

            {/* --- Image Preview Modal --- */}
            <AnimatePresence>
                {previewImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6"
                        onClick={() => setPreviewImage(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative max-w-full max-h-full rounded-[24px] overflow-hidden shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="absolute top-4 right-4 w-8 h-8 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all z-10"
                            >
                                <X size={16} strokeWidth={3} />
                            </button>
                            <img src={previewImage} alt="Fullscreen Preview" className="max-w-full max-h-[85vh] object-contain rounded-[24px]" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default SmartSidebar;