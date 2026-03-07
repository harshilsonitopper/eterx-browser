/**
 * ShadowAgent.ts — Headless Parallel Web Intelligence Engine
 * 
 * Works alongside the main agent WITHOUT clicking or interacting with UI.
 * Searches the web, reads pages, extracts data — all in the background.
 * 
 * Architecture:
 * - Uses Electron's hidden BrowserWindow for headless page fetching
 * - Searches Google directly and parses results
 * - Extracts page content, tables, forms, links
 * - Runs in parallel — main agent calls shadow tools for instant info
 * - Maintains a research cache for fast repeated queries
 */

import { BrowserWindow, session } from 'electron';

// ═════════════════════════════════════════════════
// RESEARCH CACHE — Avoids re-fetching the same data
// ═════════════════════════════════════════════════

interface CacheEntry {
    content: string;
    url: string;
    title: string;
    timestamp: number;
    links?: { text: string; href: string }[];
    tables?: string[][];
}

class ResearchCache {
    private cache = new Map<string, CacheEntry>();
    private maxSize = 50;
    private ttlMs = 10 * 60 * 1000; // 10 min TTL

    get(key: string): CacheEntry | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > this.ttlMs) {
            this.cache.delete(key);
            return null;
        }
        return entry;
    }

    set(key: string, entry: CacheEntry): void {
        if (this.cache.size >= this.maxSize) {
            const oldest = [...this.cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
            if (oldest) this.cache.delete(oldest[0]);
        }
        this.cache.set(key, { ...entry, timestamp: Date.now() });
    }

    clear(): void { this.cache.clear(); }
}

// ═════════════════════════════════════════════════
// SHADOW BROWSER — Hidden window for headless fetching
// ═════════════════════════════════════════════════

class ShadowBrowser {
    private window: BrowserWindow | null = null;
    private ready = false;

    async init(): Promise<void> {
        if (this.window && !this.window.isDestroyed()) return;
        // SAFE: BrowserWindow creation with error recovery
        try {

        this.window = new BrowserWindow({
            width: 1280,
            height: 720,
            show: false, // HIDDEN — never shown to user
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
                // USE DEFAULT SESSION — shares cookies, auth, logins with main browser!
                // This means shadow agent can access Gmail, logged-in sites, etc.
            },
        });

        // Set a standard user agent
        this.window.webContents.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        this.ready = true;
        } catch (e: any) {
            console.error('[ShadowBrowser] Failed to create window:', e.message);
            this.window = null;
            this.ready = false;
        }
    }

    async loadURL(url: string, timeoutMs = 15000): Promise<boolean> {
        await this.init();
        if (!this.window || this.window.isDestroyed()) return false;

        return new Promise<boolean>((resolve) => {
            const timer = setTimeout(() => resolve(true), timeoutMs);
            this.window!.webContents.once('did-finish-load', () => {
                clearTimeout(timer);
                resolve(true);
            });
            this.window!.webContents.once('did-fail-load', () => {
                clearTimeout(timer);
                resolve(false);
            });
            try {
                this.window!.webContents.loadURL(url);
            } catch (e) {
                clearTimeout(timer);
                resolve(false);
            }
        });
    }

    async executeJS(script: string): Promise<any> {
        if (!this.window || this.window.isDestroyed()) return null;
        try {
            // JS_TIMEOUT: 30s max for JS execution
            return await Promise.race([
                this.window.webContents.executeJavaScript(script),
                new Promise(r => setTimeout(() => r(null), 30000))
            ]);
        } catch (e) {
            return null;
        }
    }

    getURL(): string {
        if (!this.window || this.window.isDestroyed()) return '';
        return this.window.webContents.getURL();
    }

    destroy(): void {
        if (this.window && !this.window.isDestroyed()) {
            this.window.close();
        }
        this.window = null;
        this.ready = false;
    }
}

// ═════════════════════════════════════════════════
// SHADOW AGENT — Super-Intelligence Background Worker
// Can access ANY logged-in site, send emails, read data,
// fill forms, execute actions — all silently in background.
// ═════════════════════════════════════════════════

export class ShadowAgent {
    private browser: ShadowBrowser;
    private cache: ResearchCache;
    private isWorking = false;

