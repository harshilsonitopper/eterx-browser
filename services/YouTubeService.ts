/**
 * YouTubeService.ts - Perplexity-Style YouTube Video Analysis
 * 
 * Features:
 * - Smart video intent detection (no URL required)
 * - Auto-search for relevant videos
 * - Multiple transcript fetch methods (youtube-transcript library + fallbacks)
 * - Perplexity-style analysis with timestamps, sections, key moments
 */

import { LLMService } from './LLMService';
import { SearchService } from './SearchService';

// Import youtube-transcript library
let YoutubeTranscript: any;
try {
    // Dynamic import for browser/electron compatibility
    YoutubeTranscript = require('youtube-transcript').YoutubeTranscript;
} catch {
    console.warn('[YouTube] youtube-transcript library not available, using fallback methods');
}

export interface TranscriptSegment {
    text: string;
    start: number;
    duration: number;
}

export interface VideoDetails {
    title: string;
    description: string;
    channel: string;
    duration: string;
    thumbnailUrl: string;
    chapters: { time: number; title: string }[];
    viewCount?: string;
    publishedAt?: string;
}

export interface VideoAnalysis {
    videoId: string;
    details: VideoDetails | null;
    transcript: TranscriptSegment[] | null;
    analysis: string;
    keyMoments: { timestamp: string; seconds: number; title: string; description: string }[];
    sections: { timestamp: string; seconds: number; title: string }[];
    quotes: { timestamp: string; seconds: number; quote: string }[];
    summary: string;
}

const getEnv = (key: string): string => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return (import.meta.env as any)[key] || '';
    }
    return '';
};

const YOUTUBE_API_KEY = getEnv('VITE_GOOGLE_API_KEY');

export class YouTubeService {
    private static instance: YouTubeService;

    private constructor() { }

    public static getInstance(): YouTubeService {
        if (!YouTubeService.instance) {
            YouTubeService.instance = new YouTubeService();
        }
        return YouTubeService.instance;
    }

    // ============================================
    // SMART VIDEO DETECTION (No URL Required)
    // ============================================

    /**
     * Detect if user wants video content and extract search query
     */
    async detectVideoIntent(query: string, screenshotBase64?: string): Promise<{
        wantsVideo: boolean;
        suggestedSearch: string;
        detectedVideoId: string | null;
        confidence: number;
    }> {
        console.log('[YouTube] 🎯 Detecting video intent...');

        // 1. Check for explicit video URL in query
        const videoId = this.extractVideoId(query);
        if (videoId) {
            return { wantsVideo: true, suggestedSearch: '', detectedVideoId: videoId, confidence: 1.0 };
        }

        // 2. Keyword-based quick detection
        const q = query.toLowerCase();
        const videoKeywords = /video|youtube|yt|watch|tutorial|lecture|how.?to|demo|walkthrough|explain.*video|show.*video|best.*video|top.*video/i;
        if (videoKeywords.test(q)) {
            // Clean the search query
            const cleanSearch = q.replace(/(video|youtube|yt|watch|show me|find)/gi, '').trim();
            return { wantsVideo: true, suggestedSearch: cleanSearch || query, detectedVideoId: null, confidence: 0.85 };
        }

        // 3. Use Gemini for complex intent detection (with optional screenshot)
        if (screenshotBase64) {
            try {
                const result = await LLMService.analyzeImage(
                    `Analyze this screenshot. Is the user viewing a YouTube video? 
                    If yes, extract any visible video title or topic.
                    Return JSON: {"isYouTube": boolean, "videoTitle": string, "topic": string}`,
                    screenshotBase64
                );
                const json = JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || '{}');
                if (json.isYouTube) {
                    return {
                        wantsVideo: true,
                        suggestedSearch: json.videoTitle || json.topic || query,
                        detectedVideoId: null,
                        confidence: 0.9
                    };
                }
            } catch { }
        }

