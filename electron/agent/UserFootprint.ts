/**
 * UserFootprint.ts — User Context & Browsing Intelligence
 * 
 * Tracks the user's browsing patterns, page visits, video positions,
 * scroll states, and frequent sites. This data makes the agent
 * context-aware — it knows WHERE the user was, WHAT they were doing,
 * and can resume from the exact point they left off.
 * 
 * All data persisted to ~/.eterx/footprint.json
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

interface PageVisit {
    url: string;
    title: string;
    domain: string;
    timestamp: number;
    duration: number;         // seconds spent on page
    scrollPosition?: number;  // 0-1 ratio (how far down)
    interactions?: number;    // clicks/types on that page
}

interface VideoState {
    url: string;
    title: string;
    currentTime: number;  // seconds
    duration: number;     // total seconds
    lastWatched: number;  // timestamp
    completed: boolean;   // watched >90%
}

interface SiteProfile {
    domain: string;
    visitCount: number;
    totalTimeSpent: number;  // seconds
    lastVisited: number;
    commonPages: string[];   // most visited paths
    isLoggedIn: boolean;
    category?: string;       // 'email' | 'social' | 'work' | 'shopping' | 'entertainment' | 'dev'
}

interface FormData {
    url: string;
    fields: Record<string, string>;  // field name → last used value
    lastUsed: number;
}

interface FootprintData {
    recentHistory: PageVisit[];     // last 200 pages
    videoStates: VideoState[];      // last 50 videos
    siteProfiles: SiteProfile[];    // all domains
    savedForms: FormData[];         // last 30 forms
    searchHistory: string[];        // last 100 searches
    lastActiveTab: string;          // last URL user was on
    preferences: Record<string, any>;
}

// ═══════════════════════════════════════════════
// SITE CATEGORIZER
// ═══════════════════════════════════════════════

const SITE_CATEGORIES: Record<string, string> = {
    'gmail.com': 'email', 'mail.google.com': 'email', 'outlook.com': 'email', 'outlook.live.com': 'email',
    'youtube.com': 'entertainment', 'netflix.com': 'entertainment', 'twitch.tv': 'entertainment', 'spotify.com': 'entertainment',
    'twitter.com': 'social', 'x.com': 'social', 'facebook.com': 'social', 'instagram.com': 'social', 'reddit.com': 'social', 'linkedin.com': 'social',
    'github.com': 'dev', 'stackoverflow.com': 'dev', 'gitlab.com': 'dev', 'npmjs.com': 'dev', 'vercel.com': 'dev',
    'amazon.com': 'shopping', 'amazon.in': 'shopping', 'flipkart.com': 'shopping', 'ebay.com': 'shopping',
    'docs.google.com': 'work', 'notion.so': 'work', 'slack.com': 'work', 'trello.com': 'work', 'figma.com': 'work',
    'google.com': 'search', 'bing.com': 'search', 'duckduckgo.com': 'search',
};

function categorize(domain: string): string | undefined {
    const d = domain.replace('www.', '');
    return SITE_CATEGORIES[d];
}

function extractDomain(url: string): string {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}

// ═══════════════════════════════════════════════
// USER FOOTPRINT SERVICE
// ═══════════════════════════════════════════════

export class UserFootprint {
    private data: FootprintData;
    private dataPath: string;
    private saveTimer: NodeJS.Timeout | null = null;

    constructor() {
        const dataDir = path.join(app.getPath('userData'), 'eterx-data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        this.dataPath = path.join(dataDir, 'footprint.json');
        this.data = this.load();
    }

    // ── Persistence ──────────────────────────────

    private load(): FootprintData {
        try {
            if (fs.existsSync(this.dataPath)) {
                return JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
            }
        } catch (e) {
            console.error('[Footprint] Failed to load:', e);
        }
        return {
            recentHistory: [],
            videoStates: [],
            siteProfiles: [],
            savedForms: [],
            searchHistory: [],
            lastActiveTab: '',
            preferences: {},
        };
    }

    private scheduleSave(): void {
        if (this.saveTimer) return;
        this.saveTimer = setTimeout(() => {
            this.saveTimer = null;
            try {
                fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
            } catch (e) {
                console.error('[Footprint] Save failed:', e);
            }
        }, 2000); // Debounce: write at most every 2s
    }

    // ── Recording ────────────────────────────────

    /** Record a page visit. Call on every navigation. */
    recordPageVisit(url: string, title: string, duration: number = 0): void {
        const domain = extractDomain(url);
        if (!domain || url.startsWith('about:') || url.startsWith('chrome:')) return;

        const visit: PageVisit = {
            url, title, domain, duration,
            timestamp: Date.now(),
        };
        this.data.recentHistory.unshift(visit);
        if (this.data.recentHistory.length > 200) this.data.recentHistory.pop();
        this.data.lastActiveTab = url;
        
        // Update site profile
        this.updateSiteProfile(domain, duration);
        this.scheduleSave();
    }

    /** Record where user left off in a video. */
    recordVideoPosition(url: string, title: string, currentTime: number, totalDuration: number): void {
        const existing = this.data.videoStates.findIndex(v => v.url === url);
        const state: VideoState = {
            url, title, currentTime, duration: totalDuration,
            lastWatched: Date.now(),
            completed: (currentTime / totalDuration) > 0.9,
        };
        if (existing >= 0) {
            this.data.videoStates[existing] = state;
        } else {
            this.data.videoStates.unshift(state);
            if (this.data.videoStates.length > 50) this.data.videoStates.pop();
        }
        this.scheduleSave();
    }

    /** Record scroll position (0-1 ratio). */
    recordScrollPosition(url: string, scrollRatio: number): void {
        const visit = this.data.recentHistory.find(v => v.url === url);
        if (visit) visit.scrollPosition = scrollRatio;
        this.scheduleSave();
    }

    /** Record a search query. */
    recordSearch(query: string): void {
        this.data.searchHistory.unshift(query);
        if (this.data.searchHistory.length > 100) this.data.searchHistory.pop();
        this.scheduleSave();
    }

    /** Record form field values for auto-fill memory. */
    recordFormData(url: string, fields: Record<string, string>): void {
        const existing = this.data.savedForms.findIndex(f => f.url === url);
        if (existing >= 0) {
            this.data.savedForms[existing].fields = { ...this.data.savedForms[existing].fields, ...fields };
            this.data.savedForms[existing].lastUsed = Date.now();
        } else {
            this.data.savedForms.unshift({ url, fields, lastUsed: Date.now() });
            if (this.data.savedForms.length > 30) this.data.savedForms.pop();
        }
        this.scheduleSave();
    }

    /** Mark a site as logged-in (detected via cookies/session). */
    markLoggedIn(domain: string): void {
        const profile = this.getSiteProfile(domain);
        if (profile) profile.isLoggedIn = true;
        this.scheduleSave();
    }

    // ── Site Profile Management ──────────────────

    private updateSiteProfile(domain: string, duration: number): void {
        let profile = this.data.siteProfiles.find(s => s.domain === domain);
        if (!profile) {
            profile = {
                domain,
                visitCount: 0,
                totalTimeSpent: 0,
                lastVisited: Date.now(),
                commonPages: [],
                isLoggedIn: false,
                category: categorize(domain),
            };
            this.data.siteProfiles.push(profile);
        }
        profile.visitCount++;
        profile.totalTimeSpent += duration;
        profile.lastVisited = Date.now();
    }

    private getSiteProfile(domain: string): SiteProfile | undefined {
        return this.data.siteProfiles.find(s => s.domain === domain);
    }

    // ── Retrieval (for agent context) ────────────

    /** Get last N pages visited. */
    getRecentHistory(n: number = 10): PageVisit[] {
        return this.data.recentHistory.slice(0, n);
    }

    /** Get top visited domains. */
    getFrequentSites(n: number = 8): SiteProfile[] {
        return [...this.data.siteProfiles]
            .sort((a, b) => b.visitCount - a.visitCount)
            .slice(0, n);
    }

    /** Get where user left off on a video. */
    getVideoResume(url?: string): VideoState | VideoState[] | null {
        if (url) {
            return this.data.videoStates.find(v => v.url === url) || null;
        }
        // Return last 5 unwatched videos
        return this.data.videoStates
            .filter(v => !v.completed)
            .slice(0, 5);
    }

    /** Get scroll position for a page. */
    getPageResume(url: string): { scrollPosition?: number } | null {
        const visit = this.data.recentHistory.find(v => v.url === url);
        return visit ? { scrollPosition: visit.scrollPosition } : null;
    }

    /** Get recent search queries. */
    getRecentSearches(n: number = 10): string[] {
        return this.data.searchHistory.slice(0, n);
    }

    /** Get saved form data for a URL. */
    getSavedForm(url: string): Record<string, string> | null {
        const form = this.data.savedForms.find(f => f.url === url);
        return form ? form.fields : null;
    }

    /** Get the last active tab URL. */
    getLastActiveTab(): string {
        return this.data.lastActiveTab;
    }

    /** Get logged-in sites. */
    getLoggedInSites(): string[] {
        return this.data.siteProfiles
            .filter(s => s.isLoggedIn)
            .map(s => s.domain);
    }

    /**
     * Generate a formatted context string for the agent system prompt.
     * Includes: recent history, frequent sites, video resume points, active searches.
     */
    getFootprintContext(): string {
        const parts: string[] = [];

        // Recent browsing (last 5)
        const recent = this.getRecentHistory(5);
        if (recent.length > 0) {
            parts.push('## Recent Browsing');
            recent.forEach((v, i) => {
                const ago = Math.round((Date.now() - v.timestamp) / 60000);
                parts.push(`${i + 1}. [${ago}m ago] ${v.title} — ${v.url}`);
            });
        }

        // Frequent sites
        const freq = this.getFrequentSites(5);
        if (freq.length > 0) {
            parts.push('\n## Frequent Sites');
            freq.forEach(s => {
                const cat = s.category ? ` (${s.category})` : '';
                const logged = s.isLoggedIn ? ' ✓logged-in' : '';
                parts.push(`- ${s.domain}${cat}: ${s.visitCount} visits${logged}`);
            });
        }

        // Unfinished videos
        const videos = this.getVideoResume() as VideoState[] | null;
        if (videos && videos.length > 0) {
            parts.push('\n## Unfinished Videos');
            videos.forEach(v => {
                const mins = Math.round(v.currentTime / 60);
                const total = Math.round(v.duration / 60);
                parts.push(`- "${v.title}" — ${mins}/${total}min (${v.url})`);
            });
        }

        // Logged-in sites
        const loggedIn = this.getLoggedInSites();
        if (loggedIn.length > 0) {
            parts.push(`\n## Authenticated Sites: ${loggedIn.join(', ')}`);
        }

        // Recent searches
        const searches = this.getRecentSearches(5);
        if (searches.length > 0) {
            parts.push(`\n## Recent Searches: ${searches.join(' | ')}`);
        }

        return parts.length > 0 ? `\n# USER CONTEXT (Footprint)\n${parts.join('\n')}` : '';
    }

    /** Set a user preference. */
    setPreference(key: string, value: any): void {
        this.data.preferences[key] = value;
        this.scheduleSave();
    }

    /** Get a user preference. */
    getPreference(key: string): any {
        return this.data.preferences[key];
    }

    /** Force save now. */
    flush(): void {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
        try {
            fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
        } catch (e) {
            console.error('[Footprint] Flush failed:', e);
        }
    }
}

// ═══════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════

let _footprint: UserFootprint | null = null;

export function getUserFootprint(): UserFootprint {
    if (!_footprint) {
        _footprint = new UserFootprint();
    }
    return _footprint;
}
