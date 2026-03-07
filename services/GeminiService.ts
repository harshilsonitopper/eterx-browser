import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';
import { SearchService, Source, ImageSearchResult } from './SearchService';
import { YouTubeService } from './YouTubeService'; // If you want to keep video capabilities

/**
 * GeminiService.ts - Dedicated Service for EterX AI Search
 * 
 * - Independent of legacy LLMService
 * - Massive Key Rotation (VITE_API_KEY_1 to 8)
 * - Intelligent Model Shifting (Flash -> Pro -> Lite)
 * - Specialized Intent Classification
 */

// --- Configuration Helpers ---
const getEnvVar = (key: string): string => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return (import.meta.env as any)[key] || '';
    }
    return '';
};

/**
 * Loads up to 16 keys for a specific compartment (e.g., 'SEARCH', 'NEWS', 'SIDEBAR')
 * Deduplicates to avoid wasting rotation slots on identical keys.
 */
const loadCompartmentKeys = (prefix: string): string[] => {
    const seen = new Set<string>();
    const keys: string[] = [];
    for (let i = 1; i <= 16; i++) {
        const key = getEnvVar(`VITE_${ prefix }_API_KEY_${ i }`);
        if (key && key.length > 10 && !seen.has(key)) {
            seen.add(key);
            keys.push(key);
        }
    }
    // Fallback to legacy keys if compartment is empty
    if (keys.length === 0) {
        const legacy = getEnvVar('VITE_API_KEY');
        if (legacy && !seen.has(legacy)) keys.push(legacy);
    }
    return keys;
};

// Model Priority Queue: Optimized for User Request
const GEMINI_MODELS = [
    'gemini-2.5-flash',       // Primary: Fastest
    'gemini-2.5-pro',         // Secondary: High Intelligence
    'gemini-2.5-flash-lite'   // Tertiary: Ultra Light & Efficient
];

export class GeminiServiceClass {
    private keys: string[];
    private requestCounter = 0;
    private compartmentName: string;
    private keyCooldowns: Map<string, number> = new Map(); // Track cooldown timestamps
    private models: string[];

    constructor(compartment: string, customModels?: string[]) {
        this.compartmentName = compartment;
        this.keys = loadCompartmentKeys(compartment);
        this.models = customModels || GEMINI_MODELS;

        // FALLBACK STRATEGY: 
        // If this compartment (e.g., NEWS, SIDEBAR) has few keys, 
        // borrow from the main 'SEARCH' pool which is usually well-stocked.
        if (this.keys.length < 2 && compartment !== 'SEARCH') {
            console.log(`âš ï¸ [GeminiService:${ compartment }] Low keys (${ this.keys.length }). Borrowing from SEARCH pool...`);
            const searchKeys = loadCompartmentKeys('SEARCH');
            // Add unique keys from search pool
            searchKeys.forEach(k => {
                if (!this.keys.includes(k)) this.keys.push(k);
            });
        }

        if (this.keys.length === 0) {
            console.warn(`[GeminiService:${ compartment }] No keys found. Using global fallback.`);
            const fallback = getEnvVar('VITE_API_KEY');
            if (fallback) this.keys = [fallback];
        }

        console.log(`ðŸš€ [GeminiService:${ compartment }] Initialized with ${ this.keys.length } keys.`);

        // Bind TTS method to retain class context when destructured
        this.generateSpeech = this.generateSpeech.bind(this);
    }

    private getKey(model: string): string {
        const now = Date.now();
        // Try to find a ready key for this SPECIFIC model
        for (let i = 0; i < this.keys.length; i++) {
            const idx = (this.requestCounter + i) % (this.keys.length || 1);
            const candidate = this.keys[idx];

            // Check cooldown for THIS MODEL
            // Cooldown Key: "API_KEY_VALUE-MODEL_NAME"
            const cooldownKey = `${ candidate }-${ model }`;
            if (now > (this.keyCooldowns.get(cooldownKey) || 0)) {
                if (i === 0) this.requestCounter++; // Rotate primary pointer
                return candidate;
            }
        }
        // Fallback: Just return the next one in rotation to avoid blocking
        const idx = (this.requestCounter++) % (this.keys.length || 1);
        return this.keys[idx] || '';
    }

