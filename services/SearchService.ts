/**
 * SearchService.ts - Advanced Search with Page Scraping
 * 
 * - Google Custom Search API
 * - YouTube Search
 * - Image Search
 * - Page Content Scraping
 * - Multi-query support
 */

export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    pagemap?: any;
}

export interface YouTubeSearchResult {
    title: string;
    videoId: string;
    channel: string;
    thumbnail: string;
}

export interface ImageSearchResult {
    title: string;
    link: string;
    thumbnailLink: string;
    contextLink: string;
}

// Get env vars
const getEnv = (key: string): string => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return (import.meta.env as any)[key] || '';
    }
    return '';
};

const GOOGLE_API_KEY = getEnv('VITE_GOOGLE_API_KEY');
const GOOGLE_CX = getEnv('VITE_GOOGLE_CX');
const YOUTUBE_API_KEY = getEnv('VITE_GOOGLE_API_KEY'); // Same key works for YouTube

export const SearchService = {
    /**
     * Web Search - Google Custom Search
     */
    async searchWeb(query: string, numResults: number = 8): Promise<{ results: SearchResult[], abstract: string }> {
        console.log('[Search] Web search:', query);

        if (GOOGLE_API_KEY && GOOGLE_CX) {
            try {
                const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&num=${numResults}`;
                const response = await fetch(url);

                if (response.ok) {
                    const data = await response.json();
                    if (data.items?.length > 0) {
                        const results = data.items.map((item: any) => ({
                            title: item.title || '',
                            link: item.link || '',
                            snippet: item.snippet || '',
                            pagemap: item.pagemap || {}
                        }));
                        console.log('[Search] Found', results.length, 'Google results');
                        return { results, abstract: results[0]?.snippet || '' };
                    }
                }
            } catch (e) {
                console.warn('[Search] Google API failed:', e);
            }
        }

        // Fallback to DuckDuckGo
        return this.duckDuckGoSearch(query);
    },

    /**
     * Image Search - Google Custom Search
     */
    async searchImages(query: string, numResults: number = 4): Promise<ImageSearchResult[]> {
        console.log('[Search] Image search:', query);

        if (GOOGLE_API_KEY && GOOGLE_CX) {
            try {
                const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&searchType=image&imgSize=huge&num=${numResults}`;
                const response = await fetch(url);

                if (response.ok) {
                    const data = await response.json();
                    if (data.items?.length > 0) {
                        return data.items.map((item: any) => ({
                            title: item.title || '',
                            link: item.link || '', // Full size image
                            thumbnailLink: item.image?.thumbnailLink || item.link,
                            contextLink: item.image?.contextLink || ''
                        }));
                    }
                }
            } catch (e) {
                console.warn('[Search] Image search failed:', e);
            }
        }
        return [];
    },

    /**
     * YouTube Search - Find videos
     */
    async searchYouTube(query: string, maxResults: number = 5): Promise<YouTubeSearchResult[]> {
        console.log('[Search] YouTube search:', query);

        if (!YOUTUBE_API_KEY) {
            console.warn('[Search] No YouTube API key');
            return [];
        }

        try {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
            const response = await fetch(url);

            if (!response.ok) {
                console.warn('[Search] YouTube API error:', response.status);
                return [];
            }

            const data = await response.json();

            if (!data.items?.length) {
                return [];
            }

            const results: YouTubeSearchResult[] = data.items.map((item: any) => ({
                title: item.snippet?.title || '',
                videoId: item.id?.videoId || '',
                channel: item.snippet?.channelTitle || '',
                thumbnail: item.snippet?.thumbnails?.medium?.url || ''
            }));

            console.log('[Search] Found', results.length, 'videos');
            return results;

        } catch (e) {
            console.error('[Search] YouTube search failed:', e);
            return [];
        }
    },

    /**
     * DuckDuckGo HTML Scraping (Fallback)
     */
    async duckDuckGoSearch(query: string): Promise<{ results: SearchResult[], abstract: string }> {
        try {
            const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
            const html = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const results: SearchResult[] = [];

            doc.querySelectorAll('.result').forEach((el, i) => {
                if (i < 5) {
                    const title = el.querySelector('.result__title')?.textContent?.trim();
                    const link = el.querySelector('.result__url')?.getAttribute('href');
                    const snippet = el.querySelector('.result__snippet')?.textContent?.trim();

                    if (title && link) {
                        results.push({ title, link, snippet: snippet || '' });
                    }
                }
            });

            return { results, abstract: results[0]?.snippet || '' };
        } catch (e) {
            console.error('[Search] DDG failed:', e);
            return { results: [], abstract: '' };
        }
    },

    /**
     * Deep Research: Multi-step search & scrape
     */
    async deepResearch(query: string, maxPages: number = 3) {
        // 1. Initial search
        const { results } = await this.searchWeb(query, 5);
        if (results.length === 0) return { results: [], scrapedContent: [] };

        // 2. Select top 3 relevant pages
        const topPages = results.slice(0, maxPages);
        const scrapedContent: { title: string; content: string; url: string }[] = [];

        // 3. Scrape in parallel
        await Promise.all(topPages.map(async (page) => {
            const content = await this.scrapePageContent(page.link);
            if (content && content.length > 200) {
                scrapedContent.push({
                    title: page.title,
                    url: page.link,
                    content: content.slice(0, 5000) // Limit size
                });
            }
        }));

        return { results, scrapedContent };
    },

    /**
     * Scrape page text content
     */
    async scrapePageContent(url: string): Promise<string> {
        try {
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();

            if (!data.contents) return '';

            const parser = new DOMParser();
            const doc = parser.parseFromString(data.contents, 'text/html');

            // Remove scripts, styles
            doc.querySelectorAll('script, style, nav, footer, iframe, ads').forEach(el => el.remove());

            return doc.body.textContent || '';
        } catch {
            return '';
        }
    },

    /**
     * Get search suggestions for autocomplete
     */
    /**
     * Get search suggestions for autocomplete
     * OPTIMIZED: Direct fetch (CORS disabled in Electron)
     */
    async getSuggestions(query: string): Promise<string[]> {
        if (!query || query.length < 2) return [];

        try {
            // Direct fetch from Google (Works because webSecurity: false)
            const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`;
            // @ts-ignore - priority is valid in browser/electron fetch
            const response = await fetch(url, { priority: 'high' });
            const data = await response.json();

            // Chrome format: [query, [suggestions], [descriptions?], [links?], {metadata?}]
            if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
                return data[1].slice(0, 8);
            }
        } catch (e) {
            console.warn('[Search] Direct suggestions failed:', e);
            // Fallback to proxy if direct fails (e.g. strict net issues)
            try {
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
                    `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`
                )}`;
                const response = await fetch(proxyUrl);
                const data = await response.json();
                if (data.contents) {
                    const parsed = JSON.parse(data.contents);
                    if (Array.isArray(parsed) && parsed.length > 1 && Array.isArray(parsed[1])) {
                        return parsed[1].slice(0, 8);
                    }
                }
            } catch (err) {
                // Ignore
            }
        }

        return [];
    }
};

export interface Source {
    title: string;
    url: string;
    favicon?: string;
    snippet?: string;
    thumbnail?: string;
    channel?: string;
}

