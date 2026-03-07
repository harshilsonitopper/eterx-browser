import { SoundService } from './SoundService';

declare global {
    interface Window {
        electron: any;
    }
}

/**
 * GeminiLiveService.ts — REBUILT FROM SCRATCH
 * 
 * Clean, robust Gemini Live audio connection system.
 * Features:
 *   - Reference-counted connection lifecycle
 *   - Sticky session with delayed disconnect (4s)
 *   - Auto-reconnect with exponential backoff (max 3 attempts)
 *   - Buffered audio playback with precision scheduling
 *   - Full event system (status, audio, error, transcription, tools, connection events)
 *   - Session metadata tracking (model, duration, chunks, tool calls)
 *   - Tool call history for dashboard visibility
 *   - Connection event history for debugging
 */

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type GeminiLiveStatus =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'reconnecting'
    | 'speaking'
    | 'listening'
    | 'agentic'
    | 'error';

export interface GeminiKeyStatus {
    total: number;
    healthy: number;
    currentIndex: number;
    keys: { index: number; healthy: boolean; errorCount: number }[];
}

export interface ToolCallEvent {
    id: string;
    name: string;
    args: any;
    timestamp: number;
    status: 'pending' | 'completed' | 'error';
    result?: string;
}

export interface ConnectionEvent {
    type: 'connect' | 'disconnect' | 'error' | 'reconnect' | 'auto-reconnect';
    timestamp: number;
    message?: string;
    keyIndex?: number;
}

export interface SessionMetadata {
    model: string;
    connectedAt: number | null;
    disconnectedAt: number | null;
    chunksReceived: number;
    chunksSent: number;
    toolCallsTotal: number;
    reconnectAttempts: number;
}

export interface TranscriptEntry {
    text: string;
    type: 'user' | 'ai' | 'thought';
    timestamp: number;
}

// ─────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────

class GeminiLiveServiceClass {
    // === PUBLIC STATE ===
    public isActive = false;
    public currentStatus: GeminiLiveStatus = 'disconnected';
    public sessionMeta: SessionMetadata = this.freshMeta();
    public toolCallHistory: ToolCallEvent[] = [];
    public connectionHistory: ConnectionEvent[] = [];
    public transcriptLog: TranscriptEntry[] = [];
    public keyStatus: GeminiKeyStatus | null = null;

    // === PRIVATE STATE ===
    private isMuted = false;
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;
    private audioSource: MediaStreamAudioSourceNode | null = null;
    private connectionRefs = 0;
    private disconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private autoReconnectAttempts = 0;
    private isConnecting = false;
    private listenersSetup = false;

    // Audio playback state
    private isPlaying = false;
    private nextPlayTime = 0;
    private activeSources: AudioBufferSourceNode[] = [];
    private audioQueue: string[] = [];
    private isBuffering = false;
    private readonly MIN_BUFFER_CHUNKS = 3;

    // === EVENT SYSTEM ===
    private listeners = {
        status: [] as ((status: GeminiLiveStatus) => void)[],
        audioLevel: [] as ((level: number) => void)[],
        error: [] as ((error: string) => void)[],
        toolCall: [] as ((event: ToolCallEvent) => void)[],
        connectionEvent: [] as ((event: ConnectionEvent) => void)[],
        transcript: [] as ((entry: TranscriptEntry) => void)[],
        keyStatus: [] as ((status: GeminiKeyStatus) => void)[],
    };

    // ─── CONSTRUCTOR ──────────────────────────

    constructor() {
        this.initAudioContext();
    }

    private freshMeta(): SessionMetadata {
        return {
            model: 'gemini-2.5-flash-preview-native-audio-dialog',
            connectedAt: null,
            disconnectedAt: null,
            chunksReceived: 0,
            chunksSent: 0,
            toolCallsTotal: 0,
            reconnectAttempts: 0,
        };
    }

    // ─── EVENT MANAGEMENT ─────────────────────

    // Status
    public addStatusListener(cb: (s: GeminiLiveStatus) => void) { this.listeners.status.push(cb); }
    public removeStatusListener(cb: (s: GeminiLiveStatus) => void) { this.listeners.status = this.listeners.status.filter(c => c !== cb); }

