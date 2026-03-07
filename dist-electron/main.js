console.log('[Main] 🟢 MAIN PROCESS STARTING - v2.1 CHECKPOINT');
import { app, BrowserWindow, shell, ipcMain, webContents, Menu, nativeImage, clipboard, powerSaveBlocker } from 'electron';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Modality, Type, StartSensitivity, EndSensitivity } from '@google/genai';
import { BrowserAgentService } from './BrowserAgentService.js';
import { NextGenAgent } from './agent/NextGenAgent.js'; // Next-Gen Agent
// import { CDPManager } from './CDPManager.js'; // REMOVED per user request
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// =============================================================================
// GLOBAL STATE & CONSTANTS
// =============================================================================
// User Agent for Chrome Emulation
const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
// Session Persistence File
const SESSION_FILE = path.join(app.getPath('userData'), 'session.json');
// =============================================================================
// LOCAL FILE SERVER (serves temp files to WebView via HTTP)
// =============================================================================
const ETERX_TEMP_DIR = path.join(app.getPath('temp'), 'eterx-preview');
if (!fs.existsSync(ETERX_TEMP_DIR))
    fs.mkdirSync(ETERX_TEMP_DIR, { recursive: true });
// Simple MIME type map for common file types
const MIME_MAP = {
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.csv': 'text/csv',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
};
let localFileServerPort = 0; // Will be assigned when server starts
const localFileServer = http.createServer((req, res) => {
    try {
        const urlPath = decodeURIComponent(req.url || '/');
        // Security: only serve files from our temp directory
        const filePath = path.join(ETERX_TEMP_DIR, path.basename(urlPath));
        if (!filePath.startsWith(ETERX_TEMP_DIR)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }
        if (!fs.existsSync(filePath)) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const mime = MIME_MAP[ext] || 'application/octet-stream';
        const stat = fs.statSync(filePath);
        res.writeHead(200, {
            'Content-Type': mime,
            'Content-Length': stat.size,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
        });
        fs.createReadStream(filePath).pipe(res);
    }
    catch (err) {
        console.error('[LocalFileServer] Error:', err);
        res.writeHead(500);
        res.end('Internal Server Error');
    }
});
// Start on a random available port
localFileServer.listen(0, '127.0.0.1', () => {
    const addr = localFileServer.address();
    if (addr && typeof addr === 'object') {
        localFileServerPort = addr.port;
        console.log(`[Main] 📁 Local File Server started on http://127.0.0.1:${localFileServerPort}`);
    }
});
// =============================================================================
// PERFORMANCE FLAGS (CHROMIUM SPEED TUNING)
// =============================================================================
// GPU & Rendering Acceleration
app.commandLine.appendSwitch('enable-gpu-rasterization'); // Force GPU for content
app.commandLine.appendSwitch('ignore-gpu-blacklist'); // Force enable GPU
app.commandLine.appendSwitch('enable-accelerated-2d-canvas'); // Fast 2D rendering
app.commandLine.appendSwitch('enable-oop-rasterization'); // Out-of-process rasterization
app.commandLine.appendSwitch('enable-zero-copy'); // Faster rasterizer
app.commandLine.appendSwitch('ignore-gpu-blocklist'); // Unlock GPU features
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers'); // Direct GPU memory access
app.commandLine.appendSwitch('no-sandbox'); // Faster process launch
app.commandLine.appendSwitch('high-dpi-support', '1');
// WebGL & WebAssembly
app.commandLine.appendSwitch('enable-webgl'); // Ensure WebGL enabled
app.commandLine.appendSwitch('enable-webgl2-compute-context'); // WebGL2 compute
// Compositing & Rendering Pipeline
app.commandLine.appendSwitch('enable-features', 'ParallelDownloading,QUIC,HardwareMediaKeyHandling,VaapiVideoDecoder,CanvasOopRasterization,BackForwardCache,SmoothScrolling,WebAssemblyLazyCompilation,WebAssemblyTiering');
// Aggressive Performance & Quality Flags
app.commandLine.appendSwitch('disable-site-isolation-trials'); // Crucial for memory and speed
app.commandLine.appendSwitch('disable-metrics');
app.commandLine.appendSwitch('disable-metrics-system');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-default-apps');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('disable-translate');
app.commandLine.appendSwitch('disable-hang-monitor'); // Prevent false-positive "page unresponsive"
app.commandLine.appendSwitch('disable-domain-reliability'); // No telemetry
app.commandLine.appendSwitch('disable-client-side-phishing-detection'); // Speed over phishing detection
app.commandLine.appendSwitch('disable-component-update'); // No background updates
app.commandLine.appendSwitch('v8-cache-options', 'code'); // Faster JS Execution
app.commandLine.appendSwitch('enable-accelerated-video-decode'); // HW video decode
app.commandLine.appendSwitch('enable-accelerated-video-encode'); // HW video encode
app.commandLine.appendSwitch('enable-accelerated-mjpeg-decode'); // MJPEG acceleration
// Network & Loading Speed
app.commandLine.appendSwitch('enable-quic'); // QUIC protocol for faster connections
app.commandLine.appendSwitch('enable-parallel-downloading'); // Parallel resource downloads
app.commandLine.appendSwitch('enable-tcp-fast-open'); // Faster TCP connections
app.commandLine.appendSwitch('disable-background-timer-throttling'); // Keep timers fast in background
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows'); // Keep hidden tabs responsive
app.commandLine.appendSwitch('disable-renderer-backgrounding'); // Keep renderers fast
app.commandLine.appendSwitch('max-connections-per-host', '10'); // More parallel connections
app.commandLine.appendSwitch('enable-http2'); // Force HTTP/2
// Memory & Cache
app.commandLine.appendSwitch('enable-aggressive-domstorage-flushing'); // Fast DOM storage
app.commandLine.appendSwitch('disk-cache-size', '1073741824'); // 1GB disk cache (doubled)
app.commandLine.appendSwitch('media-cache-size', '268435456'); // 256MB media cache
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096 --expose-gc'); // V8 memory optimization
app.commandLine.appendSwitch('disable-ipc-flooding-protection'); // Bypass IPC bottlenecks
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,SpareRendererForSitePerProcess,MediaRouter,Translate,OptimizationHints');
// Permission Store & Persistence
const PERMISSIONS_FILE = path.join(app.getPath('userData'), 'permissions.json');
let permissionStore = {}; // { domain: { permission: boolean } }
// Active Downloads Tracker
const activeDownloads = new Map();
// Global Window Reference
let win;
let powerSaveId = null; // ⚡ Prevent OS from throttling when minimized
// =============================================================================
// =============================================================================
// AI CONFIGURATION - GOOGLE GEMINI API
// =============================================================================
import * as dotenv from 'dotenv';
dotenv.config();
// ============================================================================
// API CONFIGURATION - Supports up to 16 API Keys with Nested Model Fallback
// Add more keys in .env: VITE_API_KEY, VITE_API_KEY_2, ..., VITE_API_KEY_16
// Keys are auto-deduplicated so duplicate entries don't waste rotation slots
// ============================================================================
// All API Keys (load up to 16, deduplicated for max rotation efficiency)
const API_KEYS_RAW = [
    process.env.VITE_API_KEY,
    process.env.VITE_API_KEY_2,
    process.env.VITE_API_KEY_3,
    process.env.VITE_API_KEY_4,
    process.env.VITE_API_KEY_5,
    process.env.VITE_API_KEY_6,
    process.env.VITE_API_KEY_7,
    process.env.VITE_API_KEY_8,
    process.env.VITE_API_KEY_9,
    process.env.VITE_API_KEY_10,
    process.env.VITE_API_KEY_11,
    process.env.VITE_API_KEY_12,
    process.env.VITE_API_KEY_13,
    process.env.VITE_API_KEY_14,
    process.env.VITE_API_KEY_15,
    process.env.VITE_API_KEY_16
].filter(key => key && key.length > 0);
// Deduplicate — avoid wasting rotation slots on identical keys
const API_KEYS = [...new Set(API_KEYS_RAW)];
// Smart System Prompt — Deep Autonomous Agent
const SMART_SYSTEM_PROMPT = `You are ETERX — an elite autonomous AI agent embedded inside a web browser.You can SEE the screen, CLICK elements, TYPE text, NAVIGATE pages, and EXECUTE complex multi - step tasks completely on your own.

You are NOT a chatbot.You are a HUMAN - LEVEL browser operator.

═══ CORE IDENTITY ═══
- You continuously receive screenshots of the browser screen
  - You can read, analyze, and understand ANY webpage visually
    - You execute tasks by calling browser tools(click, type, navigate, scroll, etc.)
      - After each action, you SEE the updated screen and decide what to do next
        - You work fast, decisively, and autonomously until the task is COMPLETE

═══ AUTONOMOUS EXECUTION PROTOCOL ═══
1. ** PLAN **: When given a task, break it into steps mentally.Do NOT narrate every step unless asked.
2. ** EXECUTE **: Start taking actions immediately.Navigate, click, type — just do it.
3. ** OBSERVE **: After each action, analyze the screen to confirm it worked.If something changed, adapt.
4. ** CONTINUE **: Keep going step by step until the task is fully done.Do NOT stop to ask "should I continue?" unless you need personal information.
5. ** RETRY **: If an action fails, try a different approach:
- click_element failed ? Use click_coordinates instead
  - Page didn't load? Wait 2 seconds and try again
    - Element not visible ? Scroll down to find it
      - Wrong page ? Navigate back and try a different path
6. ** REPORT **: When done, briefly confirm what was accomplished.

═══ COMPLEX TASK EXAMPLES ═══
- "Post an Instagram story" → Open instagram.com → click + button → upload → add text → share → done
  - "Check email and reply" → Open gmail.com → click first unread → read it → click reply → compose → send
    - "Search for flights to NYC" → Go to Google Flights → enter dates → compare → report best options
      - "Tweet about AI" → Open twitter.com → click compose → type tweet → post
        - "Find a restaurant nearby" → Google Maps → search → compare ratings → report top 3

═══ VISION & SCREEN ANALYSIS ═══
- You receive periodic screenshots automatically — USE THEM to understand the current page
  - Use get_dom_tree to get detailed page structure and element IDs
    - Use take_full_page_screenshot for full - page analysis
      - When you see a login page, ASK the user for credentials — never guess
        - Read error messages, popups, and notifications from the screen

═══ INTERACTION RULES ═══
- ALWAYS speak English unless explicitly asked otherwise
  - Be concise — actions speak louder than words
    - For PERSONAL decisions(what to write, what to post), ASK the user for content
      - For NAVIGATION decisions(where to click, what to search), just DO IT
        - Never reveal passwords or sensitive data in responses
          - If a task involves money, ALWAYS confirm with the user before proceeding

═══ PERSONALITY ═══
Confident, efficient, slightly futuristic.You don't waste time explaining — you just GET IT DONE.
  `;
