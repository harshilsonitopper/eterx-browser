export { };

declare global {
    interface Window {
        ipcRenderer: {
            send(channel: string, ...args: any[]): void;
            on(channel: string, func: (...args: any[]) => void): void;
            once(channel: string, func: (...args: any[]) => void): void;
            removeListener(channel: string, func: (...args: any[]) => void): void;
            invoke(channel: string, ...args: any[]): Promise<any>;
        };
        electron: {
            minimize: () => void;
            maximize: () => void;
            close: () => void;
            fullscreen: () => void;
            saveSession: (tabs: any) => Promise<boolean>;
            loadSession: () => Promise<any[]>;
            saveMemorySnapshot: (data: any) => Promise<any>;
            loadMemorySnapshot: () => Promise<any>;
            generateAIContent: (prompt: string, model?: string, apiKey?: string) => Promise<any>;
            analyzeImage: (prompt: string, imageBase64: string, mimeType: string) => Promise<any>;
            generateDeepThinking: (prompt: string) => Promise<any>;
            summarizeYouTube: (videoInfo: any) => Promise<any>;
            seekYouTube: (seconds: number) => Promise<any>;
            analyzePage: (question: string, pageContext: string, pageUrl?: string) => Promise<any>;
            googleSignIn: () => Promise<any>;
            // Gemini Live
            sendAudioChunk: (chunk: Float32Array) => void;
            sendRealtimeInput: (part: { mimeType: string; data: string }) => void;
            sendClientContent: (text: string) => void;
            sendAudioStreamEnd: () => void;
            connectGeminiLive: (apiKey: string) => void;
            disconnectGeminiLive: () => void;
            clearGeminiSession: () => void;
            onGeminiAudio: (callback: (data: { audio: string }) => void) => void;
            onGeminiToolUse: (callback: () => void) => void;
            onGeminiStatus: (callback: (data: { status: string; keyStatus?: any; message?: string; attempt?: number }) => void) => void;
            getGeminiKeyStatus: () => Promise<any>;
            getGeminiSessionInfo: () => Promise<any>;
            onGeminiInputTranscription: (callback: (text: string) => void) => void;
            onGeminiOutputTranscription: (callback: (text: string) => void) => void;
            onGeminiThought: (callback: (thought: string) => void) => void;
            onGeminiInterrupted: (callback: () => void) => void;
            onGeminiGenerationComplete: (callback: () => void) => void;
            onGeminiGoAway: (callback: (data: { timeLeft: number }) => void) => void;
            // Browser Actions (Agentic Control)
            onGeminiBrowserAction: (callback: (data: { name: string; args: any; id: string }) => void) => void;
            sendBrowserActionResult: (data: { id: string; result: any }) => void;

            removeGeminiListeners: () => void;
            onGeminiPerformAction: (callback: (action: { id: string; name: string; args: any }) => void) => void;
            sendGeminiToolResponse: (id: string, name: string, result: any) => void;
            setActiveWebContents: (webContentsId: number) => void;
            // Terminal Execution (Document Generation)
            executeTerminal: (command: string, timeoutMs?: number) => Promise<{ success: boolean; stdout: string; stderr: string; exitCode: number; killed: boolean }>;
            getWorkspacePath: () => Promise<string>;
            listWorkspaceFiles: () => Promise<{ success: boolean; files: { name: string; size: number; modified: string }[]; error?: string }>;
            readWorkspaceFile: (filename: string) => Promise<{ success: boolean; data?: string; mimeType?: string; size?: number; error?: string }>;
            pipInstall: (packages: string) => Promise<{ success: boolean; stdout: string; stderr: string; error?: string }>;
        };
    }
}
