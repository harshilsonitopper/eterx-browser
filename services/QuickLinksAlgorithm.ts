import { v4 as uuidv4 } from 'uuid';

export interface QuickLinkItem {
    id: string;
    title: string;
    url: string;
    faviconUrl?: string; // Optional real favicon string
    isPinned: boolean;
    visitCount: number;
    lastVisited: number; // timestamp
    score: number;
}

// Deep Scoring Configuration
const HALF_LIFE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days half-life for exponential decay

export class QuickLinksAlgorithm {
    private links: QuickLinkItem[] = [];
    private static instance: QuickLinksAlgorithm;
    private listeners: (() => void)[] = [];

    private constructor() {
        this.loadFromStorage();
    }

    public static getInstance(): QuickLinksAlgorithm {
        if (!QuickLinksAlgorithm.instance) {
            QuickLinksAlgorithm.instance = new QuickLinksAlgorithm();
        }
        return QuickLinksAlgorithm.instance;
    }

    private loadFromStorage() {
        try {
            const data = localStorage.getItem('eterx_quicklinks');
            if (data) {
                this.links = JSON.parse(data);
                this.recalculateScores();
            } else {
                this.initializeDefaultLinks();
            }
        } catch (e) {
            console.error('Failed to load QuickLinks:', e);
            this.initializeDefaultLinks();
        }
    }

    private saveToStorage() {
        try {
            localStorage.setItem('eterx_quicklinks', JSON.stringify(this.links));
            this.notifyListeners(); // 🔥 Fire the event every time we save a change
        } catch (e) {
            console.error('Failed to save QuickLinks:', e);
        }
    }

    // --- Observer Pattern for Live Updates ---
    public subscribe(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener());
    }

    private initializeDefaultLinks() {
        const defaults = [
            { title: 'YouTube', url: 'https://youtube.com' },
            { title: 'Google', url: 'https://google.com' },
            { title: 'Twitter', url: 'https://twitter.com' },
            { title: 'Twitch', url: 'https://twitch.tv' },
            { title: 'Reddit', url: 'https://reddit.com' },
            { title: 'GitHub', url: 'https://github.com' },
            { title: 'Gmail', url: 'https://mail.google.com' }
        ];

        this.links = defaults.map(link => ({
            id: uuidv4(),
            title: link.title,
            url: link.url,
            isPinned: true, // Default links are pinned initially
            visitCount: 1,
            lastVisited: Date.now(),
            score: 100 // High initial score for defaults
        }));
        this.saveToStorage();
    }

    /**
     * Calculates score using Exponential Time Decay.
     * Score = visitCount * (1/2) ^ (time_elapsed / half_life)
     */
    private calculateDecayScore(visitCount: number, lastVisited: number): number {
        const now = Date.now();
        const elapsed = Math.max(0, now - lastVisited);

        // Massive Recency Boost: If visited in the last 2 hours (7200000 ms), apply a 100x multiplier
        // This ensures "last visited first come" without destroying long-term history states
        const RECENCY_BOOST_MS = 2 * 60 * 60 * 1000;
        let boostMultiplier = 1;
        if (elapsed < RECENCY_BOOST_MS) {
            // Linear scale from 100x (just visited) down to 1x (2 hours ago)
            boostMultiplier = 1 + (99 * (1 - (elapsed / RECENCY_BOOST_MS)));
        }

        const decayFactor = Math.pow(0.5, elapsed / HALF_LIFE_MS);
        return visitCount * decayFactor * boostMultiplier;
    }

    private recalculateScores() {
        let changed = false;
        this.links.forEach(link => {
            if (!link.isPinned) {
                const newScore = this.calculateDecayScore(link.visitCount, link.lastVisited);
                if (link.score !== newScore) {
                    link.score = newScore;
                    changed = true;
                }
            } else {
                // Pinned items always have a max score weight essentially
                link.score = Number.MAX_SAFE_INTEGER;
            }
        });

        if (changed) {
            this.saveToStorage();
        }
    }

    public recordVisit(url: string, title?: string, faviconUrl?: string) {
        if (!url || url.startsWith('chrome://') || url.startsWith('file://')) return;

        let link = this.links.find(l => this.normalizeUrl(l.url) === this.normalizeUrl(url));
        const now = Date.now();

        if (link) {
            link.visitCount += 1;
            link.lastVisited = now;
            link.title = title || link.title;
            if (faviconUrl) link.faviconUrl = faviconUrl;

            if (!link.isPinned) {
                link.score = this.calculateDecayScore(link.visitCount, link.lastVisited);
            }
        } else {
            // New site discovery
            this.links.push({
                id: uuidv4(),
                title: title || this.extractDomain(url),
                url: url,
                faviconUrl: faviconUrl,
                isPinned: false,
                visitCount: 1,
                lastVisited: now,
                score: this.calculateDecayScore(1, now)
            });
        }

        this.saveToStorage();
    }

    public pinShortcut(title: string, url: string, faviconUrl?: string) {
        let link = this.links.find(l => this.normalizeUrl(l.url) === this.normalizeUrl(url));
        if (link) {
            link.isPinned = true;
            link.title = title;
            if (faviconUrl) link.faviconUrl = faviconUrl;
            link.score = Number.MAX_SAFE_INTEGER;
        } else {
            this.links.push({
                id: uuidv4(),
                title: title,
                url: url,
                faviconUrl: faviconUrl,
                isPinned: true,
                visitCount: 1,
                lastVisited: Date.now(),
                score: Number.MAX_SAFE_INTEGER
            });
        }
        this.saveToStorage();
    }

    public unpinShortcut(id: string) {
        const link = this.links.find(l => l.id === id);
        if (link) {
            link.isPinned = false;
            link.score = this.calculateDecayScore(link.visitCount, link.lastVisited);
            this.saveToStorage();
        }
    }

    public removeShortcut(id: string) {
        this.links = this.links.filter(l => l.id !== id);
        this.saveToStorage();
    }

    public getTopSites(limit: number = 7): QuickLinkItem[] {
        this.recalculateScores();

        // Sort by score descending
        const sorted = [...this.links].sort((a, b) => b.score - a.score);

        // Return exactly the limit asked for (leaving 1 space for the 'Add' button usually)
        return sorted.slice(0, limit);
    }

    // --- Helpers ---
    private normalizeUrl(url: string): string {
        try {
            const parsed = new URL(url);
            return parsed.hostname.replace(/^www\./, '') + parsed.pathname;
        } catch {
            return url;
        }
    }

    private extractDomain(url: string): string {
        try {
            const parsed = new URL(url);
            let hostname = parsed.hostname.replace(/^www\./, '');
            // Simple Capitalization for default titles
            return hostname.charAt(0).toUpperCase() + hostname.slice(1).split('.')[0];
        } catch {
            return url;
        }
    }
}