// Helper: Load/Save Persistence
function loadPermissions() {
    try {
        if (fs.existsSync(PERMISSIONS_FILE)) {
            permissionStore = JSON.parse(fs.readFileSync(PERMISSIONS_FILE, 'utf-8'));
        }
    }
    catch (e) {
        console.error('Failed to load permissions', e);
    }
}
function savePermissions() {
    try {
        fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(permissionStore, null, 2));
    }
    catch (e) {
        console.error('Failed to save permissions', e);
    }
}
// IPC Handlers for Permissions
ipcMain.handle('get-site-permissions', () => permissionStore);
ipcMain.handle('update-site-permission', (_, { origin, permission, allowed }) => {
    if (!permissionStore[origin])
        permissionStore[origin] = {};
    permissionStore[origin][permission] = allowed;
    savePermissions();
    return true;
});
// Gemini Key Manager - Handles smart key rotation with health tracking
class GeminiKeyManager {
    keys;
    currentIndex = 0;
    keyHealth = new Map();
    lastRotation = Date.now();
    COOLDOWN_MS = 60000; // 1 minute cooldown for exhausted keys
    MAX_ERRORS = 10; // High tolerance for transient errors
    constructor(keys) {
        this.keys = keys;
        keys.forEach((_, i) => this.keyHealth.set(i, {
            lastError: 0,
            errorCount: 0,
            exhausted: false,
            lastUsed: 0
        }));
        console.log(`[GeminiKeyManager] Initialized with ${keys.length} API keys`);
    }
    getNextKey() {
        const now = Date.now();
        // Try to find a healthy key starting from current index
        for (let attempt = 0; attempt < this.keys.length; attempt++) {
            const idx = (this.currentIndex + attempt) % this.keys.length;
            const health = this.keyHealth.get(idx);
            // Skip exhausted keys unless cooldown passed
            if (health.exhausted) {
                if ((now - health.lastError) < this.COOLDOWN_MS) {
                    console.log(`[GeminiKeyManager] Key ${idx + 1} still in cooldown(${Math.ceil((this.COOLDOWN_MS - (now - health.lastError)) / 1000)}s left)`);
                    continue;
                }
                // Reset if cooldown passed
                console.log(`[GeminiKeyManager] Key ${idx + 1} cooldown expired, resetting health`);
                health.exhausted = false;
                health.errorCount = 0;
            }
            // Found a healthy key
            this.currentIndex = (idx + 1) % this.keys.length;
            this.lastRotation = now;
            health.lastUsed = now;
            console.log(`[GeminiKeyManager] 🔑 Using Key ${idx + 1}/${this.keys.length}`);
            return { key: this.keys[idx], index: idx };
        }
        console.error('[GeminiKeyManager] ❌ All keys exhausted!');
        return null; // All keys exhausted
    }
    markError(index, errorType) {
        const health = this.keyHealth.get(index);
        if (!health)
            return;
        health.lastError = Date.now();
        health.errorCount++;
        // Immediately exhaust on quota errors
        if (errorType === 'quota' || errorType === 'rate_limit') {
            health.exhausted = true;
            console.log(`[GeminiKeyManager] 🚫 Key ${index + 1} marked EXHAUSTED (${errorType})`);
        }
        else if (health.errorCount >= this.MAX_ERRORS) {
            health.exhausted = true;
            console.log(`[GeminiKeyManager] 🚫 Key ${index + 1} marked EXHAUSTED (${health.errorCount} errors)`);
        }
        else {
            console.log(`[GeminiKeyManager] ⚠️ Key ${index + 1} error count: ${health.errorCount}/${this.MAX_ERRORS}`);
        }
    }
    markSuccess(index) {
        const health = this.keyHealth.get(index);
        if (health) {
            health.errorCount = 0;
            health.exhausted = false;
        }
    }
    getStatus() {
        const keysStatus = Array.from(this.keyHealth.entries()).map(([idx, h]) => ({
            index: idx,
            healthy: !h.exhausted,
            errorCount: h.errorCount
        }));
        const healthy = keysStatus.filter(k => k.healthy).length;
        return {
            total: this.keys.length,
            healthy,
            currentIndex: this.currentIndex,
            keys: keysStatus
        };
    }
    // Force rotate to next key (for proactive distribution)
    rotateKey() {
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        console.log(`[GeminiKeyManager] 🔄 Proactive rotation to Key ${this.currentIndex + 1}`);
    }
}
// Initialize Key Manager with all available API keys
const geminiKeyManager = new GeminiKeyManager(API_KEYS);
// Initialize Next-Gen Browser Agent (v2 — unified, 50+ tools, ReAct loop)
let browserAgent; // Keep legacy as fallback
let nextGenAgent;
try {
    console.log('[Main] 🤖 Initializing NextGenAgent (v2)...');
    const keysToUse = API_KEYS.length > 0 ? API_KEYS : [process.env.VITE_API_KEY || ''];
    if (!keysToUse[0])
        console.error('[Main] ❌ NO API KEY FOUND! Agent will not work.');
    nextGenAgent = new NextGenAgent(keysToUse);
    browserAgent = new BrowserAgentService(keysToUse); // Keep legacy as fallback
    console.log('[Main] ✅ NextGenAgent Initialized Successfully');
}
catch (e) {
    console.error('[Main] ❌ Failed to initialize Agent:', e);
}
// Legacy Deep Agent (deprecated)
// --- Computer Use Handlers (Moved to app.whenReady) ---
// console.log('[Main] 🔌 Registering Computer Use IPC Handlers...');
// ipcMain.handle('ping', () => {
//     console.log('[Main] 🏓 Pong from Main Process!');
//     return 'pong';
// });
// ipcMain.handle('computer-use:start', async (event, task) => {
//     // ... moved ...
// });
// ipcMain.handle('computer-use:stop', async () => {
//    // ... moved ...
// });
// Google GenAI SDK Session State
let geminiSession = null;
let geminiCurrentKeyIndex = -1;
let geminiEventSender = null;
let geminiIsConnecting = false; // Lock to prevent race conditions
let audioChunkCounter = 0; // Debug counter for audio chunks
const toolCallMap = new Map(); // Store tool ID -> Name mapping
let activeWebContentsId = null;
let originalWebContentsId = null;
let visionLoopInterval = null;
let isGhosting = false;
// Handle Active WebContents updates from renderer
ipcMain.on('gemini:set-active-web-contents', (event, id) => {
    // Don't override if we are in ghost mode (main window might still send focus events)
    if (isGhosting)
        return;
    activeWebContentsId = id;
    console.log(`[Gemini Live] 🎯 Active WebContents set to: ${id}`);
    if (activeWebContentsId && nextGenAgent) {
        nextGenAgent.setActiveWebContentsId(activeWebContentsId);
    }
    if (activeWebContentsId && browserAgent) {
        browserAgent.setActiveWebContentsId(activeWebContentsId);
    }
    // If we have an active session, restart vision loop for the new tab
    if (geminiSession && activeWebContentsId) {
        startVisionLoop();
    }
});
// --- Computer Use Handlers ---
// Handlers registered in late-binding section below
// Handle Capture Active Tab (Context Awareness)
ipcMain.handle('browser:capture-active-tab', async () => {
    if (!activeWebContentsId)
        return null;
    const wc = webContents.fromId(activeWebContentsId);
    if (!wc || wc.isDestroyed())
        return null;
    try {
        const screenshot = await captureScreenFast(wc, 50);
        return {
            screenshot,
            url: wc.getURL(),
            title: wc.getTitle()
        };
    }
    catch (e) {
        console.error('Capture active tab failed:', e);
        return null;
    }
});
/**
 * Handle Ghost Task - Spawns a hidden background browser
 */
async function handleGhostTask(task, id) {
    if (isGhosting) {
        return "Already executing a ghost task.";
    }
    console.log(`[GhostMode] 👻 Initializing Ghost Browser for: ${task}`);
    isGhosting = true;
    originalWebContentsId = activeWebContentsId;
    const ghostWin = new BrowserWindow({
        width: 1280,
        height: 720,
        show: false,
        webPreferences: {
            offscreen: true,
            partition: 'persist:ghost'
        }
    });
    const wc = ghostWin.webContents;
    activeWebContentsId = wc.id;
    ghostWin.on('closed', () => {
        console.log('[GhostMode] 👻 Ghost Browser Closed');
        isGhosting = false;
        if (originalWebContentsId) {
            activeWebContentsId = originalWebContentsId;
            // startVisionLoop();
        }
    });
    // Initial navigation
    await ghostWin.loadURL(`https://www.google.com/search?q=${encodeURIComponent(task)}`);
    // Start vision loop for the new window
    // startVisionLoop();
    // Return ok to Gemini
    if (geminiSession) {
        geminiSession.sendToolResponse({
            functionResponses: [{
                    id: id,
                    name: 'execute_ghost_task',
                    response: { result: `Ghost window active. I am now browsing in the background for: ${task}.` }
                }]
        });
    }
}
// Handle Browser Action Result from Renderer
ipcMain.on('gemini:browser-action-result', (event, { id, result }) => {
    console.log(`[Gemini Live] 📤 Tool Result:`, { id: id?.slice(0, 20), result: String(result).slice(0, 50) });
    if (!geminiSession) {
        console.warn(`[Gemini Live] ⚠️ No session for tool response`);
        return;
    }
    const name = toolCallMap.get(id) || 'unknown_tool';
    try {
        // Per official Gemini Live API docs: response should be the result from the tool
        const toolResponse = {
            functionResponses: [{
                    id: id,
                    name: name,
                    response: { result: result || 'ok' }
                }]
        };
        geminiSession.sendToolResponse(toolResponse);
        toolCallMap.delete(id);
        console.log(`[Gemini Live] ✅ Tool Response Sent: ${name} -> ${typeof result === 'string' ? result.slice(0, 30) : 'ok'}`);
    }
    catch (error) {
        console.error(`[Gemini Live] ❌ Tool Response Failed:`, error.message);
    }
});
// Constants - Gemini 2.5 Flash Native Audio (Official Model Name)
const GEMINI_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
let geminiSessionHandle = null; // Session resumption handle
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000;
const SIDELOAD_VOLUME_THRESHOLD = 0.01;
// ═══════════════════════════════════════════════
// VISION LOOP — Continuous Screen Capture
// Uses Electron's native capturePage() for SPEED
// No CDP debugger needed — direct compositor capture
// ═══════════════════════════════════════════════
let visionFrameCount = 0;
const VISION_FPS = 1; // 1 frame per second
const VISION_INTERVAL = 1000 / VISION_FPS;
// Fast screenshot using Electron's native capturePage()
async function captureScreenFast(wc, quality = 40) {
    try {
        const image = await wc.capturePage();
        if (image.isEmpty())
            return null;
        // Resize for speed — 720p is enough for Gemini vision
        const resized = image.resize({ width: 1280, quality: 'good' });
        const jpegBuffer = resized.toJPEG(quality);
        if (jpegBuffer.length < 500)
            return null;
        return jpegBuffer.toString('base64');
    }
    catch {
        return null;
    }
}
function startVisionLoop() {
    stopVisionLoop(); // Clear any existing loop
    console.log(`[VisionLoop] 👁️ Starting at ${VISION_FPS} FPS (native capturePage)`);
    visionLoopInterval = setInterval(async () => {
        if (!geminiSession || !activeWebContentsId)
            return;
        const wc = webContents.fromId(activeWebContentsId);
        if (!wc || wc.isDestroyed())
            return;
        try {
            // Fast native capture — no CDP needed
            const data = await captureScreenFast(wc, 35);
            if (!data)
                return;
            // Send screenshot to Gemini (media wrapper per SDK spec)
            geminiSession.sendRealtimeInput({
                media: { mimeType: 'image/jpeg', data: data }
            });
            visionFrameCount++;
            // Every 5th frame, also send page context (text + links)
            if (visionFrameCount % 5 === 0) {
                try {
                    const pageContext = await wc.executeJavaScript(`
            (() => {
              const url = window.location.href;
              const title = document.title;
              
              // Get interactive elements with positions
              const elements = [];
              const interactable = document.querySelectorAll('a, button, input, textarea, select, [role="button"], [onclick]');
              const vw = window.innerWidth;
              const vh = window.innerHeight;
              
              let id = 1;
              interactable.forEach(el => {
                if (id > 60) return;
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return;
                if (rect.top > vh || rect.bottom < 0) return;
                
                const tag = el.tagName.toLowerCase();
                const text = (el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 40);
                const type = el.getAttribute('type') || '';
                const x = Math.round((rect.left + rect.width/2) / vw * 1000);
                const y = Math.round((rect.top + rect.height/2) / vh * 1000);
                
                if (text || type) {
                  elements.push('[' + (id++) + '] ' + tag + (type ? '(' + type + ')' : '') + ': \\'' + text + '\\' @(' + x + ',' + y + ')');
                }
              });
              
              return JSON.stringify({
                url: url,
                title: title,
                elements: elements.join('\\\\n')
              });
            })()
          `);
                    if (pageContext) {
                        const ctx = JSON.parse(pageContext);
                        const contextText = `[LIVE PAGE CONTEXT]
URL: ${ctx.url}
Title: ${ctx.title}

Interactive Elements (use ID to click, x,y coords on 0-1000 scale):
${ctx.elements}`;
                        geminiSession.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: contextText }] }]
                        });
                    }
                }
                catch (e) {
                    // Silent fail for JS execution errors (e.g., chrome:// pages)
                }
            }
        }
        catch (e) {
            // Silent fail
        }
    }, VISION_INTERVAL);
}
function stopVisionLoop() {
    if (visionLoopInterval) {
        clearInterval(visionLoopInterval);
        visionLoopInterval = null;
        visionFrameCount = 0;
        console.log('[VisionLoop] ⏹️ Stopped');
    }
}
// Auto-capture after tool execution — so Gemini sees what changed
async function captureScreenAfterAction(delayMs = 500) {
    setTimeout(async () => {
        if (!geminiSession || !activeWebContentsId)
            return;
        const wc = webContents.fromId(activeWebContentsId);
        if (!wc || wc.isDestroyed())
            return;
        const data = await captureScreenFast(wc, 50);
        if (data) {
            geminiSession.sendRealtimeInput({
                media: { mimeType: 'image/jpeg', data: data }
            });
            console.log('[VisionLoop] 📸 Post-action screenshot sent (native)');
        }
    }, delayMs);
}
// Helper: Float32Array to Base64 (for SDK)
function float32ToBase64(float32) {
    const pcm16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return Buffer.from(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength).toString('base64');
}
// Send status update to renderer
function sendGeminiStatus(status, details) {
    const isValid = geminiEventSender && !geminiEventSender.isDestroyed();
    if (isValid) {
        geminiEventSender.send('gemini:status', { status, ...details, keyStatus: geminiKeyManager.getStatus() });
    }
    else if (status !== 'disconnected') {
        // console.warn(`[Gemini Live] Skipping status '${status}' - no active renderer`);
    }
}
/**
 * Dispatcher for Agent Tools
 * Handles native execution (CDP) for high-performance actions
 */
