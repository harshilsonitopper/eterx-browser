const { ipcRenderer, contextBridge } = require('electron');

console.log('✅ PRELOAD SCRIPT LOADED');

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
    on(...args) {
        const [channel, listener] = args;
        return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
    },
    once(...args) {
        const [channel, listener] = args;
        return ipcRenderer.once(channel, (event, ...args) => listener(event, ...args));
    },
    removeListener(...args) {
        const [channel, listener] = args;
        return ipcRenderer.removeListener(channel, listener);
    },
    off(...args) {
        const [channel, ...omit] = args;
        return ipcRenderer.off(channel, ...omit);
    },
    send(...args) {
        const [channel, ...omit] = args;
        return ipcRenderer.send(channel, ...omit);
    },
    invoke(...args) {
        const [channel, ...omit] = args;
        return ipcRenderer.invoke(channel, ...omit);
    },
});

// Window controls and session persistence
contextBridge.exposeInMainWorld('electron', {
    // Generic IPC listener (used by SmartSidebar for agent:log, agent:status, gemini:response)
    on: (channel, callback) => {
        const sub = (_event, ...args) => callback(...args);
        ipcRenderer.on(channel, sub);
        return () => ipcRenderer.removeListener(channel, sub);
    },
    // Browser Agent control
    startBrowserAgent: (task, zeroClick) => ipcRenderer.invoke('browser-agent:start', task, zeroClick),
    stopBrowserAgent: () => ipcRenderer.send('browser-agent:stop'),
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    fullscreen: () => ipcRenderer.send('window-fullscreen'),
    // Session persistence
    saveSession: (tabs) => ipcRenderer.invoke('save-session', tabs),
    loadSession: () => ipcRenderer.invoke('load-session'),
    // Agent Memory Snapshot
    saveMemorySnapshot: (data) => ipcRenderer.invoke('save-memory-snapshot', data),
    loadMemorySnapshot: () => ipcRenderer.invoke('load-memory-snapshot'),
    // AI Functions
    generateAIContent: (prompt, model, apiKey) => ipcRenderer.invoke('ai:generate-content', prompt, model, apiKey),
    analyzeImage: (prompt, imageBase64, mimeType, apiKey) => ipcRenderer.invoke('ai:analyze-image', prompt, imageBase64, mimeType, apiKey),
    generateDeepThinking: (prompt, model, apiKey) => ipcRenderer.invoke('ai:generate-deep-thinking', prompt, model, apiKey),
    // YouTube Summarization
    summarizeYouTube: (videoInfo) => ipcRenderer.invoke('youtube:summarize', videoInfo),
    seekYouTube: (seconds) => ipcRenderer.invoke('youtube:seek', seconds),
    // Link Content Reading (sidebar chat auto-reads URLs)
    readLink: (url) => ipcRenderer.invoke('link:read', url),
    // File Export (PDF, Markdown, Code)
    exportFile: (content, type, filename) => ipcRenderer.invoke('file:export', { content, type, filename }),
    // Terminal Command Execution (sandboxed, with timeout)
    runTerminal: (command, timeout) => ipcRenderer.invoke('terminal:run', { command, timeout }),
    // Document Format Conversion
    convertFile: (inputPath, outputFormat) => ipcRenderer.invoke('file:convert', { inputPath, outputFormat }),
    // YouTube Transcript (full raw transcript)
    getTranscript: (url) => ipcRenderer.invoke('youtube:transcript', url),
    // Fast Page Analysis
    analyzePage: (question, pageContext, pageUrl) => ipcRenderer.invoke('ai:analyze-page', question, pageContext, pageUrl),
    // Google OAuth
    googleSignIn: () => ipcRenderer.invoke('google:sign-in'),

    // === GEMINI LIVE NATIVE AUDIO API ===
    sendAudioChunk: (chunk) => ipcRenderer.send('gemini:audio-chunk', Array.from(chunk)),
    onGeminiAudio: (callback) => {
        const sub = (_event, data) => callback(data);
        ipcRenderer.on('gemini:audio-response', sub);
        return () => ipcRenderer.removeListener('gemini:audio-response', sub);
    },
    connectGeminiLive: (apiKey) => ipcRenderer.send('gemini:connect', apiKey),
    disconnectGeminiLive: () => ipcRenderer.send('gemini:disconnect'),
    onGeminiStatus: (callback) => {
        const sub = (_event, data) => callback(data);
        ipcRenderer.on('gemini:status', sub);
        return () => ipcRenderer.removeListener('gemini:status', sub);
    },
    getGeminiKeyStatus: () => ipcRenderer.invoke('gemini:key-status'),
    captureScreenshot: (url) => ipcRenderer.invoke('ai:capture-screenshot', url),

    // Transcription listeners
    onGeminiThought: (callback) => {
        const sub = (_event, text) => callback(text);
        ipcRenderer.on('gemini:thought', sub);
        return () => ipcRenderer.removeListener('gemini:thought', sub);
    },
    onGeminiOutputTranscription: (callback) => {
        const sub = (_event, text) => callback(text);
        ipcRenderer.on('gemini:output-transcription', sub);
        return () => ipcRenderer.removeListener('gemini:output-transcription', sub);
    },
    onGeminiToolUse: (callback) => {
        const sub = (_event) => callback();
        ipcRenderer.on('gemini:tool-use', sub);
        return () => ipcRenderer.removeListener('gemini:tool-use', sub);
    },
    onGeminiBrowserAction: (callback) => {
        const sub = (_event, action) => callback(action);
        ipcRenderer.on('gemini:browser-action', sub);
        return () => ipcRenderer.removeListener('gemini:browser-action', sub);
    },
    onGeminiInterrupted: (callback) => {
        const sub = (_event) => callback();
        ipcRenderer.on('gemini:interrupted', sub);
        return () => ipcRenderer.removeListener('gemini:interrupted', sub);
    },
    onGeminiGenerationComplete: (callback) => {
        const sub = (_event) => callback();
        ipcRenderer.on('gemini:generation-complete', sub);
        return () => ipcRenderer.removeListener('gemini:generation-complete', sub);
    },

    // === BROWSER ACTIONS & OTHERS ===
    sendBrowserActionResult: (result) => ipcRenderer.send('gemini:browser-action-result', result),

    // Restored missing handler
    onGeminiInputTranscription: (callback) => {
        const sub = (_event, text) => callback(text);
        ipcRenderer.on('gemini:input-transcription', sub);
        return () => ipcRenderer.removeListener('gemini:input-transcription', sub);
    },

    // === VISION SYSTEM ===
    sendRealtimeInput: (part) => ipcRenderer.send('gemini:realtime-input', part),
    sendClientContent: (text) => ipcRenderer.send('gemini:client-content', text),
    setActiveWebContents: (webContentsId) => ipcRenderer.send('gemini:set-active-web-contents', webContentsId),

    // Cleanup
    removeGeminiListeners: () => {
        ipcRenderer.removeAllListeners('gemini:audio-response');
        ipcRenderer.removeAllListeners('gemini:status');
        ipcRenderer.removeAllListeners('gemini:browser-action');
        ipcRenderer.removeAllListeners('gemini:thought');
        ipcRenderer.removeAllListeners('gemini:output-transcription');
        ipcRenderer.removeAllListeners('gemini:tool-use');
    },
});

