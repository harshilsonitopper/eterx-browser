import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wifi, WifiOff, Key, Activity, Clock, Zap, Square,
    RefreshCw, Trash2, Mic, MicOff, Eye, EyeOff,
    ChevronDown, ChevronUp, Terminal, AlertTriangle,
    CheckCircle, Search, MousePointer2, Globe, ArrowRight,
    BarChart3, MessageSquare, Brain, Shield, X
} from 'lucide-react';
import {
    GeminiLiveService,
    GeminiLiveStatus,
    GeminiKeyStatus,
    ToolCallEvent,
    ConnectionEvent,
    TranscriptEntry
} from '../services/GeminiLiveService';

// ─────────────────────────────────────────────
// GEMINI LIVE PANEL — Full Connection Dashboard
// ─────────────────────────────────────────────

interface GeminiLivePanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const GeminiLivePanel: React.FC<GeminiLivePanelProps> = ({ isOpen, onClose }) => {
    // Connection state
    const [status, setStatus] = useState<GeminiLiveStatus>(GeminiLiveService.currentStatus);
    const [audioLevel, setAudioLevel] = useState(0);
    const [isMuted, setIsMuted] = useState(GeminiLiveService.getMuted());
    const [connectedDuration, setConnectedDuration] = useState(0);

    // Data
    const [keyStatus, setKeyStatus] = useState<GeminiKeyStatus | null>(GeminiLiveService.keyStatus);
    const [toolCalls, setToolCalls] = useState<ToolCallEvent[]>([...GeminiLiveService.toolCallHistory]);
    const [connectionEvents, setConnectionEvents] = useState<ConnectionEvent[]>([...GeminiLiveService.connectionHistory]);
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([...GeminiLiveService.transcriptLog]);
    const [sessionMeta, setSessionMeta] = useState(GeminiLiveService.sessionMeta);