    private getNextKey(): { apiKey: string, index: number } {
        const index = (this.requestCounter++) % (this.keys.length || 1);
        return { apiKey: this.keys[index] || '', index };
    }

    /**
     * Replaces the old generateContent with standard streaming using @google/genai.
     */
    async *streamChat(
        history: any[],
        prompt: string,
        systemInstruction?: string,
        enableThinking: boolean = true,
        attachments: { data: string, mimeType: string }[] = [],
        enableSearch: boolean = true
    ): AsyncGenerator<{ text: string, type: 'thought' | 'content' | 'source', url?: string, title?: string, snippet?: string }, void, unknown> {

        let lastError = '';

        for (const model of this.models) {
            for (let i = 0; i < this.keys.length; i++) {
                const { apiKey, index } = this.getNextKey();

                try {
                    const ai = new GoogleGenAI({ apiKey });

                    const config: any = {
                        systemInstruction,
                        safetySettings: [
                            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                        ],
                    };

                    if (enableThinking && model.includes('flash') && !model.includes('lite')) {
                        config.thinkingConfig = { thinkingBudgetTokenCount: 1024 };
                    }

                    if (enableSearch) {
                        config.tools = [{ googleSearch: {} }];
                    }

                    // Format Attachments for the new SDK
                    const contents = [];
                    if (attachments.length > 0) {
                        const parts = [
                            ...attachments.map(a => ({ inlineData: { data: a.data, mimeType: a.mimeType } })),
                            { text: prompt }
                        ];
                        contents.push({ role: 'user', parts });
                    } else {
                        contents.push({ role: 'user', parts: [{ text: prompt }] });
                    }

                    let fullHistory = [...history];

                    const responseStream = await ai.models.generateContentStream({
                        model: model,
                        contents: [...fullHistory, ...contents],
                        config
                    });

                    for await (const chunk of responseStream) {
                        if (chunk.candidates?.[0]?.content?.parts) {
                            for (const part of chunk.candidates[0].content.parts) {
                                if (part.thought) {
                                    yield { text: part.text || '', type: 'thought' };
                                } else if (part.text) {
                                    yield { text: part.text, type: 'content' };
                                }
                            }
                        }

                        // Handle grounding chunks if present
                        if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                            for (const gChunk of chunk.candidates[0].groundingMetadata.groundingChunks) {
                                if (gChunk.web?.uri) {
                                    yield { text: '', type: 'source', url: gChunk.web.uri, title: gChunk.web.title, snippet: (gChunk.web as any).snippet };
                                }
                            }
                        }
                    }

                    return; // Success, exit stream generator
                } catch (e: any) {
                    lastError = e.message || '';
                    if (lastError.includes('429') || lastError.includes('quota')) {
                        console.warn(`⏳ [Gemini] Rate limited on Key #${ index } for ${ model }`);
                        continue;
                    }
                    if (lastError.includes('400')) {
                        console.warn(`🚫 [Gemini] Invalid Key #${ index } for ${ model }`);
                        continue;
                    }
                    console.warn(`⚠️ [Gemini] Stream error: ${ lastError }`);
                }
            }
        }