    constructor() {
        this.browser = new ShadowBrowser();
        this.cache = new ResearchCache();
    }

    /**
     * Search Google and return parsed results — NO clicking required.
     */
    async search(query: string, maxResults = 8): Promise<{
        success: boolean;
        query: string;
        results: { rank: number; title: string; url: string; snippet: string }[];
        error?: string;
    }> {
        const cacheKey = `search:${query}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return { success: true, query, results: JSON.parse(cached.content) };
        }

        try {
            this.isWorking = true;
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;
            const loaded = await this.browser.loadURL(searchUrl);
            if (!loaded) return { success: false, query, results: [], error: 'Failed to load Google' };

            await new Promise(r => setTimeout(r, 800)); // Optimized from 1500ms

            const results = await this.browser.executeJS(`(() => {
                const items = [];
                document.querySelectorAll('.g, .tF2Cxc, [data-sokoban-container]').forEach((el, i) => {
                    if (i >= ${maxResults}) return;
                    const titleEl = el.querySelector('h3');
                    const linkEl = el.querySelector('a');
                    const snippetEl = el.querySelector('.VwiC3b, .st, .IsZvec, [data-sncf]');
                    const title = titleEl?.innerText || '';
                    const url = linkEl?.href || '';
                    const snippet = snippetEl?.innerText || '';
                    if (title && url && !url.includes('google.com/search')) {
                        items.push({ rank: items.length + 1, title, url: url.substring(0, 200), snippet: snippet.substring(0, 200) });
                    }
                });
                const featured = document.querySelector('.hgKElc, .IZ6rdc, [data-attrid]');
                if (featured) {
                    items.unshift({ rank: 0, title: 'Featured Answer', url: location.href, snippet: featured.innerText?.substring(0, 300) || '' });
                }
                return items;
            })()`);

            if (results && results.length > 0) {
                this.cache.set(cacheKey, { content: JSON.stringify(results), url: searchUrl, title: query, timestamp: Date.now() });
            }
            return { success: true, query, results: results || [] };
        } catch (e: any) {
            return { success: false, query, results: [], error: e.message };
        } finally {
            this.isWorking = false;
        }
    }

    /**
     * Read a webpage's full content — uses SHARED SESSION so logged-in sites work.
     */
    async readPage(url: string, options: { extractLinks?: boolean; extractTables?: boolean; maxLength?: number } = {}): Promise<{
        success: boolean;
        url: string;
        title: string;
        content: string;
        links?: { text: string; href: string }[];
        tables?: string[][];
        metadata?: { description: string; keywords: string };
        error?: string;
    }> {
        const cacheKey = `page:${url}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return { success: true, url: cached.url, title: cached.title, content: cached.content, links: cached.links, tables: cached.tables };
        }

