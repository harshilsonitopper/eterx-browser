/**
 * FastScraper.ts — Lightning-Fast HTTP-Based Web Scraper
 * 
 * Uses Electron's net.fetch (shares session cookies for authenticated access)
 * instead of BrowserWindow for simple page reads. 10x faster.
 * 
 * Capabilities:
 * - fastSearch: Google search via HTTP, parse results
 * - fastRead: Fetch + extract text content from any page
 * - fastBatchRead: Parallel multi-page read
 * - All use shared session cookies (logged-in sites work!)
 */

import { net, session } from 'electron';

// ═══════════════════════════════════════════════
// HTML PARSER — Lightweight text extraction
// ═══════════════════════════════════════════════

function stripHTML(html: string): string {
    // Remove scripts, styles, head
    let text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<head[\s\S]*?<\/head>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<header[\s\S]*?<\/header>/gi, '');
    
    // Convert block elements to newlines
    // Preserve list bullets and heading markers
    text = text.replace(/<li[^>]*>/gi, '\n• ');
    text = text.replace(/<h([1-6])[^>]*>/gi, '\n## ');
    text = text.replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    
    // Remove all remaining tags
    text = text.replace(/<[^>]+>/g, ' ');
    
    // Decode HTML entities
    text = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
    
    // Clean whitespace
    text = text.replace(/[ \t]+/g, ' ');
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();
    
    return text;
}

function extractTitle(html: string): string {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return match ? match[1].replace(/<[^>]+>/g, '').trim() : '';
}

function extractMetaDescription(html: string): string {
    const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    return match ? match[1].trim() : '';
}

function extractLinks(html: string, baseUrl: string): { text: string; href: string }[] {
    const links: { text: string; href: string }[] = [];
    const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) !== null && links.length < 30) {
        const href = m[1];
        const text = m[2].replace(/<[^>]+>/g, '').trim();
        if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
            try {
                const fullUrl = new URL(href, baseUrl).href;
                links.push({ text: text.substring(0, 80), href: fullUrl });
            } catch { }
        }
    }
    return links;
}

// ═══════════════════════════════════════════════
// FAST SCRAPER CLASS
// ═══════════════════════════════════════════════

export class FastScraper {
    private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

    /**
     * Fetch raw HTML from a URL using shared session cookies.
     * Uses Electron's net module for authenticated access.
     */
    async fetchHTML(url: string, timeoutMs: number = 10000): Promise<{ html: string; status: number; url: string }> {
        return new Promise(async (resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
            try {
                const response = await net.fetch(url, {
                    headers: {
                        'User-Agent': this.userAgent,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cache-Control': 'no-cache',
                        'DNT': '1',
                    },
                    redirect: 'follow',
                });
                // GUARD: non-200 responses
                const html = await response.text();
                if (response.status >= 400) {
                    clearTimeout(timer);
                    // HTTP_RETRY: 429 (rate limit) gets a retry after delay
                if (response.status === 429) {
                    clearTimeout(timer);
                    await new Promise(r => setTimeout(r, 2000));
                    try {
                        const retry = await net.fetch(url, { headers: { 'User-Agent': this.userAgent } });
                        const retryHtml = await retry.text();
                        resolve({ html: retryHtml, status: retry.status, url: retry.url || url });
                    } catch (_) {
                        reject(new Error('HTTP 429 — Rate limited'));
                    }
                    return;
                }
                reject(new Error(`HTTP ${response.status}`));
                    return;
                }
                clearTimeout(timer);
                resolve({ html, status: response.status, url: response.url || url });
            } catch (err: any) {
                clearTimeout(timer);
                reject(err);
            }
        });
    }

