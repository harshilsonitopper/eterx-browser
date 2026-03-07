/**
 * YouTubeTranscript.ts — YouTube Transcript Fetcher
 *
 * Fetches video transcripts/captions directly via HTTP.
 * No API key needed — uses YouTube's internal caption endpoint.
 * Works for any video that has auto-generated or manual captions.
 */
import { net } from 'electron';
/** Extract video ID from various YouTube URL formats */
export function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/ // bare video ID
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m)
            return m[1];
    }
    return null;
}
/** Format seconds to HH:MM:SS or MM:SS */
export function formatTimestamp(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0)
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}
/** Fetch raw YouTube page HTML */
async function fetchYouTubePage(videoId) {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await net.fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    });
    return await response.text();
}
/** Extract captions URL from YouTube page */
function extractCaptionsUrl(html) {
    // Look for captions track in the player response
    const captionTrackPattern = /"captionTracks":\[(\{.*?\})\]/;
    const match = html.match(captionTrackPattern);
    if (!match)
        return null;
    try {
        // Parse the first caption track
        const trackData = `[${match[1]}]`;
        const tracks = JSON.parse(trackData);
        // Prefer manual captions, then auto-generated English
        const manual = tracks.find((t) => !t.kind && t.languageCode === 'en');
        const autoEn = tracks.find((t) => t.kind === 'asr' && t.languageCode === 'en');
        const anyTrack = tracks[0];
        const track = manual || autoEn || anyTrack;
        if (track?.baseUrl) {
            // Add JSON format parameter
            let baseUrl = track.baseUrl.replace(/\\u0026/g, '&');
            if (!baseUrl.includes('fmt=json3')) {
                baseUrl += '&fmt=json3';
            }
            return baseUrl;
        }
    }
    catch (e) {
        // Try regex fallback
        const urlMatch = html.match(/"baseUrl":"(https:\/\/www\.youtube\.com\/api\/timedtext[^"]+)"/);
        if (urlMatch) {
            let url = urlMatch[1].replace(/\\u0026/g, '&');
            if (!url.includes('fmt=json3'))
                url += '&fmt=json3';
            return url;
        }
    }
    return null;
}
/** Extract video title from YouTube page */
function extractTitle(html) {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) {
        return titleMatch[1].replace(' - YouTube', '').trim();
    }
    const ogMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    return ogMatch ? ogMatch[1].trim() : 'Unknown';
}
/** Parse JSON3 transcript format */
function parseJson3Transcript(json) {
    const segments = [];
    if (json.events) {
        for (const event of json.events) {
            if (event.segs) {
                const text = event.segs.map((s) => s.utf8 || '').join('').trim();
                if (text && text !== '\n') {
                    segments.push({
                        text,
                        start: (event.tStartMs || 0) / 1000,
                        duration: (event.dDurationMs || 0) / 1000,
                    });
                }
            }
        }
    }
    return segments;
}
/** Parse XML transcript format (fallback) */
function parseXmlTranscript(xml) {
    const segments = [];
    const re = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
        const text = m[3]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/<[^>]+>/g, '')
            .trim();
        if (text) {
            segments.push({
                text,
                start: parseFloat(m[1]),
                duration: parseFloat(m[2]),
            });
        }
    }
    return segments;
}
/**
 * Fetch YouTube transcript for a video.
 * Works without API key — uses YouTube's internal caption endpoint.
 */
export async function fetchTranscript(videoIdOrUrl) {
    const videoId = extractVideoId(videoIdOrUrl) || videoIdOrUrl;
    try {
        // Step 1: Fetch YouTube page
        const html = await fetchYouTubePage(videoId);
        const title = extractTitle(html);
        // Step 2: Find captions URL
        const captionsUrl = extractCaptionsUrl(html);
        if (!captionsUrl) {
            return { success: false, videoId, title, transcript: [], fullText: '', error: 'No captions available for this video' };
        }
        // Step 3: Fetch transcript data
        const response = await net.fetch(captionsUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const text = await response.text();
        let segments = [];
        // Try JSON3 format first
        try {
            const json = JSON.parse(text);
            segments = parseJson3Transcript(json);
        }
        catch {
            // Fallback to XML format
            segments = parseXmlTranscript(text);
        }
        if (segments.length === 0) {
            return { success: false, videoId, title, transcript: [], fullText: '', error: 'Failed to parse transcript' };
        }
        // Build full text with timestamps
        const fullText = segments.map(s => `[${formatTimestamp(s.start)}] ${s.text}`).join('\n');
        return { success: true, videoId, title, transcript: segments, fullText };
    }
    catch (e) {
        return { success: false, videoId, title: '', transcript: [], fullText: '', error: e.message };
    }
}
/**
 * Create a timestamped summary of a transcript.
 * Groups segments into chunks for easier reading.
 */
export function createTimestampedSummary(segments, chunkDuration = 60) {
    const chunks = [];
    let currentChunk = [];
    let chunkStart = 0;
    for (const seg of segments) {
        if (seg.start - chunkStart >= chunkDuration && currentChunk.length > 0) {
            chunks.push({
                timestamp: formatTimestamp(chunkStart),
                startSeconds: chunkStart,
                text: currentChunk.map(s => s.text).join(' ')
            });
            currentChunk = [];
            chunkStart = seg.start;
        }
        currentChunk.push(seg);
    }
    // Last chunk
    if (currentChunk.length > 0) {
        chunks.push({
            timestamp: formatTimestamp(chunkStart),
            startSeconds: chunkStart,
            text: currentChunk.map(s => s.text).join(' ')
        });
    }
    const lastSeg = segments[segments.length - 1];
    const totalDuration = formatTimestamp(lastSeg ? lastSeg.start + lastSeg.duration : 0);
    return { chunks, totalDuration };
}