    // Audio Level
    public addAudioLevelListener(cb: (l: number) => void) { this.listeners.audioLevel.push(cb); }
    public removeAudioLevelListener(cb: (l: number) => void) { this.listeners.audioLevel = this.listeners.audioLevel.filter(c => c !== cb); }

    // Error
    public addErrorListener(cb: (e: string) => void) { this.listeners.error.push(cb); }
    public removeErrorListener(cb: (e: string) => void) { this.listeners.error = this.listeners.error.filter(c => c !== cb); }

    // Tool Calls
    public addToolCallListener(cb: (e: ToolCallEvent) => void) { this.listeners.toolCall.push(cb); }
    public removeToolCallListener(cb: (e: ToolCallEvent) => void) { this.listeners.toolCall = this.listeners.toolCall.filter(c => c !== cb); }

    // Connection Events
    public addConnectionEventListener(cb: (e: ConnectionEvent) => void) { this.listeners.connectionEvent.push(cb); }
    public removeConnectionEventListener(cb: (e: ConnectionEvent) => void) { this.listeners.connectionEvent = this.listeners.connectionEvent.filter(c => c !== cb); }

    // Transcription
    public addTranscriptListener(cb: (e: TranscriptEntry) => void) { this.listeners.transcript.push(cb); }
    public removeTranscriptListener(cb: (e: TranscriptEntry) => void) { this.listeners.transcript = this.listeners.transcript.filter(c => c !== cb); }

    // Key Status
    public addKeyStatusListener(cb: (s: GeminiKeyStatus) => void) { this.listeners.keyStatus.push(cb); }
    public removeKeyStatusListener(cb: (s: GeminiKeyStatus) => void) { this.listeners.keyStatus = this.listeners.keyStatus.filter(c => c !== cb); }

    // Legacy setters (backward compat)
    set onStatusChange(cb: ((s: GeminiLiveStatus) => void) | null) { this.listeners.status = cb ? [cb] : []; }
    set onAudioLevel(cb: ((l: number) => void) | null) { this.listeners.audioLevel = cb ? [cb] : []; }
    set onError(cb: ((e: string) => void) | null) { this.listeners.error = cb ? [cb] : []; }

    // Transcription listeners (legacy compat)
    private _inputTranscriptionListeners: ((text: string) => void)[] = [];
    private _outputTranscriptionListeners: ((text: string) => void)[] = [];
    public addInputTranscriptionListener(cb: (text: string) => void) { this._inputTranscriptionListeners.push(cb); }
    public removeInputTranscriptionListener(cb: (text: string) => void) { this._inputTranscriptionListeners = this._inputTranscriptionListeners.filter(c => c !== cb); }
    public addOutputTranscriptionListener(cb: (text: string) => void) { this._outputTranscriptionListeners.push(cb); }
    public removeOutputTranscriptionListener(cb: (text: string) => void) { this._outputTranscriptionListeners = this._outputTranscriptionListeners.filter(c => c !== cb); }

    // Emitters
    private emitStatus(status: GeminiLiveStatus) {
        this.currentStatus = status;
        this.listeners.status.forEach(cb => cb(status));
    }
    private emitAudioLevel(level: number) { this.listeners.audioLevel.forEach(cb => cb(level)); }
    private emitError(error: string) { this.listeners.error.forEach(cb => cb(error)); }

    private addTranscript(text: string, type: TranscriptEntry['type']) {
        const entry: TranscriptEntry = { text, type, timestamp: Date.now() };
        this.transcriptLog.push(entry);
        if (this.transcriptLog.length > 200) this.transcriptLog.shift();
        this.listeners.transcript.forEach(cb => cb(entry));
    }

    private addConnectionEvent(type: ConnectionEvent['type'], message?: string, keyIndex?: number) {
        const event: ConnectionEvent = { type, timestamp: Date.now(), message, keyIndex };
        this.connectionHistory.push(event);
        if (this.connectionHistory.length > 100) this.connectionHistory.shift();
        this.listeners.connectionEvent.forEach(cb => cb(event));
    }

