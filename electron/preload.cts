import { ipcRenderer, contextBridge } from 'electron'

console.log('✅ PRELOAD SCRIPT LOADED');

// Map to store wrapped listener references for proper removal
const listenerRegistry = new WeakMap<Function, Function>();

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
    on(...args: Parameters<typeof ipcRenderer.on>) {
        const [channel, listener] = args;
        const wrappedListener = (event: any, ...args: any[]) => listener(event, ...args);
        listenerRegistry.set(listener, wrappedListener);
        return ipcRenderer.on(channel, wrappedListener as any);
    },
    once(...args: Parameters<typeof ipcRenderer.once>) {
        const [channel, listener] = args;
        const wrappedListener = (event: any, ...args: any[]) => listener(event, ...args);
        listenerRegistry.set(listener, wrappedListener);
        return ipcRenderer.once(channel, wrappedListener as any);
    },
    removeListener(...args: Parameters<typeof ipcRenderer.removeListener>) {
        const [channel, listener] = args;
        const wrappedListener = listenerRegistry.get(listener);
        if (wrappedListener) {
            return ipcRenderer.removeListener(channel, wrappedListener as any);
        }
        return ipcRenderer.removeListener(channel, listener);
    },
    off(...args: Parameters<typeof ipcRenderer.off>) {
        const [channel, listener] = args;
        const wrappedListener = listenerRegistry.get(listener as Function);
        if (wrappedListener) {
            return ipcRenderer.off(channel, wrappedListener as any);
        }
        return ipcRenderer.off(channel, listener as any);
    },
    send(...args: Parameters<typeof ipcRenderer.send>) {
        const [channel, ...omit] = args
        return ipcRenderer.send(channel, ...omit)
    },
    invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
        const [channel, ...omit] = args
        return ipcRenderer.invoke(channel, ...omit)
    },
})

