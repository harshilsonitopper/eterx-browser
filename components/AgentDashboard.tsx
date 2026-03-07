import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, Zap, Award, BarChart3, Clock, Star, Trophy,
    ChevronRight, Target, TrendingUp, Flame, Brain, X,
    Search, MousePointer2, Globe, Terminal, Eye
} from 'lucide-react';
import { AgentLevelSystem, AgentProfile, XPGainEvent, AgentLevel } from '../services/AgentLevelSystem';
import { GeminiLiveService, ToolCallEvent } from '../services/GeminiLiveService';

// ─────────────────────────────────────────────
// AGENT DASHBOARD
// ─────────────────────────────────────────────

interface AgentDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ isOpen, onClose }) => {
    const [profile, setProfile] = useState<AgentProfile>(AgentLevelSystem.getProfile());
    const [recentXP, setRecentXP] = useState<XPGainEvent | null>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'levels' | 'achievements'>('profile');
    const [recentTools, setRecentTools] = useState<ToolCallEvent[]>([...GeminiLiveService.toolCallHistory]);

    const progress = useMemo(() => AgentLevelSystem.getProgressToNextLevel(), [profile]);
    const topActions = useMemo(() => AgentLevelSystem.getTopActions(8), [profile]);
    const allLevels = useMemo(() => AgentLevelSystem.getAllLevels(), []);

