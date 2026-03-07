const fs = require('fs');

// ═══════════════════════════════════════════════
// 1. Add IPC handlers in main.ts
// ═══════════════════════════════════════════════
const mainPath = 'c:/Harshil projects/eterx-browser/electron/main.ts';
let main = fs.readFileSync(mainPath, 'utf8');
let m = 0;

// Check if handlers already exist
if (!main.includes("ipcMain.handle('youtube:summarize'")) {
    // Find a good spot — after existing ipcMain handlers
    const insertPoint = main.indexOf("// AGI: Video state capture");
    
    if (insertPoint === -1) {
        // Fallback: insert at end of file
        console.log('Inserting at end of file');
    }
    
    const handlers = `
// ═══════════════════════════════════════════════
// YouTube Transcript + Link Reader IPC Handlers
// ═══════════════════════════════════════════════

ipcMain.handle('youtube:summarize', async (_event: any, videoInfo: any) => {
    try {
        const { fetchTranscript, createTimestampedSummary } = await import('./agent/YouTubeTranscript.js');
        const url = videoInfo?.url || videoInfo?.videoId || '';
        if (!url) return { success: false, error: 'No video URL provided' };
        
        const result = await fetchTranscript(url);
        if (!result.success) return result;
        
        // Create timestamped summary (1-minute chunks)
        const summary = createTimestampedSummary(result.transcript, 60);
        
        return {
            success: true,
            videoId: result.videoId,
            title: result.title,
            transcript: result.fullText,
            chunks: summary.chunks,
            totalDuration: summary.totalDuration,
            segmentCount: result.transcript.length
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('youtube:seek', async (_event: any, seconds: number) => {
    try {
        // Find active YouTube tab and seek
        const allContents = webContents.getAllWebContents();
        for (const wc of allContents) {
            try {
                const url = wc.getURL();
                if (url.includes('youtube.com/watch')) {
                    await wc.executeJavaScript(\`(() => {
                        const v = document.querySelector('video');
                        if (v) { v.currentTime = \${seconds}; v.play(); return true; }
                        return false;
                    })()\`);
                    return { success: true, seekedTo: seconds };
                }
            } catch (_) { }
        }
        return { success: false, error: 'No YouTube tab found' };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('link:read', async (_event: any, url: string) => {
    try {
        if (!url || !url.startsWith('http')) return { success: false, error: 'Invalid URL' };
        
        // Use FastScraper for speed
        const { getFastScraper } = await import('./agent/FastScraper.js');
        const scraper = getFastScraper();
        const result = await scraper.fastRead(url, 8000);
        
        if (result.success && result.content && result.content.length > 50) {
            return result;
        }
        
        // Fallback: try shadow agent for JS-heavy pages
        try {
            const { getShadowAgent } = await import('./agent/ShadowAgent.js');
            const shadow = getShadowAgent();
            const shadowResult = await shadow.readPage(url, { maxLength: 8000 });
            if (shadowResult.success) return shadowResult;
        } catch (_) { }
        
        return result; // Return fast result even if short
    } catch (e: any) {
        return { success: false, error: e.message, url, title: '', content: '', description: '', links: [] };
    }
});

ipcMain.handle('youtube:transcript', async (_event: any, url: string) => {
    try {
        const { fetchTranscript } = await import('./agent/YouTubeTranscript.js');
        return await fetchTranscript(url);
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

`;
    
    if (insertPoint !== -1) {
        main = main.substring(0, insertPoint) + handlers + '\n' + main.substring(insertPoint);
    } else {
        main = main.trimEnd() + '\n' + handlers;
    }
    m++;
    console.log('1. Added YouTube/Link IPC handlers to main.ts');
}

fs.writeFileSync(mainPath, main, 'utf8');
console.log(`main.ts: ${m} additions`);

// ═══════════════════════════════════════════════
// 2. Add readLink + getTranscript to preload.cjs
// ═══════════════════════════════════════════════
const preloadPath = 'c:/Harshil projects/eterx-browser/electron/preload.cjs';
let preload = fs.readFileSync(preloadPath, 'utf8');
let p = 0;

if (!preload.includes("readLink:")) {
    preload = preload.replace(
        "// Fast Page Analysis",
        `// Link Content Reading (sidebar chat auto-reads URLs)
    readLink: (url) => ipcRenderer.invoke('link:read', url),
    // YouTube Transcript (full raw transcript)
    getTranscript: (url) => ipcRenderer.invoke('youtube:transcript', url),
    // Fast Page Analysis`
    );
    p++;
    console.log('2. Added readLink + getTranscript to preload.cjs');
}

fs.writeFileSync(preloadPath, preload, 'utf8');
console.log(`preload.cjs: ${p} additions`);

console.log('DONE');