        throw new Error(`[Gemini:${ this.compartmentName }] All Models Exhausted. Last Error: ${ lastError }`);
    }

    /**
     * Generate Image natively using @google/genai 
     */
    async generateImage(prompt: string): Promise<string> {
        const { apiKey } = this.getNextKey();
        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateImages({
                model: 'gemini-3-pro-image-preview',
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: '16:9',
                    outputMimeType: 'image/png'
                }
            });

            if (response.generatedImages && response.generatedImages.length > 0) {
                return response.generatedImages[0].image.imageBytes; // base64 string
            }
            throw new Error("No image generated");
        } catch (e: any) {
            console.error("Image Gen Error:", e);
            throw new Error(`Failed to generate image: ${ e.message }`);
        }
    }

    /**
     * Check Intent: 'SEARCH' (needs info) or 'GENERATE' (creative/chat)
     */
    /**
     * Start Compatibility Wrapper
     */
    async checkIntent(query: string): Promise<'SEARCH' | 'GENERATE'> {
        const intent = await this.classifyIntent(query);
        return intent === 'CHAT' ? 'GENERATE' : 'SEARCH';
    }

    /**
     * Classify Intent: 'CHAT', 'SEARCH', or 'AGENT'
     * Uses Gemini Flash for ultra-fast classification.
     */
    async classifyIntent(query: string): Promise<'CHAT' | 'SEARCH' | 'AGENT'> {
        const q = query.toLowerCase();

        // 1. Hardcoded Fast Path (Optional, for zero-latency common cases)
        if (q.startsWith('open ') || q.startsWith('go to ') || q.startsWith('click ') || q.includes('check email')) return 'AGENT';

        // 2. LLM Classification
        try {
            const prompt = `Classify this user query into one of three categories:
            1. AGENT: Asking to perform an action on the computer, browse the web, open an app, check emails, click something, or find specific live data (e.g., "order pizza", "check my mail", "play music", "research x").
            2. SEARCH: Asking for information that needs web search (e.g., "who is...", "latest news", "weather").
            3. CHAT: General conversation, creative writing, coding help, or knowledge questions (e.g., "write a poem", "hello", "explain quantum physics").
            
            Query: "${ query }"
            
            Return ONLY the category name (AGENT, SEARCH, or CHAT).`;

            const result = await this.generateContent(prompt, "You are a precise classifier.", true); // forceFast=true
            const intent = result.text.trim().toUpperCase().replace(/[^A-Z]/g, '');

            if (['AGENT', 'SEARCH', 'CHAT'].includes(intent)) {
                return intent as 'AGENT' | 'SEARCH' | 'CHAT';
            }
            return 'CHAT'; // Default fallback
        } catch (e) {
            console.error("Intent classification failed:", e);
            return 'CHAT'; // Fail safe
        }
    }

    /**
     * Main Generation Function
     * Handles Model Shifting & Retry Logic
     * Updated: Prioritizes Model Consistency (Model Loop -> Key Loop)
     */
    async generateContent(prompt: string, systemPrompt?: string, forceFast: boolean = false, attachments: { inlineData: { data: string, mimeType: string } }[] = [], disableGrounding: boolean = false): Promise<{ text: string, groundingMetadata?: any }> {
        let lastError = '';
        const keyCount = this.keys.length;

        // Determine Model Strategy
        const modelQueue = forceFast
            ? this.models.filter(m => m.includes('flash'))
            : this.models;

        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        // STRATEGY: Try the Best Model across ALL keys first.
        // If that fails everywhere, downgrade to the next model and repeat.
        for (const model of modelQueue) {

            // START with the current rotation index to ensure "Auto Cycle"
            const startKeyIndex = this.requestCounter;

            for (let i = 0; i < keyCount; i++) {
                const activeKeyIndex = (startKeyIndex + i) % keyCount;
                const apiKey = this.keys[activeKeyIndex];

                // Skip Cooled Keys for THIS MODEL - USER REQUESTED REMOVAL
                // const cooldownKey = `${ apiKey }-${ model }`;
                // if (Date.now() < (this.keyCooldowns.get(cooldownKey) || 0)) continue;

                try {
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const toolConfig: any = {
                        model: model,
                        systemInstruction: systemPrompt,
                        safetySettings: safetySettings,
                    };

                    if (!forceFast && !disableGrounding && !prompt.toLowerCase().includes('write a poem')) {
                        toolConfig.tools = [{ googleSearch: {} }];
                    }

                    const m = genAI.getGenerativeModel(toolConfig);
                    const result = await m.generateContent({
                        contents: [{ role: 'user', parts: [{ text: prompt }, ...attachments.map(a => ({ inlineData: a.inlineData }))] }]
                    });

                    const response = result.response;
                    const text = response.text();
                    const groundingMetadata = (response as any).candidates?.[0]?.groundingMetadata;

                    if (text) {
                        // Success!
                        if (i > 0) console.log(`[Gemini] Recovered with Key #${ activeKeyIndex } on ${ model }`);
                        return { text, groundingMetadata };
                    }
                } catch (e: any) {
                    const errorMessage = e.message || '';
                    lastError = `[${ model }] ${ errorMessage }`;

                    // Handle Limits: 60s Cooldown for THIS MODEL ONLY
                    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('Too Many Requests')) {
                        console.warn(`â³ [Gemini:${ this.compartmentName }] Key #${ activeKeyIndex } Rate Limited on ${ model }. Switching immediately.`);
                        // this.keyCooldowns.set(`${ apiKey }-${ model }`, Date.now() + 60000); // DELETED AS REQUESTED
                        continue;
                    }

                    // Handle Invalid Keys: 5min Cooldown (GLOBAL - invalid is invalid everywhere)
                    if (errorMessage.includes('400') && (errorMessage.includes('API key not valid') || errorMessage.includes('API_KEY_INVALID'))) {
                        console.warn(`ðŸš« [Gemini:${ this.compartmentName }] Key #${ activeKeyIndex } Invalid. Switching immediately.`);
                        // Blacklist for ALL models - DELETED AS REQUESTED
                        // GEMINI_MODELS.forEach(m => this.keyCooldowns.set(`${ apiKey }-${ m }`, Date.now() + 300000));
                        continue;
                    }

                    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
                        console.warn(`âš ï¸ Model ${ model } not found. Skipping...`);
                        break;
                    }
                    else {
                        console.warn(`[Gemini:${ this.compartmentName }] Error on ${ model } (Key #${ activeKeyIndex }): ${ errorMessage }`);
                    }
                }
            }
        }

        throw new Error(`[Gemini:${ this.compartmentName }] All Models Exhausted. Last Error: ${ lastError }`);
    }

    // --- Specialized Helpers ---

    async generateRelatedQuestions(query: string, context: string): Promise<string[]> {
        try {
            const result = await this.generateContent(`Based on query "${ query }" and context, generate 3-4 follow-up questions. Return ONLY a raw JSON array of strings.`, "You are a JSON generator.", true);
            const cleaned = result.text.replace(/```json|```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            console.error("Failed to generate related questions:", e);
            return [];
        }
    }

    async splitQueryForDeepSearch(query: string, numQueries: number = 4): Promise<string[]> {
        const prompt = `Break down "${ query }" into ${ numQueries } focused sub-queries. Return ONLY a raw JSON array of strings.`;
        try {
            const result = await this.generateContent(prompt, "You are a JSON generator.", true);
            const cleaned = result.text.replace(/```json|```/g, '').trim();
            const queries = JSON.parse(cleaned);
            return queries.length > 0 ? queries : [query];
        } catch (e) {
            console.error("Failed to split query:", e);
            return [query];
        }
    }

    async generateDeepThinking(prompt: string): Promise<string> {
        try {
            const result = await this.generateContent(prompt, "You are a deep thinking assistant.", false);
            return result.text;
        } catch (e) {
            console.warn(`[GeminiService] Deep Thinking failed:`, e);
            return "Thinking compilation failed.";
        }
    }

    async analyzeImage(prompt: string, imageBase64: string, mimeType: string = 'image/png'): Promise<string> {
        let lastError = '';

        // Loop through models (Flash -> Pro -> Lite)
        for (const model of this.models) {
            // Try all keys for this model
            for (let i = 0; i < this.keys.length; i++) {
                const apiKey = this.keys[i]; // Just try them all linearly since we removed cooldown logic

                try {
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const geminiModel = genAI.getGenerativeModel({ model: model });

                    const result = await geminiModel.generateContent([
                        prompt,
                        { inlineData: { data: imageBase64, mimeType } }
                    ]);

                    const responseText = result.response.text();
                    if (responseText) return responseText;

                } catch (e: any) {
                    const errorMessage = e.message || '';
                    lastError = `[${ model }] ${ errorMessage }`;
                    console.warn(`[Gemini:VISION] Error on ${ model } (Key #${ i }): ${ errorMessage }`);
                    // If rate limited, just continue to next key/model
                }
            }
        }
        throw new Error(`Vision Analysis Failed: All models exhausted. Last error: ${ lastError }`);
    }

    // --- News Specific ---

    async generateNewsHeadlines(location: string): Promise<any[]> {
        const prompt = `Generate 6 trending news headlines for ${ location }. Output ONLY raw JSON array specifying title, description, source, timeAgo, category.`;
        try {
            const result = await this.generateContent(prompt, "You are a JSON generator.", true);
            const cleaned = result.text.replace(/```json|```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            console.error("Failed to generate headlines:", e);
            return [];
        }
    }

    async generateNewsReport(title: string, description: string): Promise<any> {
        const prompt = `Write a comprehensive, engaging news article on "${ title }". 
        
        Output distinct sections separated by "===SPLIT===".

        SECTION 1: JSON METADATA
        {
            "sources": [{"title": "Source", "url": "..."}],
            "related": ["Question 1?", "Question 2?"],
            "imageKeywords": "term1, term2"
        }

        ===SPLIT===

        SECTION 2: MARKDOWN CONTENT
        # Headline
        (Article text here...)
        
        IMPORTANT:
        1. Ensure the JSON in SECTION 1 is valid and contains NO content text.
        2. The content in SECTION 2 must be the full article in Markdown.
        3. Do not include markdown code blocks (like \`\`\`json) around the JSON.
        `;

        try {
            const result = await this.generateContent(prompt, "You are a professional journalist. Follow the output format strictly.", false);
            const text = result.text || '';

            const parts = text.split('===SPLIT===');

            let metadata: any = { sources: [], related: [], imageKeywords: "news" };
            let contentStr = '';

            if (parts.length >= 2) {
                // Parse Metadata
                let jsonStr = parts[0].replace(/SECTION 1: JSON METADATA|```json|```/g, '').trim();
                // cleanup if it has leading characters
                const firstBrace = jsonStr.indexOf('{');
                const lastBrace = jsonStr.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
                }

                try {
                    metadata = JSON.parse(jsonStr);
                } catch (e) {
                    console.error("News Metadata Parse Warning:", e);
                }

                // Get Content
                contentStr = parts[1].replace(/SECTION 2: MARKDOWN CONTENT/g, '').trim();
            } else {
                // Fallback: Model failed to split, assume it's just content or try to save it
                console.warn("Model failed to use split format");
                contentStr = text; // Treat whole output as content if split fails
            }

            return {
                content: contentStr || `# ${ title }\n\n${ description }`,
                sources: metadata.sources || [],
                related: metadata.related || [],
                imageKeywords: metadata.imageKeywords || "news"
            };

        } catch (e: any) {
            console.error("News Generation Error:", e);
            return {
                content: `### ${ title }\n\nWe encountered an error generating the article. Summary:\n\n${ description }`,
                sources: [],
                related: [],
                imageKeywords: "news"
            };
        }
    }

    async answerQuestion(context: string): Promise<string> {
        try {
            const result = await this.generateContent(context, `You are EterX, an elite AI. Answer ONLY from the provided text.
Rules: Use ### headings, **bold** keywords, bullet points. Use $LaTeX$ for any math. Use tables for structured data. Be concise and direct. No filler.`, false);
            return result.text;
        } catch (e) {
            console.error("Failed to answer question:", e);
            return "I'm having trouble connecting right now.";
        }
    }

    // --- Search Logic ---

    async integratedSearchAndAnswer(
        query: string,
        mode: 'fast' | 'deep' | 'research' | 'extreme' = 'deep',
        onThinking?: (step: string) => void
    ): Promise<any> {
        const thinkingSteps: string[] = [];
        const addThought = (t: string) => {
            thinkingSteps.push(t);
            onThinking?.(t);
        };

        try {
            const queryCounts = { fast: 5, deep: 15, research: 20, extreme: 40 };
            const count = queryCounts[mode] || 15;

            addThought(`Generating ${ count } compartmentalized queries...`);
            const uniqueQueries = await this.splitQueryForDeepSearch(query, count);

            addThought(`Executing parallel search across ${ uniqueQueries.length } points...`);
            const searchPromises = uniqueQueries.map(q => SearchService.searchWeb(q, 3).catch(() => ({ results: [] as any[] })));
            const results = await Promise.all(searchPromises);

            let combinedContext = "";
            const sources: Source[] = [];
            const seenUrls = new Set<string>();

            results.forEach(res => {
                res.results?.forEach((r: any) => {
                    if (!seenUrls.has(r.link)) {
                        seenUrls.add(r.link);
                        sources.push({
                            title: r.title,
                            url: r.link,
                            snippet: r.snippet,
                            favicon: `https://www.google.com/s2/favicons?domain=${ new URL(r.link).hostname }&sz=32`
                        });
                        combinedContext += `[Source: ${ r.title }]\n${ r.snippet }\n\n`;
                    }
                });
            });

            addThought("Synthesizing final response...");
            const synthesisPrompt = `You are EterX â€” an elite AI research synthesizer. Analyze the sources below and answer the user's query.

FORMATTING RULES:
- Use ### headings (2-4 words max) to organize sections
- **Bold** every important keyword/term
- Use bullet points, never long paragraphs
- Use markdown tables for any comparative/structured data
- Use $LaTeX$ for ALL math (inline: $x^2$, block: $$\\sum_i$$)
- Cite sources inline: [Source Title](url)
- End with > **Key Insight**: one-sentence takeaway
- Be concise, scientific, authoritative. Zero filler.`;
            const synthesisResult = await this.generateContent(`User Query: "${ query }"\n\nResearch Context:\n${ combinedContext.slice(0, 15000) }`, synthesisPrompt, false);

            return {
                answer: synthesisResult.text,
                sources: sources.slice(0, 20),
                images: [],
                relatedQuestions: [],
                thinkingSteps,
                status: 'done'
            };
        } catch (error: any) {
            addThought(`Error: ${ error.message }`);
            return {
                answer: `Error: ${ error.message }`,
                sources: [],
                images: [],
                relatedQuestions: [],
                thinkingSteps,
                status: 'error'
            };
        }
    }

    /**
     * Generates high-fidelity speech from text using Gemini TTS
     */
    async generateSpeech(text: string, voiceName: string = 'Aoede'): Promise<string | null> {
        const apiKey = this.getKey('gemini-2.5-flash-preview-tts');
        if (!apiKey) throw new Error("No API key available for Speech Generation.");

        const ai = new GoogleGenAI({ apiKey });

        try {
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-tts',
                contents: text,
                config: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: voiceName
                            }
                        }
                    }
                }
            });

            // Extract inlineData (base64 audio)
            const inlineData = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
            if (inlineData && inlineData.inlineData) {
                return inlineData.inlineData.data;
            }
            return null;
        } catch (error) {
            console.error("Gemini TTS Generation Error:", error);
            throw error;
        }
    }
}

// === COMPARTMENTALIZED INSTANCES ===
export const SearchGeminiService = new GeminiServiceClass('SEARCH');
export const NewsGeminiService = new GeminiServiceClass('NEWS');
export const SidebarGeminiService = new GeminiServiceClass('SIDEBAR', [
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
]);

// Default export for compatibility
export const GeminiService = SearchGeminiService;