        try {
            this.isWorking = true;
            const fullUrl = url.startsWith('http') ? url : `https://${url}`;
            const loaded = await this.browser.loadURL(fullUrl);
            if (!loaded) return { success: false, url, title: '', content: '', error: 'Failed to load page' };

            // Adaptive wait: check readyState instead of fixed delay
            await new Promise<void>(resolve => {
                const maxWait = setTimeout(resolve, 1200);
                const check = setInterval(async () => {
                    try {
                        const state = await this.browser.executeJS('document.readyState');
                        if (state === 'complete' || state === 'interactive') {
                            clearInterval(check); clearTimeout(maxWait); resolve();
                        }
                    } catch (_) { clearInterval(check); clearTimeout(maxWait); resolve(); }
                }, 150);
            });

            const maxLen = options.maxLength || 15000;
            const result = await this.browser.executeJS(`(() => {
                const title = document.title || '';
                const description = document.querySelector('meta[name="description"]')?.content || '';
                const keywords = document.querySelector('meta[name="keywords"]')?.content || '';
                // Smart content detection — try multiple selectors in priority order
                const contentSelectors = ['article', 'main', '[role="main"]', '.post-content', '.article-body', '.entry-content', '#content', '.content', '#main-content', '.page-content', '.story-body'];
                let main = null;
                for (const sel of contentSelectors) {
                    const el = document.querySelector(sel);
                    if (el && el.innerText && el.innerText.length > 200) { main = el; break; }
                }
                if (!main) main = document.body;
                const content = main.innerText?.substring(0, ${maxLen}) || '';
                const links = ${options.extractLinks !== false} ? Array.from(document.querySelectorAll('a[href]')).slice(0, 50).map(a => ({
                    text: (a.innerText || '').trim().substring(0, 60), href: a.href
                })).filter(l => l.text.length > 0 && !l.href.startsWith('javascript:')) : [];
                const tables = ${options.extractTables !== false} ? Array.from(document.querySelectorAll('table')).slice(0, 3).map(t => {
                    const rows = Array.from(t.querySelectorAll('tr')).slice(0, 20);
                    return rows.map(r => Array.from(r.querySelectorAll('th, td')).map(c => c.innerText?.trim()?.substring(0, 50) || ''));
                }) : [];
                return { title, content, links, tables, metadata: { description, keywords } };
            })()`);

            if (result) {
                this.cache.set(cacheKey, { content: result.content, url: fullUrl, title: result.title, links: result.links, tables: result.tables, timestamp: Date.now() });
            }
            return { success: true, url: fullUrl, ...(result || { title: '', content: '' }) };
        } catch (e: any) {
            return { success: false, url, title: '', content: '', error: e.message };
        } finally {
            this.isWorking = false;
        }
    }

    /**
     * Full research pipeline: search → read top pages → return combined data.
     */
    async research(query: string, depth = 3): Promise<{
        success: boolean;
        query: string;
        searchResults: { rank: number; title: string; url: string; snippet: string }[];
        pageContents: { url: string; title: string; excerpt: string }[];
        error?: string;
    }> {
        try {
            this.isWorking = true;
            const searchResult = await this.search(query);
            if (!searchResult.success || searchResult.results.length === 0) {
                return { success: false, query, searchResults: [], pageContents: [], error: 'Search failed' };
            }

            const topResults = searchResult.results.filter(r => r.rank > 0).slice(0, depth);

            // PARALLEL: Read all pages simultaneously via Promise.all
            const pagePromises = topResults.map(async result => {
                try {
                    const page = await this.readPage(result.url, { maxLength: 5000 });
                    if (page.success && page.content) {
                        return { url: result.url, title: page.title, excerpt: page.content.substring(0, 2000) };
                    }
                } catch (_) { }
                return null;
            });
            const rawResults = await Promise.all(pagePromises);
            const pageContents = rawResults.filter(Boolean) as { url: string; title: string; excerpt: string }[];

            return { success: true, query, searchResults: searchResult.results, pageContents };
        } catch (e: any) {
            return { success: false, query, searchResults: [], pageContents: [], error: e.message };
        } finally {
            this.isWorking = false;
        }
    }

    /**
     * Quick answer from Google featured snippet or top result.
     */
    async quickAnswer(question: string): Promise<{ answer: string; source: string; success: boolean }> {
        const searchResult = await this.search(question, 3);
        if (!searchResult.success) return { answer: '', source: '', success: false };
        const featured = searchResult.results.find(r => r.rank === 0);
        if (featured && featured.snippet) return { answer: featured.snippet, source: 'Google Featured Snippet', success: true };
        const top = searchResult.results[0];
        if (top) return { answer: top.snippet, source: top.url, success: true };
        return { answer: '', source: '', success: false };
    }

    /**
     * Execute arbitrary action on any website silently.
     * Navigate to URL → run JS → return result.
     * Since we use the same session, all logged-in sites are accessible!
     */
    async executeAction(url: string, script: string): Promise<{
        success: boolean;
        url: string;
        result: any;
        error?: string;
    }> {
        try {
            this.isWorking = true;
            const fullUrl = url.startsWith('http') ? url : `https://${url}`;
            const loaded = await this.browser.loadURL(fullUrl);
            if (!loaded) return { success: false, url, result: null, error: 'Failed to load page' };
            await new Promise(r => setTimeout(r, 1000)); // Optimized from 2000ms
            const result = await this.browser.executeJS(script);
            return { success: true, url: fullUrl, result };
        } catch (e: any) {
            return { success: false, url, result: null, error: e.message };
        } finally {
            this.isWorking = false;
        }
    }

    /**
     * Fill a form and submit on any website silently.
     * Navigate → fill fields → click submit → return result.
     */
    async fillAndSubmit(url: string, fields: Record<string, string>, submitSelector?: string): Promise<{
        success: boolean;
        url: string;
        filled: number;
        submitted: boolean;
        error?: string;
    }> {
        try {
            this.isWorking = true;
            const fullUrl = url.startsWith('http') ? url : `https://${url}`;
            const loaded = await this.browser.loadURL(fullUrl);
            if (!loaded) return { success: false, url, filled: 0, submitted: false, error: 'Failed to load page' };
            await new Promise(r => setTimeout(r, 2000));

            const fieldsJson = JSON.stringify(fields);
            const submitSel = submitSelector || 'button[type="submit"], input[type="submit"], button:not([type])';

            const result = await this.browser.executeJS(`(function() {
                const fields = ${fieldsJson};
                let filled = 0;
                const inputs = document.querySelectorAll('input, textarea, select');
                const labels = document.querySelectorAll('label');
                
                for (const [key, value] of Object.entries(fields)) {
                    const keyLower = key.toLowerCase();
                    let found = false;
                    
                    for (const label of labels) {
                        if (label.textContent.toLowerCase().includes(keyLower)) {
                            const forId = label.getAttribute('for');
                            let target = forId ? document.getElementById(forId) : label.querySelector('input, textarea, select');
                            if (target) {
                                target.focus();
                                target.value = '';
                                document.execCommand('insertText', false, String(value));
                                if (target.value !== String(value)) { target.value = value; target.dispatchEvent(new Event('input', {bubbles:true})); }
                                filled++;
                                found = true;
                                break;
                            }
                        }
                    }
                    
                    if (!found) {
                        for (const input of inputs) {
                            const name = (input.name || '').toLowerCase();
                            const ph = (input.placeholder || '').toLowerCase();
                            if (name.includes(keyLower) || ph.includes(keyLower)) {
                                input.focus();
                                input.value = '';
                                document.execCommand('insertText', false, String(value));
                                if (input.value !== String(value)) { input.value = value; input.dispatchEvent(new Event('input', {bubbles:true})); }
                                filled++;
                                break;
                            }
                        }
                    }
                }
                
                // Submit
                let submitted = false;
                const submitBtn = document.querySelector('${submitSel.replace(/'/g, "\\'")}');
                if (submitBtn) {
                    submitBtn.click();
                    submitted = true;
                }
                
                return { filled, submitted, total: Object.keys(fields).length };
            })()`);

            await new Promise(r => setTimeout(r, 2000)); // Wait for submission

            return {
                success: true,
                url: fullUrl,
                filled: result?.filled || 0,
                submitted: result?.submitted || false,
            };
        } catch (e: any) {
            return { success: false, url, filled: 0, submitted: false, error: e.message };
        } finally {
            this.isWorking = false;
        }
    }

    /**
     * Read emails from Gmail — uses the shared session (user must be logged in).
     */
    async readEmails(maxEmails = 10): Promise<{
        success: boolean;
        emails: { from: string; subject: string; snippet: string; date: string }[];
        error?: string;
    }> {
        try {
            this.isWorking = true;
            const loaded = await this.browser.loadURL('https://mail.google.com/mail/u/0/#inbox');
            if (!loaded) return { success: false, emails: [], error: 'Failed to load Gmail' };
            await new Promise(r => setTimeout(r, 4000)); // Gmail is slow to load

            const emails = await this.browser.executeJS(`(() => {
                const items = [];
                // Gmail inbox rows
                const rows = document.querySelectorAll('tr.zA, [role="row"]');
                rows.forEach((row, i) => {
                    if (i >= ${maxEmails}) return;
                    const from = row.querySelector('.yW, [email]')?.innerText?.trim() || row.querySelector('.bA4 span')?.innerText?.trim() || '';
                    const subject = row.querySelector('.bqe, .bog, .y6')?.innerText?.trim() || '';
                    const snippet = row.querySelector('.y2')?.innerText?.trim() || '';
                    const date = row.querySelector('.xW, .xW span')?.innerText?.trim() || '';
                    if (from || subject) {
                        items.push({ from: from.substring(0, 50), subject: subject.substring(0, 100), snippet: snippet.substring(0, 150), date });
                    }
                });
                return items;
            })()`);

            return { success: true, emails: emails || [] };
        } catch (e: any) {
            return { success: false, emails: [], error: e.message };
        } finally {
            this.isWorking = false;
        }
    }

    /** Check if shadow agent is currently working */
    get busy(): boolean { return this.isWorking; }
    /** Clear the research cache */
    clearCache(): void { this.cache.clear(); }
    /** Clean up resources */
    destroy(): void {
        this.browser.destroy();
        this.cache.clear();
    }

    /** Get the internal browser for sub-agent use */
    getBrowser(): ShadowBrowser { return this.browser; }
}