    useEffect(() => {
        if (!isOpen) return;

        const onProfile = (p: AgentProfile) => setProfile({ ...p });
        const onXP = (e: XPGainEvent) => {
            setRecentXP(e);
            setTimeout(() => setRecentXP(null), 3000);
        };
        const onToolCall = () => setRecentTools([...GeminiLiveService.toolCallHistory]);

        AgentLevelSystem.addProfileListener(onProfile);
        AgentLevelSystem.addXPListener(onXP);
        GeminiLiveService.addToolCallListener(onToolCall);

        return () => {
            AgentLevelSystem.removeProfileListener(onProfile);
            AgentLevelSystem.removeXPListener(onXP);
            GeminiLiveService.removeToolCallListener(onToolCall);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const getActionIcon = (action: string) => {
        if (action.includes('navigate') || action.includes('url') || action.includes('tab')) return <Globe size={14} />;
        if (action.includes('click')) return <MousePointer2 size={14} />;
        if (action.includes('search')) return <Search size={14} />;
        if (action.includes('type') || action.includes('key')) return <Terminal size={14} />;
        if (action.includes('screenshot') || action.includes('dom')) return <Eye size={14} />;
        return <Zap size={14} />;
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed inset-4 z-[250] rounded-3xl overflow-hidden flex flex-col"
                style={{
                    background: 'linear-gradient(145deg, rgba(15,23,42,0.98) 0%, rgba(30,27,50,0.98) 40%, rgba(15,23,42,0.99) 100%)',
                    backdropFilter: 'blur(60px) saturate(200%)',
                    border: '1px solid rgba(148,163,184,0.12)',
                    boxShadow: '0 25px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
            >
                {/* ═══ XP GAIN TOAST ═══ */}
                <AnimatePresence>
                    {recentXP && (
                        <motion.div
                            initial={{ y: -60, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -60, opacity: 0 }}
                            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl flex items-center gap-3"
                            style={{
                                background: recentXP.levelUp
                                    ? 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(239,68,68,0.3))'
                                    : 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
                                border: `1px solid ${ recentXP.levelUp ? 'rgba(245,158,11,0.4)' : 'rgba(59,130,246,0.3)' }`,
                                backdropFilter: 'blur(20px)',
                            }}
                        >
                            {recentXP.levelUp ? <Trophy size={20} className="text-amber-400" /> : <Zap size={18} className="text-blue-400" />}
                            <span className="text-white font-semibold">
                                {recentXP.levelUp ? `LEVEL UP! ${ recentXP.newLevel?.title }` : `+${ recentXP.xp } XP`}
                            </span>
                            <span className="text-slate-400 text-sm">{recentXP.action}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ═══ HEADER ═══ */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-700/40">
                    <div className="flex items-center gap-4">
                        {/* Level Badge */}
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${ profile.level.gradient } flex items-center justify-center shadow-lg`}
                            style={{ boxShadow: `0 8px 30px ${ profile.level.color }40` }}>
                            <Shield size={32} className="text-white drop-shadow-md" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-white tracking-tight">Agent Dashboard</h1>
                                <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
                                    style={{
                                        background: `${ profile.level.color }20`,
                                        color: profile.level.color,
                                        border: `1px solid ${ profile.level.color }30`
                                    }}>
                                    {profile.level.title}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-slate-400 text-sm">{profile.xp.toLocaleString()} XP</span>
                                <span className="text-slate-600">·</span>
                                <span className="text-slate-400 text-sm">{profile.totalActions.toLocaleString()} actions</span>
                                {profile.streakDays > 0 && (
                                    <>
                                        <span className="text-slate-600">·</span>
                                        <span className="text-amber-400 text-sm flex items-center gap-1">
                                            <Flame size={14} /> {profile.streakDays} day streak
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all">
                        <X size={22} />
                    </button>
                </div>

                {/* ═══ XP PROGRESS BAR ═══ */}
                <div className="px-8 py-4 border-b border-slate-700/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400 font-medium">Level {profile.level.tier} Progress</span>
                        <span className="text-xs text-slate-500">{Math.round(progress.progress * 100)}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${ progress.progress * 100 }%` }}
                            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                            className={`h-full rounded-full bg-gradient-to-r ${ profile.level.gradient }`}
                            style={{ boxShadow: `0 0 12px ${ profile.level.color }60` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-slate-500">{progress.current} XP</span>
                        <span className="text-[10px] text-slate-500">{progress.next} XP to next level</span>
                    </div>
                </div>

                {/* ═══ TAB BAR ═══ */}
                <div className="flex px-8 py-2 gap-2 border-b border-slate-700/30">
                    {([
                        { key: 'profile' as const, label: 'Profile', icon: Shield },
                        { key: 'stats' as const, label: 'Statistics', icon: BarChart3 },
                        { key: 'levels' as const, label: 'Levels', icon: TrendingUp },
                        { key: 'achievements' as const, label: 'Achievements', icon: Trophy },
                    ]).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${ activeTab === tab.key
                                ? `bg-gradient-to-r ${ profile.level.gradient } text-white shadow-lg`
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                                }`}
                            style={activeTab === tab.key ? { boxShadow: `0 4px 20px ${ profile.level.color }30` } : {}}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ═══ TAB CONTENT ═══ */}
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

                    {/* ── PROFILE TAB ── */}
                    {activeTab === 'profile' && (
                        <>
                            {/* Quick Stats Grid */}
                            <div className="grid grid-cols-4 gap-4">
                                <StatCard icon={<Zap size={20} />} label="Total XP" value={profile.xp.toLocaleString()} color={profile.level.color} />
                                <StatCard icon={<Target size={20} />} label="Actions" value={profile.totalActions.toLocaleString()} color="#3b82f6" />
                                <StatCard icon={<Clock size={20} />} label="Sessions" value={`${ profile.sessionCount }`} color="#8b5cf6" />
                                <StatCard icon={<Flame size={20} />} label="Streak" value={`${ profile.streakDays } days`} color="#f59e0b" />
                            </div>

                            {/* Capabilities */}
                            <div className="rounded-2xl bg-slate-800/40 border border-slate-700/30 p-5">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                                    <Brain size={16} className="text-purple-400" /> Current Capabilities
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {profile.level.capabilities.map((cap, i) => (
                                        <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/30">
                                            {cap}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500 mt-3 italic">{profile.level.description}</p>
                            </div>

                            {/* Recent Tool Activity */}
                            <div className="rounded-2xl bg-slate-800/40 border border-slate-700/30 p-5">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                                    <Terminal size={16} className="text-cyan-400" /> Recent Activity
                                </h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {recentTools.slice(-10).reverse().map((tc, i) => (
                                        <div key={tc.id + i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-700/30 transition-all">
                                            <span className="text-slate-400">{getActionIcon(tc.name)}</span>
                                            <span className="text-sm text-slate-200 flex-1 truncate">{tc.name.replace(/_/g, ' ')}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${ tc.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400' }`}>
                                                {tc.status}
                                            </span>
                                        </div>
                                    ))}
                                    {recentTools.length === 0 && (
                                        <p className="text-slate-500 text-xs italic text-center py-4">No activity yet. Connect to Gemini Live and start tasks!</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── STATS TAB ── */}
                    {activeTab === 'stats' && (
                        <>
                            {/* Top Actions */}
                            <div className="rounded-2xl bg-slate-800/40 border border-slate-700/30 p-5">
                                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                                    <BarChart3 size={16} className="text-blue-400" /> Top Actions
                                </h3>
                                <div className="space-y-3">
                                    {topActions.map((a, i) => {
                                        const maxCount = topActions[0]?.count || 1;
                                        const barWidth = (a.count / maxCount) * 100;
                                        return (
                                            <div key={a.action} className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-sm text-slate-200">
                                                        <span className="text-slate-500 font-mono text-xs w-4">#{i + 1}</span>
                                                        {getActionIcon(a.action)}
                                                        <span className="truncate">{a.action.replace(/_/g, ' ')}</span>
                                                    </div>
                                                    <span className="text-xs text-slate-400 font-mono">{a.count}x</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${ barWidth }%` }}
                                                        className={`h-full rounded-full bg-gradient-to-r ${ profile.level.gradient }`}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {topActions.length === 0 && (
                                        <p className="text-slate-500 text-xs italic text-center py-4">No actions recorded yet</p>
                                    )}
                                </div>
                            </div>

                            {/* Action Breakdown */}
                            <div className="rounded-2xl bg-slate-800/40 border border-slate-700/30 p-5">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Full Action Breakdown</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(profile.actionBreakdown).sort((a, b) => b[1] - a[1]).map(([action, count]) => (
                                        <div key={action} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-900/40 border border-slate-700/20">
                                            <span className="text-slate-400">{getActionIcon(action)}</span>
                                            <span className="text-[11px] text-slate-300 flex-1 truncate">{action.replace(/_/g, ' ')}</span>
                                            <span className="text-[10px] text-slate-500 font-mono">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── LEVELS TAB ── */}
                    {activeTab === 'levels' && (
                        <div className="space-y-3">
                            {allLevels.map((level, i) => {
                                const isCurrentOrPast = profile.xp >= level.minXP;
                                const isCurrent = level.tier === profile.level.tier;
                                return (
                                    <motion.div
                                        key={level.tier}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className={`rounded-2xl p-5 border transition-all ${ isCurrent
                                            ? `border-2 shadow-lg`
                                            : isCurrentOrPast
                                                ? 'bg-slate-800/40 border-slate-700/30'
                                                : 'bg-slate-900/30 border-slate-800/20 opacity-60'
                                            }`}
                                        style={isCurrent ? {
                                            borderColor: `${ level.color }50`,
                                            background: `linear-gradient(135deg, ${ level.color }10, transparent)`,
                                            boxShadow: `0 8px 30px ${ level.color }15`
                                        } : {}}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ level.gradient } flex items-center justify-center ${ !isCurrentOrPast ? 'opacity-30 grayscale' : '' }`}>
                                                <span className="text-white font-bold text-lg">{level.tier}</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-bold" style={{ color: isCurrentOrPast ? level.color : '#64748b' }}>
                                                        {level.title}
                                                    </span>
                                                    {isCurrent && (
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-white border border-white/20">
                                                            CURRENT
                                                        </span>
                                                    )}
                                                    {isCurrentOrPast && !isCurrent && (
                                                        <span className="text-emerald-400 text-xs">✓ Unlocked</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5">{level.description}</p>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {level.capabilities.map((cap, j) => (
                                                        <span key={j} className={`px-2 py-0.5 rounded text-[10px] ${ isCurrentOrPast
                                                            ? 'bg-slate-700/50 text-slate-300'
                                                            : 'bg-slate-800/50 text-slate-500'
                                                            }`}>
                                                            {cap}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-sm font-mono text-slate-500">
                                                {level.minXP.toLocaleString()} XP
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── ACHIEVEMENTS TAB ── */}
                    {activeTab === 'achievements' && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Trophy size={18} className="text-amber-400" />
                                <span className="text-sm text-slate-300 font-semibold">{profile.achievements.length} Unlocked</span>
                            </div>
                            {profile.achievements.length > 0 ? profile.achievements.map((ach, i) => (
                                <motion.div
                                    key={ach}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 p-4"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                        <Star size={20} className="text-amber-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-amber-200">{ach.split('—')[0].trim()}</div>
                                        <div className="text-xs text-slate-400">{ach.split('—')[1]?.trim() || ''}</div>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="text-center py-12">
                                    <Award size={48} className="text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-500 text-sm">No achievements yet. Start using the agent to unlock them!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

// ─── HELPER COMPONENTS ────────────────────────

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
    <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4 text-center"
        style={{ boxShadow: `inset 0 1px 0 ${ color }08` }}>
        <div className="flex justify-center mb-2" style={{ color }}>{icon}</div>
        <div className="text-xl font-bold text-white">{value}</div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
);

export default AgentDashboard;
