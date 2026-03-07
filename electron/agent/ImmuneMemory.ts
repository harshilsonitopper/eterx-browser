/**
 * ImmuneMemory.ts — Biological Immune Memory System
 * From BeyondHuman Architecture System 04
 * 
 * Every failure permanently immunizes the agent against that failure class.
 * Antibodies are pattern matchers that run before every action and inject
 * known fixes. The agent gets permanently smarter from every failure.
 */

import { Antibody } from './SiteFingerprint.js';

// ─────────────────────────────────────────────
// ANTIBODY STORE
// ─────────────────────────────────────────────

export class ImmuneMemory {
    private antibodies: Antibody[] = [];
    private maxAntibodies: number = 500;

    constructor() {
        // Load default antibodies — common web interaction failures
        this.seedDefaultAntibodies();
    }

    /**
     * Analyze a failure and create an antibody to prevent it in the future
     */
    learnFromFailure(context: {
        tool: string;
        args: any;
        error: string;
        url: string;
        domain: string;
    }): Antibody | null {
        const { tool, args, error, domain } = context;
        const errorLower = error.toLowerCase();

        // Pattern matching for common failure types
        let antibody: Antibody | null = null;

        // Element not found → scroll first or use JS
        if (errorLower.includes('not found') || errorLower.includes('no element') || errorLower.includes('cannot find')) {
            antibody = {
                id: this.generateId(),
                trigger_pattern: `element_not_found:${ tool }`,
                failure_type: 'element_not_found',
                prevention_action: 'scroll_to_element_first',
                domain,
                confidence: 0.7,
                hit_count: 0,
                created_at: Date.now(),
                last_used: Date.now(),
            };
        }

        // Click failed → element may have moved, re-resolve
        if (errorLower.includes('click') && (errorLower.includes('fail') || errorLower.includes('intercept'))) {
            antibody = {
                id: this.generateId(),
                trigger_pattern: `click_intercepted:${ domain }`,
                failure_type: 'click_intercepted',
                prevention_action: 'dismiss_overlays_before_click',
                domain,
                confidence: 0.8,
                hit_count: 0,
                created_at: Date.now(),
                last_used: Date.now(),
            };
        }

        // Navigation timeout → site is slow, increase wait
        if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
            antibody = {
                id: this.generateId(),
                trigger_pattern: `timeout:${ domain }`,
                failure_type: 'timeout',
                prevention_action: 'increase_wait_time',
                domain,
                confidence: 0.6,
                hit_count: 0,
                created_at: Date.now(),
                last_used: Date.now(),
            };
        }

        // SPA re-render → element disappeared during action
        if (errorLower.includes('detach') || errorLower.includes('stale') || errorLower.includes('destroyed')) {
            antibody = {
                id: this.generateId(),
                trigger_pattern: `spa_rerender:${ domain }`,
                failure_type: 'element_stale',
                prevention_action: 'wait_for_dom_stable_300ms',
                domain,
                confidence: 0.85,
                hit_count: 0,
                created_at: Date.now(),
                last_used: Date.now(),
            };
        }

        // Form field not accepting input
        if (errorLower.includes('readonly') || errorLower.includes('disabled') || errorLower.includes('cannot type')) {
            antibody = {
                id: this.generateId(),
                trigger_pattern: `field_readonly:${ domain }`,
                failure_type: 'field_not_editable',
                prevention_action: 'use_js_value_injection',
                domain,
                confidence: 0.75,
                hit_count: 0,
                created_at: Date.now(),
                last_used: Date.now(),
            };
        }

        if (antibody) {
            // Check for duplicate pattern
            const existing = this.antibodies.find(a =>
                a.trigger_pattern === antibody!.trigger_pattern && a.domain === antibody!.domain
            );
            if (existing) {
                existing.confidence = Math.min(1.0, existing.confidence + 0.1);
                existing.last_used = Date.now();
                return existing;
            }

            this.antibodies.push(antibody);

            // Evict oldest low-confidence antibodies if over limit
            if (this.antibodies.length > this.maxAntibodies) {
                this.antibodies.sort((a, b) => (b.confidence * b.hit_count) - (a.confidence * a.hit_count));
                this.antibodies = this.antibodies.slice(0, this.maxAntibodies);
            }
        }