async function dispatchToolCall(name, args, id) {
    const PHYSICAL_TOOLS = ['click_coordinates', 'type_text', 'click_and_type', 'scroll_page', 'hover_element'];
    const BROWSER_TOOLS = ['navigate_to_url', 'open_new_tab', 'close_current_tab', 'go_back', 'go_forward', 'refresh_page', 'search_web', 'click_element', 'read_page_content', 'press_key', 'wait', 'spoof_gps', 'take_full_page_screenshot', 'get_dom_tree'];
    if (!name)
        return;
    console.log(`[Gemini Live] 🔧 Dispatching Tool: ${name} `, args, id);
    toolCallMap.set(id, name);
    geminiEventSender?.send('gemini:tool-use');
    geminiEventSender?.send('gemini:status', { status: 'agentic' }); // 🟢 Update UI to Agentic Mode
    // ⚡ NATIVE CDP EXECUTION (High Performance)
    if (name === 'execute_ghost_task') {
        handleGhostTask(args.task, id);
        return;
    }
    // Handle Full Page Screenshot (Native)
    if (name === 'take_full_page_screenshot' && activeWebContentsId) {
        const wc = webContents.fromId(activeWebContentsId);
        if (wc && !wc.isDestroyed()) {
            try {
                if (!wc.debugger.isAttached())
                    wc.debugger.attach('1.3');
                const result = await wc.debugger.sendCommand('Page.captureScreenshot', {
                    format: 'jpeg',
                    quality: 60,
                    fromSurface: true,
                    captureBeyondViewport: true
                });
                const data = result?.data;
                // Send to Gemini
                geminiSession?.sendToolResponse({
                    functionResponses: [{
                            id: id,
                            name: name,
                            response: { result: 'Screenshot taken and sent to visual context.' }
                        }]
                });
                // Also invoke visual input (media wrapper per SDK spec)
                geminiSession?.sendRealtimeInput({
                    media: { mimeType: 'image/jpeg', data: data }
                });
            }
            catch (e) {
                console.error('Full page screenshot failed:', e);
                geminiSession?.sendToolResponse({
                    functionResponses: [{ id: id, name: name, response: { error: e.message } }]
                });
            }
        }
        return;
    }
    // Handle DOM Tree (Native)
    if (name === 'get_dom_tree' && activeWebContentsId) {
        const wc = webContents.fromId(activeWebContentsId);
        if (wc && !wc.isDestroyed()) {
            try {
                const fullTree = await wc.executeJavaScript(`
              (() => {
                const body = document.body.innerText;
                const links = Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href })).slice(0, 50);
                return JSON.stringify({ bodyPreview: body.slice(0, 2000), links });
              })()
              `);
                geminiSession?.sendToolResponse({
                    functionResponses: [{
                            id: id,
                            name: name,
                            response: { result: fullTree }
                        }]
                });
            }
            catch (e) {
                geminiSession?.sendToolResponse({
                    functionResponses: [{ id: id, name: name, response: { error: e.message } }]
                });
            }
        }
        return;
    }
    // Handle execute_javascript (Native)
    if (name === 'execute_javascript' && activeWebContentsId) {
        const wc = webContents.fromId(activeWebContentsId);
        if (wc && !wc.isDestroyed()) {
            try {
                const result = await wc.executeJavaScript(args.code);
                geminiSession?.sendToolResponse({
                    functionResponses: [{ id, name, response: { result: typeof result === 'string' ? result : JSON.stringify(result) } }]
                });
            }
            catch (e) {
                geminiSession?.sendToolResponse({
                    functionResponses: [{ id, name, response: { error: e.message } }]
                });
            }
        }
        return;
    }
    // Handle get_page_info (Native)
    if (name === 'get_page_info' && activeWebContentsId) {
        const wc = webContents.fromId(activeWebContentsId);
        if (wc && !wc.isDestroyed()) {
            try {
                const info = await wc.executeJavaScript(`
          JSON.stringify({
            url: window.location.href,
            title: document.title,
            description: document.querySelector('meta[name="description"]')?.content || '',
            favicon: document.querySelector('link[rel="icon"]')?.href || '',
            language: document.documentElement.lang || 'unknown'
          })
        `);
                geminiSession?.sendToolResponse({
                    functionResponses: [{ id, name, response: { result: info } }]
                });
            }
            catch (e) {
                geminiSession?.sendToolResponse({
                    functionResponses: [{ id, name, response: { error: e.message } }]
                });
            }
        }
        return;
    }
    // Handle find_text_on_page (Native)
    if (name === 'find_text_on_page' && activeWebContentsId) {
        const wc = webContents.fromId(activeWebContentsId);
        if (wc && !wc.isDestroyed()) {
            try {
                const searchText = args.text;
                const result = await wc.executeJavaScript(`
          (() => {
            const text = ${JSON.stringify(searchText)};
            const body = document.body.innerText;
            const regex = new RegExp(text.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 'gi');
            const matches = [...body.matchAll(regex)];
            return JSON.stringify({ count: matches.length, found: matches.length > 0 });
          })()
        `);
                geminiSession?.sendToolResponse({
                    functionResponses: [{ id, name, response: { result } }]
                });
            }
            catch (e) {
                geminiSession?.sendToolResponse({
                    functionResponses: [{ id, name, response: { error: e.message } }]
                });
            }
        }
        return;
    }
    // Handle select_dropdown (Native)
    if (name === 'select_dropdown' && activeWebContentsId) {
        const wc = webContents.fromId(activeWebContentsId);
        if (wc && !wc.isDestroyed()) {
            try {
                const result = await wc.executeJavaScript(`
          (() => {
            const el = document.querySelector(${JSON.stringify(args.selector)});
            if (!el) return JSON.stringify({ error: 'Element not found' });
            const value = ${JSON.stringify(args.value)};
            // Try by value first, then by text
            let found = false;
            for (const opt of el.options) {
              if (opt.value === value || opt.textContent.trim() === value) {
                el.value = opt.value;
                el.dispatchEvent(new Event('change', { bubbles: true }));
                found = true;
                break;
              }
            }
            return JSON.stringify({ result: found ? 'Selected: ' + value : 'Option not found' });
          })()
        `);
                geminiSession?.sendToolResponse({
                    functionResponses: [{ id, name, response: { result } }]
                });
            }
            catch (e) {
                geminiSession?.sendToolResponse({
                    functionResponses: [{ id, name, response: { error: e.message } }]
                });
            }
        }
        return;
    }
    // Handle fill_form_field (Native)
    if (name === 'fill_form_field' && activeWebContentsId) {
        const wc = webContents.fromId(activeWebContentsId);
        if (wc && !wc.isDestroyed()) {
            try {
                const result = await wc.executeJavaScript(`
          (() => {
            const el = document.querySelector(${JSON.stringify(args.selector)});
            if (!el) return JSON.stringify({ error: 'Element not found' });
            el.focus();
            el.value = ${JSON.stringify(args.value)};
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return JSON.stringify({ result: 'Filled: ' + ${JSON.stringify(args.selector)} });
          })()
        `);
                geminiSession?.sendToolResponse({
                    functionResponses: [{ id, name, response: { result } }]
                });
            }
            catch (e) {
                geminiSession?.sendToolResponse({
                    functionResponses: [{ id, name, response: { error: e.message } }]
                });
            }
        }
        captureScreenAfterAction(500);
        return;
    }
    if (name === 'close_current_tab' && isGhosting && activeWebContentsId) {
        const wc = webContents.fromId(activeWebContentsId);
        if (wc && !wc.isDestroyed()) {
            const win = BrowserWindow.fromWebContents(wc);
            if (win) {
                win.close();
                if (geminiSession) {
                    geminiSession.sendToolResponse({
                        functionResponses: [{ id: id, name: name, response: { result: 'Ghost window closed.' } }]
                    });
                }
                return;
            }
        }
    }
    if (PHYSICAL_TOOLS.includes(name) && activeWebContentsId) {
        const wc = webContents.fromId(activeWebContentsId);
        if (wc && !wc.isDestroyed()) {
            try {
                const bounds = BrowserWindow.fromWebContents(wc)?.getContentBounds() || { width: 1280, height: 720 };
                if (name === 'click_coordinates' || name === 'click_and_type') {
                    const px = Math.round((args.x / 1000) * bounds.width);
                    const py = Math.round((args.y / 1000) * bounds.height);
                    // Native Click
                    wc.sendInputEvent({ type: 'mouseDown', x: px, y: py, button: 'left', clickCount: 1 });
                    await new Promise(r => setTimeout(r, 50));
                    wc.sendInputEvent({ type: 'mouseUp', x: px, y: py, button: 'left', clickCount: 1 });
                    if (name === 'click_and_type') {
                        await new Promise(r => setTimeout(r, 100)); // Wait for focus
                        for (const char of args.text) {
                            wc.sendInputEvent({ type: 'char', keyCode: char });
                            await new Promise(r => setTimeout(r, 10)); // Typing speed
                        }
                        if (args.submit !== false) {
                            wc.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
                            wc.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
                        }
                    }
                }
                else if (name === 'type_text') {
                    for (const char of args.text) {
                        wc.sendInputEvent({ type: 'char', keyCode: char });
                        await new Promise(r => setTimeout(r, 10));
                    }
                    if (args.submit !== false) {
                        wc.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
                        wc.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
                    }
                }
                else if (name === 'scroll_page') {
                    const direction = args.direction === 'up' ? -1 : 1;
                    let delta = 400; // default for 'half'
                    if (args.amount === 'little')
                        delta = 100;
                    if (args.amount === 'full')
                        delta = 800;
                    // Native Scroll
                    // @ts-ignore
                    wc.sendInputEvent({ type: 'mouseWheel', x: 100, y: 100, deltaY: direction * delta });
                }
                // Send response back to Gemini SDK after native execution
                if (geminiSession) {
                    geminiSession.sendToolResponse({
                        functionResponses: [{
                                id: id,
                                name: name,
                                response: { result: 'ok (native)' }
                            }]
                    });
                }
                // Auto-capture screen after action so agent sees result
                captureScreenAfterAction(name === 'click_and_type' ? 1000 : 500);
                return;
            }
            catch (err) {
                console.error(`[CDP] Native tool execution failed: `, err);
                // Fallback to renderer proxy if native fails
            }
        }
    }
    // 🌐 RENDERER PROXY (Standard Flow)
    if ([...PHYSICAL_TOOLS, ...BROWSER_TOOLS].includes(name)) {
        geminiEventSender?.send('gemini:browser-action', { name, args, id });
        // Auto-capture after renderer handles the action
        const delay = ['navigate_to_url', 'search_web', 'refresh_page'].includes(name) ? 2500 : 1000;
        captureScreenAfterAction(delay);
    }
    else if (name === 'google_search' || name === 'webSearch') {
        console.log(`[Gemini Live] 🔍 Built -in Search Tool`);
    }
    else {
        console.log(`[Gemini Live] ❓ Unknown tool: ${name} `);
    }
}
// Connect to Gemini Live API using Google GenAI SDK
async function connectGeminiLive(sender) {
    // Always update the event sender to reply to the correct window
    geminiEventSender = sender;
    // Prevent race conditions and duplicate connections
    if (geminiIsConnecting)
        return;
    if (geminiSession) {
        console.log('[Gemini Live] 🔄 Resuming existing session');
        sendGeminiStatus('connected', { keyIndex: geminiCurrentKeyIndex + 1 });
        return;
    }
    geminiIsConnecting = true;
    // Key Management
    const keyInfo = geminiKeyManager.getNextKey();
    if (!keyInfo) {
        sendGeminiStatus('error', { message: 'All API keys exhausted.' });
        geminiIsConnecting = false;
        return;
    }
    geminiCurrentKeyIndex = keyInfo.index;
    sendGeminiStatus('connecting', { keyIndex: keyInfo.index + 1 });
    try {
        console.log(`[Gemini Live] 🔗 Connecting with SDK(Key ${keyInfo.index + 1})...`);
        const ai = new GoogleGenAI({
            apiKey: keyInfo.key,
            httpOptions: { apiVersion: 'v1alpha' } // Essential for Native Audio and new features
        });
        // Browser Control Function Declarations
        const browserControlTools = [
            {
                name: "navigate_to_url",
                description: "Navigate the browser to a specific URL or website",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        url: { type: Type.STRING, description: "The full URL to navigate to (e.g., https://google.com)" }
                    },
                    required: ["url"]
                }
            },
            {
                name: "open_new_tab",
                description: "Open a new browser tab, optionally with a URL",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        url: { type: Type.STRING, description: "Optional URL for the new tab" }
                    }
                }
            },
            {
                name: "close_current_tab",
                description: "Close the currently active browser tab",
                parameters: { type: Type.OBJECT, properties: {} }
            },
            {
                name: "go_back",
                description: "Navigate back to the previous page in browser history",
                parameters: { type: Type.OBJECT, properties: {} }
            },
            {
                name: "go_forward",
                description: "Navigate forward in browser history",
                parameters: { type: Type.OBJECT, properties: {} }
            },
            {
                name: "refresh_page",
                description: "Refresh/reload the current page",
                parameters: { type: Type.OBJECT, properties: {} }
            },
            {
                name: "scroll_page",
                description: "Scroll the page up or down. Use 'little' for small scroll (100px), 'half' for half page, 'full' for full page, 'max' to scroll to top/bottom",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        direction: { type: Type.STRING, description: "Direction: 'up' or 'down'" },
                        amount: { type: Type.STRING, description: "'little' (100px), 'half' (50% page), 'full' (100% page), 'max' (top/bottom)" }
                    },
                    required: ["direction"]
                }
            },
            {
                name: "search_web",
                description: "Search the web using Google for a query",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        query: { type: Type.STRING, description: "The search query" }
                    },
                    required: ["query"]
                }
            },
            {
                name: "read_page_content",
                description: "Read and summarize the current page content",
                parameters: { type: Type.OBJECT, properties: {} }
            },
            {
                name: "click_element",
                description: "Click on an element by its ID from the page context list. The page context shows [ID] type: 'text' @(x,y) for each clickable element. Use the [ID] number to click.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        element_id: { type: Type.NUMBER, description: "The element ID from page context (e.g., 1, 2, 3...)" }
                    },
                    required: ["element_id"]
                }
            },
            {
                name: "click_coordinates",
                description: "Click at specific X,Y coordinates on the screen (0-1000 scale). Use this for precise clicking on buttons, links, icons.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        x: { type: Type.NUMBER, description: "X coordinate (0-1000, left to right)" },
                        y: { type: Type.NUMBER, description: "Y coordinate (0-1000, top to bottom)" }
                    },
                    required: ["x", "y"]
                }
            },
            {
                name: "type_text",
                description: "Type text into the currently focused input field",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING, description: "The text to type" },
                        submit: { type: Type.BOOLEAN, description: "Whether to press Enter after typing" }
                    },
                    required: ["text"]
                }
            },
            {
                name: "click_and_type",
                description: "Click at coordinates, then type text, then optionally press Enter. Use for search boxes and input fields.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        x: { type: Type.NUMBER, description: "X coordinate (0-1000)" },
                        y: { type: Type.NUMBER, description: "Y coordinate (0-1000)" },
                        text: { type: Type.STRING, description: "Text to type after clicking" },
                        submit: { type: Type.BOOLEAN, description: "Press Enter after typing (default: true)" }
                    },
                    required: ["x", "y", "text"]
                }
            },
            {
                name: "hover_element",
                description: "Hover the mouse over coordinates to reveal dropdowns, tooltips, or menus",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        x: { type: Type.NUMBER, description: "X coordinate (0-1000)" },
                        y: { type: Type.NUMBER, description: "Y coordinate (0-1000)" }
                    },
                    required: ["x", "y"]
                }
            },
            {
                name: "press_key",
                description: "Press a keyboard key (Enter, Escape, Tab, ArrowDown, ArrowUp, Backspace, etc.)",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        key: { type: Type.STRING, description: "Key to press: Enter, Escape, Tab, ArrowDown, ArrowUp, Backspace, Delete, Space" }
                    },
                    required: ["key"]
                }
            },
            {
                name: "wait",
                description: "Wait for a specified number of seconds (for loading, animations)",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        seconds: { type: Type.NUMBER, description: "Seconds to wait (1-10)" }
                    },
                    required: ["seconds"]
                }
            },
            {
                name: "spoof_gps",
                description: "Set the browser's Geolocation to specific coordinates (e.g. New York, London)",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        latitude: { type: Type.NUMBER, description: "Latitude (e.g. 40.7128)" },
                        longitude: { type: Type.NUMBER, description: "Longitude (e.g. -74.0060)" }
                    },
                    required: ["latitude", "longitude"]
                }
            },
            {
                name: "execute_ghost_task",
                description: "Run a task in a hidden background tab. Ideal for research, price comparison, or repetitive lookups while the user stays on their current page.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        task: { type: Type.STRING, description: "Detailed description of the task to perform in the background (e.g., 'Find the cheapest flight to Tokyo in May')" }
                    },
                    required: ["task"]
                }
            },
            {
                name: "take_full_page_screenshot",
                description: "Capture a screenshot of the entire scrollable page context.",
                parameters: { type: Type.OBJECT, properties: {} }
            },
            {
                name: "get_dom_tree",
                description: "Get a detailed structure of the page, including links and main content text.",
                parameters: { type: Type.OBJECT, properties: {} }
            },
            {
                name: "execute_javascript",
                description: "Execute arbitrary JavaScript code on the current page and return the result. Use for complex DOM manipulation, data extraction, or automation tasks.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        code: { type: Type.STRING, description: "JavaScript code to execute on the page" }
                    },
                    required: ["code"]
                }
            },
            {
                name: "get_page_info",
                description: "Get the current page URL, title, meta description, and other metadata.",
                parameters: { type: Type.OBJECT, properties: {} }
            },
            {
                name: "find_text_on_page",
                description: "Search for text on the current page (like Ctrl+F). Returns count and positions of matches.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING, description: "Text to search for on the page" }
                    },
                    required: ["text"]
                }
            },
            {
                name: "select_dropdown",
                description: "Select an option from a dropdown/select element by its value or visible text.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        selector: { type: Type.STRING, description: "CSS selector for the dropdown element" },
                        value: { type: Type.STRING, description: "Value or visible text of the option to select" }
                    },
                    required: ["selector", "value"]
                }
            },
            {
                name: "fill_form_field",
                description: "Fill a specific form field identified by CSS selector with a value.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        selector: { type: Type.STRING, description: "CSS selector for the input field" },
                        value: { type: Type.STRING, description: "Value to fill in the field" }
                    },
                    required: ["selector", "value"]
                }
            }
        ];
        geminiSession = await ai.live.connect({
            model: GEMINI_MODEL,
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } }
                },
                thinkingConfig: { includeThoughts: true },
                enableAffectiveDialog: true, // Emotion-aware responses
                systemInstruction: {
                    parts: [{ text: SMART_SYSTEM_PROMPT }]
                },
                // Session Resumption — survive disconnects
                sessionResumption: {
                    ...(geminiSessionHandle ? { handle: geminiSessionHandle } : {}),
                    transparent: true
                },
                // Context Window Compression — unlimited session length
                contextWindowCompression: {
                    slidingWindow: {} // Auto-compress when context gets too large
                },
                // Transcriptions — get text of what user says and agent says
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                // Proactive audio — smart response gating
                proactivity: {
                    proactiveAudio: true
                },
                realtimeInputConfig: {
                    automaticActivityDetection: {
                        disabled: false,
                        startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
                        endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW
                    }
                },
                tools: [
                    { googleSearch: {} },
                    { functionDeclarations: browserControlTools }
                ]
            },
            callbacks: {
                onopen: () => {
                    console.log('[Gemini Live] ✅ SDK Session Opened (V-AGENT MODE)');
                    geminiIsConnecting = false;
                    geminiKeyManager.markSuccess(geminiCurrentKeyIndex);
                    sendGeminiStatus('connected');
                    // Start the Vision Loop so agent can see the screen
                    if (activeWebContentsId)
                        startVisionLoop();
                },
                onmessage: (message) => {
                    // 🔬 DEBUG: Log ALL incoming messages to diagnose silence
                    const keys = Object.keys(message);
                    // console.log(`[Gemini Live] 📨 Message received: `, keys.join(', '));
                    // 0. Handle GoAway (Connection about to close — auto-reconnect)
                    if (message.goAway) {
                        console.warn(`[Gemini Live] ⚠️ Server sent GoAway! Time left: `, message.goAway.timeLeft);
                        geminiEventSender?.send('gemini:go-away', { timeLeft: message.goAway.timeLeft });
                        // Auto-reconnect after brief delay using session resumption
                        setTimeout(() => {
                            if (geminiEventSender && !geminiEventSender.isDestroyed()) {
                                console.log('[Gemini Live] 🔄 Auto-reconnecting after GoAway...');
                                geminiSession = null;
                                geminiIsConnecting = false;
                                connectGeminiLive(geminiEventSender);
                            }
                        }, 2000);
                    }
                    // 0b. Handle Session Resumption Updates
                    if (message.sessionResumptionUpdate) {
                        if (message.sessionResumptionUpdate.resumable && message.sessionResumptionUpdate.newHandle) {
                            geminiSessionHandle = message.sessionResumptionUpdate.newHandle;
                            console.log(`[Gemini Live] 🔑 Session handle updated (resumable)`);
                        }
                    }
                    // 1. Audio Output
                    if (message.serverContent?.modelTurn?.parts) {
                        for (const part of message.serverContent.modelTurn.parts) {
                            if (part.inlineData?.data) {
                                // console.log(`[Gemini Live] 🔊 Server Audio: ${ Math.round(part.inlineData.data.length / 1024) }KB`);
                                geminiEventSender?.send('gemini:audio-response', { audio: part.inlineData.data });
                            }
                            // Handle Thoughts/Text
                            if (part.text) {
                                if (part.text.startsWith('Thought:')) {
                                    geminiEventSender?.send('gemini:thought', part.text);
                                }
                                else {
                                    geminiEventSender?.send('gemini:output-transcription', part.text);
                                }
                            }
                            // 🛠️ Handle Function Calls (Browser Control)
                            if (part.functionCall) {
                                const name = part.functionCall.name || part.functionCall.functionName;
                                const args = part.functionCall.args || part.functionCall.arguments || {};
                                const id = part.functionCall.id || 'unknown';
                                dispatchToolCall(name, args, id);
                            }
                        }
                    }
                    // Handle toolCallMessage (Live API's primary format for tool calls)
                    if (message.toolCallMessage) {
                        const functionCalls = message.toolCallMessage.functionCalls || [];
                        for (const fc of functionCalls) {
                            const name = fc.name || fc.functionName;
                            const args = fc.args || fc.arguments || {};
                            const id = fc.id || 'unknown';
                            dispatchToolCall(name, args, id);
                        }
                    }
                    // Handle toolCall at message level (alternative format)
                    if (message.toolCall && !message.toolCallMessage) {
                        const functionCalls = message.toolCall.functionCalls || [message.toolCall];
                        for (const fc of functionCalls) {
                            const name = fc.name || fc.functionName;
                            const args = fc.args || fc.arguments || {};
                            const id = fc.id || 'unknown';
                            dispatchToolCall(name, args, id);
                        }
                    }
                    // Handle grounding metadata (google_search results indicator)
                    if (message.serverContent?.groundingMetadata || message.groundingMetadata) {
                        const metadata = message.serverContent?.groundingMetadata || message.groundingMetadata;
                        console.log(`[Gemini Live] 🔍 Grounding Search Executed: `, JSON.stringify(metadata).slice(0, 100));
                        geminiEventSender?.send('gemini:tool-use');
                    }
                    // 2. Input Transcription (User Speech)
                    if (message.serverContent?.inputTranscription) {
                        const text = message.serverContent.inputTranscription.text;
                        if (text) {
                            console.log(`[Gemini Live] 🎤 User: "${text}"`);
                            geminiEventSender?.send('gemini:input-transcription', text);
                        }
                    }
                    // 2b. Output Transcription (Agent Speech → Text)
                    if (message.serverContent?.outputTranscription) {
                        const text = message.serverContent.outputTranscription.text;
                        if (text) {
                            geminiEventSender?.send('gemini:output-transcription', text);
                        }
                    }
                    // 3. Interruptions
                    if (message.serverContent?.interrupted) {
                        console.log('[Gemini Live] 🛑 Interrupted');
                        geminiEventSender?.send('gemini:interrupted');
                    }
                    // 4. Turn Complete
                    if (message.serverContent?.turnComplete) {
                        geminiEventSender?.send('gemini:generation-complete');
                    }
                },
                onclose: (e) => {
                    // Enhanced logging to diagnose premature disconnects
                    const closeCode = e?.code || e?._closeCode || 'unknown';
                    const closeReason = e?.reason || e?._closeReason || '';
                    console.log(`[Gemini Live]SDK Session Closed: Code = ${closeCode}, Reason = ${closeReason}`);
                    geminiSession = null;
                    geminiIsConnecting = false;
                    stopVisionLoop();
                    sendGeminiStatus('disconnected');
                },
                onerror: (e) => {
                    console.error('[Gemini Live] SDK Error:', e);
                    sendGeminiStatus('error', { message: e.message });
                    geminiIsConnecting = false;
                    stopVisionLoop();
                    let type = 'unknown';
                    const msg = (e.message || e.toString()).toLowerCase();
                    if (msg.includes('429') || msg.includes('quota') || msg.includes('limit')) {
                        type = 'quota';
                    }
                    geminiKeyManager.markError(geminiCurrentKeyIndex, type);
                }
            }
        });
    }
    catch (e) {
        console.error('[Gemini Live] Connection Exception:', e);
        sendGeminiStatus('error', { message: e.message });
        // Mark the current key as failed so we rotate next time
        if (geminiCurrentKeyIndex >= 0) {
            const isQuota = e.message?.includes('429') || e.message?.includes('quota');
            geminiKeyManager.markError(geminiCurrentKeyIndex, isQuota ? 'quota' : 'network');
        }
        geminiIsConnecting = false;
    }
}
// IPC: Connect
ipcMain.on('gemini:connect', (event, _apiKeyFromRenderer) => {
    connectGeminiLive(event.sender);
});
// IPC: Disconnect
ipcMain.on('gemini:disconnect', () => {
    if (geminiSession) {
        geminiSession.close(); // SDK Close
        geminiSession = null;
        console.log('[Gemini Live] Disconnected by Client');
    }
    stopVisionLoop();
    sendGeminiStatus('disconnected');
    geminiEventSender = null;
});
// IPC: Send Realtime Input (Images/Screenshots)
ipcMain.on('gemini:realtime-input', (event, part) => {
    if (!geminiSession) {
        console.warn('[Gemini Live] ❌ No session for screenshot');
        return;
    }
    try {
        // Validate part data exists and is a string
        if (!part || !part.data || typeof part.data !== 'string') {
            console.warn('[Gemini Live] ⚠️ Invalid screenshot data type:', typeof part?.data);
            return;
        }
        // Ensure data is properly base64 encoded (strip data URL prefix if present)
        let base64Data = part.data;
        if (base64Data.startsWith('data:')) {
            const commaIndex = base64Data.indexOf(',');
            if (commaIndex > 0) {
                base64Data = base64Data.substring(commaIndex + 1);
            }
        }
        // Validate base64 - should only contain valid base64 characters
        if (!/^[A-Za-z0-9+/=]+$/.test(base64Data.substring(0, 100))) {
            console.warn('[Gemini Live] ⚠️ Invalid base64 characters in screenshot data');
            return;
        }
        // Skip if too small (likely empty/failed screenshot)
        if (base64Data.length < 1000) {
            console.warn(`[Gemini Live] ⚠️ Screenshot too small(${base64Data.length} chars), skipping`);
            return;
        }
        console.log(`[Gemini Live] 📷 Screenshot: ${Math.round(base64Data.length / 1024)}KB`);
        // Send to SDK using sendRealtimeInput (media wrapper per SDK spec)
        geminiSession.sendRealtimeInput({
            media: {
                mimeType: part.mimeType.includes('jpeg') ? 'image/jpeg' : 'image/png',
                data: base64Data
            }
        });
    }
    catch (e) {
        console.error('[Gemini Live] ❌ Screenshot send failed:', e.message);
    }
});
// IPC: Send Client Content (DOM context text)
ipcMain.on('gemini:client-content', (event, text) => {
    if (!geminiSession)
        return;
    try {
        if (text && text.length > 0) {
            // Send context text via SDK's sendClientContent method
            geminiSession.sendClientContent({
                turns: [{
                        role: 'user',
                        parts: [{ text: `[Page Context]\n${text}` }]
                    }]
            });
            console.log(`[Gemini Live] 📄 DOM context sent(${text.length} chars)`);
        }
    }
    catch (e) {
        console.error('[Gemini Live] ❌ Client content failed:', e.message);
    }
});
// IPC: Send Audio Chunk
let audioFirstChunk = true;
ipcMain.on('gemini:audio-chunk', (event, chunk) => {
    // Log first chunk to confirm IPC working
    if (audioFirstChunk) {
        console.log('[Gemini Live] 🎤 FIRST AUDIO CHUNK RECEIVED via IPC');
        audioFirstChunk = false;
    }
    // Ensure we always have a valid sender for replies
    if (!geminiEventSender || geminiEventSender.isDestroyed()) {
        geminiEventSender = event.sender;
    }
    if (!geminiSession) {
        console.log('[Gemini Live] ⚠️ Audio chunk received but NO SESSION');
        return;
    }
    // 1. Normalize Input to Float32Array
    let floatData;
    if (chunk instanceof Float32Array) {
        floatData = chunk;
    }
    else if (Buffer.isBuffer(chunk)) {
        // If it's a Buffer, it might be a Float32Array sent as raw bytes
        floatData = new Float32Array(chunk.buffer, chunk.byteOffset, chunk.byteLength / 4);
    }
    else if (ArrayBuffer.isView(chunk)) {
        floatData = new Float32Array(chunk.buffer, chunk.byteOffset, chunk.byteLength / 4);
    }
    else if (Array.isArray(chunk)) {
        floatData = new Float32Array(chunk);
    }
    else {
        // Silent fail for invalid formats
        return;
    }
    // 2. Send to SDK (Server VAD handles silence)
    try {
        const base64Audio = float32ToBase64(floatData);
        geminiSession.sendRealtimeInput({
            audio: {
                mimeType: "audio/pcm;rate=16000",
                data: base64Audio
            }
        });
        // Log less frequently to avoid spam, especially now with gating
        audioChunkCounter = (audioChunkCounter || 0) + 1;
        if (audioChunkCounter % 1000 === 1) {
            console.log(`[Gemini Live] 🎤 Audio chunks sent: ${audioChunkCounter}`);
        }
    }
    catch (e) {
        // Suppress spammy errors on disconnect
        // console.error('[Gemini Live] Send Input Error:', e);
    }
});
// IPC: Interrupt
ipcMain.on('gemini:interrupt', () => {
    // SDK doesn't always need explicit interrupt signal client->server, 
    // but we can send an empty audio chunk or specific control signal if supported.
    // For now, assume client handles its own playback stop.
    console.log('[Gemini Live] Client triggered interrupt');
});
// =============================================================================
// MAIN APP LIFECYCLE
// =============================================================================
function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false, // ⚡ Don't show until ready — prevents white flash
        frame: false, // Custom title bar
        titleBarStyle: 'hidden',
        backgroundColor: '#000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: true,
            contextIsolation: true, // Secure context
            webviewTag: true, // Enable <webview>
            sandbox: false, // Required for some Node APIs
            webSecurity: false, // Allow local resources
            backgroundThrottling: false, // ⚡ Keep media playing when minimized/hidden
            spellcheck: false, // ⚡ Disable spellcheck for speed
            v8CacheOptions: 'code', // ⚡ Cache compiled V8 code
        },
    });
    // ⚡ Show window only when fully ready — eliminates white flash on startup
    win.once('ready-to-show', () => {
        win?.show();
        win?.focus();
    });
    // Load App
    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
        win.webContents.openDevTools();
    }
    else if (!app.isPackaged) {
        win.loadURL('http://localhost:3000');
        win.webContents.openDevTools();
    }
    else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    // Force reset zoom on the main window
    win.webContents.on('did-finish-load', () => {
        win?.webContents.setZoomLevel(0);
        win?.webContents.setZoomFactor(1.0);
    });
    // ⚡ DNS Preconnect — warm up connections to popular sites on startup
    const preconnectDomains = [
        'https://www.google.com',
        'https://www.youtube.com',
        'https://www.github.com',
        'https://www.google.com/s2/favicons', // Favicon service
    ];
    preconnectDomains.forEach(url => {
        try {
            win?.webContents.session.preconnect({ url, numSockets: 2 });
        }
        catch (e) { }
    });
    // ⚡ Session cache configuration
    try {
        win.webContents.session.enableNetworkEmulation({ offline: false, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    }
    catch (e) { }
    // Permissions Handler — allow all for browser functionality
    win.webContents.session.setPermissionRequestHandler((webContents, permission, callback, details) => {
        callback(true);
    });
    // Device Permissions (Mic/Cam)
    win.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
        return true;
    });
    win.on('closed', () => {
        win = null;
        // Stop power save blocker
        if (powerSaveId !== null) {
            powerSaveBlocker.stop(powerSaveId);
            powerSaveId = null;
        }
    });
    // ═════════════════════════════════════════════════════════════
    // ⚡ ANTI-THROTTLE SYSTEM — Keep media playing when app loses focus
    // This is THE fix for video lag when switching to another application
    // ═════════════════════════════════════════════════════════════
    // Helper: Disable throttling on ALL webContents (main + all webviews)
    const disableAllThrottling = () => {
        webContents.getAllWebContents().forEach(wc => {
            if (!wc.isDestroyed()) {
                try {
                    wc.backgroundThrottling = false;
                }
                catch (e) { }
            }
        });
    };
    // When user switches to another app (THIS is the key event)
    win.on('blur', () => {
        disableAllThrottling();
    });
    win.on('minimize', () => {
        disableAllThrottling();
    });
    win.on('restore', () => {
        if (win)
            win.webContents.invalidate();
        disableAllThrottling();
    });
    win.on('show', () => {
        if (win)
            win.webContents.invalidate();
    });
    win.on('focus', () => {
        if (win)
            win.webContents.invalidate();
        disableAllThrottling();
    });
    // ⚡ Power Save Blocker — prevent-app-suspension is stronger than prevent-display-sleep
    // Prevents OS from suspending Chromium renderer processes entirely
    powerSaveId = powerSaveBlocker.start('prevent-app-suspension');
    console.log(`[Main] ⚡ PowerSaveBlocker started (ID: ${powerSaveId}, type: prevent-app-suspension)`);
}
// Global Exception Handler
process.on('uncaughtException', (error) => {
    console.error('UNCAUGHT EXCEPTION:', error);
});
app.whenReady().then(() => {
    console.log('[Main] 🚀 Deep Thought System v2.0 - Loaded');
    // Custom protocol registration removed — using local HTTP server instead
    loadPermissions();
    createWindow();
    // --- Register Browser Agent IPCs (NextGenAgent v2) ---
    ipcMain.handle('browser-agent:start', async (event, task, zeroClickMode) => {
        console.log(`[Main] 🚀 IPC: browser-agent:start -> "${task}" | zeroClick: ${!!zeroClickMode}`);
        if (!nextGenAgent)
            return { error: 'Agent not initialized' };
        if (!activeWebContentsId)
            return { error: 'No active tab' };
        const mainWin = BrowserWindow.fromWebContents(event.sender);
        if (mainWin)
            nextGenAgent.setTargetWindow(mainWin);
        nextGenAgent.setActiveWebContentsId(activeWebContentsId);
        // Start async (non-blocking)
        nextGenAgent.executeObjective(task, { zeroClickMode: !!zeroClickMode });
        return { status: 'started', agent: 'NextGenAgent v2', zeroClickMode: !!zeroClickMode };
    });
    ipcMain.handle('browser-agent:stop', async () => {
        console.log('[Main] 🛑 IPC: browser-agent:stop');
        if (nextGenAgent)
            nextGenAgent.stop();
        return { status: 'stopped' };
    });
    ipcMain.handle('agent:get-state', async () => {
        if (nextGenAgent)
            return nextGenAgent.getState();
        return { status: 'idle' };
    });
    // ===========================================================================
    // APPLICATION MENU (Zoom, Edit, etc.)
    // ===========================================================================
    const isMac = process.platform === 'darwin';
    const template = [
        // { role: 'appMenu' }
        ...(isMac ? [{
                label: app.name,
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            }] : []),
        // { role: 'fileMenu' }
        {
            label: 'File',
            submenu: [
                isMac ? { role: 'close' } : { role: 'quit' }
            ]
        },
        // { role: 'editMenu' }
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(isMac ? [
                    { role: 'pasteAndMatchStyle' },
                    { role: 'delete' },
                    { role: 'selectAll' },
                    { type: 'separator' },
                    {
                        label: 'Speech',
                        submenu: [
                            { role: 'startSpeaking' },
                            { role: 'stopSpeaking' }
                        ]
                    }
                ] : [
                    { role: 'delete' },
                    { type: 'separator' },
                    { role: 'selectAll' }
                ])
            ]
        },
        // { role: 'viewMenu' }
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        // { role: 'windowMenu' }
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                ...(isMac ? [
                    { type: 'separator' },
                    { role: 'front' },
                    { type: 'separator' },
                    { role: 'window' }
                ] : [
                    { role: 'close' }
                ])
            ]
        }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