    // ─── AUDIO CONTEXT ────────────────────────

    private initAudioContext() {
        try {
            const AC = window.AudioContext || (window as any).webkitAudioContext;
            this.audioContext = new AC();
        } catch (e) {
            console.error('[GeminiLive] Failed to create AudioContext');
        }
    }

    // ─── CONNECT ──────────────────────────────

    async connect() {
        // Cancel any pending disconnect (Sticky Session)
        if (this.disconnectTimeout) {
            console.log('[GeminiLive] 🍯 Sticky: Cancel pending disconnect');
            clearTimeout(this.disconnectTimeout);
            this.disconnectTimeout = null;
        }

        this.connectionRefs++;
        console.log(`[GeminiLive] Connect (refs: ${ this.connectionRefs })`);

        // Already connected
        if (this.isActive) {
            this.emitStatus('connected');
            return;
        }

        // Already connecting
        if (this.isConnecting) {
            this.emitStatus('connecting');
            return;
        }

        console.log('[GeminiLive] 🔌 Starting new connection...');
        this.isConnecting = true;
        this.emitStatus('connecting');
        this.addConnectionEvent('connect', 'Initiating connection');

        try {
            // 1. Microphone
            await this.startMicrophone();

            // 2. IPC listeners
            this.setupIPCListeners();

            // 3. Connect via main process (which handles key rotation)
            window.electron.connectGeminiLive('');

            console.log('[GeminiLive] ✅ Connection initiated');
        } catch (e: any) {
            console.error('[GeminiLive] ❌ Connection failed:', e);
            this.emitError(e.message || 'Connection failed');
            this.emitStatus('error');
            this.isConnecting = false;
            this.addConnectionEvent('error', e.message);
            this.cleanup();
        }
    }

    // ─── DISCONNECT ───────────────────────────

    disconnect() {
        if (this.connectionRefs <= 0) {
            this.connectionRefs = 0;
            return;
        }

        this.connectionRefs--;
        console.log(`[GeminiLive] Disconnect (refs: ${ this.connectionRefs })`);

        if (this.connectionRefs > 0) {
            console.log('[GeminiLive] Still used by other components');
            return;
        }

        // Sticky disconnect: wait 4s before actually killing session
        console.log('[GeminiLive] ⏳ Waiting 4s before disconnect...');
        this.disconnectTimeout = setTimeout(() => {
            console.log('[GeminiLive] 🛑 Disconnecting');
            this.sessionMeta.disconnectedAt = Date.now();
            this.cleanup();
            window.electron.disconnectGeminiLive();
            this.emitStatus('disconnected');
            this.addConnectionEvent('disconnect', 'Session ended');
            this.disconnectTimeout = null;
        }, 4000);
    }

    // Force disconnect (no delay)
    public forceDisconnect() {
        if (this.disconnectTimeout) {
            clearTimeout(this.disconnectTimeout);
            this.disconnectTimeout = null;
        }
        this.connectionRefs = 0;
        this.sessionMeta.disconnectedAt = Date.now();
        this.cleanup();
        window.electron.disconnectGeminiLive();
        this.emitStatus('disconnected');
        this.addConnectionEvent('disconnect', 'Force disconnected');
    }

    // Clear session (destroy and allow fresh connect)
    public clearSession() {
        this.forceDisconnect();
        if (window.electron?.clearGeminiSession) {
            window.electron.clearGeminiSession();
        }
        this.sessionMeta = this.freshMeta();
        this.toolCallHistory = [];
        this.transcriptLog = [];
        this.addConnectionEvent('disconnect', 'Session cleared');
    }

    // ─── MUTE CONTROL ─────────────────────────

    public setMuted(muted: boolean) {
        this.isMuted = muted;
        console.log(`[GeminiLive] 🎤 Muted: ${ muted }`);
    }

    public toggleMuted(): boolean {
        this.isMuted = !this.isMuted;
        console.log(`[GeminiLive] 🎤 Toggle: ${ this.isMuted }`);
        return this.isMuted;
    }

