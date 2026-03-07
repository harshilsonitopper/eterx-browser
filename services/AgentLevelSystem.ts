/**
 * AgentLevelSystem.ts — Deep Agent Progression System
 * 
 * XP-based leveling for the agentic browser. Tracks every action
 * the agent performs, awards XP, and unlocks capabilities at each level.
 * Persisted via localStorage.
 */

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface AgentLevel {
    tier: number;
    title: string;
    minXP: number;
    color: string;
    gradient: string;
    description: string;
    capabilities: string[];
}

export interface AgentProfile {
    xp: number;
    level: AgentLevel;
    totalActions: number;
    actionBreakdown: Record<string, number>;
    sessionCount: number;
    streakDays: number;
    lastActiveDate: string;
    achievements: string[];
    createdAt: number;
}

export interface XPGainEvent {
    action: string;
    xp: number;
    total: number;
    levelUp: boolean;
    newLevel?: AgentLevel;
}

// ─────────────────────────────────────────────
// LEVEL DEFINITIONS
// ─────────────────────────────────────────────

const LEVELS: AgentLevel[] = [
    {
        tier: 0, title: 'Novice', minXP: 0,
        color: '#94a3b8', gradient: 'from-slate-400 to-slate-500',
        description: 'Just getting started. Learning the basics.',
        capabilities: ['Navigate to URLs', 'Basic search', 'Click elements']
    },
    {
        tier: 1, title: 'Apprentice', minXP: 100,
        color: '#60a5fa', gradient: 'from-blue-400 to-blue-600',
        description: 'Building competence. Can handle simple tasks.',
        capabilities: ['Form filling', 'Multi-step navigation', 'Screenshot capture']
    },
    {
        tier: 2, title: 'Agent', minXP: 500,
        color: '#a78bfa', gradient: 'from-violet-400 to-purple-600',
        description: 'Capable agent. Handles complex browser tasks.',
        capabilities: ['Multi-tab workflows', 'DOM analysis', 'Social media posting']
    },
    {
        tier: 3, title: 'Master', minXP: 2000,
        color: '#f59e0b', gradient: 'from-amber-400 to-orange-600',
        description: 'Expert operator. Autonomous complex workflows.',
        capabilities: ['Ghost mode tasks', 'Parallel execution', 'Content creation']
    },
    {
        tier: 4, title: 'Autonomous', minXP: 5000,
        color: '#10b981', gradient: 'from-emerald-400 to-teal-600',
        description: 'Full autonomy. Can plan and execute any task.',
        capabilities: ['Self-planning', 'Error recovery', 'Multi-site orchestration', 'Deep research']
    },
    {
        tier: 5, title: 'Transcendent', minXP: 15000,
        color: '#ec4899', gradient: 'from-pink-400 to-rose-600',
        description: 'Beyond limits. Anticipates needs before asked.',
        capabilities: ['Predictive actions', 'Context memory', 'Workflow templates', 'Full automation']
    }
];

// ─────────────────────────────────────────────
// XP TABLE
// ─────────────────────────────────────────────

const XP_TABLE: Record<string, number> = {
    // Navigation
    'navigate_to_url': 5,
    'go_back': 2,
    'go_forward': 2,
    'refresh_page': 2,
    'open_new_tab': 5,
    'close_current_tab': 3,

    // Interaction
    'click_element': 3,
    'click_coordinates': 3,
    'type_text': 4,
    'click_and_type': 6,
    'hover_element': 2,
    'press_key': 2,
    'scroll_page': 2,

    // Search & Intelligence
    'search_web': 10,
    'read_page_content': 8,
    'get_dom_tree': 8,
    'take_full_page_screenshot': 8,

    // Advanced
    'execute_ghost_task': 25,
    'spoof_gps': 5,
    'wait': 1,

    // Complex workflows (synthetic — awarded when multi-step sequences complete)
    'social_media_post': 50,
    'research_report': 75,
    'form_automation': 30,
    'data_extraction': 40,
    'content_creation': 60,
};

// ─────────────────────────────────────────────
// STORAGE KEY
// ─────────────────────────────────────────────
const STORAGE_KEY = 'eterx_agent_profile';

// ─────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────

class AgentLevelSystemClass {
    private profile: AgentProfile;
    private listeners: ((event: XPGainEvent) => void)[] = [];
    private profileListeners: ((profile: AgentProfile) => void)[] = [];

    constructor() {
        this.profile = this.loadProfile();
    }

    // ─── PERSISTENCE ──────────────────────────

