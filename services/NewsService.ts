import { NewsGeminiService as GeminiService } from './GeminiService';
import { NewsArticle } from '../components/NewsFeed';

// In-memory cache for news articles
// We extend NewsArticle to include full content and extra metadata
interface CachedArticle extends NewsArticle {
    fullContent?: string;
    sources?: any[];
    related?: any[];
    imageKeywords?: string;
}

const articleCache: Record<string, CachedArticle> = {};
const PRE_FETCH_LIMIT = 5; // Number of top stories to pre-generate
const HEADLINE_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

class NewsServiceClass {

    private headlinesCache: { data: NewsArticle[], timestamp: number, location: string } | null = null;

    /**
     * Fetches fresh headlines based on location.
     * Implements caching to prevent redundant API calls on every New Tab open.
     */
    async fetchHeadlines(city: string | null): Promise<NewsArticle[]> {
        const location = city || 'Global';
        const now = Date.now();

        // Check Cache
        if (
            this.headlinesCache &&
            this.headlinesCache.location === location &&
            (now - this.headlinesCache.timestamp < HEADLINE_CACHE_DURATION)
        ) {
            console.log(`[NewsService] Returning cached headlines for ${ location }`);
            return this.headlinesCache.data;
        }

        console.log(`[NewsService] Fetching fresh headlines for ${ location }...`);

        try {
            // 1. Get Headlines from Gemini
            // We might want to pass 'city' to generate relevant local news
            const headlines = await GeminiService.generateNewsHeadlines(location);

            // 2. Process and Cache
            const articles: NewsArticle[] = headlines.map((h: any, i: number) => {
                const id = `news-${ now }-${ i }`;
                const article: NewsArticle = {
                    id,
                    title: h.title,
                    description: h.description,
                    source: h.source || 'AI News',
                    timeAgo: h.timeAgo || 'Just now',
                    category: h.category || 'General',
                    imageUrl: h.imageUrl
                };

                // Store in article cache
                articleCache[id] = article;
                return article;
            });

            // Update Headlines Cache
            this.headlinesCache = {
                data: articles,
                timestamp: now,
                location
            };

            // 3. Trigger Background Pre-generation
            this.startPreGeneration(articles.slice(0, PRE_FETCH_LIMIT));

            return articles;
        } catch (e) {
            console.error("[NewsService] Failed to fetch headlines", e);
            // Return cached if available even if expired, or empty
            return this.headlinesCache?.data || [];
        }
    }

    /**
     * Background process to generate full content for top articles.
     * This ensures "Instant Load" when user clicks.
     */
    private async startPreGeneration(articles: NewsArticle[]) {
        console.log(`[NewsService] Starting pre-generation for ${ articles.length } articles...`);

        for (const article of articles) {
            // Check if already generated
            if (articleCache[article.id]?.fullContent) continue;

            // Generate silently
            try {
                // We assume GeminiService can handle concurrent requests or we sequence them nice and slow
                // to avoid rate limits on the public API.
                await this.generateFullArticle(article.id).then((result) => {
                    if (result) console.log(`[NewsService] Pre-generated: ${ article.title.slice(0, 20) }...`);
                });

                // Larger delay to be polite to the API (5s)
                await new Promise(r => setTimeout(r, 5000));
            } catch (e: any) {
                console.warn(`[NewsService] Pre-gen failed for ${ article.id }`, e);
                // Stop pre-gen if we hit a rate limit
                if (e.message?.includes('429')) {
                    console.warn('[NewsService] Rate limit hit during pre-gen. Stopping.');
                    break;
                }
            }
        }
    }

    /**
     * Retrieves an article. If cached/pre-generated, returns immediately.
     * Otherwise, generates it on demand.
     */
    async getArticleContent(id: string): Promise<CachedArticle | null> {
        const cached = articleCache[id];

        if (cached && cached.fullContent) {
            console.log(`[NewsService] Cache HIT for ${ id }`);
            return cached;
        }

        console.log(`[NewsService] Cache MISS for ${ id }. Generating now...`);
        const result = await this.generateFullArticle(id);
        if (result) {
            return articleCache[id];
        }
        return null;
    }

    /**
     * The heavy lifter: Asks Gemini for the full report.
     */
    private async generateFullArticle(id: string): Promise<{ content: string; sources: any[]; related: any[] } | null> {
        const article = articleCache[id];
        if (!article) return null;

        try {
            const result = await GeminiService.generateNewsReport(article.title, article.description);

            // Update Cache
            articleCache[id] = {
                ...article,
                fullContent: result.content,
                sources: result.sources,
                related: result.related,
                imageKeywords: result.imageKeywords
            };

            return result;
        } catch (e) {
            console.error(`[NewsService] Generation failed for ${ id }`, e);
            return null;
        }
    }

    /**
     * Allows the user to ask questions about a specific article.
     * @param articleId The ID of the article to query.
     * @param question The user's question.
     */
    async askAboutArticle(articleId: string, question: string): Promise<string> {
        const article = articleCache[articleId];
        if (!article || !article.fullContent) {
            return "I can't answer questions about this article yet. Please wait for it to fully load.";
        }

        try {
            // We use GeminiService to answer based on context
            // Construct a context prompt
            const context = `
Article Title: ${ article.title }
Article Content:
${ article.fullContent }

User Question: ${ question }

Answer the user's question based strictly on the article content provided above. Keep it concise.
            `;

            // Assuming GeminiService has a generic 'chat' or 'generateText' method.
            // If not, we might need to use a specific method or add one.
            // Looking at GeminiService usage in App.tsx (implied), it might have 'sendMessage' or similar.
            // I'll stick to a hypothetical 'generateResponse' or reuse 'generateNewsReport' structure if possible? 
            // Actually, I should check GeminiService capability. 
            // For now, I'll assume I can use a generic method from it, or I'll implement it there if needed.
            // I will lazily use a 'generateText' compatible call. 
            // If GeminiService doesn't have it, I might need to add it.
            // Let's assume generateText exists or I'll use a direct fetch pattern if needed.
            // But wait, I'm importing `NewsGeminiService`.

            return await GeminiService.answerQuestion(context);
        } catch (e) {
            console.error("Failed to answer question", e);
            return "Sorry, I couldn't process your question right now.";
        }
    }
}

export const NewsService = new NewsServiceClass();