    public getMuted(): boolean { return this.isMuted; }

    // ─── INTERRUPT ────────────────────────────

    public interrupt() {
        console.log('[GeminiLive] ✋ Manual Interrupt');
        this.stopAudioPlayback();
        this.emitStatus('listening');
    }

    // ─── SCREEN CONTEXT ───────────────────────

    public sendScreenContext(base64Image: string) {
        if (!this.isActive) return;

        let base64Data = base64Image;
        if (base64Data.includes(',')) {
            base64Data = base64Data.split(',')[1];
        }

        if (!base64Data || base64Data.length < 100) return;

        if (window.electron?.sendRealtimeInput) {
            window.electron.sendRealtimeInput({ mimeType: 'image/jpeg', data: base64Data });
            console.log(`[GeminiLive] 📸 Screenshot (${ Math.round(base64Data.length / 1024) }KB)`);
        }
    }

    // ─── RESUME AUDIO CONTEXT ─────────────────

    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            console.log('[GeminiLive] ▶️ AudioContext resumed');
        }
    }

    // ─── MICROPHONE ───────────────────────────

    private async startMicrophone() {
        if (this.mediaStream) {
            console.log('[GeminiLive] Mic already active');
            return;
        }

        console.log('[GeminiLive] 🎤 Requesting microphone...');

        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true }
            });
        } catch {
            console.warn('[GeminiLive] ⚠️ Preferred mic failed, fallback to default');
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        if (!this.audioContext) this.initAudioContext();
        if (!this.audioContext) throw new Error('No AudioContext');

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        this.audioSource = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

        this.processor.onaudioprocess = (e) => {
            if (!this.isActive || !this.processor || this.isMuted) return;

            const input = e.inputBuffer.getChannelData(0);

            // Noise gate
            if (Math.max(...input) < 0.001) return;

            // Emit audio level for visualizers
            this.emitAudioLevel(Math.max(...input));

            // Downsample & send
            const downsampled = this.downsampleTo16k(input, this.audioContext!.sampleRate);
            window.electron.sendAudioChunk(downsampled);
            this.sessionMeta.chunksSent++;
        };

        this.audioSource.connect(this.processor);
        this.processor.connect(this.audioContext.destination);
        console.log('[GeminiLive] ✅ Microphone ready');
    }

    private downsampleTo16k(input: Float32Array, inputRate: number): Float32Array {
        if (inputRate === 16000) return input;
        const ratio = inputRate / 16000;
        const newLength = Math.ceil(input.length / ratio);
        const result = new Float32Array(newLength);
        for (let i = 0; i < newLength; i++) {
            const index = i * ratio;
            const left = Math.floor(index);
            const right = Math.min(Math.ceil(index), input.length - 1);
            const frac = index - left;
            result[i] = input[left] + (input[right] - input[left]) * frac;
        }
        return result;
    }

    // ─── IPC LISTENERS ────────────────────────

    private setupIPCListeners() {
        if (this.listenersSetup) return;
        this.listenersSetup = true;

        // Status updates from main process
        window.electron.onGeminiStatus((data: any) => {
            console.log('[GeminiLive] Status:', data.status);

            // Update key status if available
            if (data.keyStatus) {
                this.keyStatus = data.keyStatus;
                this.listeners.keyStatus.forEach(cb => cb(data.keyStatus));
            }

            switch (data.status) {
                case 'connected':
                    this.isActive = true;
                    this.isConnecting = false;
                    this.autoReconnectAttempts = 0;
                    this.sessionMeta.connectedAt = Date.now();
                    this.sessionMeta.disconnectedAt = null;
                    this.addConnectionEvent('connect', `Connected (Key ${ (data.keyIndex || '?') })`, data.keyIndex);
                    this.emitStatus('connected');
                    break;

                case 'error':
                    this.isActive = false;
                    this.isConnecting = false;
                    this.emitError(data.message || 'Error');
                    this.emitStatus('error');
                    this.addConnectionEvent('error', data.message || 'Unknown error');

                    // Auto-reconnect
                    if (this.connectionRefs > 0 && this.autoReconnectAttempts < 3) {
                        this.autoReconnectAttempts++;
                        this.sessionMeta.reconnectAttempts++;
                        const delay = 500 * this.autoReconnectAttempts;
                        console.log(`[GeminiLive] 🔄 Auto-reconnect #${ this.autoReconnectAttempts } in ${ delay }ms`);
                        this.addConnectionEvent('auto-reconnect', `Attempt ${ this.autoReconnectAttempts }`);
                        setTimeout(() => this.connect(), delay);
                    }
                    break;

                case 'disconnected':
                    this.isActive = false;
                    this.isConnecting = false;
                    this.sessionMeta.disconnectedAt = Date.now();
                    this.emitStatus('disconnected');

                    // Unexpected disconnect — try reconnect
                    if (this.connectionRefs > 0 && this.autoReconnectAttempts < 3) {
                        this.autoReconnectAttempts++;
                        this.sessionMeta.reconnectAttempts++;
                        console.log(`[GeminiLive] 🔄 Auto-reconnect after drop #${ this.autoReconnectAttempts }`);
                        this.addConnectionEvent('auto-reconnect', `Drop recovery #${ this.autoReconnectAttempts }`);
                        setTimeout(() => this.connect(), 500 * this.autoReconnectAttempts);
                    }
                    break;

                case 'agentic':
                    this.emitStatus('agentic');
                    break;
            }
        });

        // Audio responses
        window.electron.onGeminiAudio((data: { audio: string }) => {
            this.sessionMeta.chunksReceived++;
            this.enqueueAudio(data.audio);
        });

        // Interruptions
        if (typeof window.electron.onGeminiInterrupted === 'function') {
            window.electron.onGeminiInterrupted(() => {
                console.log('[GeminiLive] 🛑 Interrupted');
                this.forceListening();
            });
        }

        // Tool use sound
        if (typeof window.electron.onGeminiToolUse === 'function') {
            window.electron.onGeminiToolUse(() => {
                SoundService.playSearchSound();
            });
        }

        // Transcriptions
        if (window.electron.onGeminiInputTranscription) {
            window.electron.onGeminiInputTranscription((text: string) => {
                this._inputTranscriptionListeners.forEach(cb => cb(text));
                this.addTranscript(text, 'user');
            });
        }
        if (window.electron.onGeminiOutputTranscription) {
            window.electron.onGeminiOutputTranscription((text: string) => {
                this._outputTranscriptionListeners.forEach(cb => cb(text));
                this.addTranscript(text, 'ai');
            });
        }

        // Thoughts
        if (window.electron.onGeminiThought) {
            window.electron.onGeminiThought((thought: string) => {
                this.addTranscript(thought, 'thought');
            });
        }

        // Generation complete
        if (typeof window.electron.onGeminiGenerationComplete === 'function') {
            window.electron.onGeminiGenerationComplete(() => {
                this.forceListening();
            });
        }

        // Browser actions (tool call tracking)
        if (window.electron.onGeminiBrowserAction) {
            window.electron.onGeminiBrowserAction((data: { name: string; args: any; id: string }) => {
                this.trackToolCall(data.id, data.name, data.args);
            });
        }
    }

    private forceListening() {
        this.stopAudioPlayback();
        this.emitStatus('listening');
    }

    // ─── TOOL CALL TRACKING ───────────────────

    public trackToolCall(id: string, name: string, args: any) {
        const event: ToolCallEvent = { id, name, args, timestamp: Date.now(), status: 'pending' };
        this.toolCallHistory.push(event);
        if (this.toolCallHistory.length > 100) this.toolCallHistory.shift();
        this.sessionMeta.toolCallsTotal++;
        this.listeners.toolCall.forEach(cb => cb(event));
    }

    public completeToolCall(id: string, result?: string) {
        const evt = this.toolCallHistory.find(e => e.id === id);
        if (evt) {
            evt.status = 'completed';
            evt.result = result;
            this.listeners.toolCall.forEach(cb => cb(evt));
        }
    }

    // ─── AUDIO PLAYBACK (Buffered & Scheduled) ─

    private enqueueAudio(base64: string) {
        this.audioQueue.push(base64);
        if (!this.isPlaying && !this.isBuffering) {
            this.processAudioQueue();
        }
    }

    private async processAudioQueue() {
        if (!this.audioContext || this.audioQueue.length === 0) return;

        // Startup buffering
        if (!this.isPlaying && this.audioQueue.length < this.MIN_BUFFER_CHUNKS) {
            this.isBuffering = true;
            setTimeout(() => this.processAudioQueue(), 50);
            return;
        }

        this.isBuffering = false;
        while (this.audioQueue.length > 0) {
            const b64 = this.audioQueue.shift();
            if (b64) await this.scheduleAudioChunk(b64);
        }
    }

    private async scheduleAudioChunk(base64: string) {
        if (!this.audioContext) return;

        try {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

            const pcm16 = new Int16Array(bytes.buffer);
            const audioBuffer = this.audioContext.createBuffer(1, pcm16.length, 24000);
            const channelData = audioBuffer.getChannelData(0);
            for (let i = 0; i < pcm16.length; i++) channelData[i] = pcm16[i] / 32768;

            if (this.audioContext.state === 'suspended') await this.audioContext.resume();

            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);

            const now = this.audioContext.currentTime;
            if (this.nextPlayTime < now) this.nextPlayTime = now + 0.05;

            source.start(this.nextPlayTime);
            this.activeSources.push(source);
            this.nextPlayTime += audioBuffer.duration;

            if (!this.isPlaying) {
                this.isPlaying = true;
                this.emitStatus('speaking');
            }

            source.onended = () => {
                this.activeSources = this.activeSources.filter(s => s !== source);
                if (this.activeSources.length === 0 && this.audioQueue.length === 0) {
                    this.isPlaying = false;
                    this.nextPlayTime = 0;
                    if (this.isActive) this.emitStatus('listening');
                }
            };
        } catch (e) {
            console.error('[GeminiLive] Audio playback error:', e);
        }
    }

    private stopAudioPlayback() {
        this.activeSources.forEach(s => { try { s.stop(); s.disconnect(); } catch { } });
        this.activeSources = [];
        this.audioQueue = [];
        this.isPlaying = false;
        this.isBuffering = false;
        this.nextPlayTime = 0;
    }

    // ─── CLEANUP ──────────────────────────────

    private cleanup() {
        this.isActive = false;
        this.listenersSetup = false;
        this.stopAudioPlayback();

        if (this.processor) {
            this.processor.onaudioprocess = null;
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.audioSource) {
            this.audioSource.disconnect();
            this.audioSource = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(t => t.stop());
            this.mediaStream = null;
        }
        if (this.audioContext && this.audioContext.state === 'running') {
            this.audioContext.suspend().catch(() => { });
        }
        if (typeof window.electron.removeGeminiListeners === 'function') {
            window.electron.removeGeminiListeners();
        }
    }

    // ─── ASYNC KEY STATUS ─────────────────────

    public async fetchKeyStatus(): Promise<GeminiKeyStatus | null> {
        try {
            if (window.electron?.getGeminiKeyStatus) {
                const status = await window.electron.getGeminiKeyStatus();
                this.keyStatus = status;
                this.listeners.keyStatus.forEach(cb => cb(status));
                return status;
            }
        } catch { }
        return null;
    }

    public async fetchSessionInfo(): Promise<any> {
        try {
            if (window.electron?.getGeminiSessionInfo) {
                return await window.electron.getGeminiSessionInfo();
            }
        } catch { }
        return null;
    }

    // ─── PUBLIC GETTERS ───────────────────────

    get connected(): boolean { return this.isActive; }

    public getConnectedDuration(): number {
        if (!this.sessionMeta.connectedAt) return 0;
        const end = this.sessionMeta.disconnectedAt || Date.now();
        return end - this.sessionMeta.connectedAt;
    }
}

// Singleton export
export const GeminiLiveService = new GeminiLiveServiceClass();
export { GeminiLiveServiceClass as GeminiLiveServiceFormatted };