    private loadProfile(): AgentProfile {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Recalculate level from XP
                parsed.level = this.calculateLevel(parsed.xp);
                return parsed;
            }
        } catch { }

        return {
            xp: 0,
            level: LEVELS[0],
            totalActions: 0,
            actionBreakdown: {},
            sessionCount: 0,
            streakDays: 0,
            lastActiveDate: new Date().toDateString(),
            achievements: [],
            createdAt: Date.now()
        };
    }

    private saveProfile() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
        } catch { }
    }

    // ─── LEVEL CALCULATION ────────────────────

    private calculateLevel(xp: number): AgentLevel {
        let level = LEVELS[0];
        for (const l of LEVELS) {
            if (xp >= l.minXP) level = l;
        }
        return level;
    }

    // ─── XP METHODS ───────────────────────────

    public awardXP(action: string, customXP?: number): XPGainEvent {
        const xp = customXP || XP_TABLE[action] || 3; // Default 3 XP for unknown actions
        const prevLevel = this.profile.level;

        this.profile.xp += xp;
        this.profile.totalActions++;
        this.profile.actionBreakdown[action] = (this.profile.actionBreakdown[action] || 0) + 1;

        // Update streak
        const today = new Date().toDateString();
        if (this.profile.lastActiveDate !== today) {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            this.profile.streakDays = this.profile.lastActiveDate === yesterday
                ? this.profile.streakDays + 1 : 1;
            this.profile.lastActiveDate = today;
        }

        // Recalculate level
        const newLevel = this.calculateLevel(this.profile.xp);
        const levelUp = newLevel.tier > prevLevel.tier;
        this.profile.level = newLevel;

        // Check achievements
        this.checkAchievements();

        this.saveProfile();

        const event: XPGainEvent = {
            action, xp, total: this.profile.xp, levelUp,
            newLevel: levelUp ? newLevel : undefined
        };

        this.listeners.forEach(cb => cb(event));
        this.profileListeners.forEach(cb => cb(this.profile));

        if (levelUp) {
            console.log(`[AgentLevel] 🎉 LEVEL UP! ${ prevLevel.title } → ${ newLevel.title } (${ this.profile.xp } XP)`);
        }

        return event;
    }

    // ─── ACHIEVEMENTS ─────────────────────────

    private checkAchievements() {
        const p = this.profile;
        const add = (name: string) => {
            if (!p.achievements.includes(name)) p.achievements.push(name);
        };

        if (p.totalActions >= 10) add('First Steps — 10 actions performed');
        if (p.totalActions >= 100) add('Centurion — 100 actions performed');
        if (p.totalActions >= 1000) add('Machine — 1000 actions performed');
        if (p.streakDays >= 3) add('Hat Trick — 3 day streak');
        if (p.streakDays >= 7) add('Weekly Warrior — 7 day streak');
        if ((p.actionBreakdown['search_web'] || 0) >= 50) add('Researcher — 50 web searches');
        if ((p.actionBreakdown['execute_ghost_task'] || 0) >= 10) add('Ghost Operator — 10 ghost tasks');
        if (p.xp >= 1000) add('Thousand Club — 1000 XP');
        if (p.xp >= 10000) add('Legend — 10000 XP');
    }

    // ─── GETTERS ──────────────────────────────

    public getProfile(): AgentProfile { return { ...this.profile }; }
    public getLevel(): AgentLevel { return this.profile.level; }
    public getXP(): number { return this.profile.xp; }
    public getTotalActions(): number { return this.profile.totalActions; }

    public getProgressToNextLevel(): { current: number; next: number; progress: number } {
        const currentLevel = this.profile.level;
        const nextLevel = LEVELS[currentLevel.tier + 1] || currentLevel;
        const current = this.profile.xp - currentLevel.minXP;
        const next = nextLevel.minXP - currentLevel.minXP;
        return {
            current,
            next: next || 1,
            progress: next > 0 ? Math.min(current / next, 1) : 1
        };
    }

    public getAllLevels(): AgentLevel[] { return [...LEVELS]; }

    public getTopActions(n = 5): { action: string; count: number }[] {
        return Object.entries(this.profile.actionBreakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([action, count]) => ({ action, count }));
    }

    public incrementSession() {
        this.profile.sessionCount++;
        this.saveProfile();
    }

    // ─── EVENTS ───────────────────────────────

    public addXPListener(cb: (event: XPGainEvent) => void) { this.listeners.push(cb); }
    public removeXPListener(cb: (event: XPGainEvent) => void) { this.listeners = this.listeners.filter(c => c !== cb); }
    public addProfileListener(cb: (profile: AgentProfile) => void) { this.profileListeners.push(cb); }
    public removeProfileListener(cb: (profile: AgentProfile) => void) { this.profileListeners = this.profileListeners.filter(c => c !== cb); }

    // ─── RESET (debugging) ────────────────────

    public resetProfile() {
        localStorage.removeItem(STORAGE_KEY);
        this.profile = this.loadProfile();
        this.profileListeners.forEach(cb => cb(this.profile));
    }
}

// Singleton
export const AgentLevelSystem = new AgentLevelSystemClass();
