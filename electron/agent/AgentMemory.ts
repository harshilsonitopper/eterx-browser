/**
 * AgentMemory.ts — 3-Tier Persistent Memory System
 * 
 * Working Memory:  Current task context, recent actions, observations (in-memory, per-task)
 * Procedural Memory: Successful action sequences for common patterns (persisted to disk)
 * Semantic Memory:  Learned facts about websites — selectors, login URLs, patterns (persisted to disk)
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface ActionRecord {
    tool: string;
    args: any;
    result: any;
    timestamp: number;
    url?: string;
    screenshotHash?: string;
}

export interface WorkingMemory {
    goal: string;
    actions: ActionRecord[];
    observations: string[];
    currentUrl: string;
    startTime: number;
    turnCount: number;
    failedActions: ActionRecord[];
    /** Variables set during task execution */
    variables: Record<string, any>;
    /** Screenshots hashes for stuck detection */
    recentScreenshotHashes: string[];
    /** Extracted data accumulated during task */
    extractedData: any[];
    /** Current page title */
    pageTitle: string;
    /** Previous thinking steps */
    thinkingHistory: string[];
}

export interface ProcedureStep {
    tool: string;
    argsTemplate: any;
    description: string;
}

export interface Procedure {
    id: string;
    name: string;
    description: string;
    triggerPatterns: string[];
    steps: ProcedureStep[];
    successCount: number;
    failCount: number;
    lastUsed: number;
    avgDuration: number;
    sitePattern?: string;
}

export interface SiteFact {
    domain: string;
    facts: Record<string, any>;
    selectors: Record<string, string>;
    loginUrl?: string;
    searchUrl?: string;
    knownPatterns: string[];
    lastUpdated: number;
    captchaType?: 'recaptcha_v2' | 'recaptcha_v3' | 'hcaptcha' | 'cloudflare' | 'none';
    hasAntiBot?: boolean;
}

export interface TaskEpisode {
    goal: string;
    success: boolean;
    duration: number;
    turnCount: number;
    toolsUsed: string[];
    errorSummary?: string;
    domain?: string;
    timestamp: number;
    keyInsights?: string[];
}

// ─────────────────────────────────────────────
// MEMORY SERVICE
// ─────────────────────────────────────────────

export class AgentMemory {
    private working: WorkingMemory;
    private procedures: Map<string, Procedure> = new Map();
    private siteFacts: Map<string, SiteFact> = new Map();
    private episodes: TaskEpisode[] = [];

    private readonly dataDir: string;
    private readonly PROCEDURES_FILE: string;
    private readonly SITE_FACTS_FILE: string;
    private readonly EPISODES_FILE: string;
    private readonly MAX_EPISODES = 200;
    private readonly MAX_WORKING_ACTIONS = 100;

    constructor() {
        // Store in app data directory
        this.dataDir = path.join(app.getPath('userData'), 'agent_memory');
        this.PROCEDURES_FILE = path.join(this.dataDir, 'procedures.json');
        this.SITE_FACTS_FILE = path.join(this.dataDir, 'site_facts.json');
        this.EPISODES_FILE = path.join(this.dataDir, 'episodes.json');

        // Ensure directory exists
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }

        // Initialize working memory
        this.working = this.createFreshWorkingMemory('');

        // Load persisted memories
        this.loadProcedures();
        this.loadSiteFacts();
        this.loadEpisodes();

