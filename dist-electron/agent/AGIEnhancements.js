/**
 * AGIEnhancements.ts — Deep AGI Intelligence Layer
 *
 * Adds speculative prefetch, smart routing, adaptive speed,
 * cookie/session intelligence, and task decomposition.
 * These sit on top of the existing NextGenAgent architecture.
 */
export class SpeculativePrefetch {
    cache = new Map();
    maxSize = 10;
    ttlMs = 60000; // 1 minute
    /** Prefetch URLs that the agent might navigate to next */
    async prefetchUrls(urls) {
        // SAFE: FastScraper import
        let getFastScraper;
        try {
            getFastScraper = (await import('./FastScraper.js')).getFastScraper;
        }
        catch {
            return;
        }
        const scraper = getFastScraper?.();
        if (!scraper)
            return;
        // Prefetch in parallel, fire-and-forget
        const validUrls = urls
            .filter(u => u.startsWith('http') && !this.cache.has(u))
            .slice(0, 3); // Max 3 at a time
        Promise.all(validUrls.map(async (url) => {
            try {
                const result = await scraper.fastRead(url, 3000);
                if (result.success) {
                    this.cache.set(url, {
                        url, content: result.content, title: result.title,
                        timestamp: Date.now()
                    });
                    // Evict old entries
                    if (this.cache.size > this.maxSize) {
                        const oldest = [...this.cache.entries()]
                            .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
                        if (oldest)
                            this.cache.delete(oldest[0]);
                    }
                }
            }
            catch (_) { }
        })).catch(() => { });
    }
    /** Get prefetched content for a URL (returns null if not cached) */
    get(url) {
        const entry = this.cache.get(url);
        if (!entry)
            return null;
        if (Date.now() - entry.timestamp > this.ttlMs) {
            this.cache.delete(url);
            return null;
        }
        return entry;
    }
    /** Predict URLs from current page links that agent might click */
    predictNextUrls(somElements, goal) {
        const goalLower = goal.toLowerCase();
        const goalWords = goalLower.split(/\s+/).filter(w => w.length > 3);
        return somElements
            .filter((el) => el.href && el.href.startsWith('http'))
            .map((el) => ({
            url: el.href,
            score: goalWords.reduce((s, w) => s + (el.text?.toLowerCase().includes(w) ? 2 : 0) +
                (el.href?.toLowerCase().includes(w) ? 1 : 0), 0)
        }))
            .filter(e => e.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(e => e.url);
    }
    clear() { this.cache.clear(); }
}
export class SmartRouter {
    performance = new Map();
    /** Record a tool execution result */
    recordExecution(tool, durationMs, success) {
        const prev = this.performance.get(tool) || { totalCalls: 0, avgMs: 0, successRate: 1, lastUsed: 0 };
        prev.totalCalls++;
        prev.avgMs = (prev.avgMs * (prev.totalCalls - 1) + durationMs) / prev.totalCalls;
        prev.successRate = (prev.successRate * (prev.totalCalls - 1) + (success ? 1 : 0)) / prev.totalCalls;
        prev.lastUsed = Date.now();
        this.performance.set(tool, prev);
    }
    /** Get the best tool for a given operation type */
    getBestTool(operationType) {
        const candidates = {
            'search': ['fast_search', 'shadow_search', 'shadow_quick_answer'],
            'read': ['fast_read', 'shadow_read_page', 'read_page_content'],
            'multi_search': ['parallel_search', 'fast_search'],
            'multi_read': ['parallel_read', 'fast_read'],
        };
        const tools = candidates[operationType] || [];
        let best = tools[0]; // Default to fastest
        let bestScore = -1;
        for (const tool of tools) {
            const perf = this.performance.get(tool);
            if (!perf) {
                // No data yet — prefer the "fast" variant
                if (tool.startsWith('fast_') && bestScore < 100) {
                    best = tool;
                    bestScore = 100;
                }
                continue;
            }
            // Score = success_rate / avg_time (higher = better)
            const score = (perf.successRate * 1000) / Math.max(perf.avgMs, 1);
            if (score > bestScore) {
                best = tool;
                bestScore = score;
            }
        }
        return best;
    }
    /** Generate routing hints for system prompt */
    getRoutingHints() {
        const hints = [];
        for (const [tool, perf] of this.performance.entries()) {
            if (perf.totalCalls >= 3) {
                hints.push(`${tool}: avg ${Math.round(perf.avgMs)}ms, ${Math.round(perf.successRate * 100)}% success (${perf.totalCalls} calls)`);
            }
        }
        return hints.length > 0 ? `\n## Tool Performance\n${hints.join('\n')}` : '';
    }
}
// ═══════════════════════════════════════════════
// 3. ADAPTIVE SPEED CONTROLLER
// Reduces delays when confident, increases when uncertain
// ═══════════════════════════════════════════════
export class AdaptiveSpeed {
    successStreak = 0;
    failStreak = 0;
    baseDelay = 200; // ms
    recordSuccess() {
        this.successStreak++;
        this.failStreak = 0;
    }
    recordFailure() {
        this.failStreak++;
        this.successStreak = 0;
    }
    /** Get adaptive delay based on recent success/failure pattern */
    turboMode = false;
    enableTurbo() { this.turboMode = true; }
    disableTurbo() { this.turboMode = false; }
    getDelay() {
        if (this.turboMode)
            return 20; // Turbo — maximum speed
        if (this.successStreak >= 5)
            return 50; // Very confident — blazing fast
        if (this.successStreak >= 3)
            return 100; // Confident — fast
        if (this.failStreak >= 3)
            return 500; // Struggling — slow down
        if (this.failStreak >= 2)
            return 350; // Cautious
        return this.baseDelay; // Default
    }
    /** Get screenshot quality based on confidence */
    getScreenshotQuality() {
        if (this.successStreak >= 5)
            return 40; // Low quality — speed priority
        if (this.failStreak >= 2)
            return 70; // High quality — need detail
        return 55; // Default
    }
    /** Get SOM element limit based on confidence */
    getSOMLimit() {
        if (this.successStreak >= 5)
            return 40; // Fewer elements — fast
        if (this.failStreak >= 2)
            return 80; // More elements — thorough
        return 60; // Default
    }
    reset() {
        this.successStreak = 0;
        this.failStreak = 0;
    }
}
// ═══════════════════════════════════════════════
// 4. COOKIE/SESSION INTELLIGENCE
// Detects login state, session health, auth walls
// ═══════════════════════════════════════════════
export class SessionIntelligence {
    loginStates = new Map();
    /** Detect if user is logged in on a page by checking common patterns */
    async detectLoginState(wc) {
        try {
            // SESSION_DETECT_TIMEOUT: 5s max
            const result = await Promise.race([
                wc.executeJavaScript(`(() => {
                const indicators = [];
                let user = null;
                
                // Check for logout/profile links (strong login indicator)
                const logoutLinks = document.querySelectorAll('a[href*="logout"], a[href*="signout"], a[href*="sign_out"], button[class*="logout"]');
                if (logoutLinks.length > 0) indicators.push('logout_link');
                
                // Check for profile/avatar elements
                const avatars = document.querySelectorAll('[class*="avatar"], [class*="profile-pic"], [class*="user-icon"], img[alt*="profile"], img[class*="avatar"]');
                if (avatars.length > 0) indicators.push('avatar');
                
                // Check for user name display
                const nameEls = document.querySelectorAll('[class*="username"], [class*="user-name"], [class*="display-name"], [data-testid*="user"]');
                if (nameEls.length > 0) {
                    indicators.push('username_display');
                    user = nameEls[0].innerText?.trim()?.substring(0, 50);
                }
                
                // Check for login form (strong NOT-logged-in indicator)
                const loginForm = document.querySelector('input[type="password"]:not([aria-hidden="true"]), form[action*="login"], form[action*="signin"]');
                if (loginForm) indicators.push('login_form_present');
                
                // Check for Google account indicator
                const gAccount = document.querySelector('a[href*="accounts.google.com"], [data-ogsr-up], .gb_A');
                if (gAccount) indicators.push('google_account');
                
                // Check cookies for session tokens
                const cookies = document.cookie;
                if (cookies.includes('session') || cookies.includes('token') || cookies.includes('auth') || cookies.includes('SID=')) {
                    indicators.push('session_cookie');
                }
                
                const loggedIn = indicators.filter(i => i !== 'login_form_present').length > 0 && !indicators.includes('login_form_present');
                return { loggedIn, indicators, user };
            })()`),
                new Promise(r => setTimeout(() => r({ loggedIn: false, indicators: [], user: null }), 5000))
            ]);
            // Cache the result
            try {
                const domain = new URL(wc.getURL()).hostname.replace('www.', '');
                this.loginStates.set(domain, { loggedIn: result.loggedIn, lastChecked: Date.now(), user: result.user });
                // Update footprint
                if (result.loggedIn) {
                    import('./UserFootprint.js').then(mod => {
                        mod.getUserFootprint().markLoggedIn(domain);
                    }).catch(() => { });
                }
            }
            catch (_) { }
            return result;
        }
        catch {
            return { loggedIn: false, indicators: [] };
        }
    }
    /** Get session context for a domain */
    getSessionContext(domain) {
        const state = this.loginStates.get(domain);
        if (!state)
            return '';
        const ago = Math.round((Date.now() - state.lastChecked) / 60000);
        return `Session: ${state.loggedIn ? 'LOGGED IN' : 'NOT logged in'}${state.user ? ` as "${state.user}"` : ''} (checked ${ago}m ago)`;
    }
    /** Check if an auth wall is blocking progress */
    async detectAuthWall(wc) {
        try {
            const isAuthWall = await wc.executeJavaScript(`(() => {
                const url = window.location.href.toLowerCase();
                const body = document.body?.innerText?.toLowerCase() || '';
                return (
                    url.includes('/login') || url.includes('/signin') || url.includes('/auth') ||
                    (body.includes('sign in') && body.includes('password') && document.querySelector('input[type="password"]'))
                );
            })()`);
            return isAuthWall;
        }
        catch {
            return false;
        }
    }
}
// ═══════════════════════════════════════════════
// 5. TASK DECOMPOSER
// Breaks complex goals into sub-tasks for smarter execution
// ═══════════════════════════════════════════════
export class TaskDecomposer {
    /** Decompose a complex task into ordered sub-tasks */
    decompose(task) {
        const taskLower = task.toLowerCase();
        const subtasks = [];
        // Multi-step patterns
        const stepPatterns = [
            /then\s+/i, /after\s+that/i, /next\s+/i, /also\s+/i,
            /and\s+also/i, /first\s+.*then/i, /finally\s+/i,
            /afterwards/i, /once.*done/i, /when.*finished/i,
            /step\s*\d/i, /\d+\.\s+/i, /before\s+/i
        ];
        const hasMultiStep = stepPatterns.some(p => p.test(task));
        if (hasMultiStep) {
            // Split by conjunction words
            const parts = task.split(/\s*(?:then|after that|next|also|and also|finally|,\s*then)\s*/i)
                .map(p => p.trim())
                .filter(p => p.length > 5);
            subtasks.push(...parts);
        }
        else {
            subtasks.push(task);
        }
        // Estimate turns
        let estimatedTurns = 0;
        for (const st of subtasks) {
            const stLower = st.toLowerCase();
            if (['search', 'find', 'look', 'check'].some(w => stLower.includes(w)))
                estimatedTurns += 3;
            else if (['fill', 'form', 'register', 'sign up'].some(w => stLower.includes(w)))
                estimatedTurns += 8;
            else if (['buy', 'purchase', 'order', 'book'].some(w => stLower.includes(w)))
                estimatedTurns += 15;
            else if (['compose', 'write', 'send'].some(w => stLower.includes(w)))
                estimatedTurns += 6;
            else if (['navigate', 'go to', 'open'].some(w => stLower.includes(w)))
                estimatedTurns += 2;
            else if (['read', 'extract', 'get'].some(w => stLower.includes(w)))
                estimatedTurns += 2;
            else
                estimatedTurns += 5;
        }
        return {
            subtasks,
            isComplex: subtasks.length > 1 || estimatedTurns > 10,
            estimatedTurns
        };
    }
    /** Generate a plan summary for the system prompt */
    generatePlanContext(task) {
        const { subtasks, isComplex, estimatedTurns } = this.decompose(task);
        if (!isComplex)
            return '';
        let plan = `\n## TASK PLAN (Auto-Decomposed)\n`;
        plan += `Estimated: ${estimatedTurns} turns\n`;
        subtasks.forEach((st, i) => {
            plan += `${i + 1}. ${st}\n`;
        });
        return plan;
    }
}
// ═══════════════════════════════════════════════
// 6. SMART CONTEXT BUILDER
// Builds optimized context messages based on task type
// ═══════════════════════════════════════════════
export class SmartContextBuilder {
    /** Build an enhanced context section for data-extraction tasks */
    buildExtractionContext(somElements, goal) {
        const goalLower = goal.toLowerCase();
        const isExtraction = ['read', 'extract', 'get', 'find', 'list', 'what', 'show', 'tell me', 'check'].some(w => goalLower.includes(w));
        if (!isExtraction)
            return '';
        // Find text-heavy elements
        const textElements = somElements.filter((el) => el.text && el.text.length > 20 && ['a', 'button', 'span', 'div'].includes(el.tag));
        if (textElements.length > 0) {
            return `\n## KEY TEXT ELEMENTS (for extraction)\n${textElements.slice(0, 10).map((el) => `- [${el.id}] "${el.text.substring(0, 60)}" ${el.href ? `→ ${el.href.substring(0, 50)}` : ''}`).join('\n')}`;
        }
        return '';
    }
    /** Build navigation hints based on common site patterns */
    buildNavigationHints(url, somElements) {
        const domain = this.extractDomain(url);
        const hints = [];
        // Google-specific
        if (domain.includes('google.com') && url.includes('/search')) {
            const resultLinks = somElements.filter((el) => el.tag === 'a' && el.href && !el.href.includes('google.com'));
            hints.push(`📊 ${resultLinks.length} search result links visible`);
        }
        // Gmail-specific  
        if (domain.includes('mail.google.com')) {
            const emailRows = somElements.filter((el) => el.tag === 'tr' || el.role === 'row');
            hints.push(`📧 ${emailRows.length} email rows visible`);
        }
        // Amazon/Shopping-specific
        if (domain.includes('amazon.') || domain.includes('flipkart.') || domain.includes('ebay.')) {
            const priceEls = somElements.filter((el) => /\$|\u20B9|price|cost/i.test(el.text || ''));
            const addToCart = somElements.filter((el) => /add to cart|buy now|add to bag/i.test(el.text || ''));
            hints.push(`🛒 ${priceEls.length} price elements, ${addToCart.length} buy buttons visible`);
        }
        // YouTube-specific
        if (domain.includes('youtube.com')) {
            const videoLinks = somElements.filter((el) => el.href?.includes('/watch'));
            hints.push(`🎬 ${videoLinks.length} video links visible`);
        }
        return hints.length > 0 ? `\n## SITE INTELLIGENCE\n${hints.join('\n')}` : '';
    }
    extractDomain(url) {
        try {
            return new URL(url).hostname;
        }
        catch {
            return '';
        }
    }
}
// ═══════════════════════════════════════════════
// SINGLETON EXPORTS
// ═══════════════════════════════════════════════
let _prefetch = null;
let _router = null;
let _speed = null;
let _session = null;
let _decomposer = null;
let _contextBuilder = null;
export function getSpeculativePrefetch() {
    if (!_prefetch)
        _prefetch = new SpeculativePrefetch();
    return _prefetch;
}
export function getSmartRouter() {
    if (!_router)
        _router = new SmartRouter();
    return _router;
}
export function getAdaptiveSpeed() {
    if (!_speed)
        _speed = new AdaptiveSpeed();
    return _speed;
}
export function getSessionIntelligence() {
    if (!_session)
        _session = new SessionIntelligence();
    return _session;
}
export function getTaskDecomposer() {
    if (!_decomposer)
        _decomposer = new TaskDecomposer();
    return _decomposer;
}
export function getSmartContextBuilder() {
    if (!_contextBuilder)
        _contextBuilder = new SmartContextBuilder();
    return _contextBuilder;
}
