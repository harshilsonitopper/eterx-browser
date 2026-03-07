/// <reference types="vite/client" />

declare global {
    interface Window {
        electron: {
            minimize: () => void;
            maximize: () => void;
            close: () => void;
            fullscreen: () => void;
            saveSession: (tabs: any) => Promise<boolean>;
            loadSession: () => Promise<any[] | null>;
            generateAIContent: (prompt: string, model?: string, apiKey?: string) => Promise<string>;
            analyzeImage: (prompt: string, imageBase64: string, mimeType: string, apiKey?: string) => Promise<string>;
            generateDeepThinking: (prompt: string, model?: string, apiKey?: string) => Promise<string>;

            // Gemini Live - Core
            sendAudioChunk: (chunk: Float32Array) => void;
            sendRealtimeInput: (part: { mimeType: string; data: string }) => void;
            sendAudioStreamEnd: () => void;
            connectGeminiLive: (apiKey: string) => void;
            disconnectGeminiLive: () => void;
            clearGeminiSession: () => void;

            // Gemini Live - Audio Response
            onGeminiAudio: (callback: (data: { audio: string }) => void) => void;

            // Gemini Live - Status (Auto Key Rotation)
            onGeminiStatus: (callback: (data: {
                status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
                keyStatus?: { total: number; healthy: number; currentIndex: number };
                message?: string;
                attempt?: number;
                keyIndex?: number;
            }) => void) => void;
            getGeminiKeyStatus: () => Promise<{ total: number; healthy: number; currentIndex: number; keys: { index: number; healthy: boolean; errorCount: number }[] }>;
            getGeminiSessionInfo: () => Promise<{
                isConnected: boolean;
                hasResumptionHandle: boolean;
                sessionExpireTime: number;
                canResume: boolean;
                keyStatus: { total: number; healthy: number; currentIndex: number };
            }>;

            // Gemini Live - Transcription
            onGeminiInputTranscription: (callback: (text: string) => void) => void;
            onGeminiOutputTranscription: (callback: (text: string) => void) => void;

            // Gemini Live - Thinking Mode
            onGeminiThought: (callback: (thought: string) => void) => void;

            // Gemini Live - Events
            onGeminiInterrupted: (callback: () => void) => void;
            onGeminiToolUse: (callback: () => void) => void;
            onGeminiGenerationComplete: (callback: () => void) => void;
            onGeminiGoAway: (callback: (data: { timeLeft: number }) => void) => void;

            // Browser Actions (Agentic Control)
            onGeminiBrowserAction: (callback: (data: { name: string; args: any; id: string }) => void) => void;
            sendBrowserActionResult: (data: { id: string; result: any }) => void;


            // Gemini Live - Cleanup
            removeGeminiListeners: () => void;

            // YouTube Summarization with timestamps
            summarizeYouTube: (videoInfo: { title: string; channelName: string; description: string; transcript: string }) => Promise<string>;
            // Fast Page Analysis
            analyzePage: (question: string, pageContext: string, pageUrl?: string) => Promise<string>;
            // Google OAuth
            googleSignIn: () => Promise<any>;
            // Gemini Live - Agent Actions
            onGeminiPerformAction: (callback: (action: { id: string, name: string, args: any }) => void) => void;
            sendGeminiToolResponse: (id: string, name: string, result: any) => void;
            setActiveWebContents: (webContentsId: number) => void;
            sendClientContent: (text: string) => void;
        };
        ipcRenderer: {
            send(channel: string, ...args: any[]): void;
            on(channel: string, func: (...args: any[]) => void): void;
            once(channel: string, func: (...args: any[]) => void): void;
            removeListener(channel: string, func: (...args: any[]) => void): void;
            invoke(channel: string, ...args: any[]): Promise<any>;
        };
    }
}