        // 4. For educational/how-to queries, suggest videos might help
        const educationalPattern = /how (to|do|can)|learn|understand|explain|tutorial|guide|step.?by.?step/i;
        if (educationalPattern.test(q)) {
            return { wantsVideo: true, suggestedSearch: query, detectedVideoId: null, confidence: 0.6 };
        }

        return { wantsVideo: false, suggestedSearch: '', detectedVideoId: null, confidence: 0 };
    }

    /**
     * Search YouTube and return best matching video
     */
    async searchAndSelectBestVideo(query: string, maxResults: number = 3): Promise<{
        videoId: string;
        title: string;
        channel: string;
        thumbnail: string;
        description: string;
    } | null> {
        console.log('[YouTube] 🔍 Searching for:', query);

        try {
            const results = await SearchService.searchYouTube(query, maxResults);
            if (results.length === 0) return null;

            // Return the top result (YouTube search is already relevance-sorted)
            const best = results[0];
            return {
                videoId: best.videoId,
                title: best.title,
                channel: best.channel,
                thumbnail: best.thumbnail,
                description: ''
            };
        } catch (e) {
            console.error('[YouTube] Search failed:', e);
            return null;
        }
    }

    /**
     * 🧠 CONTENT CURATION ENGINE (TASK 16)
     * Ranks and Filters videos based on INTENT and QUALITY.
     * Prevents showing random clips when user wants a full lecture.
     */
    async curateVideoResults(videos: {
        videoId: string;
        title: string;
        channel: string;
        thumbnail: string;
        description: string;
    }[], intent: string): Promise<{
        videoId: string;
        title: string;
        channel: string;
        thumbnail: string;
        description: string;
        curationTag: string; // "Best for Beginners", "Deep Dive", "Quick Overview"
        qualityScore: number;
    }[]> {
        console.log('[YouTube] 🧠 Curating results for intent:', intent);

        const isLearning = /learn|tutorial|course|lecture|how to|guide|study/i.test(intent);
        const isNews = /news|report|update|latest/i.test(intent);

        return videos.map(v => {
            let score = 5;
            let tag = "Related Video";
            const title = v.title.toLowerCase();

            // Quality Signals
            if (isLearning) {
                if (title.includes('full course') || title.includes('complete')) { score += 3; tag = "Comprehensive Guide"; }
                if (title.includes('tutorial') || title.includes('101')) { score += 2; tag = "Best for Beginners"; }
                if (title.includes('lecture')) { score += 2; tag = "Academic Lecture"; }
                if (title.includes('shorts')) { score -= 3; tag = "Short Clip"; } // Demote shorts for learning
            } else if (isNews) {
                if (title.includes('live') || title.includes('breaking')) { score += 3; tag = "Live Coverage"; }
                if (title.includes('update')) { score += 2; tag = "Latest Update"; }
                if (title.includes('documentary')) { score -= 1; tag = "Documentary"; } // Demote docs for breaking news
            }

            // Channel Authority (Simple heuristic)
            if (v.channel.includes('Official') || v.channel.includes('Verified')) score += 1;

            return { ...v, curationTag: tag, qualityScore: score };
        }).sort((a, b) => b.qualityScore - a.qualityScore); // Sort by quality
    }

    // ============================================
    // VIDEO DETAILS & TRANSCRIPT FETCHING
    // ============================================

    /**
     * Get video details using YouTube Data API
     */
    async getVideoDetails(videoId: string): Promise<VideoDetails | null> {
        console.log('[YouTube] Getting details for:', videoId);

        if (!YOUTUBE_API_KEY) {
            console.warn('[YouTube] No API key configured');
            return this.getVideoDetailsFromPage(videoId);
        }

        try {
            const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`;
            const response = await fetch(url);

            if (!response.ok) {
                console.warn('[YouTube] API error:', response.status);
                return this.getVideoDetailsFromPage(videoId);
            }

            const data = await response.json();
            const video = data.items?.[0];

            if (!video) return null;

            const chapters = this.parseChaptersFromDescription(video.snippet.description);

            return {
                title: video.snippet.title,
                description: video.snippet.description,
                channel: video.snippet.channelTitle,
                duration: video.contentDetails.duration,
                thumbnailUrl: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url || '',
                chapters,
                viewCount: video.statistics?.viewCount,
                publishedAt: video.snippet.publishedAt
            };
        } catch (e) {
            console.error('[YouTube] Details fetch failed:', e);
            return this.getVideoDetailsFromPage(videoId);
        }
    }

    /**
     * Fallback: Get basic details from oEmbed
     */
    private async getVideoDetailsFromPage(videoId: string): Promise<VideoDetails | null> {
        try {
            const url = `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`;
            const response = await fetch(url);
            const data = await response.json();

            return {
                title: data.title || 'Unknown Video',
                description: '',
                channel: data.author_name || 'Unknown',
                duration: '',
                thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                chapters: []
            };
        } catch {
            return null;
        }
    }

    /**
     * Parse chapters from description
     */
    private parseChaptersFromDescription(description: string): { time: number; title: string }[] {
        const chapters: { time: number; title: string }[] = [];
        const regex = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(.+)/gm;
        let match;

        while ((match = regex.exec(description)) !== null) {
            let seconds = parseInt(match[1]) * 60 + parseInt(match[2]);
            if (match[3]) {
                seconds = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
            }
            chapters.push({ time: seconds, title: match[4].trim() });
        }

        return chapters;
    }

    /**
     * Get transcript using multiple methods (library + fallbacks)
     */
    async getTranscript(videoId: string): Promise<TranscriptSegment[] | null> {
        console.log('[YouTube] Fetching transcript:', videoId);

        // Method 0: Use youtube-transcript library (most reliable)
        if (YoutubeTranscript) {
            try {
                const transcript = await YoutubeTranscript.fetchTranscript(videoId);
                if (transcript && transcript.length > 0) {
                    console.log('[YouTube] ✅ Got transcript via youtube-transcript library:', transcript.length, 'segments');
                    return transcript.map((t: any) => ({
                        text: t.text || '',
                        start: t.offset / 1000 || 0,
                        duration: t.duration / 1000 || 0
                    }));
                }
            } catch (e) {
                console.warn('[YouTube] Library fetch failed, trying fallbacks...', e);
            }
        }

        // Method 1: Try transcript proxy
        try {
            const proxyUrl = `https://yt-transcript.vercel.app/api/transcript?v=${videoId}`;
            const response = await fetch(proxyUrl);
            if (response.ok) {
                const data = await response.json();
                if (data.transcript && Array.isArray(data.transcript)) {
                    console.log('[YouTube] ✅ Got transcript via proxy:', data.transcript.length, 'segments');
                    return data.transcript.map((t: any) => ({
                        text: t.text || '',
                        start: parseFloat(t.start) || 0,
                        duration: parseFloat(t.duration) || 0
                    }));
                }
            }
        } catch { }

        // Method 2: Try alternative proxy
        try {
            const altProxy = `https://api.kome.ai/api/tools/youtube-transcripts?video_id=${videoId}`;
            const response = await fetch(altProxy);
            if (response.ok) {
                const data = await response.json();
                if (data.transcript) {
                    console.log('[YouTube] ✅ Got transcript via alt proxy');
                    return this.parseRawTranscript(data.transcript);
                }
            }
        } catch { }

        // Method 3: Try innertube API
        try {
            const innertubeUrl = `https://www.youtube.com/youtubei/v1/get_transcript?key=your api key`;
            const innertubeBody = {
                context: {
                    client: { clientName: "WEB", clientVersion: "2.20240101.00.00" }
                },
                params: btoa(`\n\x0b${videoId}`)
            };

            const response = await fetch(innertubeUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(innertubeBody)
            });

            if (response.ok) {
                const data = await response.json();
                const transcriptData = data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body?.transcriptSegmentListRenderer?.initialSegments;

                if (transcriptData) {
                    const segments: TranscriptSegment[] = [];
                    for (const seg of transcriptData) {
                        const renderer = seg.transcriptSegmentRenderer;
                        if (renderer) {
                            segments.push({
                                text: renderer.snippet?.runs?.[0]?.text || '',
                                start: parseInt(renderer.startMs) / 1000 || 0,
                                duration: (parseInt(renderer.endMs) - parseInt(renderer.startMs)) / 1000 || 0
                            });
                        }
                    }
                    if (segments.length) {
                        console.log('[YouTube] ✅ Got transcript via innertube:', segments.length, 'segments');
                        return segments;
                    }
                }
            }
        } catch { }

        console.warn('[YouTube] ❌ Could not fetch transcript');
        return null;
    }

    /**
     * Parse raw transcript text into segments
     */
    private parseRawTranscript(rawText: string): TranscriptSegment[] {
        const segments: TranscriptSegment[] = [];
        const lines = rawText.split('\n');
        let currentTime = 0;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Try to extract timestamp
            const timeMatch = trimmed.match(/\[?(\d{1,2}):(\d{2})(?::(\d{2}))?\]?\s*(.*)/);
            if (timeMatch) {
                let seconds = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
                if (timeMatch[3]) {
                    seconds = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]);
                }
                segments.push({ text: timeMatch[4], start: seconds, duration: 5 });
                currentTime = seconds;
            } else {
                segments.push({ text: trimmed, start: currentTime, duration: 5 });
                currentTime += 5;
            }
        }

        return segments;
    }

    // ============================================
    // PERPLEXITY-STYLE ANALYSIS
    // ============================================

    /**
     * Generate full Perplexity-style video analysis
     */
    async getPerplexityStyleAnalysis(videoId: string, userQuery: string): Promise<VideoAnalysis> {
        console.log('[YouTube] 🎬 Generating Perplexity-style analysis for:', videoId);

        // Fetch all data in parallel
        const [details, transcript] = await Promise.all([
            this.getVideoDetails(videoId),
            this.getTranscript(videoId)
        ]);

        if (!transcript || transcript.length === 0) {
            // Even without transcript, return basic analysis
            return {
                videoId,
                details,
                transcript: null,
                analysis: `Unable to fetch transcript for this video. Please watch the video directly.`,
                keyMoments: [],
                sections: [],
                quotes: [],
                summary: details?.title || 'Video analysis unavailable'
            };
        }

        // Generate comprehensive analysis
        const analysisPrompt = this.buildPerplexityPrompt(details, transcript, userQuery);

        try {
            const rawAnalysis = await LLMService.generate(analysisPrompt, undefined, true);

            // Parse the structured response
            const parsed = this.parseAnalysisResponse(rawAnalysis);

            return {
                videoId,
                details,
                transcript,
                analysis: rawAnalysis,
                keyMoments: parsed.keyMoments,
                sections: parsed.sections,
                quotes: parsed.quotes,
                summary: parsed.summary
            };
        } catch (e) {
            console.error('[YouTube] Analysis failed:', e);
            return {
                videoId,
                details,
                transcript,
                analysis: 'Analysis failed. Please try again.',
                keyMoments: [],
                sections: [],
                quotes: [],
                summary: details?.title || ''
            };
        }
    }

    /**
     * Build Perplexity-style analysis prompt
     */
    private buildPerplexityPrompt(details: VideoDetails | null, transcript: TranscriptSegment[], userQuery: string): string {
        const transcriptText = transcript.slice(0, 500).map(s => `[${this.formatTime(s.start)}] ${s.text}`).join('\n');

        const chaptersSection = details?.chapters?.length
            ? `\n**Video Chapters:**\n${details.chapters.map(c => `${this.formatTime(c.time)} - ${c.title}`).join('\n')}\n`
            : '';

        return `You are **YouTube Content Intelligence**. Analyze this video like Perplexity AI.

**Video:** ${details?.title || 'Unknown'}
**Channel:** ${details?.channel || 'Unknown'}
**Duration:** ${details?.duration || 'Unknown'}
${chaptersSection}

**User Request:** ${userQuery}

**Transcript:**
${transcriptText.slice(0, 20000)}

---

## OUTPUT FORMAT (Follow EXACTLY):

> **Main Takeaway:** [One compelling sentence summarizing the video's core value]

## 📑 Video Outline

| Timestamp | Section | Key Points |
|-----------|---------|------------|
| **0:00** | Introduction | [1-2 sentences] |
| **X:XX** | [Section Name] | [1-2 sentences] |
[Include 5-8 major sections with EXACT timestamps from transcript]

## 🔑 Key Moments

1. **[MM:SS]** - **[Insight Title]** — [Why this matters, 1 sentence] ⭐ [Importance: 1-10]
2. **[MM:SS]** - **[Insight Title]** — [Why this matters] ⭐ [1-10]
[Include 5-10 key moments with exact timestamps]

## 💬 Notable Quotes

> "[Exact quote from transcript]" — **[MM:SS]**

> "[Another quote]" — **[MM:SS]**
[Include 2-4 memorable quotes with exact timestamps]

## 🎯 Actionable Takeaways

1. **[Takeaway 1]** — [How to apply it]
2. **[Takeaway 2]** — [How to apply it]
3. **[Takeaway 3]** — [How to apply it]

---

**CRITICAL RULES:**
- Use EXACT timestamps from the transcript
- Be CONCISE but comprehensive
- Answer the user's specific question if they asked one
- Format for readability with bold headers`;
    }

    /**
     * Parse the analysis response into structured data
     */
    private parseAnalysisResponse(analysis: string): {
        keyMoments: { timestamp: string; seconds: number; title: string; description: string }[];
        sections: { timestamp: string; seconds: number; title: string }[];
        quotes: { timestamp: string; seconds: number; quote: string }[];
        summary: string;
    } {
        const keyMoments: any[] = [];
        const sections: any[] = [];
        const quotes: any[] = [];
        let summary = '';

        // Extract summary (blockquote at top)
        const summaryMatch = analysis.match(/>\s*\*\*Main Takeaway:\*\*\s*(.+)/);
        if (summaryMatch) summary = summaryMatch[1].trim();

        // Extract timestamps from analysis
        const timestampPattern = /\*\*(\d{1,2}:\d{2}(?::\d{2})?)\*\*\s*[-—]\s*\*\*([^*]+)\*\*/g;
        let match;
        while ((match = timestampPattern.exec(analysis)) !== null) {
            const ts = match[1];
            const title = match[2].trim();
            const seconds = this.parseTimestamp(ts);
            keyMoments.push({ timestamp: ts, seconds, title, description: '' });
        }

        // Extract quotes
        const quotePattern = />\s*"([^"]+)"\s*—\s*\*\*(\d{1,2}:\d{2}(?::\d{2})?)\*\*/g;
        while ((match = quotePattern.exec(analysis)) !== null) {
            const quote = match[1].trim();
            const ts = match[2];
            const seconds = this.parseTimestamp(ts);
            quotes.push({ timestamp: ts, seconds, quote });
        }

        return { keyMoments, sections, quotes, summary };
    }

    /**
     * Parse timestamp string to seconds
     */
    private parseTimestamp(ts: string): number {
        const parts = ts.split(':').map(Number);
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return parts[0] * 60 + parts[1];
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Extract video ID from various URL formats
     */
    extractVideoId(text: string): string | null {
        const patterns = [
            /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
            /youtu\.be\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
            /[?&]v=([a-zA-Z0-9_-]{11})/
        ];
        for (const p of patterns) {
            const m = text.match(p);
            if (m) return m[1];
        }
        return null;
    }

    formatTime(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    formatTranscriptWithTimestamps(segments: TranscriptSegment[]): string {
        return segments.map(s => `[${this.formatTime(s.start)}] ${s.text}`).join('\n');
    }

    /**
     * Legacy method for backward compatibility
     */
    getTimestampedSummaryPrompt(segments: TranscriptSegment[], details: VideoDetails | null, query: string): string {
        return this.buildPerplexityPrompt(details, segments, query);
    }
}