// ═════════════════════════════════════════════════
// SHADOW SUB-AGENT — AI-Powered Autonomous Background Worker
// Has its own Gemini reasoning loop. The main agent delegates
// a task and the sub-agent figures out the steps autonomously.
// ═════════════════════════════════════════════════

export class ShadowSubAgent {
    private shadow: ShadowAgent;
    private apiKey: string;

    constructor(shadow: ShadowAgent, apiKey: string) {
        this.shadow = shadow;
        this.apiKey = apiKey;
    }

    /**
     * Delegate a full task to the shadow sub-agent.
     * It uses Gemini to plan and execute steps autonomously in the background.
     * Returns the result when done.
     */
    async delegateTask(task: string, context?: string): Promise<{
        success: boolean;
        result: string;
        steps: string[];
        error?: string;
    }> {
        const steps: string[] = [];
        const maxTurns = 12;

        try {
            // Import Gemini dynamically to avoid circular deps
            const { GoogleGenAI } = await import('@google/genai');
            const genai = new GoogleGenAI({ apiKey: this.apiKey });

            const systemPrompt = `You are a Shadow Sub-Agent — an autonomous background web worker.
You execute tasks silently using a hidden browser that shares the user's login session.
You can access Gmail, YouTube, GitHub, and any site the user is logged into.

RESPOND ONLY WITH JSON. Each response must be ONE action:
{"action":"navigate","url":"https://..."}
{"action":"read_page"} — read current page content
{"action":"execute_js","script":"(() => { ... })()"} — run any JS on current page
{"action":"fill_form","fields":{"field":"value"}} — fill form fields
{"action":"click","selector":"CSS selector"} — click an element
{"action":"type","selector":"CSS selector","text":"text to type"}
{"action":"extract","script":"JS that returns data"} — extract specific data
{"action":"search","query":"Google search query"}
{"action":"fast_search","query":"query"} — instant HTTP search (faster, preferred)
{"action":"fast_read","url":"https://..."} — instant HTTP page read (faster, preferred)
{"action":"done","result":"final answer/result"} — task complete
{"action":"fail","reason":"why it failed"} — task failed

RULES:
- You see the page title and content summary after each action
- Plan efficiently — minimize steps
- Use direct JS execution for speed
- Access logged-in sites freely (shared session)
- Return results via "done" action`;

            let currentUrl = '';
            let pageInfo = '';
            
            for (let turn = 0; turn < maxTurns; turn++) {
                const userMessage = turn === 0
                    ? `TASK: ${task}${context ? '\nCONTEXT: ' + context : ''}\n\nDecide your first action.`
                    : `ACTION RESULT:\nURL: ${currentUrl}\nPAGE: ${pageInfo}\n\nDecide next action.`;

                const result = await genai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: userMessage,
                    config: {
                        systemInstruction: systemPrompt,
                        temperature: 0.1,
                        maxOutputTokens: 500,
                    }
                });

                const text = result.text?.trim() || '';
                let action: any;
                try {
                    // Extract JSON from response
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (!jsonMatch) throw new Error('No JSON found');
                    action = JSON.parse(jsonMatch[0]);
                } catch {
                    // Try raw text extraction if JSON fails
                    if (text.toLowerCase().includes('done') || text.toLowerCase().includes('result')) {
                        return { success: true, result: text, steps: [...steps, `Turn ${turn + 1}: Completed (raw text)`] };
                    }
                    steps.push(`Turn ${turn + 1}: Failed to parse response`);
                    continue;
                }

                steps.push(`Turn ${turn + 1}: ${action.action}${action.url ? ' → ' + action.url : ''}${action.query ? ' → ' + action.query : ''}`);

                // Execute the action
                switch (action.action) {
                    case 'navigate': {
                        const page = await this.shadow.readPage(action.url, { maxLength: 3000 });
                        currentUrl = action.url;
                        pageInfo = page.success ? `Title: ${page.title}\n${page.content?.substring(0, 1500) || 'No content'}` : 'Failed to load';
                        break;
                    }
                    case 'read_page': {
                        const browser = this.shadow.getBrowser();
                        const content = await browser.executeJS(`(() => ({ title: document.title, content: document.body?.innerText?.substring(0, 2000) || '' }))()`);
                        currentUrl = browser.getURL();
                        pageInfo = content ? `Title: ${content.title}\n${content.content}` : 'No content';
                        break;
                    }
                    case 'execute_js': {
                        const jsResult = await this.shadow.getBrowser().executeJS(action.script);
                        pageInfo = `JS Result: ${JSON.stringify(jsResult)?.substring(0, 1500) || 'null'}`;
                        break;
                    }
                    case 'fill_form': {
                        const fillResult = await this.shadow.fillAndSubmit(currentUrl || 'about:blank', action.fields, action.submit_selector);
                        pageInfo = `Filled ${fillResult.filled} fields, submitted: ${fillResult.submitted}`;
                        break;
                    }
                    case 'click': {
                        const clickResult = await this.shadow.getBrowser().executeJS(`(() => {
                            const el = document.querySelector('${action.selector?.replace(/'/g, "\\'")}');
                            if (el) { el.click(); return { clicked: true, text: el.innerText?.substring(0, 50) }; }
                            return { clicked: false };
                        })()`);
                        pageInfo = clickResult?.clicked ? `Clicked: ${clickResult.text}` : 'Element not found';
                        await new Promise(r => setTimeout(r, 1000));
                        break;
                    }
                    case 'type': {
                        await this.shadow.getBrowser().executeJS(`(() => {
                            const el = document.querySelector('${action.selector?.replace(/'/g, "\\'")}');
                            if (el) { el.focus(); el.value = ''; document.execCommand('insertText', false, '${action.text?.replace(/'/g, "\\'")}'); }
                        })()`);
                        pageInfo = `Typed into ${action.selector}`;
                        break;
                    }
                    case 'extract': {
                        const data = await this.shadow.getBrowser().executeJS(action.script);
                        pageInfo = `Extracted: ${JSON.stringify(data)?.substring(0, 1500) || 'null'}`;
                        break;
                    }
                    case 'search': {
                        const searchResult = await this.shadow.search(action.query);
                        pageInfo = searchResult.success
                            ? searchResult.results.map(r => `${r.rank}. ${r.title}: ${r.snippet}`).join('\n')
                            : 'Search failed';
                        break;
                    }
                    case 'fast_search': {
                        // Use HTTP scraper for speed
                        try {
                            const { getFastScraper } = await import('./FastScraper.js');
                            const scraper = getFastScraper();
                            const sr = await scraper.fastSearch(action.query, 6);
                            if (sr.success && sr.results.length > 0) {
                                pageInfo = sr.results.map(r => `${r.rank}. ${r.title}: ${r.snippet}`).join('\n');
                            } else {
                                // Fallback to browser search
                                const searchResult = await this.shadow.search(action.query);
                                pageInfo = searchResult.success
                                    ? searchResult.results.map(r => `${r.rank}. ${r.title}: ${r.snippet}`).join('\n')
                                    : 'Search failed';
                            }
                        } catch (_) {
                            const searchResult = await this.shadow.search(action.query);
                            pageInfo = searchResult.success
                                ? searchResult.results.map(r => `${r.rank}. ${r.title}: ${r.snippet}`).join('\n')
                                : 'Search failed';
                        }
                        break;
                    }
                    case 'fast_read': {
                        try {
                            const { getFastScraper } = await import('./FastScraper.js');
                            const scraper = getFastScraper();
                            const pr = await scraper.fastRead(action.url, 3000);
                            if (pr.success && pr.content.length > 100) {
                                currentUrl = action.url;
                                pageInfo = `Title: ${pr.title}\n${pr.content}`;
                            } else {
                                // Fallback to browser
                                const page = await this.shadow.readPage(action.url, { maxLength: 3000 });
                                currentUrl = action.url;
                                pageInfo = page.success ? `Title: ${page.title}\n${page.content?.substring(0, 1500) || 'No content'}` : 'Failed to load';
                            }
                        } catch (_) {
                            const page = await this.shadow.readPage(action.url, { maxLength: 3000 });
                            currentUrl = action.url;
                            pageInfo = page.success ? `Title: ${page.title}\n${page.content?.substring(0, 1500) || 'No content'}` : 'Failed to load';
                        }
                        break;
                    }
                    case 'done': {
                        return { success: true, result: action.result || '', steps };
                    }
                    case 'fail': {
                        return { success: false, result: '', steps, error: action.reason || 'Task failed' };
                    }
                    default: {
                        pageInfo = `Unknown action: ${action.action}`;
                    }
                }
            }