// IPC: Capture Screenshot of a URL
ipcMain.handle('ai:capture-screenshot', async (_, url) => {
    console.log(`[Main] 📸 Capturing screenshot for: ${url} `);
    const shotWin = new BrowserWindow({
        width: 1280,
        height: 720,
        show: false,
        webPreferences: {
            offscreen: true,
        }
    });
    try {
        await shotWin.loadURL(url);
        // Wait for some time to let content load
        await new Promise(resolve => setTimeout(resolve, 3000));
        const image = await shotWin.webContents.capturePage();
        return image.toDataURL();
    }
    catch (e) {
        console.error(`[Main] Screenshot failed for ${url}: `, e);
        return null;
    }
    finally {
        shotWin.destroy();
    }
});
// IPC: Minimize/Maximize/Close/Fullscreen
ipcMain.on('window-minimize', () => win?.minimize());
ipcMain.on('window-maximize', () => {
    if (win?.isMaximized()) {
        win.unmaximize();
    }
    else {
        win?.maximize();
    }
});
ipcMain.on('window-close', () => win?.close());
// Open file with native OS default application (Available for future use if needed)
ipcMain.handle('app:open-external-file', async (_, filePath) => {
    try {
        const result = await shell.openPath(filePath);
        if (result) {
            console.error(`[Main] Error opening external file: ${result}`);
            return false;
        }
        return true;
    }
    catch (e) {
        console.error(`[Main] Open External Exception: ${e.message}`);
        return false;
    }
});
// Save in-memory file to OS temp and return HTTP URL for WebView preview
ipcMain.handle('app:save-temp-file', async (_, fileName, buffer) => {
    try {
        const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueName = `eterx_${Date.now()}_${safeName}`;
        const tempPath = path.join(ETERX_TEMP_DIR, uniqueName);
        fs.writeFileSync(tempPath, Buffer.from(buffer));
        // Return the HTTP URL that the webview can load
        const httpUrl = `http://127.0.0.1:${localFileServerPort}/${encodeURIComponent(uniqueName)}`;
        console.log(`[Main] 📁 Saved temp file: ${tempPath} -> ${httpUrl}`);
        return httpUrl;
    }
    catch (e) {
        console.error(`[Main] Error saving temp file: ${e.message}`);
        return null;
    }
});
// Other fullscreen logic
ipcMain.on('window-fullscreen', () => {
    if (win?.isFullScreen()) {
        win.setFullScreen(false);
    }
    else {
        win?.setFullScreen(true);
    }
});
// =============================================================================
// CONTEXT MENU & UI INJECTION
// =============================================================================
app.on('web-contents-created', (event, contents) => {
    console.log(`[Main] web-contents-created: ${contents.id} (${contents.getType()})`);
    // ⚡ Disable throttling on ALL new webContents immediately
    try {
        contents.backgroundThrottling = false;
    }
    catch (e) { }
    // ⚡ Auto-disable throttling when media starts playing in any webview
    contents.on('media-started-playing', () => {
        try {
            contents.backgroundThrottling = false;
        }
        catch (e) { }
    });
    // Enable pinch-to-zoom ONLY for webviews, not the main app window
    if (contents.getType() === 'webview') {
        const enableZoom = () => {
            try {
                contents.setVisualZoomLevelLimits(1, 4);
            }
            catch (err) {
                console.error(`[Zoom] Failed for ${contents.id}:`, err);
            }
        };
        enableZoom();
        contents.on('did-finish-load', enableZoom);
    }
    contents.on('did-attach-webview', (e, webContents) => {
        // Also explicitly ensure it's enabled when attached
        try {
            webContents.setVisualZoomLevelLimits(1, 4);
        }
        catch (e) { }
        // Webviews create their own webContents. We MUST attach the window open handler directly to them.
        webContents.setWindowOpenHandler((details) => {
            console.log(`[Main/Webview] Intercepted new window request for: ${details.url}`);
            if (win && !win.isDestroyed()) {
                win.webContents.send('app:open-new-tab', details.url);
            }
            return { action: 'deny' };
        });
    });
    // 1. Inject Modern Selection & Quality CSS into every frame
    const injectStyles = () => {
        contents.insertCSS(`
            ::selection {
                background: #a8c7fa; /* Google Modern Light Blue */
                color: #000;
            }
            img, video, canvas, svg {
                image-rendering: -webkit-optimize-contrast !important;
                image-rendering: high-quality !important;
                transform: translateZ(0) !important;
            }
        `);
    };
    contents.on('did-finish-load', injectStyles);
    // 2. Right-Click Context Menu
    contents.on('context-menu', (event, params) => {
        const menuTemplate = [];
        // "Search Google for..."
        if (params.selectionText) {
            const query = params.selectionText.trim();
            if (query) {
                menuTemplate.push({
                    label: `Search Google for "${query.length > 20 ? query.slice(0, 20) + '...' : query}"`,
                    click: () => {
                        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                        // Open in new window/tab logic (handled by renderer usually, but here we force new window for simplicity or shell)
                        shell.openExternal(searchUrl);
                    },
                    icon: nativeImage.createFromPath(path.join(__dirname, '../resources/google-icon.png')).resize({ width: 16 }) // Optional: if icon exists
                });
                menuTemplate.push({
                    label: 'Ask AI',
                    click: () => {
                        // Send to Main Window Renderer
                        if (win) {
                            win.webContents.send('renderer:ask-ai', query);
                            win.focus(); // Ensure main window gets focus
                        }
                    },
                    // icon: ... (AI Icon)
                });
                menuTemplate.push({ type: 'separator' });
            }
        }
        // --- Link Actions ---
        if (params.linkURL) {
            menuTemplate.push({
                label: 'Open Link in New Tab',
                click: () => {
                    if (win && !win.isDestroyed()) {
                        win.webContents.send('app:open-new-tab', params.linkURL);
                    }
                }
            });
            menuTemplate.push({
                label: 'Copy Link Address',
                click: () => clipboard.writeText(params.linkURL)
            });
            menuTemplate.push({ type: 'separator' });
        }
        // --- Image Actions ---
        if (params.mediaType === 'image') {
            menuTemplate.push({
                label: 'Open Image in New Tab',
                click: () => {
                    if (win && !win.isDestroyed()) {
                        win.webContents.send('app:open-new-tab', params.srcURL);
                    }
                }
            });
            menuTemplate.push({
                label: 'Copy Image',
                click: () => contents.copyImageAt(params.x, params.y)
            });
            menuTemplate.push({
                label: 'Copy Image Address',
                click: () => clipboard.writeText(params.srcURL)
            });
            menuTemplate.push({ type: 'separator' });
        }
        // --- Text Edit Actions (when in an input field) ---
        if (params.isEditable) {
            menuTemplate.push({ role: 'undo', label: 'Undo', accelerator: 'CmdOrCtrl+Z', enabled: params.editFlags.canUndo });
            menuTemplate.push({ role: 'redo', label: 'Redo', accelerator: 'CmdOrCtrl+Y', enabled: params.editFlags.canRedo });
            menuTemplate.push({ type: 'separator' });
            menuTemplate.push({ role: 'cut', label: 'Cut', accelerator: 'CmdOrCtrl+X', enabled: params.editFlags.canCut });
            menuTemplate.push({ role: 'copy', label: 'Copy', accelerator: 'CmdOrCtrl+C', enabled: params.editFlags.canCopy });
            menuTemplate.push({ role: 'paste', label: 'Paste', accelerator: 'CmdOrCtrl+V', enabled: params.editFlags.canPaste });
            menuTemplate.push({ role: 'pasteAndMatchStyle', label: 'Paste as Plain Text', enabled: params.editFlags.canPaste });
            menuTemplate.push({ role: 'selectAll', label: 'Select All', accelerator: 'CmdOrCtrl+A', enabled: params.editFlags.canSelectAll });
            menuTemplate.push({ type: 'separator' });
        }
        // --- Text Selection Actions (Not Editable) ---
        else if (params.selectionText) {
            menuTemplate.push({ role: 'copy', label: 'Copy', accelerator: 'CmdOrCtrl+C', enabled: params.editFlags.canCopy });
            menuTemplate.push({ type: 'separator' });
        }
        // --- Standard Edit Actions (Empty non-editable area) ---
        else if (params.editFlags.canPaste) {
            menuTemplate.push({ role: 'paste', label: 'Paste', accelerator: 'CmdOrCtrl+V' });
        }
        // Only show "Select All" if it makes sense (usually always)
        if (!params.selectionText && !params.linkURL && params.mediaType === 'none') {
            if (params.editFlags.canSelectAll) {
                menuTemplate.push({ role: 'selectAll', label: 'Select All', accelerator: 'CmdOrCtrl+A' });
            }
        }
        // --- General Page Actions ---
        if (!params.selectionText && !params.linkURL && params.mediaType === 'none') {
            menuTemplate.push({ type: 'separator' });
            menuTemplate.push({ label: 'Back', enabled: contents.canGoBack(), click: () => contents.goBack() });
            menuTemplate.push({ label: 'Forward', enabled: contents.canGoForward(), click: () => contents.goForward() });
            menuTemplate.push({ label: 'Reload', click: () => contents.reload() });
        }
        // --- Developer Tools ---
        menuTemplate.push({ type: 'separator' });
        menuTemplate.push({
            label: 'Inspect Element',
            click: () => contents.inspectElement(params.x, params.y)
        });
        if (menuTemplate.length > 0) {
            const menu = Menu.buildFromTemplate(menuTemplate);
            // Resolve the correct window for the popup
            let targetWindow = BrowserWindow.fromWebContents(contents);
            // If no window found (common for webviews), try the host's window
            if (!targetWindow && contents.hostWebContents) {
                targetWindow = BrowserWindow.fromWebContents(contents.hostWebContents);
            }
            // Fallback to focused window
            if (!targetWindow) {
                targetWindow = BrowserWindow.getFocusedWindow();
            }
            if (targetWindow) {
                // x,y are optional, if omitted it shows at mouse cursor which is what we want
                menu.popup({ window: targetWindow });
            }
            else {
                console.warn('No window found for context menu');
            }
        }
    });
    // Inject CSS on navigation too (to persist across page loads)
    contents.on('did-navigate', () => {
        contents.insertCSS(`
            ::selection {
                background: #a8c7fa; /* Google Modern Blue/Purple Mix */
                color: #0d1b2a;
            }
            img, video, canvas, svg {
                image-rendering: -webkit-optimize-contrast !important;
                image-rendering: high-quality !important;
                transform: translateZ(0) !important;
            }
        `);
        // AGI Footprint: Track page visits
        try {
            const url = contents.getURL();
            const title = contents.getTitle();
            import('./agent/UserFootprint.js').then(mod => {
                mod.getUserFootprint().recordPageVisit(url, title, 0);
            }).catch(() => { });
        }
        catch (_) { }
        // AGI Footprint: Track video positions on YouTube
        try {
            const url = contents.getURL();
            if (url.includes('youtube.com/watch')) {
                setTimeout(() => {
                    contents.executeJavaScript(`
            (() => {
              const v = document.querySelector('video');
              if (v && !v._eterxTracked) {
                v._eterxTracked = true;
                v.addEventListener('pause', () => {
                  window.postMessage({ type: 'eterx-video-state', currentTime: v.currentTime, duration: v.duration, title: document.title }, '*');
                });
                window.addEventListener('beforeunload', () => {
                  window.postMessage({ type: 'eterx-video-state', currentTime: v.currentTime, duration: v.duration, title: document.title }, '*');
                });
              }
            })()
          `).catch(() => { });
                }, 3000);
            }
        }
        catch (_) { }
    });
});
// ═══════════════════════════════════════════════
// GEMINI TTS (Text-to-Speech) IPC Handler
// ═══════════════════════════════════════════════
ipcMain.handle('ai:tts', async (_event, text, voiceName = 'Kore') => {
    console.log(`[TTS] 🔊 Request: ${text.substring(0, 80)}... voice=${voiceName}`);
    try {
        if (!text || text.trim().length === 0)
            return { success: false, error: 'No text provided' };
        // Strip markdown for cleaner speech
        const cleanText = text
            .replace(/```[\s\S]*?```/g, ' code block ')
            .replace(/[#*_~`>|\-\[\]()]/g, '')
            .replace(/\n{2,}/g, '. ')
            .replace(/\n/g, ', ')
            .replace(/\s{2,}/g, ' ')
            .trim();
        // Truncate to avoid hitting TTS context limit (32k tokens)
        const truncated = cleanText.substring(0, 4000);
        console.log(`[TTS] Clean text (${truncated.length} chars): ${truncated.substring(0, 100)}...`);
        // Get API key via key manager
        const keyResult = geminiKeyManager.getNextKey();
        if (!keyResult)
            return { success: false, error: 'All API keys exhausted' };
        console.log(`[TTS] Using key index ${keyResult.index}`);
        const ai = new GoogleGenAI({ apiKey: keyResult.key });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: truncated }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName },
                    },
                },
            },
        });
        const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!data) {
            console.error('[TTS] No audio data in response');
            geminiKeyManager.markError(keyResult.index, 'unknown');
            return { success: false, error: 'No audio generated' };
        }
        geminiKeyManager.markSuccess(keyResult.index);
        console.log(`[TTS] ✅ Audio generated: ${Math.round(data.length / 1024)}KB`);
        return { success: true, audio: data, sampleRate: 24000, channels: 1, bitDepth: 16 };
    }
    catch (err) {
        console.error('[TTS] ❌ Error:', err.message);
        return { success: false, error: err.message };
    }
});
// ═══════════════════════════════════════════════
// YouTube Transcript + Link Reader IPC Handlers
// ═══════════════════════════════════════════════
ipcMain.handle('youtube:summarize', async (_event, videoInfo) => {
    try {
        const { fetchTranscript, createTimestampedSummary } = await import('./agent/YouTubeTranscript.js');
        const url = videoInfo?.url || videoInfo?.videoId || '';
        if (!url)
            return { success: false, error: 'No video URL provided' };
        const result = await fetchTranscript(url);
        if (!result.success)
            return result;
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
    }
    catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('youtube:seek', async (_event, seconds) => {
    try {
        // Find active YouTube tab and seek
        const allContents = webContents.getAllWebContents();
        for (const wc of allContents) {
            try {
                const url = wc.getURL();
                if (url.includes('youtube.com/watch')) {
                    await wc.executeJavaScript(`(() => {
                        const v = document.querySelector('video');
                        if (v) { v.currentTime = ${seconds}; v.play(); return true; }
                        return false;
                    })()`);
                    return { success: true, seekedTo: seconds };
                }
            }
            catch (_) { }
        }
        return { success: false, error: 'No YouTube tab found' };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('file:export', async (_event, { content, type, filename }) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const { shell } = require('electron');
        // Auto-save to Downloads folder (no dialog needed)
        const downloadsDir = app.getPath('downloads');
        // Ensure filename has correct extension
        const extMap = { pdf: '.pdf', markdown: '.md', code: path.extname(filename) || '.js', text: '.txt' };
        let finalName = filename;
        if (!finalName.includes('.'))
            finalName += extMap[type] || '.txt';
        // Handle conflicts — append _1, _2, etc.
        let savePath = path.join(downloadsDir, finalName);
        let counter = 1;
        const baseName = path.basename(finalName, path.extname(finalName));
        const ext = path.extname(finalName);
        while (fs.existsSync(savePath)) {
            savePath = path.join(downloadsDir, `${baseName}_${counter}${ext}`);
            counter++;
        }
        if (type === 'pdf') {
            // ── Lightweight Markdown → HTML Converter ──
            function mdToHtml(md) {
                let h = md;
                h = h.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                h = h.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => `<pre class="code-block"><code>${code}</code></pre>`);
                h = h.replace(/((\|[^\n]+\|\n)+)/g, (tableBlock) => {
                    const rows = tableBlock.trim().split('\n');
                    if (rows.length < 2)
                        return tableBlock;
                    let t = '<table>';
                    rows.forEach((row, i) => {
                        if (row.replace(/[\|\s\-:]/g, '').length === 0)
                            return;
                        const cells = row.split('|').filter((c) => c.trim() !== '');
                        const tag = i === 0 ? 'th' : 'td';
                        const rc = i > 0 && i % 2 === 0 ? ' class="alt"' : '';
                        t += `<tr${rc}>` + cells.map((c) => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
                    });
                    return t + '</table>';
                });
                h = h.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
                h = h.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
                h = h.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
                h = h.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
                h = h.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
                h = h.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
                h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
                h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
                h = h.replace(/`([^`]+)`/g, '<code class="il">$1</code>');
                h = h.replace(/^&gt;\s*(.+)$/gm, '<blockquote>$1</blockquote>');
                h = h.replace(/^---+$/gm, '<hr>');
                h = h.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
                h = h.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
                h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
                h = h.replace(/\n\n+/g, '</p><p>');
                h = '<p>' + h + '</p>';
                h = h.replace(/<p>\s*<\/p>/g, '');
                h = h.replace(/<p>(<(?:h[1-6]|pre|table|ul|ol|hr|blockquote))/g, '$1');
                h = h.replace(/(<\/(?:h[1-6]|pre|table|ul|ol|blockquote)>)<\/p>/g, '$1');
                h = h.replace(/<p>(<hr>)/g, '$1');
                h = h.replace(/(<hr>)<\/p>/g, '$1');
                h = h.replace(/([^>])\n([^<])/g, '$1<br>$2');
                return h;
            }
            const bodyHtml = mdToHtml(content);
            const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
            <style>
                @page{margin:0}*{box-sizing:border-box}
                body{font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:11pt;line-height:1.7;color:#1a1a1a;padding:50px 60px;margin:0;background:#fff}
                h1{font-size:22pt;font-weight:700;color:#0a0a0a;margin:32px 0 12px;padding-bottom:8px;border-bottom:2px solid #e5e7eb}
                h2{font-size:17pt;font-weight:600;color:#111;margin:28px 0 10px}
                h3{font-size:13pt;font-weight:700;color:#1e293b;margin:22px 0 8px}
                h4{font-size:11pt;font-weight:700;color:#374151;margin:18px 0 6px;text-transform:uppercase;letter-spacing:0.04em}
                p{margin:0 0 10px}strong{font-weight:700;color:#000}em{font-style:italic;color:#444}
                .code-block{background:#1e293b;color:#e2e8f0;padding:16px 20px;border-radius:10px;font-family:'Consolas','Courier New',monospace;font-size:9.5pt;line-height:1.6;overflow-x:auto;margin:14px 0;border:1px solid #334155}
                .code-block code{background:none;padding:0;color:inherit;font-size:inherit}
                code.il{background:#f1f5f9;color:#c7254e;padding:2px 6px;border-radius:4px;font-family:'Consolas',monospace;font-size:9pt;border:1px solid #e2e8f0}
                table{width:100%;border-collapse:collapse;margin:16px 0;font-size:10pt;border:1px solid #d1d5db}
                th{background:#f3f4f6;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;font-size:8.5pt;color:#374151;padding:10px 14px;text-align:left;border-bottom:2px solid #d1d5db;border-right:1px solid #e5e7eb}
                td{padding:9px 14px;border-bottom:1px solid #e5e7eb;border-right:1px solid #f0f0f0;color:#333}tr.alt{background:#fafbfc}
                blockquote{border-left:4px solid #6366f1;margin:12px 0;padding:10px 16px;background:#f8fafc;color:#475569;font-style:italic}
                ul,ol{padding-left:22px;margin:8px 0}li{margin:4px 0}
                hr{border:none;height:1px;background:#d1d5db;margin:24px 0}
                a{color:#4f46e5;text-decoration:underline}
                .ft{position:fixed;bottom:20px;left:60px;right:60px;border-top:1px solid #e5e7eb;padding-top:8px;font-size:8pt;color:#94a3b8;display:flex;justify-content:space-between}
            </style></head><body>${bodyHtml}<div class="ft"><span>Generated by EterX • ${dateStr}</span><span>${finalName}</span></div></body></html>`;
            return new Promise((resolve) => {
                const { BrowserWindow } = require('electron');
                const pdfWin = new BrowserWindow({ show: false, width: 800, height: 600, webPreferences: { nodeIntegration: false } });
                pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);
                pdfWin.webContents.on('did-finish-load', async () => {
                    await new Promise(r => setTimeout(r, 400));
                    try {
                        const pdfData = await pdfWin.webContents.printToPDF({
                            printBackground: true,
                            margins: { top: 0.4, bottom: 0.6, left: 0, right: 0 }
                        });
                        fs.writeFileSync(savePath, pdfData);
                        pdfWin.destroy();
                        // Auto-open the PDF
                        shell.openPath(savePath);
                        resolve({ success: true, path: savePath });
                    }
                    catch (e) {
                        pdfWin.destroy();
                        resolve({ success: false, error: e.message });
                    }
                });
                // Timeout: if page doesn't load in 10s, fail gracefully
                setTimeout(() => {
                    try {
                        pdfWin.destroy();
                    }
                    catch (_) { }
                    resolve({ success: false, error: 'PDF generation timed out' });
                }, 10000);
            });
        }
        else {
            // Direct file write for non-PDF types
            fs.writeFileSync(savePath, content);
            shell.openPath(savePath);
            return { success: true, path: savePath };
        }
    }
    catch (e) {
        return { success: false, error: e.message };
    }
});
// ── Terminal Command Execution (sandboxed, timeout-protected) ──
ipcMain.handle('terminal:run', async (_event, { command, timeout = 30000 }) => {
    try {
        const { exec } = require('child_process');
        // Safety: allowlist of safe commands
        const firstWord = command.trim().split(/\s+/)[0].toLowerCase();
        const allowed = ['node', 'npm', 'npx', 'python', 'python3', 'pip', 'pip3', 'git', 'pandoc',
            'dir', 'ls', 'echo', 'type', 'cat', 'head', 'tail', 'find', 'grep', 'wc', 'sort',
            'curl', 'wget', 'ping', 'ipconfig', 'ifconfig', 'netstat', 'whoami', 'hostname',
            'date', 'time', 'mkdir', 'touch', 'cp', 'copy', 'move', 'mv', 'rename'];
        if (!allowed.includes(firstWord)) {
            return { success: false, error: `Command "${firstWord}" is not in the safety allowlist.`, stdout: '', stderr: '' };
        }
        return new Promise((resolve) => {
            const child = exec(command, { timeout, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
                if (error && error.killed) {
                    resolve({ success: false, error: 'Command timed out', stdout: stdout || '', stderr: stderr || '' });
                }
                else if (error) {
                    resolve({ success: false, error: error.message, stdout: stdout || '', stderr: stderr || '', code: error.code });
                }
                else {
                    resolve({ success: true, stdout: stdout || '', stderr: stderr || '' });
                }
            });
        });
    }
    catch (e) {
        return { success: false, error: e.message, stdout: '', stderr: '' };
    }
});
// ── File Format Conversion ──
ipcMain.handle('file:convert', async (_event, { inputPath, outputFormat }) => {
    try {
        const { exec } = require('child_process');
        const path = require('path');
        const outputPath = inputPath.replace(/\.[^.]+$/, `.${outputFormat}`);
        const cmd = `pandoc "${inputPath}" -o "${outputPath}"`;
        return new Promise((resolve) => {
            exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
                if (error) {
                    resolve({ success: false, error: `Conversion failed: ${error.message}. Make sure pandoc is installed.` });
                }
                else {
                    resolve({ success: true, outputPath, stdout, stderr });
                }
            });
        });
    }
    catch (e) {
        return { success: false, error: e.message };
    }
});
ipcMain.handle('link:read', async (_event, url) => {
    try {
        if (!url || !url.startsWith('http'))
            return { success: false, error: 'Invalid URL' };
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
            if (shadowResult.success)
                return shadowResult;
        }
        catch (_) { }
        return result; // Return fast result even if short
    }
    catch (e) {
        return { success: false, error: e.message, url, title: '', content: '', description: '', links: [] };
    }
});
ipcMain.handle('youtube:transcript', async (_event, url) => {
    try {
        const { fetchTranscript } = await import('./agent/YouTubeTranscript.js');
        return await fetchTranscript(url);
    }
    catch (e) {
        return { success: false, error: e.message };
    }
});
// =============================================================================
// TERMINAL EXECUTION ENGINE — Python/CLI Command Runner for Agentic Documents
// =============================================================================
const ETERX_WORKSPACE = path.join(app.getPath('userData'), 'eterx-workspace');
if (!fs.existsSync(ETERX_WORKSPACE))
    fs.mkdirSync(ETERX_WORKSPACE, { recursive: true });
