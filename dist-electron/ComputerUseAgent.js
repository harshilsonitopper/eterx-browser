import { webContents } from 'electron';
import { GoogleGenAI, Type } from '@google/genai'; // Using the GoogleGenAI class directly
// Define tools explicitly for the model
const computerUseFunctions = [
    {
        name: "click_at",
        description: "Click at specific coordinates on the screen.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                x: { type: Type.INTEGER, description: "X coordinate (0-1000)" },
                y: { type: Type.INTEGER, description: "Y coordinate (0-1000)" }
            },
            required: ["x", "y"]
        }
    },
    {
        name: "type_text_at",
        description: "Click at coordinates and type text.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                x: { type: Type.INTEGER, description: "X coordinate (0-1000)" },
                y: { type: Type.INTEGER, description: "Y coordinate (0-1000)" },
                text: { type: Type.STRING, description: "Text to type" },
                press_enter: { type: Type.BOOLEAN, description: "Whether to press Enter after typing" }
            },
            required: ["x", "y", "text"]
        }
    },
    {
        name: "scroll_at",
        description: "Scroll the screen at specific coordinates.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                x: { type: Type.INTEGER },
                y: { type: Type.INTEGER },
                direction: { type: Type.STRING, enum: ["up", "down", "left", "right"] },
                magnitude: { type: Type.INTEGER }
            },
            required: ["x", "y", "direction"]
        }
    },
    {
        name: "navigate",
        description: "Navigate to a URL",
        parameters: {
            type: Type.OBJECT,
            properties: {
                url: { type: Type.STRING }
            },
            required: ["url"]
        }
    },
    {
        name: "search",
        description: "Search Google",
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: { type: Type.STRING }
            },
            required: ["query"]
        }
    },
    {
        name: "go_back",
        description: "Go back to the previous page in history.",
        parameters: { type: Type.OBJECT, properties: {}, required: [] }
    },
    {
        name: "go_forward",
        description: "Go forward to the next page in history.",
        parameters: { type: Type.OBJECT, properties: {}, required: [] }
    },
    {
        name: "reload",
        description: "Reload the current page.",
        parameters: { type: Type.OBJECT, properties: {}, required: [] }
    },
    {
        name: "get_url",
        description: "Get the current page URL.",
        parameters: { type: Type.OBJECT, properties: {}, required: [] }
    },
    {
        name: "get_page_text",
        description: "Get the text content of the current page.",
        parameters: { type: Type.OBJECT, properties: {}, required: [] }
    }
];
export class ComputerUseAgent {
    // ... existing properties ...
    genAI;
    model;
    state;
    config;
    activeWebContentsId = null;
    window = null;
    isRunning = false;
    shouldStop = false;
    // ... existing constructor ...
    constructor(apiKey) {
        this.config = {
            apiKey,
            modelName: 'gemini-2.5-computer-use-preview-10-2025',
            maxTurns: 20, // Increased limit for complex tasks
            screenWidth: 1024,
            screenHeight: 768
        };
        // ... rest of constructor ...
        this.genAI = new GoogleGenAI({ apiKey: this.config.apiKey });
        // @ts-ignore
        this.model = this.genAI.getGenerativeModel({
            model: this.config.modelName,
            tools: [{ functionDeclarations: computerUseFunctions }]
        });
        this.state = {
            status: 'idle',
            currentTask: '',
            logs: [],
            history: []
        };
    }
    // ... existing methods ...
    setTargetWindow(win) {
        this.window = win;
    }
    setActiveWebContents(id) {
        this.activeWebContentsId = id;
    }
    log(message, type = 'info') {
        const logEntry = `[${new Date().toLocaleTimeString()}] [${type.toUpperCase()}] ${message}`;
        console.log(logEntry);
        this.state.logs.push(logEntry);
        if (this.window && !this.window.isDestroyed()) {
            this.window.webContents.send('agent:log', logEntry);
        }
    }
    updateStatus(status) {
        this.state.status = status;
        if (this.window && !this.window.isDestroyed()) {
            this.window.webContents.send('agent:status', status);
        }
    }
    async startTask(task) {
        // ... existing startTask ...
        if (this.isRunning) {
            this.log("Agent already running. Stopping previous task...", 'info');
            this.stop();
            await new Promise(r => setTimeout(r, 1000));
        }
        this.isRunning = true;
        this.shouldStop = false;
        this.state.currentTask = task;
        this.state.history = [];
        this.updateStatus('running');
        this.log(`Starting task: "${task}"`, 'info');
        try {
            await this.agentLoop(task);
        }
        catch (error) {
            this.log(`Agent Error: ${error.message}`, 'error');
            this.updateStatus('error');
        }
        finally {
            this.isRunning = false;
            if (this.state.status !== 'stopped') {
                this.updateStatus('idle');
            }
        }
    }
    stop() {
        this.shouldStop = true;
        this.isRunning = false;
        this.updateStatus('stopped');
        this.log("Agent stopped by user.", 'info');
    }
    async agentLoop(goal) {
        // ... existing agentLoop ...
        let turn = 0;
        const chat = this.model.startChat();
        const screenshotBase64 = await this.captureScreen();
        if (!screenshotBase64) {
            this.log("Failed to capture screen. Aborting.", 'error');
            return;
        }
        let currentParts = [
            { text: `Goal: ${goal}. You are a computer use agent. Interact with the browser to achieve the goal.` },
            { inlineData: { mimeType: 'image/png', data: screenshotBase64 } }
        ];
        while (turn < (this.config.maxTurns || 20)) {
            if (this.shouldStop)
                break;
            turn++;
            this.log(`--- Turn ${turn} ---`, 'info');
            this.log("Thinking...", 'info');
            try {
                const result = await chat.sendMessage(currentParts);
                const response = result.response;
                const text = response.text();
                if (text)
                    this.log(`Model thought: ${text}`, 'info');
                const functionCalls = response.functionCalls();
                if (!functionCalls || functionCalls.length === 0) {
                    this.log("Agent finished (no more actions).", 'info');
                    break;
                }
                const toolResponses = [];
                for (const call of functionCalls) {
                    if (this.shouldStop)
                        break;
                    this.log(`Executing: ${call.name}`, 'action');
                    let output = { output: "ok" };
                    try {
                        const args = call.args;
                        switch (call.name) {
                            case 'click_at':
                                await this.clickAt(Number(args.x), Number(args.y));
                                break;
                            case 'type_text_at':
                                await this.clickAt(Number(args.x), Number(args.y));
                                await this.typeText(String(args.text), Boolean(args.press_enter));
                                break;
                            case 'scroll_at':
                                await this.scroll(Number(args.x), Number(args.y), args.direction, Number(args.magnitude));
                                break;
                            case 'navigate':
                                await this.navigate(String(args.url));
                                break;
                            case 'search':
                                await this.search(String(args.query));
                                break;
                            case 'go_back':
                                await this.goBack();
                                break;
                            case 'go_forward':
                                await this.goForward();
                                break;
                            case 'reload':
                                await this.reload();
                                break;
                            case 'get_url':
                                output = { output: await this.getUrl() };
                                break;
                            case 'get_page_text':
                                output = { output: await this.getPageText() };
                                break;
                            default:
                                output = { output: "unknown action" };
                        }
                    }
                    catch (e) {
                        output = { output: `error: ${e.message}` };
                        this.log(`Action error: ${e.message}`, 'error');
                    }
                    toolResponses.push({
                        functionResponse: {
                            name: call.name,
                            response: output
                        }
                    });
                }
                await new Promise(r => setTimeout(r, 1000));
                const nextScreenshot = await this.captureScreen();
                currentParts = toolResponses;
                if (nextScreenshot) {
                    currentParts.push({
                        inlineData: { mimeType: 'image/png', data: nextScreenshot }
                    });
                }
            }
            catch (error) {
                this.log(`API Error: ${error.message}`, 'error');
                break;
            }
        }
    }
    async captureScreen() {
        if (!this.activeWebContentsId)
            return null;
        const wc = webContents.fromId(this.activeWebContentsId);
        if (!wc || wc.isDestroyed())
            return null;
        try {
            const image = await wc.capturePage();
            // Resize to target dimensions for consistency/speed
            const resized = image.resize({ width: this.config.screenWidth, height: this.config.screenHeight });
            return resized.toPNG().toString('base64');
        }
        catch (e) {
            console.error("Capture failed:", e);
            return null;
        }
    }
    denormalize(coord, max) {
        return Math.round((coord / 1000) * max);
    }
    // --- Browser Actions ---
    async clickAt(x, y) {
        if (!this.activeWebContentsId)
            return;
        const wc = webContents.fromId(this.activeWebContentsId);
        if (!wc || wc.isDestroyed())
            return;
        const dimensions = await wc.executeJavaScript(`({width: window.innerWidth, height: window.innerHeight})`);
        const realX = this.denormalize(x, dimensions.width);
        const realY = this.denormalize(y, dimensions.height);
        wc.sendInputEvent({ type: 'mouseDown', x: realX, y: realY, button: 'left', clickCount: 1 });
        wc.sendInputEvent({ type: 'mouseUp', x: realX, y: realY, button: 'left', clickCount: 1 });
    }
    async typeText(text, pressEnter = true) {
        if (!this.activeWebContentsId)
            return;
        const wc = webContents.fromId(this.activeWebContentsId);
        if (!wc)
            return;
        for (const char of text) {
            wc.sendInputEvent({ type: 'char', keyCode: char });
            await new Promise(r => setTimeout(r, 10));
        }
        if (pressEnter) {
            wc.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
            wc.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
        }
    }
    async scroll(x, y, direction, magnitude) {
        if (!this.activeWebContentsId)
            return;
        const wc = webContents.fromId(this.activeWebContentsId);
        if (!wc)
            return;
        const scrollAmount = magnitude ? this.denormalize(magnitude, 1000) : 300;
        const js = `window.scrollBy({
             top: ${direction === 'down' ? scrollAmount : direction === 'up' ? -scrollAmount : 0},
             left: ${direction === 'right' ? scrollAmount : direction === 'left' ? -scrollAmount : 0},
             behavior: 'smooth'
         })`;
        await wc.executeJavaScript(js);
    }
    async navigate(url) {
        if (!this.activeWebContentsId)
            return;
        const wc = webContents.fromId(this.activeWebContentsId);
        if (!wc)
            return;
        await wc.loadURL(url.startsWith('http') ? url : `https://${url}`);
    }
    async search(query) {
        if (!this.activeWebContentsId)
            return;
        const wc = webContents.fromId(this.activeWebContentsId);
        if (!wc)
            return;
        await wc.loadURL(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
    }
    async goBack() {
        if (!this.activeWebContentsId)
            return;
        const wc = webContents.fromId(this.activeWebContentsId);
        if (wc && wc.canGoBack())
            wc.goBack();
    }
    async goForward() {
        if (!this.activeWebContentsId)
            return;
        const wc = webContents.fromId(this.activeWebContentsId);
        if (wc && wc.canGoForward())
            wc.goForward();
    }
    async reload() {
        if (!this.activeWebContentsId)
            return;
        const wc = webContents.fromId(this.activeWebContentsId);
        if (wc)
            wc.reload();
    }
    async getUrl() {
        if (!this.activeWebContentsId)
            return '';
        const wc = webContents.fromId(this.activeWebContentsId);
        return wc ? wc.getURL() : '';
    }
    async getPageText() {
        if (!this.activeWebContentsId)
            return '';
        const wc = webContents.fromId(this.activeWebContentsId);
        if (!wc)
            return '';
        return await wc.executeJavaScript(`document.body.innerText`);
    }
}
