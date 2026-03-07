"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
console.log('✅ PRELOAD SCRIPT LOADED');
// Map to store wrapped listener references for proper removal
const listenerRegistry = new WeakMap();
// --------- Expose some API to the Renderer process ---------
electron_1.contextBridge.exposeInMainWorld('ipcRenderer', {
    on(...args) {
        const [channel, listener] = args;
        const wrappedListener = (event, ...args) => listener(event, ...args);
        listenerRegistry.set(listener, wrappedListener);
        return electron_1.ipcRenderer.on(channel, wrappedListener);
    },
    once(...args) {
        const [channel, listener] = args;
        const wrappedListener = (event, ...args) => listener(event, ...args);
        listenerRegistry.set(listener, wrappedListener);
        return electron_1.ipcRenderer.once(channel, wrappedListener);
    },
    removeListener(...args) {
        const [channel, listener] = args;
        const wrappedListener = listenerRegistry.get(listener);
        if (wrappedListener) {
            return electron_1.ipcRenderer.removeListener(channel, wrappedListener);
        }
        return electron_1.ipcRenderer.removeListener(channel, listener);
    },
    off(...args) {
        const [channel, listener] = args;
        const wrappedListener = listenerRegistry.get(listener);
        if (wrappedListener) {
            return electron_1.ipcRenderer.off(channel, wrappedListener);
        }
        return electron_1.ipcRenderer.off(channel, listener);
    },
    send(...args) {
        const [channel, ...omit] = args;
        return electron_1.ipcRenderer.send(channel, ...omit);
    },
    invoke(...args) {
        const [channel, ...omit] = args;
        return electron_1.ipcRenderer.invoke(channel, ...omit);
    },
});
// Window controls and session persistence
electron_1.contextBridge.exposeInMainWorld('electron', {
    minimize: () => electron_1.ipcRenderer.send('window-minimize'),
    maximize: () => electron_1.ipcRenderer.send('window-maximize'),
    close: () => electron_1.ipcRenderer.send('window-close'),
    fullscreen: () => electron_1.ipcRenderer.send('window-fullscreen'),
    // Session persistence
    saveSession: (tabs) => electron_1.ipcRenderer.invoke('save-session', tabs),
    loadSession: () => electron_1.ipcRenderer.invoke('load-session'),
    // Agent Memory Snapshot
    saveMemorySnapshot: (data) => electron_1.ipcRenderer.invoke('save-memory-snapshot', data),
    loadMemorySnapshot: () => electron_1.ipcRenderer.invoke('load-memory-snapshot'),
    // Open file using the OS default application (PDFs, docs, etc)
    openExternalFile: (filePath) => electron_1.ipcRenderer.invoke('app:open-external-file', filePath),
    // Save an in-memory blob to a OS temp file and return the path
    saveTempFile: (fileName, buffer) => electron_1.ipcRenderer.invoke('app:save-temp-file', fileName, buffer),
    // AI Functions
    generateAIContent: (prompt) => electron_1.ipcRenderer.invoke('ai:generate-content', prompt),
    analyzeImage: (prompt, imageBase64, mimeType) => electron_1.ipcRenderer.invoke('ai:analyze-image', prompt, imageBase64, mimeType),
    generateDeepThinking: (prompt) => electron_1.ipcRenderer.invoke('ai:generate-deep-thinking', prompt),
    // YouTube Summarization (zero-click with timestamps)
    summarizeYouTube: (videoInfo) => electron_1.ipcRenderer.invoke('youtube:summarize', videoInfo),
    seekYouTube: (seconds) => electron_1.ipcRenderer.invoke('youtube:seek', seconds),
    // Fast Page Analysis (answer questions from page context)
    analyzePage: (question, pageContext, pageUrl) => electron_1.ipcRenderer.invoke('ai:analyze-page', question, pageContext, pageUrl),
    captureActiveTab: () => electron_1.ipcRenderer.invoke('browser:capture-active-tab'),
    // Gemini TTS (Text-to-Speech)
    generateTTS: (text, voiceName) => electron_1.ipcRenderer.invoke('ai:tts', text, voiceName),
    // Google OAuth (loopback method)
    googleSignIn: () => electron_1.ipcRenderer.invoke('google:sign-in'),
    // Gemini Live Native Audio API
    sendAudioChunk: (chunk) => electron_1.ipcRenderer.send('gemini:audio-chunk', chunk),
    sendRealtimeInput: (part) => electron_1.ipcRenderer.send('gemini:realtime-input', part),
    sendAudioStreamEnd: () => electron_1.ipcRenderer.send('gemini:audio-stream-end'),
    connectGeminiLive: (apiKey) => electron_1.ipcRenderer.send('gemini:connect', apiKey),
    disconnectGeminiLive: () => electron_1.ipcRenderer.send('gemini:disconnect'),
    clearGeminiSession: () => electron_1.ipcRenderer.send('gemini:clear-session'),
    // Audio response listener
    onGeminiAudio: (callback) => electron_1.ipcRenderer.on('gemini:audio-response', (_event, data) => callback(data)),
    // Tool use listener (Search sound)
    onGeminiToolUse: (callback) => electron_1.ipcRenderer.on('gemini:tool-use', () => callback()),
    // Status updates (connection state, key rotation)
    onGeminiStatus: (callback) => {
        const listener = (_event, data) => callback(data);
        electron_1.ipcRenderer.on('gemini:status', listener);
        return () => electron_1.ipcRenderer.removeListener('gemini:status', listener);
    },
    getGeminiKeyStatus: () => electron_1.ipcRenderer.invoke('gemini:key-status'),
    getGeminiSessionInfo: () => electron_1.ipcRenderer.invoke('gemini:session-info'),
    // Transcription listeners (input = user speech, output = model speech)
    onGeminiInputTranscription: (callback) => {
        const listener = (_event, text) => callback(text);
        electron_1.ipcRenderer.on('gemini:input-transcription', listener);
        return () => electron_1.ipcRenderer.removeListener('gemini:input-transcription', listener);
    },
    onGeminiOutputTranscription: (callback) => {
        const listener = (_event, text) => callback(text);
        electron_1.ipcRenderer.on('gemini:output-transcription', listener);
        return () => electron_1.ipcRenderer.removeListener('gemini:output-transcription', listener);
    },
    sendClientContent: (text) => electron_1.ipcRenderer.send('gemini:client-content', text),
    // Thought summaries (from thinking mode)
    onGeminiThought: (callback) => electron_1.ipcRenderer.on('gemini:thought', (_event, thought) => callback(thought)),
    // Interruption signal (user spoke while model was responding)
    onGeminiInterrupted: (callback) => electron_1.ipcRenderer.on('gemini:interrupted', () => callback()),
    // Generation complete signal (model finished turn)
    onGeminiGenerationComplete: (callback) => electron_1.ipcRenderer.on('gemini:generation-complete', () => callback()),
    // GoAway warning (connection will terminate soon)
    onGeminiGoAway: (callback) => electron_1.ipcRenderer.on('gemini:go-away', (_event, data) => callback(data)),
    // Browser Action (Agentic Control - navigate, click, scroll, etc.)
    // Browser Action (Agentic Control - navigate, click, scroll, etc.)
    onGeminiBrowserAction: (callback) => {
        const listener = (_event, data) => {
            console.log('[Preload] 📩 Received browser-action:', data);
            callback(data);
        };
        electron_1.ipcRenderer.on('gemini:browser-action', listener);
        return () => electron_1.ipcRenderer.removeListener('gemini:browser-action', listener);
    },
    // Send Browser Action Result (closing the loop)
    sendBrowserActionResult: (data) => electron_1.ipcRenderer.send('gemini:browser-action-result', data),
    // Remove all Gemini listeners (cleanup)
    removeGeminiListeners: () => {
        electron_1.ipcRenderer.removeAllListeners('gemini:audio-response');
        electron_1.ipcRenderer.removeAllListeners('gemini:status');
        electron_1.ipcRenderer.removeAllListeners('gemini:input-transcription');
        electron_1.ipcRenderer.removeAllListeners('gemini:output-transcription');
        electron_1.ipcRenderer.removeAllListeners('gemini:thought');
        electron_1.ipcRenderer.removeAllListeners('gemini:interrupted');
        electron_1.ipcRenderer.removeAllListeners('gemini:generation-complete');
        electron_1.ipcRenderer.removeAllListeners('gemini:go-away');
        electron_1.ipcRenderer.removeAllListeners('gemini:tool-use');
        electron_1.ipcRenderer.removeAllListeners('gemini:perform-action');
        electron_1.ipcRenderer.removeAllListeners('gemini:browser-action');
    },
    // Agent Actions (Renderer execution)
    onGeminiPerformAction: (callback) => electron_1.ipcRenderer.on('gemini:perform-action', (_event, action) => callback(action)),
    sendGeminiToolResponse: (id, name, result) => electron_1.ipcRenderer.send('gemini:tool-response', { id, name, result }),
    setActiveWebContents: (webContentsId) => electron_1.ipcRenderer.send('gemini:set-active-web-contents', webContentsId),
    // --- Browser Agent V2 ---
    startBrowserAgent: (task, zeroClickMode) => electron_1.ipcRenderer.invoke('browser-agent:start', task, zeroClickMode),
    stopBrowserAgent: () => electron_1.ipcRenderer.invoke('browser-agent:stop'),
    // Terminal Execution (Agentic Document Generation)
    executeTerminal: (command, timeoutMs) => electron_1.ipcRenderer.invoke('terminal:execute', command, timeoutMs),
    getWorkspacePath: () => electron_1.ipcRenderer.invoke('terminal:get-workspace'),
    listWorkspaceFiles: () => electron_1.ipcRenderer.invoke('terminal:list-files'),
    readWorkspaceFile: (filename) => electron_1.ipcRenderer.invoke('terminal:read-file', filename),
    pipInstall: (packages) => electron_1.ipcRenderer.invoke('terminal:pip-install', packages),
    on: (channel, listener) => {
        // Safe whitelist for specific channels or generic
        const validChannels = ['agent:log', 'agent:status', 'agent:step'];
        if (validChannels.includes(channel)) {
            const wrappedListener = (_event, ...args) => listener.apply(null, args);
            electron_1.ipcRenderer.on(channel, wrappedListener);
            return () => {
                electron_1.ipcRenderer.removeListener(channel, wrappedListener);
            };
        }
        // For non-whitelisted channels, return a no-op cleanup function
        return () => { };
    }
});
// =============================================================================
// CHROME TRUST EMULATION - Makes browser appear as real Chrome to Google
// =============================================================================
// This script will be injected into webviews for Google domains
const CHROME_EMULATION_SCRIPT = `
(function() {
    // 1. Remove webdriver detection (main automation indicator)
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    
    // 2. Add Chrome object (Google checks for this)
    if (!window.chrome) {
        window.chrome = {
            runtime: { id: undefined },
            loadTimes: function() { return {}; },
            csi: function() { return {}; },
            app: { isInstalled: false, InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' }, RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' } }
        };
    }
    
    // 3. Fix plugins (empty = detected as headless/bot)
    Object.defineProperty(navigator, 'plugins', {
        get: () => {
            const plugins = [
                { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1, item: () => null, namedItem: () => null },
                { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '', length: 1, item: () => null, namedItem: () => null },
                { name: 'Native Client', filename: 'internal-nacl-plugin', description: '', length: 1, item: () => null, namedItem: () => null }
            ];
            plugins.length = 3;
            plugins.item = (i) => plugins[i] || null;
            plugins.namedItem = (name) => plugins.find(p => p.name === name) || null;
            plugins.refresh = () => {};
            return plugins;
        }
    });
    
    // 4. Fix languages
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'language', { get: () => 'en-US' });
    
    // 5. Fix hardware concurrency (0 or 1 = detected as VM/bot)
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    
    // 6. Fix permissions API
    const origQuery = navigator.permissions?.query?.bind(navigator.permissions);
    if (origQuery) {
        navigator.permissions.query = (params) => {
            if (params.name === 'notifications') {
                return Promise.resolve({ state: Notification.permission, onchange: null });
            }
            return origQuery(params);
        };
    }
    
    // 7. Fix WebGL vendor/renderer (must not be empty)
    const getParameterOrig = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
        if (param === 37445) return 'Google Inc. (NVIDIA)';  // UNMASKED_VENDOR_WEBGL
        if (param === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0)';  // UNMASKED_RENDERER_WEBGL
        return getParameterOrig.call(this, param);
    };
    
    // 8. Remove Electron from user agent in JS
    Object.defineProperty(navigator, 'userAgent', {
        get: () => navigator.userAgent.replace(/Electron\\/[\\d.]+ /g, '').replace(/\\s+/g, ' ').trim()
    });
    
    console.log('[ChromeEmulation] Trust signals applied');
})();
`;
// Expose the emulation script so it can be injected into webviews
electron_1.contextBridge.exposeInMainWorld('chromeEmulation', {
    getScript: () => CHROME_EMULATION_SCRIPT
});