// Locate Python executable
let pythonPath = 'python';
try {
    const { execSync } = require('child_process');
    // Try python3 first (Linux/Mac), fallback to python (Windows)
    try {
        execSync('python3 --version', { stdio: 'pipe' });
        pythonPath = 'python3';
    }
    catch {
        pythonPath = 'python';
    }
}
catch (_) { }
console.log(`[Terminal] 🐍 Python path: ${pythonPath}, Workspace: ${ETERX_WORKSPACE}`);
ipcMain.handle('terminal:execute', async (_event, command, timeoutMs = 60000) => {
    const { exec } = require('child_process');
    return new Promise((resolve) => {
        console.log(`[Terminal] ▶ Executing: ${command}`);
        const child = exec(command, {
            cwd: ETERX_WORKSPACE,
            timeout: timeoutMs,
            maxBuffer: 1024 * 1024 * 10, // 10MB output buffer
            env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' },
            shell: true,
        }, (error, stdout, stderr) => {
            if (error) {
                console.log(`[Terminal] ❌ Error: ${error.message}`);
                resolve({
                    success: false,
                    stdout: stdout || '',
                    stderr: stderr || error.message,
                    exitCode: error.code || 1,
                    killed: error.killed || false,
                });
            }
            else {
                console.log(`[Terminal] ✅ Done (${stdout.length} chars output)`);
                resolve({
                    success: true,
                    stdout: stdout || '',
                    stderr: stderr || '',
                    exitCode: 0,
                    killed: false,
                });
            }
        });
    });
});
// Get the workspace directory path (so frontend can reference output files)
ipcMain.handle('terminal:get-workspace', () => ETERX_WORKSPACE);
// List files in workspace
ipcMain.handle('terminal:list-files', async () => {
    try {
        const files = fs.readdirSync(ETERX_WORKSPACE).map((f) => {
            const stat = fs.statSync(path.join(ETERX_WORKSPACE, f));
            return { name: f, size: stat.size, modified: stat.mtime.toISOString() };
        });
        return { success: true, files };
    }
    catch (e) {
        return { success: false, error: e.message, files: [] };
    }
});
// Read a generated file as base64 (for download in frontend)
ipcMain.handle('terminal:read-file', async (_event, filename) => {
    try {
        const filePath = path.join(ETERX_WORKSPACE, path.basename(filename));
        if (!fs.existsSync(filePath))
            return { success: false, error: 'File not found' };
        const data = fs.readFileSync(filePath);
        const ext = path.extname(filename).toLowerCase();
        const mimeMap = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
            '.csv': 'text/csv', '.txt': 'text/plain', '.html': 'text/html',
        };
        return { success: true, data: data.toString('base64'), mimeType: mimeMap[ext] || 'application/octet-stream', size: data.length };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
});
// Install Python packages
ipcMain.handle('terminal:pip-install', async (_event, packages) => {
    const { exec } = require('child_process');
    return new Promise((resolve) => {
        exec(`${pythonPath} -m pip install ${packages} --quiet`, {
            timeout: 120000,
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        }, (error, stdout, stderr) => {
            resolve({ success: !error, stdout, stderr, error: error?.message });
        });
    });
});
// AGI: Video state capture for UserFootprint
try {
    const { ipcMain: ipc } = require('electron');
    ipc.on('eterx:video-state', (_event, data) => {
        import('./agent/UserFootprint.js').then(mod => {
            mod.getUserFootprint().recordVideoPosition(data.url, data.title, data.currentTime, data.duration);
        }).catch(() => { });
    });
}
catch (_) { }