    /**
     * Fast Google Search — returns parsed results without browser.
     * ~500ms vs ~5s for browser-based search.
     */
    async fastSearch(query: string, maxResults: number = 8): Promise<{
        success: boolean;
        query: string;
        results: { rank: number; title: string; url: string; snippet: string }[];
        error?: string;
    }> {
        try {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${maxResults}&hl=en&gl=us&safe=off&filter=0`;
            const { html } = await this.fetchHTML(searchUrl);
            
            const results: { rank: number; title: string; url: string; snippet: string }[] = [];
            
            // Parse Google search results
            // Match result blocks with <a href="/url?q=..."> or direct links
            const resultBlocks = html.match(/<div class="[^"]*"[^>]*>[\s\S]*?<\/div>/g) || [];
            
            // Alternative: parse <a> tags with /url?q= pattern
            const linkRe = /<a[^>]+href="\/url\?q=([^&"]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
            let m;
            let rank = 1;
            while ((m = linkRe.exec(html)) !== null && results.length < maxResults) {
                const url = decodeURIComponent(m[1]);
                const title = m[2].replace(/<[^>]+>/g, '').trim();
                if (title && url.startsWith('http') && !url.includes('google.com') && !url.includes('youtube.com/redirect')) {
                    // Try to find snippet near this result
                    const afterLink = html.substring(m.index + m[0].length, m.index + m[0].length + 500);
                    const snippetMatch = afterLink.match(/<span[^>]*>([\s\S]{20,200}?)<\/span>/);
                    const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
                    
                    results.push({ rank: rank++, title, url, snippet });
                }
            }

            // Second fallback: parse <h3> titles with associated links
            if (results.length === 0) {
                const h3Re = /<h3[^>]*>([sS]*?)<\/h3>/gi;
                let h3Match;
                while ((h3Match = h3Re.exec(html)) !== null && results.length < maxResults) {
                    const h3Text = h3Match[1].replace(/<[^>]+>/g, '').trim();
                    // Find nearest preceding <a> with href
                    const before = html.substring(Math.max(0, h3Match.index - 300), h3Match.index);
                    const linkMatch = before.match(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>/i);
                    if (h3Text && linkMatch && !linkMatch[1].includes('google.com')) {
                        results.push({ rank: rank++, title: h3Text, url: linkMatch[1], snippet: '' });
                    }
                }
            }

            // Fallback: parse href= directly if /url?q= didn't work
            if (results.length === 0) {
                const directRe = /<a[^>]+href="(https?:\/\/(?!www\.google)[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
                while ((m = directRe.exec(html)) !== null && results.length < maxResults) {
                    const url = m[1];
                    const title = m[2].replace(/<[^>]+>/g, '').trim();
                    if (title.length > 5 && !url.includes('google.com') && !url.includes('gstatic.com')) {
                        results.push({ rank: rank++, title, url, snippet: '' });
                    }
                }
            }

            // RETRY: If no results found, try alternate parsing
            if (results.length === 0) {
                // Try to get any text from the page as fallback
                const bodyText = stripHTML(html).substring(0, 500);
                if (bodyText.includes('unusual traffic') || bodyText.includes('CAPTCHA')) {
                    return { success: false, query, results: [], error: 'Google CAPTCHA detected — use shadow_search instead' };
                }
            }
            return { success: true, query, results };
        } catch (err: any) {
            return { success: false, query, results: [], error: err.message };
        }
    }

    /**
     * Fast Page Read — fetch and extract text content without browser.
     * ~200ms vs ~3s for browser-based page load.
     */
    async fastRead(url: string, maxLength: number = 5000): Promise<{
        success: boolean;
        url: string;
        title: string;
        content: string;
        description: string;
        links: { text: string; href: string }[];
        error?: string;
    }> {
        try {
            const { html, url: finalUrl } = await this.fetchHTML(url);
            const title = extractTitle(html);
            const description = extractMetaDescription(html);
            const content = stripHTML(html).substring(0, maxLength);
            const links = extractLinks(html, finalUrl);

            return { success: true, url: finalUrl, title, content, description, links };
        } catch (err: any) {
            return { success: false, url, title: '', content: '', description: '', links: [], error: err.message };
        }
    }

    /**
     * Parallel Batch Read — fetch multiple pages simultaneously.
     * All requests fire at once, results collected when all complete.
     */
    async fastBatchRead(urls: string[], maxLength: number = 3000): Promise<{
        success: boolean;
        results: { url: string; title: string; content: string; error?: string }[];
        totalMs: number;
    }> {
        const start = Date.now();
        const promises = urls.map(url =>
            this.fastRead(url, maxLength)
                .then(r => ({ url: r.url, title: r.title, content: r.content, error: r.error }))
                .catch(e => ({ url, title: '', content: '', error: e.message }))
        );
        const results = await Promise.all(promises);
        return { success: true, results, totalMs: Date.now() - start };
    }

    /**
     * Fast Research — search + read top results in parallel.
     * Combines fastSearch + fastBatchRead for instant research.
     */
    async fastResearch(query: string, depth: number = 3): Promise<{
        success: boolean;
        query: string;
        searchResults: { rank: number; title: string; url: string; snippet: string }[];
        pageContents: { url: string; title: string; excerpt: string }[];
        totalMs: number;
    }> {
        const start = Date.now();
        
        // Step 1: Search
        const search = await this.fastSearch(query, depth + 2);
        if (!search.success) {
            return { success: false, query, searchResults: [], pageContents: [], totalMs: Date.now() - start };
        }

        // Step 2: Read top pages in parallel
        const topUrls = search.results.slice(0, depth).map(r => r.url);
        const batch = await this.fastBatchRead(topUrls, 2000);

        const pageContents = batch.results
            .filter(r => r.content.length > 50)
            .map(r => ({ url: r.url, title: r.title, excerpt: r.content.substring(0, 1500) }));

        return {
            success: true,
            query,
            searchResults: search.results,
            pageContents,
            totalMs: Date.now() - start,
        };
    }
}

// ═══════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════

let _scraper: FastScraper | null = null;
export function getFastScraper(): FastScraper {
    if (!_scraper) _scraper = new FastScraper();
    return _scraper;
}
