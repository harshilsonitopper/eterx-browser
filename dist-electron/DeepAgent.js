import { webContents } from 'electron';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
// --- Tool Definitions (Gemini Schema) ---
const BROWSER_TOOLS = [
    {
        name: "click",
        description: "Click at specific X,Y coordinates on the screen. Use this to interact with buttons, links, and form fields.",
        parameters: {
            type: "OBJECT",
            properties: {
                x: { type: "INTEGER", description: "The X coordinate to click (0-1024)." },
                y: { type: "INTEGER", description: "The Y coordinate to click (0-768)." }
            },
            required: ["x", "y"]
        }
    },
    {
        name: "type",
        description: "Type text into the currently focused element. Usually follows a 'click' action.",
        parameters: {
            type: "OBJECT",
            properties: {
                text: { type: "STRING", description: "The text to type." },
                submit: { type: "BOOLEAN", description: "Whether to press Enter after typing." }
            },
            required: ["text"]
        }
    },
    {
        name: "scroll",
        description: "Scroll the page up or down.",
        parameters: {
            type: "OBJECT",
            properties: {
                direction: { type: "STRING", enum: ["up", "down"], description: "The direction to scroll." },
                amount: { type: "INTEGER", description: "Pixels to scroll (default 300)." }
            },
            required: ["direction"]
        }
    },
    {
        name: "navigate",
        description: "Navigate the browser to a specific URL.",
        parameters: {
            type: "OBJECT",
            properties: {
                url: { type: "STRING", description: "The full URL to navigate to." }
            },
            required: ["url"]
        }
    },
    {
        name: "done",
        description: "Call this when the user's goal is achieved or if you cannot proceed.",
        parameters: {
            type: "OBJECT",
            properties: {
                summary: { type: "STRING", description: "A brief summary of what was accomplished." }
            },
            required: ["summary"]
        }
    },
    {
        name: "get_country_info",
        description: "Get comprehensive information about a country using an external API. Use this when the user asks to see a country using API.",
        parameters: {
            type: "OBJECT",
            properties: {
                country: { type: "STRING", description: "The name of the country to look up." }
            },
            required: ["country"]
        }
    }
];
// --- Model Registry ---
const MODEL_REGISTRY = {
    '2.5-flash': 'gemini-2.5-flash',
    '2.5-pro': 'gemini-1.5-pro-latest',
    '2.5-flash-lite': 'gemini-1.5-flash-8b',
};
export class DeepAgent {
    genAI;
    model;
    state;
    config;
    activeWebContentsId = null;
    window = null;
    isRunning = false;
    shouldStop = false;
    chatSession = null;
    constructor(apiKey, modelType = '2.5-flash') {
        const actualModel = MODEL_REGISTRY[modelType] || 'gemini-2.5-flash';
        this.config = {
            apiKey,
            modelName: actualModel,
            maxTurns: 50,
            screenWidth: 1024,
            screenHeight: 768
        };
        console.log(`[DeepAgent] Initialized Native Tool Agent with: ${modelType} (${this.config.modelName})`);
        this.genAI = new GoogleGenAI({ apiKey: this.config.apiKey });
        // @ts-ignore
        this.model = this.genAI.getGenerativeModel({
            model: this.config.modelName,
            systemInstruction: `You are an Autonomous Browser Agent.
You interact with the browser using the provided tools.
You are "Agentic": you feel the flow of the task and call tools naturally.
- Receive a screenshot + goal.
- Decide which tool to call.
- Receive tool result.
- Repeat until done.
Coordinate System: 1024x768. X=0,Y=0 is top-left.`,
            tools: [{ functionDeclarations: BROWSER_TOOLS }],
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
        });
        this.state = {
            status: 'idle',
            currentTask: '',
            logs: [],
            history: []
        };
    }
    setTargetWindow(win) {
        this.window = win;
    }
    setActiveWebContents(id) {
        this.activeWebContentsId = id;
    }
    log(message, type = 'info') {
        const logEntry = `[DeepAgent] ${message}`;
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
        if (this.isRunning) {
            this.stop();
            await new Promise(r => setTimeout(r, 1000));
        }
        this.isRunning = true;
        this.shouldStop = false;
        this.state.currentTask = task;
        this.updateStatus('running');
        this.log(`🚀 Starting Task (Native Tools): "${task}"`, 'info');
        try {
            await this.agentLoop(task);
        }
        catch (error) {
            this.log(`❌ Critical Error: ${error.message}`, 'error');
            this.updateStatus('error');
        }
        finally {
            this.isRunning = false;
            // Only go back to idle if we didn't stop intentionally
            if (this.state.status !== 'stopped') {
                this.updateStatus('idle');
            }
        }
    }
    stop() {
        this.shouldStop = true;
        this.isRunning = false;
        this.updateStatus('stopped');
        this.log("🛑 Agent stopped by user.", 'info');
    }
    async agentLoop(goal) {
        let turn = 0;
        // Start a new chat session
        this.chatSession = this.model.startChat({
            history: [
                { role: 'user', parts: [{ text: `GOAL: ${goal}` }] }
            ]
        });
        while (turn < this.config.maxTurns) {
            if (this.shouldStop)
                break;
            turn++;
            this.log(`--- Turn ${turn}/${this.config.maxTurns} ---`, 'info');
            // 1. Capture Vision
            const screenshotBase64 = await this.captureScreen();
            if (!screenshotBase64) {
                this.log("Failed to capture screen. Waiting...", 'error');
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }
            // 2. Send to Gemini (Screenshot + "What next?")
            this.log("🧠 Thinking (Function Calling)...", 'info');
            try {
                // We send the screenshot as a user message part in the turn
                const result = await this.chatSession.sendMessage([
                    { inlineData: { mimeType: 'image/png', data: screenshotBase64 } },
                    { text: "Analyze the screen and execute the next step using tools." }
                ]);
                // 3. Process Response (Tool Calls)
                const call = result.response.functionCalls()?.[0];
                if (call) {
                    // It's a tool call!
                    const { name, args } = call;
                    this.log(`⚡ Tool Call: ${name}(${JSON.stringify(args)})`, 'action');
                    // Execute
                    const toolResult = await this.executeTool(name, args);
                    // Send Result back to model (Native Function Calling flow)
                    // The SDK handles this via history usually, but we might need to manually send the functionResponse
                    this.log(`  -> Result: ${JSON.stringify(toolResult)}`, 'info');
                    // Note: In GoogleGenAI proper, you'd send `functionResponse` parts.
                    // For simplicity, we just send it as text relative to the previous turn if manual,
                    // OR rely on the fact that `sendMessage` persists context.
                    // Actually, we must send the tool response back for the model to continue.
                    await this.chatSession.sendMessage([
                        {
                            functionResponse: {
                                name: name,
                                response: { result: toolResult }
                            }
                        }
                    ]);
                    if (name === 'done') {
                        this.log(`✅ Task Finished: ${args.summary}`, 'action');
                        break;
                    }
                    // Wait for page update after action
                    await new Promise(r => setTimeout(r, 2000));
                }
                else {
                    // It's just text
                    const text = result.response.text();
                    this.log(`💭 Model: ${text}`, 'info');
                    if (this.window)
                        this.window.webContents.send('gemini:thought', text);
                    // Any text response that isn't a tool call might be a question or partial thought.
                    // We continue the loop.
                }
            }
            catch (error) {
                this.log(`API Loop Error: ${error.message}`, 'error');
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    }
    async executeTool(name, args) {
        if (!this.activeWebContentsId)
            return { error: "No active tab" };
        const wc = webContents.fromId(this.activeWebContentsId);
        if (!wc || wc.isDestroyed())
            return { error: "Tab destroyed" };
        try {
            switch (name) {
                case 'click':
                    await this.clickAt(wc, args.x, args.y);
                    return { status: "clicked" };
                case 'type':
                    if (args.text) {
                        for (const char of args.text) {
                            wc.sendInputEvent({ type: 'char', keyCode: char });
                            await new Promise(r => setTimeout(r, 10));
                        }
                    }
                    if (args.submit) {
                        wc.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
                        wc.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
                    }
                    return { status: "typed" };
                case 'scroll':
                    const amount = args.amount || 300;
                    const code = args.direction === 'up'
                        ? `window.scrollBy(0, -${amount})`
                        : `window.scrollBy(0, ${amount})`;
                    await wc.executeJavaScript(code);
                    return { status: "scrolled" };
                case 'navigate':
                    if (args.url) {
                        await wc.loadURL(args.url.startsWith('http') ? args.url : `https://${args.url}`);
                        return { status: "navigating" };
                    }
                    return { error: "No URL" };
                case 'get_country_info':
                    if (args.country) {
                        try {
                            const response = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(args.country)}?fullText=true`);
                            const data = await response.json();
                            if (response.ok && data && data.length > 0) {
                                return {
                                    status: "success",
                                    data: {
                                        name: data[0].name.common,
                                        capital: data[0].capital?.[0],
                                        population: data[0].population,
                                        region: data[0].region,
                                        currencies: data[0].currencies,
                                    }
                                };
                            }
                            return { error: "Country not found" };
                        }
                        catch (e) {
                            return { error: e.message };
                        }
                    }
                    return { error: "No country provided" };
                case 'done':
                    return { status: "done" };
                default:
                    return { error: "Unknown tool" };
            }
        }
        catch (e) {
            return { error: e.message };
        }
    }
    async clickAt(wc, x, y) {
        // Rescale from 1024x768 to actual window size
        const dimensions = await wc.executeJavaScript(`({width: window.innerWidth, height: window.innerHeight})`);
        const scaleX = dimensions.width / this.config.screenWidth;
        const scaleY = dimensions.height / this.config.screenHeight;
        const realX = Math.round(x * scaleX);
        const realY = Math.round(y * scaleY);
        wc.sendInputEvent({ type: 'mouseDown', x: realX, y: realY, button: 'left', clickCount: 1 });
        wc.sendInputEvent({ type: 'mouseUp', x: realX, y: realY, button: 'left', clickCount: 1 });
    }
    async captureScreen() {
        if (!this.activeWebContentsId)
            return null;
        const wc = webContents.fromId(this.activeWebContentsId);
        if (!wc || wc.isDestroyed())
            return null;
        try {
            const image = await wc.capturePage();
            const resized = image.resize({ width: this.config.screenWidth, height: this.config.screenHeight });
            return resized.toPNG().toString('base64');
        }
        catch (e) {
            console.error("Capture failed:", e);
            return null;
        }
    }
}