        console.log(`[AgentMemory] Initialized. Procedures: ${ this.procedures.size }, Sites: ${ this.siteFacts.size }, Episodes: ${ this.episodes.length }`);
    }

    // ─────────────────────────────────────────
    // WORKING MEMORY
    // ─────────────────────────────────────────

    /** Reset working memory for a new task */
    startNewTask(goal: string): void {
        this.working = this.createFreshWorkingMemory(goal);
    }

    private createFreshWorkingMemory(goal: string): WorkingMemory {
        return {
            goal,
            actions: [],
            observations: [],
            currentUrl: '',
            startTime: Date.now(),
            turnCount: 0,
            failedActions: [],
            variables: {},
            recentScreenshotHashes: [],
            extractedData: [],
            pageTitle: '',
            thinkingHistory: [],
        };
    }

    /** Record an action taken */
    recordAction(record: ActionRecord): void {
        this.working.actions.push(record);
        // Sliding window
        if (this.working.actions.length > this.MAX_WORKING_ACTIONS) {
            this.working.actions.shift();
        }
        if (record.result?.error) {
            this.working.failedActions.push(record);
        }
    }

    /** Record an observation/thought */
    recordObservation(observation: string): void {
        this.working.observations.push(observation);
        if (this.working.observations.length > 50) {
            this.working.observations.shift();
        }
    }

    /** Record thinking step */
    recordThinking(thinking: string): void {
        this.working.thinkingHistory.push(thinking);
        if (this.working.thinkingHistory.length > 30) {
            this.working.thinkingHistory.shift();
        }
    }

    /** Track screenshot hashes for stuck detection */
    recordScreenshotHash(hash: string): void {
        this.working.recentScreenshotHashes.push(hash);
        if (this.working.recentScreenshotHashes.length > 10) {
            this.working.recentScreenshotHashes.shift();
        }
    }

    /** Check if the agent is stuck (same screenshot N times in a row) */
    isStuck(threshold: number = 3): boolean {
        const hashes = this.working.recentScreenshotHashes;
        if (hashes.length < threshold) return false;
        const recent = hashes.slice(-threshold);
        return recent.every(h => h === recent[0]);
    }

    /** Update current URL */
    setCurrentUrl(url: string): void {
        this.working.currentUrl = url;
    }

    /** Update page title */
    setPageTitle(title: string): void {
        this.working.pageTitle = title;
    }

    /** Increment turn counter */
    incrementTurn(): number {
        return ++this.working.turnCount;
    }

    /** Get working memory snapshot for context injection */
    getWorkingContext(): WorkingMemory {
        return { ...this.working };
    }

    /** Get recent actions summary (for injecting into prompts) */
    getRecentActionsSummary(n: number = 5): string {
        const recent = this.working.actions.slice(-n);
        if (recent.length === 0) return 'No actions taken yet.';

        return recent.map((a, i) => {
            const resultStr = a.result?.error
                ? `❌ ${ a.result.error }`
                : `✅ ${ JSON.stringify(a.result).substring(0, 100) }`;
            return `${ i + 1 }. ${ a.tool }(${ JSON.stringify(a.args).substring(0, 80) }) → ${ resultStr }`;
        }).join('\n');
    }

    /** Get failed actions summary */
    getFailedActionsSummary(): string {
        if (this.working.failedActions.length === 0) return 'No failed actions.';
        return this.working.failedActions.map(a =>
            `- ${ a.tool }: ${ a.result?.error || 'unknown error' }`
        ).join('\n');
    }

    /** Set a variable in working memory */
    setVariable(key: string, value: any): void {
        this.working.variables[key] = value;
    }

    /** Get a variable from working memory */
    getVariable(key: string): any {
        return this.working.variables[key];
    }

    /** Store extracted data */
    addExtractedData(data: any): void {
        this.working.extractedData.push(data);
    }

    /** Get task duration */
    getTaskDuration(): number {
        return Date.now() - this.working.startTime;
    }

    // ─────────────────────────────────────────
    // PROCEDURAL MEMORY (Learned routines)
    // ─────────────────────────────────────────

    /** Save a successful procedure */
    saveProcedure(procedure: Procedure): void {
        this.procedures.set(procedure.id, procedure);
        this.persistProcedures();
    }

    /** Find matching procedures for a goal */
    findProcedures(goal: string): Procedure[] {
        const goalLower = goal.toLowerCase();
        const matches: Procedure[] = [];

        for (const proc of this.procedures.values()) {
            for (const pattern of proc.triggerPatterns) {
                if (goalLower.includes(pattern.toLowerCase())) {
                    matches.push(proc);
                    break;
                }
            }
        }

        // Sort by success rate and recency
        return matches.sort((a, b) => {
            const aRate = a.successCount / Math.max(1, a.successCount + a.failCount);
            const bRate = b.successCount / Math.max(1, b.successCount + b.failCount);
            if (Math.abs(aRate - bRate) > 0.1) return bRate - aRate;
            return b.lastUsed - a.lastUsed;
        });
    }

    /** Record procedure outcome */
    recordProcedureOutcome(id: string, success: boolean, duration: number): void {
        const proc = this.procedures.get(id);
        if (!proc) return;

        if (success) {
            proc.successCount++;
        } else {
            proc.failCount++;
        }
        proc.lastUsed = Date.now();
        proc.avgDuration = (proc.avgDuration + duration) / 2;
        this.persistProcedures();
    }

    /** Auto-learn a procedure from a successful task */
    learnProcedure(goal: string, actions: ActionRecord[], domain?: string): void {
        // Only learn if the task had 3+ successful actions
        const successfulActions = actions.filter(a => !a.result?.error);
        if (successfulActions.length < 3) return;

        const id = `proc_${ Date.now() }_${ Math.random().toString(36).slice(2, 8) }`;
        const keywords = goal.toLowerCase().split(/\s+/).filter(w => w.length > 3);

        const procedure: Procedure = {
            id,
            name: goal.substring(0, 80),
            description: `Learned from successful task: "${ goal }"`,
            triggerPatterns: keywords.slice(0, 5),
            steps: successfulActions.map(a => ({
                tool: a.tool,
                argsTemplate: a.args,
                description: `${ a.tool } with ${ JSON.stringify(a.args).substring(0, 50) }`,
            })),
            successCount: 1,
            failCount: 0,
            lastUsed: Date.now(),
            avgDuration: Date.now() - (actions[0]?.timestamp || Date.now()),
            sitePattern: domain,
        };

        this.saveProcedure(procedure);
    }

    // ─────────────────────────────────────────
    // SEMANTIC MEMORY (Site knowledge)
    // ─────────────────────────────────────────

    /** Get facts about a domain */
    getSiteFacts(domain: string): SiteFact | undefined {
        return this.siteFacts.get(domain);
    }

    /** Save/update facts about a domain */
    saveSiteFact(domain: string, update: Partial<SiteFact>): void {
        const existing = this.siteFacts.get(domain) || {
            domain,
            facts: {},
            selectors: {},
            knownPatterns: [],
            lastUpdated: Date.now(),
        };

        const merged: SiteFact = {
            ...existing,
            ...update,
            facts: { ...existing.facts, ...(update.facts || {}) },
            selectors: { ...existing.selectors, ...(update.selectors || {}) },
            knownPatterns: [...new Set([...existing.knownPatterns, ...(update.knownPatterns || [])])],
            lastUpdated: Date.now(),
        };

        this.siteFacts.set(domain, merged);
        this.persistSiteFacts();
    }

    /** Record that a site has CAPTCHA */
    recordCaptchaDetection(domain: string, type: SiteFact['captchaType']): void {
        this.saveSiteFact(domain, { captchaType: type, hasAntiBot: true });
    }

    /** Check if a domain is known to have anti-bot measures */
    hasAntiBot(domain: string): boolean {
        return this.siteFacts.get(domain)?.hasAntiBot === true;
    }

    /** Save a successful selector for a site */
    saveSelector(domain: string, name: string, selector: string): void {
        const existing = this.siteFacts.get(domain);
        if (existing) {
            existing.selectors[name] = selector;
            existing.lastUpdated = Date.now();
            this.persistSiteFacts();
        } else {
            this.saveSiteFact(domain, { selectors: { [name]: selector } });
        }
    }

    // ─────────────────────────────────────────
    // EPISODIC MEMORY (Task history)
    // ─────────────────────────────────────────

    /** Save a task episode */
    saveEpisode(episode: TaskEpisode): void {
        this.episodes.push(episode);
        if (this.episodes.length > this.MAX_EPISODES) {
            this.episodes.shift();
        }
        this.persistEpisodes();
    }

    /** Get recent episodes */
    getRecentEpisodes(n: number = 10): TaskEpisode[] {
        return this.episodes.slice(-n).reverse();
    }

    /** Get success rate */
    getSuccessRate(): number {
        if (this.episodes.length === 0) return 0;
        const successes = this.episodes.filter(e => e.success).length;
        return successes / this.episodes.length;
    }

    /** Get episodes for a specific domain */
    getDomainEpisodes(domain: string, n: number = 5): TaskEpisode[] {
        return this.episodes
            .filter(e => e.domain === domain)
            .slice(-n)
            .reverse();
    }

    // ─────────────────────────────────────────
    // CONTEXT GENERATION (for LLM prompts)
    // ─────────────────────────────────────────

    /** Generate a memory context string for injection into the system prompt */
    generateMemoryContext(currentDomain?: string): string {
        const parts: string[] = [];

        // Procedural hints
        const relevantProcedures = this.findProcedures(this.working.goal);
        if (relevantProcedures.length > 0) {
            parts.push('### Relevant Past Procedures');
            for (const proc of relevantProcedures.slice(0, 3)) {
                const rate = Math.round((proc.successCount / Math.max(1, proc.successCount + proc.failCount)) * 100);
                parts.push(`- "${ proc.name }" (${ rate }% success, ${ proc.steps.length } steps)`);
            }
            parts.push('');
        }

        // Site knowledge
        if (currentDomain) {
            const siteFact = this.siteFacts.get(currentDomain);
            if (siteFact) {
                parts.push(`### Known Facts About ${ currentDomain }`);
                if (siteFact.captchaType) parts.push(`- ⚠️ CAPTCHA Type: ${ siteFact.captchaType }`);
                if (siteFact.hasAntiBot) parts.push(`- ⚠️ Has anti-bot detection`);
                if (siteFact.loginUrl) parts.push(`- Login URL: ${ siteFact.loginUrl }`);
                if (siteFact.searchUrl) parts.push(`- Search URL: ${ siteFact.searchUrl }`);
                for (const [name, selector] of Object.entries(siteFact.selectors)) {
                    parts.push(`- Selector "${ name }": ${ selector }`);
                }
                parts.push('');
            }
        }

        // Recent episode insights
        const recentEpisodes = currentDomain
            ? this.getDomainEpisodes(currentDomain, 3)
            : this.getRecentEpisodes(3);

        if (recentEpisodes.length > 0) {
            parts.push('### Recent Task History');
            for (const ep of recentEpisodes) {
                const icon = ep.success ? '✅' : '❌';
                parts.push(`- ${ icon } "${ ep.goal.substring(0, 60) }" — ${ ep.toolsUsed.length } tools, ${ Math.round(ep.duration / 1000) }s`);
                if (ep.keyInsights) {
                    ep.keyInsights.forEach(insight => parts.push(`  💡 ${ insight }`));
                }
            }
            parts.push('');
        }

        return parts.length > 0 ? parts.join('\n') : '';
    }

    // ─────────────────────────────────────────
    // PERSISTENCE
    // ─────────────────────────────────────────

    private loadProcedures(): void {
        try {
            if (fs.existsSync(this.PROCEDURES_FILE)) {
                const data = JSON.parse(fs.readFileSync(this.PROCEDURES_FILE, 'utf-8'));
                for (const proc of data) {
                    this.procedures.set(proc.id, proc);
                }
            }
        } catch (e) {
            console.warn('[AgentMemory] Failed to load procedures:', e);
        }
    }

    private persistProcedures(): void {
        try {
            fs.writeFileSync(this.PROCEDURES_FILE, JSON.stringify(Array.from(this.procedures.values()), null, 2));
        } catch (e) {
            console.error('[AgentMemory] Failed to save procedures:', e);
        }
    }

    private loadSiteFacts(): void {
        try {
            if (fs.existsSync(this.SITE_FACTS_FILE)) {
                const data = JSON.parse(fs.readFileSync(this.SITE_FACTS_FILE, 'utf-8'));
                for (const fact of data) {
                    this.siteFacts.set(fact.domain, fact);
                }
            }
        } catch (e) {
            console.warn('[AgentMemory] Failed to load site facts:', e);
        }
    }

    private persistSiteFacts(): void {
        try {
            fs.writeFileSync(this.SITE_FACTS_FILE, JSON.stringify(Array.from(this.siteFacts.values()), null, 2));
        } catch (e) {
            console.error('[AgentMemory] Failed to save site facts:', e);
        }
    }

    private loadEpisodes(): void {
        try {
            if (fs.existsSync(this.EPISODES_FILE)) {
                this.episodes = JSON.parse(fs.readFileSync(this.EPISODES_FILE, 'utf-8'));
            }
        } catch (e) {
            console.warn('[AgentMemory] Failed to load episodes:', e);
        }
    }

    private persistEpisodes(): void {
        try {
            fs.writeFileSync(this.EPISODES_FILE, JSON.stringify(this.episodes, null, 2));
        } catch (e) {
            console.error('[AgentMemory] Failed to save episodes:', e);
        }
    }
}
