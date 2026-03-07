/**
 * LLMService.ts - Compatibility Layer
 * 
 * DEPRECATED: OpenAI has been removed.
 * All logic now routes to the dedicated GeminiService.ts.
 */

import { SearchGeminiService, NewsGeminiService, SidebarGeminiService, GeminiServiceClass } from './GeminiService';
import { YouTubeService } from './YouTubeService';

export class LLMServiceClass {
    private gemini: GeminiServiceClass;

    constructor(gemini: GeminiServiceClass) {
        this.gemini = gemini;
    }

    async generate(prompt: string, systemPrompt?: string, useSmartModel: boolean = false): Promise<string> {
        const result = await this.gemini.generateContent(prompt, systemPrompt, !useSmartModel);
        return result.text;
    }

    async searchAndAnswer(query: string): Promise<{ answer: string; sources: { title: string; url: string }[] }> {
        const { SearchService } = await import('./SearchService');
        const searchData = await SearchService.searchWeb(query);
        const { results } = searchData;

        let context = '';
        const sources: { title: string; url: string }[] = [];

        results.forEach((r, i) => {
            context += `${i + 1}. [${r.title}](${r.link})\n   "${r.snippet}"\n\n`;
            sources.push({ title: r.title, url: r.link });
        });

        if (context) {
            const prompt = `Answer query: "${query}" using information:\n${context}`;
            const answer = await this.generate(prompt);
            return { answer, sources };
        }
        return { answer: 'No results found.', sources: [] };
    }

    async analyzeImage(prompt: string, imageBase64: string): Promise<string> {
        return this.gemini.analyzeImage(prompt, imageBase64);
    }

    async analyzeVideo(videoId: string, query: string): Promise<string> {
        const yt = YouTubeService.getInstance();
        const transcript = await yt.getTranscript(videoId);
        if (!transcript) return "Could not fetch transcript.";
        const details = await yt.getVideoDetails(videoId);
        const prompt = yt.getTimestampedSummaryPrompt(transcript, details, query);
        return this.generate(prompt + `\n\nUser Query: ${query}`);
    }
}

export const SearchLLMService = new LLMServiceClass(SearchGeminiService);
export const SidebarLLMService = new LLMServiceClass(SidebarGeminiService);
export const NewsLLMService = new LLMServiceClass(NewsGeminiService);

// Legacy default export
export const LLMService = SearchLLMService;