        return antibody;
    }

    /**
     * Scan current context for matching antibodies
     * Returns prevention actions to inject before the action executes
     */
    scan(context: {
        tool: string;
        domain: string;
        pageState?: string;
    }): string[] {
        const preventions: string[] = [];

        for (const ab of this.antibodies) {
            // Domain match (or global)
            const domainMatch = ab.domain === context.domain || ab.domain === '*';
            if (!domainMatch) continue;

            // Pattern match
            const patternMatch =
                ab.trigger_pattern.includes(context.tool) ||
                ab.trigger_pattern.includes(context.domain);

            if (patternMatch && ab.confidence > 0.5) {
                preventions.push(ab.prevention_action);
                ab.hit_count++;
                ab.last_used = Date.now();
            }
        }

        return [...new Set(preventions)]; // Deduplicate
    }

    /**
     * Get antibody stats
     */
    getStats(): { total: number; byType: Record<string, number>; topDomains: string[] } {
        const byType: Record<string, number> = {};
        const domainCount = new Map<string, number>();

        for (const ab of this.antibodies) {
            byType[ab.failure_type] = (byType[ab.failure_type] || 0) + 1;
            domainCount.set(ab.domain, (domainCount.get(ab.domain) || 0) + 1);
        }

        const topDomains = [...domainCount.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([d]) => d);

        return { total: this.antibodies.length, byType, topDomains };
    }

    /**
     * Seed with universal antibodies — common patterns that apply everywhere
     */
    private seedDefaultAntibodies(): void {
        const defaults: Array<{ pattern: string; type: string; action: string }> = [
            { pattern: 'cookie_banner:*', type: 'overlay_blocking', action: 'dismiss_cookie_banner' },
            { pattern: 'modal_popup:*', type: 'overlay_blocking', action: 'press_escape_or_close' },
            { pattern: 'captcha_detected:*', type: 'captcha', action: 'inject_stealth_first' },
            { pattern: 'lazy_load:*', type: 'content_not_loaded', action: 'scroll_to_trigger_load' },
            { pattern: 'spa_hydration:*', type: 'premature_interaction', action: 'wait_500ms_after_load' },
            { pattern: 'dropdown_closed:*', type: 'dropdown_not_open', action: 'click_trigger_before_option' },
            { pattern: 'iframe_content:*', type: 'wrong_context', action: 'switch_to_iframe' },
            { pattern: 'shadow_dom:*', type: 'element_hidden', action: 'pierce_shadow_dom' },
        ];

        for (const d of defaults) {
            this.antibodies.push({
                id: this.generateId(),
                trigger_pattern: d.pattern,
                failure_type: d.type,
                prevention_action: d.action,
                domain: '*',
                confidence: 0.9,
                hit_count: 0,
                created_at: Date.now(),
                last_used: 0,
            });
        }
    }

    private generateId(): string {
        return `ab_${ Date.now() }_${ Math.random().toString(36).substring(2, 8) }`;
    }
}

// ─────────────────────────────────────────────
// NETWORK ORACLE (Lightweight v1)
// From BeyondHuman System 11
// ─────────────────────────────────────────────

export interface CapturedResponse {
    url: string;
    method: string;
    status: number;
    contentType: string;
    body: string; // JSON stringified if applicable
    timestamp: number;
}

export class NetworkOracle {
    private responses: CapturedResponse[] = [];
    private maxResponses: number = 50;
    private isActive: boolean = false;