    // UI state
    const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'tools' | 'transcript' | 'events'>('overview');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    // Duration timer
    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => {
            setConnectedDuration(GeminiLiveService.getConnectedDuration());
            setSessionMeta({ ...GeminiLiveService.sessionMeta });
        }, 1000);
        return () => clearInterval(interval);
    }, [isOpen]);

    // Subscribe to all events
    useEffect(() => {
        if (!isOpen) return;

        const onStatus = (s: GeminiLiveStatus) => setStatus(s);
        const onLevel = (l: number) => setAudioLevel(l);
        const onError = (e: string) => setErrorMessage(e);
        const onToolCall = () => setToolCalls([...GeminiLiveService.toolCallHistory]);
        const onConnEvent = () => setConnectionEvents([...GeminiLiveService.connectionHistory]);
        const onTranscript = () => setTranscripts([...GeminiLiveService.transcriptLog]);
        const onKeyStatus = (ks: GeminiKeyStatus) => setKeyStatus(ks);

        GeminiLiveService.addStatusListener(onStatus);
        GeminiLiveService.addAudioLevelListener(onLevel);
        GeminiLiveService.addErrorListener(onError);
        GeminiLiveService.addToolCallListener(onToolCall);
        GeminiLiveService.addConnectionEventListener(onConnEvent);
        GeminiLiveService.addTranscriptListener(onTranscript);
        GeminiLiveService.addKeyStatusListener(onKeyStatus);

        // Fetch initial key status
        GeminiLiveService.fetchKeyStatus();

        return () => {
            GeminiLiveService.removeStatusListener(onStatus);
            GeminiLiveService.removeAudioLevelListener(onLevel);
            GeminiLiveService.removeErrorListener(onError);
            GeminiLiveService.removeToolCallListener(onToolCall);
            GeminiLiveService.removeConnectionEventListener(onConnEvent);
            GeminiLiveService.removeTranscriptListener(onTranscript);
            GeminiLiveService.removeKeyStatusListener(onKeyStatus);
        };
    }, [isOpen]);

    // Auto-scroll transcript
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts]);

    if (!isOpen) return null;

    const isConnected = status === 'connected' || status === 'listening' || status === 'speaking' || status === 'agentic';
    const statusColor = {
        disconnected: '#6b7280', connecting: '#f59e0b', connected: '#10b981',
        reconnecting: '#f59e0b', speaking: '#8b5cf6', listening: '#3b82f6',
        agentic: '#14b8a6', error: '#ef4444'
    }[status] || '#6b7280';

    const formatDuration = (ms: number) => {
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        if (h > 0) return `${ h }h ${ m % 60 }m ${ s % 60 }s`;
        if (m > 0) return `${ m }m ${ s % 60 }s`;
        return `${ s }s`;
    };

    const formatTime = (ts: number) => new Date(ts).toLocaleTimeString();

    const getToolIcon = (name: string) => {
        if (name.includes('navigate') || name.includes('url')) return <Globe size={14} className="text-blue-400" />;
        if (name.includes('click')) return <MousePointer2 size={14} className="text-purple-400" />;
        if (name.includes('search')) return <Search size={14} className="text-cyan-400" />;
        if (name.includes('type')) return <Terminal size={14} className="text-green-400" />;
        if (name.includes('screenshot') || name.includes('dom')) return <Eye size={14} className="text-amber-400" />;
        return <Zap size={14} className="text-gray-400" />;
    };

    // ─── ACTIONS ──────────────────────────────

    const handleConnect = async () => {
        setErrorMessage(null);
        await GeminiLiveService.resume();
        await GeminiLiveService.connect();
    };

    const handleDisconnect = () => GeminiLiveService.forceDisconnect();
    const handleReconnect = () => { handleDisconnect(); setTimeout(handleConnect, 500); };
    const handleClearSession = () => GeminiLiveService.clearSession();
    const handleToggleMute = () => setIsMuted(GeminiLiveService.toggleMuted());
    const handleInterrupt = () => GeminiLiveService.interrupt();

    // ─── RENDER ───────────────────────────────

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 400 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 400 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed right-0 top-0 bottom-0 w-[480px] z-[200] flex flex-col"
                style={{
                    background: 'linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.97) 50%, rgba(15,23,42,0.99) 100%)',
                    backdropFilter: 'blur(40px) saturate(180%)',
                    borderLeft: '1px solid rgba(148,163,184,0.12)',
                    boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
                }}
            >
                {/* ═══ HEADER ═══ */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <motion.div
                            animate={{
                                boxShadow: isConnected
                                    ? [`0 0 8px ${ statusColor }40`, `0 0 20px ${ statusColor }80`, `0 0 8px ${ statusColor }40`]
                                    : `0 0 4px ${ statusColor }40`
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: statusColor }}
                        />
                        <div>
                            <h2 className="text-white font-bold text-base tracking-tight">Gemini Live</h2>
                            <span className="text-xs uppercase tracking-wider" style={{ color: statusColor }}>
                                {status === 'speaking' ? '● Speaking' : status === 'listening' ? '● Listening' : status === 'agentic' ? '⚡ Agentic' : status}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isConnected && (
                            <span className="text-xs text-slate-400 font-mono bg-slate-800/60 px-2 py-1 rounded">
                                {formatDuration(connectedDuration)}
                            </span>
                        )}
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-all">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ═══ AUDIO VISUALIZER ═══ */}
                <div className="px-5 py-3 border-b border-slate-700/30">
                    <div className="flex items-center gap-1.5 h-8">
                        {Array.from({ length: 32 }).map((_, i) => {
                            const barLevel = isConnected ? Math.max(0.05, audioLevel * (0.5 + Math.random() * 0.8)) : 0.03;
                            return (
                                <motion.div
                                    key={i}
                                    animate={{ scaleY: barLevel }}
                                    transition={{ duration: 0.08 }}
                                    className="flex-1 rounded-full origin-bottom"
                                    style={{
                                        height: '100%',
                                        background: status === 'speaking'
                                            ? `linear-gradient(to top, #8b5cf6, #a78bfa)`
                                            : status === 'agentic'
                                                ? `linear-gradient(to top, #14b8a6, #2dd4bf)`
                                                : `linear-gradient(to top, #3b82f6, #60a5fa)`,
                                        opacity: 0.6 + barLevel * 0.4,
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* ═══ QUICK CONTROLS ═══ */}
                <div className="px-5 py-3 flex items-center gap-2 border-b border-slate-700/30">
                    {!isConnected ? (
                        <button onClick={handleConnect} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm hover:brightness-110 transition-all active:scale-[0.98]">
                            <Wifi size={16} /> Connect
                        </button>
                    ) : (
                        <button onClick={handleDisconnect} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold text-sm hover:brightness-110 transition-all active:scale-[0.98]">
                            <WifiOff size={16} /> Disconnect
                        </button>
                    )}
                    <button onClick={handleToggleMute} className={`p-2.5 rounded-xl border transition-all ${ isMuted ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-slate-700/40 border-slate-600/40 text-slate-300 hover:bg-slate-600/40' }`}>
                        {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                    <button onClick={handleReconnect} className="p-2.5 rounded-xl bg-slate-700/40 border border-slate-600/40 text-slate-300 hover:bg-slate-600/40 transition-all" title="Reconnect">
                        <RefreshCw size={16} />
                    </button>
                    {status === 'speaking' && (
                        <button onClick={handleInterrupt} className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 transition-all" title="Interrupt">
                            <Square size={16} />
                        </button>
                    )}
                    <button onClick={handleClearSession} className="p-2.5 rounded-xl bg-slate-700/40 border border-slate-600/40 text-slate-300 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 transition-all" title="Clear Session">
                        <Trash2 size={16} />
                    </button>
                </div>

                {/* ═══ ERROR BANNER ═══ */}
                <AnimatePresence>
                    {errorMessage && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-5 py-2 bg-red-500/10 border-b border-red-500/20"
                        >
                            <div className="flex items-center gap-2 text-red-400 text-xs">
                                <AlertTriangle size={14} />
                                <span className="flex-1 truncate">{errorMessage}</span>
                                <button onClick={() => setErrorMessage(null)} className="hover:text-white">✕</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ═══ TAB BAR ═══ */}
                <div className="flex px-5 py-1 gap-1 border-b border-slate-700/30">
                    {(['overview', 'keys', 'tools', 'transcript', 'events'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${ activeTab === tab
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* ═══ TAB CONTENT ═══ */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">

                    {/* ── OVERVIEW TAB ── */}
                    {activeTab === 'overview' && (
                        <>
                            {/* Session Info */}
                            <div className="rounded-xl bg-slate-800/50 border border-slate-700/40 p-4 space-y-3">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Activity size={14} /> Session Info
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <InfoCard label="Model" value={sessionMeta.model.split('-').slice(0, 3).join(' ')} />
                                    <InfoCard label="Duration" value={isConnected ? formatDuration(connectedDuration) : '—'} />
                                    <InfoCard label="Audio Sent" value={`${ sessionMeta.chunksSent.toLocaleString() } chunks`} />
                                    <InfoCard label="Audio Received" value={`${ sessionMeta.chunksReceived.toLocaleString() } chunks`} />
                                    <InfoCard label="Tool Calls" value={`${ sessionMeta.toolCallsTotal }`} />
                                    <InfoCard label="Reconnects" value={`${ sessionMeta.reconnectAttempts }`} />
                                </div>
                            </div>

                            {/* Key Health Summary */}
                            {keyStatus && (
                                <div className="rounded-xl bg-slate-800/50 border border-slate-700/40 p-4 space-y-3">
                                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <Key size={14} /> API Keys
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl font-bold text-emerald-400">{keyStatus.healthy}</div>
                                        <div className="text-slate-400 text-sm">/ {keyStatus.total} healthy</div>
                                        <div className="flex-1" />
                                        <div className="flex gap-1">
                                            {keyStatus.keys.map((k, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${ k.healthy
                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                        }`}
                                                >
                                                    {i + 1}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Recent Activity */}
                            <div className="rounded-xl bg-slate-800/50 border border-slate-700/40 p-4 space-y-2">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <BarChart3 size={14} /> Recent Activity
                                </h3>
                                {toolCalls.slice(-5).reverse().map((tc, i) => (
                                    <div key={tc.id + i} className="flex items-center gap-2 py-1.5 border-b border-slate-700/20 last:border-0">
                                        {getToolIcon(tc.name)}
                                        <span className="text-sm text-slate-200 flex-1 truncate">{tc.name}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${ tc.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : tc.status === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400' }`}>
                                            {tc.status}
                                        </span>
                                    </div>
                                ))}
                                {toolCalls.length === 0 && (
                                    <p className="text-slate-500 text-xs italic text-center py-2">No tool calls yet</p>
                                )}
                            </div>
                        </>
                    )}

                    {/* ── KEYS TAB ── */}
                    {activeTab === 'keys' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-300">API Key Health</h3>
                                <button onClick={() => GeminiLiveService.fetchKeyStatus()} className="text-xs text-blue-400 hover:text-blue-300">
                                    Refresh
                                </button>
                            </div>
                            {keyStatus ? keyStatus.keys.map((key, i) => (
                                <div key={i} className={`rounded-xl p-4 border transition-all ${ key.healthy
                                    ? 'bg-slate-800/50 border-slate-700/40'
                                    : 'bg-red-950/30 border-red-500/20'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${ key.healthy
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {i + 1}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-200">Key {i + 1}</div>
                                                <div className={`text-xs ${ key.healthy ? 'text-emerald-400' : 'text-red-400' }`}>
                                                    {key.healthy ? '✓ Healthy' : `✕ Exhausted (${ key.errorCount } errors)`}
                                                </div>
                                            </div>
                                        </div>
                                        {i === keyStatus.currentIndex && (
                                            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg border border-blue-500/30">
                                                ACTIVE
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="text-slate-500 text-sm text-center py-8">
                                    Loading key status...
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TOOLS TAB ── */}
                    {activeTab === 'tools' && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3">Tool Call History ({toolCalls.length})</h3>
                            {toolCalls.slice().reverse().map((tc, i) => (
                                <div key={tc.id + i} className="rounded-xl bg-slate-800/50 border border-slate-700/40 p-3 space-y-1">
                                    <div className="flex items-center gap-2">
                                        {getToolIcon(tc.name)}
                                        <span className="text-sm font-medium text-slate-200 flex-1">{tc.name}</span>
                                        <span className="text-[10px] text-slate-500 font-mono">{formatTime(tc.timestamp)}</span>
                                    </div>
                                    {tc.args && Object.keys(tc.args).length > 0 && (
                                        <div className="text-xs text-slate-400 bg-slate-900/50 rounded-lg px-2 py-1 mt-1 font-mono truncate">
                                            {JSON.stringify(tc.args).slice(0, 120)}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${ tc.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : tc.status === 'error' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400' }`}>
                                            {tc.status}
                                        </span>
                                        {tc.result && <span className="text-[10px] text-slate-500 truncate ml-1">{tc.result.slice(0, 50)}</span>}
                                    </div>
                                </div>
                            ))}
                            {toolCalls.length === 0 && (
                                <p className="text-slate-500 text-xs italic text-center py-8">No tool calls recorded</p>
                            )}
                        </div>
                    )}

                    {/* ── TRANSCRIPT TAB ── */}
                    {activeTab === 'transcript' && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3">
                                <MessageSquare size={14} className="inline mr-2" />
                                Conversation ({transcripts.length})
                            </h3>
                            {transcripts.map((t, i) => (
                                <div key={i} className={`flex gap-2 ${ t.type === 'user' ? 'justify-end' : 'justify-start' }`}>
                                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${ t.type === 'user'
                                        ? 'bg-blue-500/20 text-blue-200 border border-blue-500/20 rounded-br-sm'
                                        : t.type === 'thought'
                                            ? 'bg-amber-500/10 text-amber-300/80 border border-amber-500/15 rounded-bl-sm italic'
                                            : 'bg-slate-700/40 text-slate-200 border border-slate-600/30 rounded-bl-sm'
                                        }`}>
                                        {t.type === 'thought' && <Brain size={12} className="inline mr-1 opacity-60" />}
                                        {t.text}
                                        <div className="text-[10px] opacity-40 mt-1">{formatTime(t.timestamp)}</div>
                                    </div>
                                </div>
                            ))}
                            {transcripts.length === 0 && (
                                <p className="text-slate-500 text-xs italic text-center py-8">No transcriptions yet. Start speaking!</p>
                            )}
                            <div ref={transcriptEndRef} />
                        </div>
                    )}

                    {/* ── EVENTS TAB ── */}
                    {activeTab === 'events' && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3">Connection Events ({connectionEvents.length})</h3>
                            {connectionEvents.slice().reverse().map((evt, i) => (
                                <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-700/20 last:border-0">
                                    <div className={`w-6 h-6 rounded-md flex items-center justify-center mt-0.5 ${ evt.type === 'connect' ? 'bg-emerald-500/20 text-emerald-400'
                                        : evt.type === 'disconnect' ? 'bg-slate-500/20 text-slate-400'
                                            : evt.type === 'error' ? 'bg-red-500/20 text-red-400'
                                                : 'bg-amber-500/20 text-amber-400'
                                        }`}>
                                        {evt.type === 'connect' ? <Wifi size={12} /> : evt.type === 'disconnect' ? <WifiOff size={12} /> : evt.type === 'error' ? <AlertTriangle size={12} /> : <RefreshCw size={12} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-slate-200 capitalize">{evt.type.replace('-', ' ')}</div>
                                        {evt.message && <div className="text-xs text-slate-400 truncate">{evt.message}</div>}
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono shrink-0">{formatTime(evt.timestamp)}</span>
                                </div>
                            ))}
                            {connectionEvents.length === 0 && (
                                <p className="text-slate-500 text-xs italic text-center py-8">No events yet</p>
                            )}
                        </div>
                    )}
                </div>

                {/* ═══ FOOTER ═══ */}
                <div className="px-5 py-3 border-t border-slate-700/40 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Shield size={12} />
                        <span>{sessionMeta.model.split('-').slice(1, 4).join('-')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>↑{sessionMeta.chunksSent}</span>
                        <span>↓{sessionMeta.chunksReceived}</span>
                        <span>🔧{sessionMeta.toolCallsTotal}</span>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

// ─── HELPER COMPONENTS ────────────────────────

const InfoCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-700/30">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
        <div className="text-sm text-slate-200 font-medium mt-0.5 truncate">{value}</div>
    </div>
);

export default GeminiLivePanel;