// Window controls and session persistence
contextBridge.exposeInMainWorld('electron', {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    fullscreen: () => ipcRenderer.send('window-fullscreen'),
    // Session persistence
    saveSession: (tabs: any) => ipcRenderer.invoke('save-session', tabs),
    loadSession: () => ipcRenderer.invoke('load-session'),
    // Agent Memory Snapshot
    saveMemorySnapshot: (data: any) => ipcRenderer.invoke('save-memory-snapshot', data),
    loadMemorySnapshot: () => ipcRenderer.invoke('load-memory-snapshot'),

    // Open file using the OS default application (PDFs, docs, etc)
    openExternalFile: (filePath: string) => ipcRenderer.invoke('app:open-external-file', filePath),
    // Save an in-memory blob to a OS temp file and return the path
    saveTempFile: (fileName: string, buffer: ArrayBuffer) => ipcRenderer.invoke('app:save-temp-file', fileName, buffer),

    // AI Functions
    generateAIContent: (prompt: string) => ipcRenderer.invoke('ai:generate-content', prompt),
    analyzeImage: (prompt: string, imageBase64: string, mimeType: string) => ipcRenderer.invoke('ai:analyze-image', prompt, imageBase64, mimeType),
    generateDeepThinking: (prompt: string) => ipcRenderer.invoke('ai:generate-deep-thinking', prompt),
    // YouTube Summarization (zero-click with timestamps)
    summarizeYouTube: (videoInfo: { title: string; channelName: string; description: string; transcript: string }) =>
        ipcRenderer.invoke('youtube:summarize', videoInfo),
    seekYouTube: (seconds: number) => ipcRenderer.invoke('youtube:seek', seconds),
    // Fast Page Analysis (answer questions from page context)
    analyzePage: (question: string, pageContext: string, pageUrl?: string) =>
        ipcRenderer.invoke('ai:analyze-page', question, pageContext, pageUrl),
    captureActiveTab: () => ipcRenderer.invoke('browser:capture-active-tab'),
    // Gemini TTS (Text-to-Speech)
    generateTTS: (text: string, voiceName?: string) => ipcRenderer.invoke('ai:tts', text, voiceName),
    // Google OAuth (loopback method)
    googleSignIn: () => ipcRenderer.invoke('google:sign-in'),
    // Gemini Live Native Audio API
    sendAudioChunk: (chunk: Float32Array) => ipcRenderer.send('gemini:audio-chunk', chunk),
    sendRealtimeInput: (part: { mimeType: string; data: string }) => ipcRenderer.send('gemini:realtime-input', part),
    sendAudioStreamEnd: () => ipcRenderer.send('gemini:audio-stream-end'),
    connectGeminiLive: (apiKey: string) => ipcRenderer.send('gemini:connect', apiKey),
    disconnectGeminiLive: () => ipcRenderer.send('gemini:disconnect'),
    clearGeminiSession: () => ipcRenderer.send('gemini:clear-session'),

    // Audio response listener
    onGeminiAudio: (callback: (data: { audio: string }) => void) =>
        ipcRenderer.on('gemini:audio-response', (_event, data) => callback(data)),

    // Tool use listener (Search sound)
    onGeminiToolUse: (callback: () => void) =>
        ipcRenderer.on('gemini:tool-use', () => callback()),

    // Status updates (connection state, key rotation)
    onGeminiStatus: (callback: (data: { status: string; keyStatus?: any; message?: string; attempt?: number }) => void) => {
        const listener = (_event: any, data: any) => callback(data);
        ipcRenderer.on('gemini:status', listener);
        return () => ipcRenderer.removeListener('gemini:status', listener);
    },
    getGeminiKeyStatus: () => ipcRenderer.invoke('gemini:key-status'),
    getGeminiSessionInfo: () => ipcRenderer.invoke('gemini:session-info'),

    // Transcription listeners (input = user speech, output = model speech)
    onGeminiInputTranscription: (callback: (text: string) => void) => {
        const listener = (_event: any, text: string) => callback(text);
        ipcRenderer.on('gemini:input-transcription', listener);
        return () => ipcRenderer.removeListener('gemini:input-transcription', listener);
    },
    onGeminiOutputTranscription: (callback: (text: string) => void) => {
        const listener = (_event: any, text: string) => callback(text);
        ipcRenderer.on('gemini:output-transcription', listener);
        return () => ipcRenderer.removeListener('gemini:output-transcription', listener);
    },
    sendClientContent: (text: string) => ipcRenderer.send('gemini:client-content', text),

    // Thought summaries (from thinking mode)
    onGeminiThought: (callback: (thought: string) => void) =>
        ipcRenderer.on('gemini:thought', (_event, thought) => callback(thought)),

    // Interruption signal (user spoke while model was responding)
    onGeminiInterrupted: (callback: () => void) =>
        ipcRenderer.on('gemini:interrupted', () => callback()),

    // Generation complete signal (model finished turn)
    onGeminiGenerationComplete: (callback: () => void) =>
        ipcRenderer.on('gemini:generation-complete', () => callback()),

    // GoAway warning (connection will terminate soon)
    onGeminiGoAway: (callback: (data: { timeLeft: number }) => void) =>
        ipcRenderer.on('gemini:go-away', (_event, data) => callback(data)),

    // Browser Action (Agentic Control - navigate, click, scroll, etc.)
    // Browser Action (Agentic Control - navigate, click, scroll, etc.)
    onGeminiBrowserAction: (callback: (data: { name: string; args: any; id: string }) => void) => {
        const listener = (_event: any, data: any) => {
            console.log('[Preload] 📩 Received browser-action:', data);
            callback(data);
        };
        ipcRenderer.on('gemini:browser-action', listener);
        return () => ipcRenderer.removeListener('gemini:browser-action', listener);
    },

    // Send Browser Action Result (closing the loop)
    sendBrowserActionResult: (data: { id: string; result: any }) => ipcRenderer.send('gemini:browser-action-result', data),


    // Remove all Gemini listeners (cleanup)
    removeGeminiListeners: () => {
        ipcRenderer.removeAllListeners('gemini:audio-response');
        ipcRenderer.removeAllListeners('gemini:status');
        ipcRenderer.removeAllListeners('gemini:input-transcription');
        ipcRenderer.removeAllListeners('gemini:output-transcription');
        ipcRenderer.removeAllListeners('gemini:thought');
        ipcRenderer.removeAllListeners('gemini:interrupted');
        ipcRenderer.removeAllListeners('gemini:generation-complete');
        ipcRenderer.removeAllListeners('gemini:go-away');
        ipcRenderer.removeAllListeners('gemini:tool-use');
        ipcRenderer.removeAllListeners('gemini:perform-action');
        ipcRenderer.removeAllListeners('gemini:browser-action');
    },

    // Agent Actions (Renderer execution)
    onGeminiPerformAction: (callback: (action: { id: string, name: string, args: any }) => void) =>
        ipcRenderer.on('gemini:perform-action', (_event, action) => callback(action)),

    sendGeminiToolResponse: (id: string, name: string, result: any) =>
        ipcRenderer.send('gemini:tool-response', { id, name, result }),

    setActiveWebContents: (webContentsId: number) => ipcRenderer.send('gemini:set-active-web-contents', webContentsId),

    // --- Browser Agent V2 ---
    startBrowserAgent: (task: string, zeroClickMode?: boolean) => ipcRenderer.invoke('browser-agent:start', task, zeroClickMode),
    stopBrowserAgent: () => ipcRenderer.invoke('browser-agent:stop'),

    // Terminal Execution (Agentic Document Generation)
    executeTerminal: (command: string, timeoutMs?: number) => ipcRenderer.invoke('terminal:execute', command, timeoutMs),
    getWorkspacePath: () => ipcRenderer.invoke('terminal:get-workspace'),
    listWorkspaceFiles: () => ipcRenderer.invoke('terminal:list-files'),
    readWorkspaceFile: (filename: string) => ipcRenderer.invoke('terminal:read-file', filename),
    pipInstall: (packages: string) => ipcRenderer.invoke('terminal:pip-install', packages),

    on: (channel: string, listener: (...args: any[]) => void) => {
        // Safe whitelist for specific channels or generic
        const validChannels = ['agent:log', 'agent:status', 'agent:step'];
        if (validChannels.includes(channel)) {
            const wrappedListener = (_event: any, ...args: any[]) => listener.apply(null, args);
            ipcRenderer.on(channel, wrappedListener);
            return () => {
                ipcRenderer.removeListener(channel, wrappedListener);
            };
        }
        // For non-whitelisted channels, return a no-op cleanup function
        return () => { };
    }
})

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
contextBridge.exposeInMainWorld('chromeEmulation', {
    getScript: () => CHROME_EMULATION_SCRIPT
});