    /**
     * Start capturing network responses from a webContents
     * Injects a fetch/XHR interceptor
     */
    async startCapture(wc: Electron.WebContents): Promise<void> {
        if (this.isActive) return;
        this.isActive = true;

        try {
            // Inject XHR/Fetch interceptor
            await wc.executeJavaScript(`(() => {
                if (window.__eterxNetworkOracle) return; // Already injected
                window.__eterxNetworkOracle = { responses: [] };
                
                // Intercept fetch
                const origFetch = window.fetch;
                window.fetch = async function(...args) {
                    const response = await origFetch.apply(this, args);
                    try {
                        const clone = response.clone();
                        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
                        const ct = clone.headers.get('content-type') || '';
                        if (ct.includes('json') && !url.includes('analytics') && !url.includes('tracking')) {
                            const body = await clone.text();
                            window.__eterxNetworkOracle.responses.push({
                                url: url.substring(0, 200),
                                method: args[1]?.method || 'GET',
                                status: response.status,
                                contentType: ct,
                                body: body.substring(0, 2000),
                                timestamp: Date.now()
                            });
                            // Keep only last 20
                            if (window.__eterxNetworkOracle.responses.length > 20) {
                                window.__eterxNetworkOracle.responses = window.__eterxNetworkOracle.responses.slice(-20);
                            }
                        }
                    } catch(e) {}
                    return response;
                };
                
                // Intercept XHR
                const origOpen = XMLHttpRequest.prototype.open;
                const origSend = XMLHttpRequest.prototype.send;
                XMLHttpRequest.prototype.open = function(method, url) {
                    this.__eterxMethod = method;
                    this.__eterxUrl = typeof url === 'string' ? url : String(url);
                    return origOpen.apply(this, arguments);
                };
                XMLHttpRequest.prototype.send = function() {
                    this.addEventListener('load', function() {
                        try {
                            const ct = this.getResponseHeader('content-type') || '';
                            if (ct.includes('json') && !this.__eterxUrl.includes('analytics')) {
                                window.__eterxNetworkOracle.responses.push({
                                    url: this.__eterxUrl.substring(0, 200),
                                    method: this.__eterxMethod || 'GET',
                                    status: this.status,
                                    contentType: ct,
                                    body: (this.responseText || '').substring(0, 2000),
                                    timestamp: Date.now()
                                });
                                if (window.__eterxNetworkOracle.responses.length > 20) {
                                    window.__eterxNetworkOracle.responses = window.__eterxNetworkOracle.responses.slice(-20);
                                }
                            }
                        } catch(e) {}
                    });
                    return origSend.apply(this, arguments);
                };
            })()`);
        } catch {
            this.isActive = false;
        }
    }

    /**
     * Harvest captured responses from the page
     */
    async harvest(wc: Electron.WebContents): Promise<CapturedResponse[]> {
        if (!this.isActive) return [];

        try {
            const raw = await wc.executeJavaScript(`(() => {
                if (!window.__eterxNetworkOracle) return '[]';
                const data = JSON.stringify(window.__eterxNetworkOracle.responses);
                window.__eterxNetworkOracle.responses = []; // Clear after harvest
                return data;
            })()`);

            const parsed = JSON.parse(raw) as CapturedResponse[];
            this.responses.push(...parsed);

            // Keep only recent
            if (this.responses.length > this.maxResponses) {
                this.responses = this.responses.slice(-this.maxResponses);
            }

            return parsed;
        } catch {
            return [];
        }
    }

    /**
     * Get a summary of recent API calls for the agent's context
     */
    getContextSummary(maxEntries: number = 3): string {
        if (this.responses.length === 0) return '';

        const recent = this.responses.slice(-maxEntries);
        const lines = recent.map(r => {
            const shortUrl = r.url.split('?')[0]; // Remove query params
            let bodyPreview = '';
            try {
                const parsed = JSON.parse(r.body);
                // Show keys or first item count
                if (Array.isArray(parsed)) {
                    bodyPreview = `[${ parsed.length } items]`;
                } else if (typeof parsed === 'object') {
                    bodyPreview = `{${ Object.keys(parsed).slice(0, 5).join(', ') }}`;
                }
            } catch {
                bodyPreview = r.body.substring(0, 100);
            }
            return `${ r.method } ${ shortUrl } → ${ r.status } ${ bodyPreview }`;
        });

        return `\n## Network Activity\n${ lines.join('\n') }\n`;
    }

    /**
     * Check if a specific API call succeeded
     */
    hasSuccessfulCall(urlPattern: string, method?: string): boolean {
        return this.responses.some(r =>
            r.url.includes(urlPattern) &&
            r.status >= 200 && r.status < 300 &&
            (!method || r.method.toUpperCase() === method.toUpperCase())
        );
    }

    /**
     * Reset oracle state (on navigation)
     */
    reset(): void {
        this.responses = [];
        this.isActive = false;
    }
}