            return { success: false, result: '', steps, error: 'Max turns reached without completing task' };
        } catch (e: any) {
            return { success: false, result: '', steps, error: e.message };
        }
    }
}

// ═════════════════════════════════════════════════
// SHADOW POOL — Parallel Multi-Browser Execution Engine
// 3 concurrent ShadowBrowser instances for simultaneous tasks
// ═════════════════════════════════════════════════

export class ShadowPool {
    private browsers: ShadowBrowser[] = [];
    private inUse: Set<number> = new Set();
    private maxSize = 3;
    private cache: ResearchCache = new ResearchCache();

    /** Acquire an idle browser from the pool. Creates new if needed. */
    async acquireBrowser(): Promise<{ browser: ShadowBrowser; index: number }> {
        // Find idle browser
        for (let i = 0; i < this.browsers.length; i++) {
            if (!this.inUse.has(i)) {
                // Auto-recreate if browser was destroyed
                if (!this.browsers[i] || (this.browsers[i] as any).window?.isDestroyed?.()) {
                    try {
                        this.browsers[i] = new ShadowBrowser();
                        await this.browsers[i].init();
                    } catch (_) { continue; }
                }
                this.inUse.add(i);
                return { browser: this.browsers[i], index: i };
            }
        }
        // Create new if under limit
        if (this.browsers.length < this.maxSize) {
            const browser = new ShadowBrowser();
            await browser.init();
            const index = this.browsers.length;
            this.browsers.push(browser);
            this.inUse.add(index);
            return { browser, index };
        }
        // Wait for one to free up (poll every 200ms, max 30s)
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const interval = setInterval(() => {
                for (let i = 0; i < this.browsers.length; i++) {
                    if (!this.inUse.has(i)) {
                        clearInterval(interval);
                        this.inUse.add(i);
                        resolve({ browser: this.browsers[i], index: i });
                        return;
                    }
                }
                if (++attempts > 150) {
                    clearInterval(interval);
                    reject(new Error('Shadow pool exhausted'));
                }
            }, 200);
        });
    }

    /** Release a browser back to the pool. */
    releaseBrowser(index: number): void {
        this.inUse.delete(index);
    }

    /** Run a task on a pooled browser. Auto-acquires and releases. */
    async withBrowser<T>(fn: (browser: ShadowBrowser) => Promise<T>): Promise<T> {
        const { browser, index } = await this.acquireBrowser();
        try {
            // POOL_OP_TIMEOUT: 45s max per pool operation
            return await Promise.race([
                fn(browser),
                new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Pool operation timed out')), 45000))
            ]);
        } finally {
            this.releaseBrowser(index);
        }
    }

    /** Search multiple queries in parallel — all at once. */
    async parallelSearch(queries: string[], maxResults = 6): Promise<{
        success: boolean;
        results: { query: string; results: { rank: number; title: string; url: string; snippet: string }[] }[];
        totalMs: number;
    }> {
        const start = Date.now();
        const promises = queries.map(query =>
            this.withBrowser(async (browser) => {
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${maxResults}&hl=en`;
                const loaded = await browser.loadURL(searchUrl);
                if (!loaded) return { query, results: [] };
                const results = await browser.executeJS(`(() => {
                    const items = [];
                    let rank = 1;
                    document.querySelectorAll('div.g, div[data-sokoban-container]').forEach(el => {
                        const a = el.querySelector('a[href]');
                        const title = el.querySelector('h3');
                        const snippet = el.querySelector('.VwiC3b, .IsZvec, span.st');
                        if (a && title) {
                            items.push({
                                rank: rank++,
                                title: title.innerText.trim(),
                                url: a.href,
                                snippet: snippet ? snippet.innerText.trim().substring(0, 150) : ''
                            });
                        }
                    });
                    return items.slice(0, ${maxResults});
                })()`);
                return { query, results: results || [] };
            }).catch(() => ({ query, results: [] }))
        );
        const all = await Promise.all(promises);
        return { success: true, results: all, totalMs: Date.now() - start };
    }

    /** Read multiple pages in parallel — all at once. */
    async parallelRead(urls: string[], maxLength = 3000): Promise<{
        success: boolean;
        pages: { url: string; title: string; content: string; error?: string }[];
        totalMs: number;
    }> {
        const start = Date.now();
        const promises = urls.map(url =>
            this.withBrowser(async (browser) => {
                // Check cache first
                const cached = this.cache.get(url);
                if (cached) return { url, title: cached.title, content: cached.content };
                
                const loaded = await browser.loadURL(url);
                if (!loaded) return { url, title: '', content: '', error: 'Failed to load' };
                const data = await browser.executeJS(`(() => {
                    const title = document.title;
                    // Smart content detection — priority selectors
                    const selectors = ['article', 'main', '[role="main"]', '.post-content', '.article-body', '.entry-content', '#content', '.content'];
                    let main = null;
                    for (const sel of selectors) {
                        const el = document.querySelector(sel);
                        if (el && el.innerText && el.innerText.length > 200) { main = el; break; }
                    }
                    if (!main) main = document.body;
                    const content = main.innerText.substring(0, ${maxLength});
                    return { title, content };
                })()`);
                if (data) {
                    this.cache.set(url, { content: data.content, url, title: data.title, timestamp: Date.now() });
                }
                return { url, title: data?.title || '', content: data?.content || '' };
            }).catch(e => ({ url, title: '', content: '', error: e.message }))
        );
        const pages = await Promise.all(promises);
        return { success: true, pages, totalMs: Date.now() - start };
    }

    /** Execute arbitrary JS on multiple sites in parallel. */
    async parallelExecute(tasks: { url: string; script: string }[]): Promise<{
        success: boolean;
        results: { url: string; result: any; error?: string }[];
        totalMs: number;
    }> {
        const start = Date.now();
        const promises = tasks.map(task =>
            this.withBrowser(async (browser) => {
                const loaded = await browser.loadURL(task.url);
                if (!loaded) return { url: task.url, result: null, error: 'Failed to load' };
                const result = await browser.executeJS(task.script);
                return { url: task.url, result };
            }).catch(e => ({ url: task.url, result: null, error: e.message }))
        );
        const results = await Promise.all(promises);
        return { success: true, results, totalMs: Date.now() - start };
    }

    /** Destroy all pool browsers. */
    destroy(): void {
        this.browsers.forEach(b => b.destroy());
        this.browsers = [];
        this.inUse.clear();
        this.cache.clear();
    }

    get size(): number { return this.browsers.length; }
    get active(): number { return this.inUse.size; }
}

// ═════════════════════════════════════════════════
// SINGLETONS
// ═════════════════════════════════════════════════

let _shadowInstance: ShadowAgent | null = null;
let _subAgentInstance: ShadowSubAgent | null = null;
let _poolInstance: ShadowPool | null = null;

export function getShadowAgent(): ShadowAgent {
    if (!_shadowInstance) {
        _shadowInstance = new ShadowAgent();
    }
    return _shadowInstance;
}

export function getShadowSubAgent(apiKey: string): ShadowSubAgent {
    if (!_subAgentInstance) {
        _subAgentInstance = new ShadowSubAgent(getShadowAgent(), apiKey);
    }
    return _subAgentInstance;
}

export function getShadowPool(): ShadowPool {
    if (!_poolInstance) {
        _poolInstance = new ShadowPool();
    }
    return _poolInstance;
}

export function destroyShadowAgent(): void {
    if (_shadowInstance) {
        _shadowInstance.destroy();
        _shadowInstance = null;
    }
    if (_poolInstance) {
        _poolInstance.destroy();
        _poolInstance = null;
    }
    _subAgentInstance = null;
}

