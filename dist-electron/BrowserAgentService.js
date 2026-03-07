import electron from 'electron';
const { webContents } = electron;
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SetOfMark } from './agent/perception/SetOfMark.js';
const BROWSER_TOOLS = [
    {
        name: "click",
        description: "Click an interactive element on the screen. Provide the ID number of the red bounding box you want to interact with.",
        parameters: {
            type: "OBJECT",
            properties: {
                element_id: { type: "INTEGER", description: "The ID number shown in the red badge on the target element." },
                reason: { type: "STRING", description: "Why you are clicking here." }
            },
            required: ["element_id", "reason"]
        }
    },
    {
        name: "type_text",
        description: "Type text into a specific interactive element (like an input field or textarea).",
        parameters: {
            type: "OBJECT",
            properties: {
                element_id: { type: "INTEGER", description: "The ID number of the element to type into." },
                text: { type: "STRING", description: "The text to type." },
                pressEnter: { type: "BOOLEAN", description: "Whether to submit the form after typing by pressing Enter." }
            },
            required: ["element_id", "text"]
        }
    },
    {
        name: "navigate",
        description: "Navigate to a specific URL.",
        parameters: {
            type: "OBJECT",
            properties: {
                url: { type: "STRING", description: "The URL to navigate to." }
            },
            required: ["url"]
        }
    },
    {
        name: "scroll",
        description: "Scroll the page to find more elements.",
        parameters: {
            type: "OBJECT",
            properties: {
                direction: { type: "STRING", enum: ["up", "down"], description: "Scroll direction" },
                amount: { type: "INTEGER", description: "Amount of scroll in pixels" }
            },
            required: ["direction"]
        }
    },
    {
        name: "hover",
        description: "Hover over an interactive element. Use this for dropdown menus or tooltips.",
        parameters: {
            type: "OBJECT",
            properties: {
                element_id: { type: "INTEGER", description: "The ID number shown in the red badge on the target element." }
            },
            required: ["element_id"]
        }
    },
    {
        name: "right_click",
        description: "Right-click (context menu) an interactive element on the screen.",
        parameters: {
            type: "OBJECT",
            properties: {
                element_id: { type: "INTEGER", description: "The ID number shown in the red badge on the target element." }
            },
            required: ["element_id"]
        }
    },
    {
        name: "press_key",
        description: "Press a specific keyboard key (e.g. 'Enter', 'Escape', 'Tab', 'ArrowDown'). Useful for navigating menus or closing modals.",
        parameters: {
            type: "OBJECT",
            properties: {
                key: { type: "STRING", description: "The name of the key to press (e.g. 'Enter', 'Escape', 'ArrowDown')." }
            },
            required: ["key"]
        }
    },
    {
        name: "task_complete",
        description: "Call this when you have successfully established that the user's objective is achieved, or if it is impossible to proceed.",
        parameters: {
            type: "OBJECT",
            properties: {
                outcome: { type: "STRING", description: "Comprehensive summary of what was accomplished, including any extracted data requested." }
            },
            required: ["outcome"]
        }
    },
    {
        name: "extract_page_content",
        description: "Extract text content from the current page. Useful for reading articles, gathering data, or checking the status of a long process.",
        parameters: {
            type: "OBJECT",
            properties: {
                target: { type: "STRING", enum: ["full_page", "main_content"], description: "What part of the page to extract" }
            },
            required: ["target"]
        }
    },
    {
        name: "evaluate_js",
        description: "Evaluate arbitrary JavaScript on the page. Extremely powerful. Use this to extract complex tabular data, find hidden elements, or interact with complex custom UIs when standard clicking fails.",
        parameters: {
            type: "OBJECT",
            properties: {
                script: { type: "STRING", description: "The JavaScript code to evaluate. Must return a value or a Promise. e.g. 'return document.title;'" }
            },
            required: ["script"]
        }
    },
    {
        name: "wait",
        description: "Wait for a specific amount of time. Use this when you click a button that triggers a slow animation, network request, or page load, and you need to let the UI settle before the next frame.",
        parameters: {
            type: "OBJECT",
            properties: {
                ms: { type: "INTEGER", description: "Milliseconds to wait (e.g. 2000 for 2 seconds)." }
            },
            required: ["ms"]
        }
    }
];
export class BrowserAgentService {
    genAI;
    apiKeys;
    currentKeyIndex = 0;
    state;
    activeWebContentsId = null;
    window = null;
    isRunning = false;
    chatSession = null;
    SCREEN_WIDTH = 1280;
    SCREEN_HEIGHT = 720;
    constructor(apiKeys) {
        this.apiKeys = apiKeys;
        this.currentKeyIndex = 0;
        this.genAI = new GoogleGenerativeAI(this.apiKeys[this.currentKeyIndex]);
        this.state = {
            status: 'idle',
            currentTask: '',
            logs: []
        };
    }
    setTargetWindow(win) {
        this.window = win;
    }
    setActiveWebContentsId(id) {
        this.activeWebContentsId = id;
    }
    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const formatted = `[Agent] ${message}`;
        console.log(formatted);
        this.state.logs.push(formatted);
        if (this.window && !this.window.isDestroyed()) {
            this.window.webContents.send('agent:log', formatted);
        }
    }
    updateStatus(status) {
        this.state.status = status;
        if (this.window && !this.window.isDestroyed()) {
            this.window.webContents.send('agent:status', status);
        }
    }
    async executeObjective(task) {
        if (this.isRunning) {
            this.stop();
            await new Promise(r => setTimeout(r, 1000));
        }
        this.isRunning = true;
        this.state.currentTask = task;
        this.updateStatus('running');
        this.log(`🚀 Executing New Objective: "${task}"`, 'info');
        try {
            await this.autonomousLoop(task);
        }
        catch (error) {
            this.log(`❌ System Failure: ${error.message}`, 'error');
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
        this.isRunning = false;
        this.updateStatus('stopped');
        this.log("🛑 Objective execution halted.", 'info');
    }
    async captureBrowserViewport() {
        if (!this.activeWebContentsId)
            return null;
        const wc = webContents.fromId(this.activeWebContentsId);
        if (!wc || wc.isDestroyed())
            return null;
        try {
            const image = await wc.capturePage();
            // Resize for token efficiency
            const resized = image.resize({ width: this.SCREEN_WIDTH, height: this.SCREEN_HEIGHT });
            return resized.toPNG().toString('base64');
        }
        catch (e) {
            console.error("Screenshot capture failed:", e);
            return null;
        }
    }
    async autonomousLoop(goal) {
        let currentModelName = 'gemini-2.5-flash';
        let keyRotationCount = 0;
        const createSession = (modelName, history) => {
            const model = this.genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: `You are an elite, AGI-level Autonomous Browser Agent.
Your objective is to EXECUTE the user's task — not just find information, but ACTUALLY DO what they ask.

### CORE PRINCIPLE: ACTION, NOT INFORMATION
**CRITICAL**: If the user says "do X for me", "mail it", "send it", "fill it", "book it", "register" — you MUST actually PERFORM the action.
- "Mail it" = Open email, compose, type the content, and SEND it
- "Register" = Fill forms, submit them, complete the registration
- "Book it" = Select, fill details, and complete the booking
Finding information is ONLY the first step. The task is NOT complete until the ACTION is done.

### ANTI-HALLUCINATION RULES
**NEVER invent or fabricate data.** This is a fireable offense:
- Email addresses MUST come from the actual webpage — not your training data
- Phone numbers, URLs, prices, names MUST be visible on screen
- If you don't see specific data on the page, say "I could not find the exact information"
- NEVER generate email addresses like "support@company.com" from guessing
- Use extract_page_content or evaluate_js to READ actual data from pages

### Cognitive Architecture
1. **Analyze:** Examine the screenshot and available DOM elements with their element_ids.
2. **Plan:** Think deeply — what is the FULL task? Break it into steps. What step am I on?
3. **Execute:** Choose the most precise tool.
4. **Verify:** After action, check if it actually worked.

### Tool Usage Rules
- CLICK/TYPE: Always provide exact element_id from red badges. Use sendInputEvent for real clicks.
- NAVIGATION: Use navigate for URLs. Type in search bars for searches.
- DISCOVERY: scroll if target isn't visible. extract_page_content for reading text.
- ADVANCED: evaluate_js for complex interactions or data extraction.
- WAIT: After heavy transitions (login, search), wait for DOM to settle.

### TASK COMPLETION RULES
Before calling task_complete, ask yourself:
1. Did I ACTUALLY DO what the user asked? (not just find info)
2. Is ALL data I'm reporting FROM THE PAGE? (not hallucinated)
3. If user said "send/mail/submit" — did I ACTUALLY send/mail/submit?
4. If I only found information but user asked me to ACT — I must keep going.

ONLY call task_complete when the ACTION is truly finished and verified.

CRITICAL: Never guess an element_id. If you don't see a red box with a number, use evaluate_js or scroll.`,
                tools: [
                    { functionDeclarations: BROWSER_TOOLS }
                ]
            });
            return history ? model.startChat({ history }) : model.startChat({
                history: [{ role: 'user', parts: [{ text: `NEW DIRECTIVE: ${goal}` }] }]
            });
        };
        this.chatSession = createSession(currentModelName);
        let interactionTurn = 0;
        const MAX_TURNS = 20;
        while (interactionTurn < MAX_TURNS && this.isRunning) {
            interactionTurn++;
            this.log(`--- Turn ${interactionTurn}/${MAX_TURNS} ---`, 'info');
            if (!this.activeWebContentsId) {
                this.log("⚠️ No active tab.", 'error');
                break;
            }
            const wc = webContents.fromId(this.activeWebContentsId);
            if (!wc || wc.isDestroyed()) {
                this.log("⚠️ Tab destroyed.", 'error');
                break;
            }
            this.log("👓 Injecting Set-of-Mark Annotations...", 'info');
            const somElements = await SetOfMark.annotateViewport(wc);
            // Give the browser 50ms to physically render the CSS boxes before screenshotting
            await new Promise(r => setTimeout(r, 50));
            const screenshotBase64 = await this.captureBrowserViewport();
            // Instantly clean up annotations so user doesn't just stare at red boxes
            await SetOfMark.cleanup(wc);
            if (!screenshotBase64) {
                this.log("⚠️ Viewport inaccessible. Retrying...", 'error');
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }
            try {
                this.log("🧠 Processing Multimodal Frame (with DOM Map)...", 'info');
                // Truncate DOM array if too huge to save context, but realistically SO is fast
                const cleanDom = somElements.map((el) => ({ id: el.id, tag: el.tag, text: el.text }));
                const currentUrl = wc.getURL();
                const startTime = Date.now();
                const result = await this.chatSession.sendMessage([
                    { inlineData: { mimeType: 'image/png', data: screenshotBase64 } },
                    { text: `Analyze the viewport and execute the next action required for the directive. \nCURRENT URL: ${currentUrl}\nAvailable Interactive Elements:\n${JSON.stringify(cleanDom)}` }
                ]);
                const latency = Date.now() - startTime;
                this.log(`⏱️ [${currentModelName}] Inference Time: ${(latency / 1000).toFixed(2)}s`, 'info');
                const functionCall = result.response.functionCalls()?.[0];
                if (functionCall) {
                    const { name, args } = functionCall;
                    this.log(`⚡ Action: ${name}(${JSON.stringify(args)})`, 'action');
                    const toolEvaluation = await this.orchestrateToolCall(name, args);
                    this.log(`  -> Action Result: ${JSON.stringify(toolEvaluation)}`, 'info');
                    // Report the tool outcome back to Gemini
                    await this.chatSession.sendMessage([
                        {
                            functionResponse: {
                                name: name,
                                response: { content: toolEvaluation }
                            }
                        }
                    ]);
                    if (name === 'task_complete') {
                        this.log(`✅ Objective Finished: ${args.outcome}`, 'action');
                        break;
                    }
                    // Network/Animation buffer delay (Reduced for speed)
                    await new Promise(r => setTimeout(r, 500));
                }
                else {
                    const modelFeedback = result.response.text();
                    this.log(`💭 Thought: ${modelFeedback}`, 'info');
                    if (this.window && !this.window.isDestroyed()) {
                        this.window.webContents.send('gemini:thought', modelFeedback);
                    }
                }
            }
            catch (error) {
                const msg = (error.message || '').toLowerCase();
                if (msg.includes('429') || msg.includes('quota') || msg.includes('limit') || msg.includes('exhausted') || msg.includes('too many') || msg.includes('overloaded')) {
                    this.log(`⚠️ API Rate Limit Hit. Rotating Key...`, 'error');
                    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
                    this.genAI = new GoogleGenerativeAI(this.apiKeys[this.currentKeyIndex]);
                    keyRotationCount++;
                    // Fallback to 3-flash-preview if we've exhausted all available keys on 2.5
                    if (keyRotationCount >= this.apiKeys.length && currentModelName === 'gemini-2.5-flash') {
                        this.log(`⚠️ All ${this.apiKeys.length} API Keys exhausted for gemini-2.5-flash. Falling back to gemini-3-flash-preview...`, 'error');
                        currentModelName = 'gemini-3-flash-preview';
                        keyRotationCount = 0; // Reset counter for 3-flash keys
                    }
                    try {
                        const oldHistory = await this.chatSession.getHistory();
                        this.chatSession = createSession(currentModelName, oldHistory);
                        this.log(`🔄 Key rotated to Index ${this.currentKeyIndex}. Resuming...`, 'info');
                        continue;
                    }
                    catch (e) {
                        this.log(`⚠️ Failed to restore session history: ${e.message}`, 'error');
                    }
                }
                else {
                    this.log(`⚠️ Orchestration Error: ${error.message}`, 'error');
                    await new Promise(r => setTimeout(r, 3000));
                }
            }
        }
    }
    async orchestrateToolCall(name, args) {
        if (!this.activeWebContentsId)
            return { error: "No active browser tab found." };
        const wc = webContents.fromId(this.activeWebContentsId);
        if (!wc || wc.isDestroyed())
            return { error: "Browser tab was closed unexpectedly." };
        // Pass the cached array into the orchestrated tool if needed, but for simplicity
        // let's click using JavaScript dynamically
        try {
            switch (name) {
                case 'click':
                    if (args.element_id !== undefined) {
                        return await this.performSetOfMarkAction(wc, args.element_id, 'click');
                    }
                    else {
                        return { error: "Missing element_id parameter." };
                    }
                case 'type_text':
                    if (args.element_id !== undefined) {
                        // Click to activate (not just focus — focus doesn't work on many sites)
                        const clickResult = await this.performSetOfMarkAction(wc, args.element_id, 'click');
                        if (clickResult.error)
                            return clickResult;
                        await new Promise(r => setTimeout(r, 150));
                    }
                    if (args.text) {
                        // Use execCommand('insertText') — the MOST compatible method
                        // Works with React, Vue, Angular, contenteditable (WhatsApp, Slack)
                        const safeText = args.text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
                        const typeScript = `(() => {
                            const el = document.activeElement;
                            if (!el) return { error: 'No focused element' };
                            
                            let success = document.execCommand('insertText', false, '${safeText}');
                            
                            if (!success || (el.value !== undefined && !el.value.includes('${safeText.substring(0, 20)}'))) {
                                if (el.value !== undefined) {
                                    const setter = Object.getOwnPropertyDescriptor(
                                        window.HTMLInputElement.prototype, 'value'
                                    )?.set || Object.getOwnPropertyDescriptor(
                                        window.HTMLTextAreaElement.prototype, 'value'
                                    )?.set;
                                    if (setter) {
                                        setter.call(el, (el.value || '') + '${safeText}');
                                    } else {
                                        el.value = (el.value || '') + '${safeText}';
                                    }
                                    el.dispatchEvent(new Event('input', { bubbles: true }));
                                    el.dispatchEvent(new Event('change', { bubbles: true }));
                                } else if (el.isContentEditable || el.contentEditable === 'true') {
                                    el.textContent = (el.textContent || '') + '${safeText}';
                                    el.dispatchEvent(new Event('input', { bubbles: true }));
                                }
                            }
                            
                            const val = el.value || el.textContent || el.innerText || '';
                            return { success: true, hasValue: val.length > 0, preview: val.substring(Math.max(0, val.length - 40)) };
                        })()`;
                        const typeResult = await wc.executeJavaScript(typeScript);
                        if (typeResult.error)
                            return typeResult;
                    }
                    if (args.pressEnter || args.press_enter) {
                        await new Promise(r => setTimeout(r, 200));
                        wc.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
                        await new Promise(r => setTimeout(r, 30));
                        wc.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
                    }
                    return { success: true, message: `Typed text successfully into element ${args.element_id || 'focused'}.` };
                case 'right_click':
                    if (args.element_id !== undefined) {
                        return await this.performSetOfMarkAction(wc, args.element_id, 'right_click');
                    }
                    else {
                        return { error: "Missing element_id parameter." };
                    }
                case 'hover':
                    if (args.element_id !== undefined) {
                        return await this.performSetOfMarkAction(wc, args.element_id, 'hover');
                    }
                    else {
                        return { error: "Missing element_id parameter." };
                    }
                case 'press_key':
                    if (args.key) {
                        wc.sendInputEvent({ type: 'keyDown', keyCode: args.key });
                        wc.sendInputEvent({ type: 'keyUp', keyCode: args.key });
                        return { success: true, message: `Pressed key: ${args.key}` };
                    }
                    return { error: "Missing key parameter." };
                case 'navigate':
                    if (args.url) {
                        await wc.loadURL(args.url.startsWith('http') ? args.url : `https://${args.url}`);
                        return { success: true, message: `Navigating to URL.` };
                    }
                    return { error: "Missing 'url' parameter." };
                case 'scroll':
                    const amount = args.amount || 400;
                    const jsPayload = args.direction === 'up'
                        ? `window.scrollBy({ top: -${amount}, behavior: 'smooth' })`
                        : `window.scrollBy({ top: ${amount}, behavior: 'smooth' })`;
                    await wc.executeJavaScript(jsPayload);
                    return { success: true, message: `Scrolled window ${args.direction} by ${amount}px.` };
                case 'task_complete':
                    return { success: true, status: "complete" };
                case 'extract_page_content':
                    const extScript = args.target === 'full_page'
                        ? `document.body.innerText`
                        : `(document.querySelector('main') || document.body).innerText`;
                    const text = await wc.executeJavaScript(extScript);
                    return { success: true, content: text.substring(0, 15000) }; // cap at 15k chars to save tokens
                case 'evaluate_js':
                    if (args.script) {
                        try {
                            const evalObj = await wc.executeJavaScript(`(async () => { ${args.script} })()`);
                            return { success: true, result: evalObj };
                        }
                        catch (err) {
                            return { error: `JS Evaluation Error: ${err.message}` };
                        }
                    }
                    return { error: "Missing 'script' parameter." };
                case 'wait':
                    if (args.ms) {
                        await new Promise(r => setTimeout(r, args.ms));
                        return { success: true, message: `Waited for ${args.ms}ms.` };
                    }
                    return { error: "Missing 'ms' parameter." };
                default:
                    return { error: `Unrecognized tool capability: ${name}` };
            }
        }
        catch (e) {
            return { error: `Execution Exception: ${e.message}` };
        }
    }
    async performSetOfMarkAction(wc, id, action) {
        // Phase 1: Find element, scroll into view, get coordinates
        const prepScript = `
            (() => {
                const interactiveSelectors = [
                    'button', 'a', 'input', 'select', 'textarea', 
                    '[role="button"]', '[role="link"]', '[role="checkbox"]', 
                    '[role="radio"]', '[role="switch"]', '[role="tab"]',
                    '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]',
                    'summary', 'details', 'label[for]'
                ].join(', ');

                const elements = Array.from(document.querySelectorAll(interactiveSelectors));
                let idCounter = 1;
                let target = null;
                
                for(let el of elements) {
                    const rect = el.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0 || el.disabled || window.getComputedStyle(el).visibility === 'hidden') continue;
                    if (rect.top >= window.innerHeight || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.right <= 0) continue;
                    
                    if (idCounter === ${id}) {
                        target = el;
                        break;
                    }
                    idCounter++;
                }

                if (!target) return { error: "Element ID not found in current viewport." };

                target.scrollIntoView({ behavior: 'instant', block: 'center' });
                const rect = target.getBoundingClientRect();
                const cx = Math.round(rect.left + rect.width / 2);
                const cy = Math.round(rect.top + rect.height / 2);

                return {
                    found: true,
                    tag: target.tagName,
                    text: (target.innerText || '').substring(0, 50),
                    href: target.href || '',
                    isLink: target.tagName === 'A' && !!target.href,
                    cx, cy,
                    rect: {x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height)}
                };
            })();
        `;
        try {
            const prep = await wc.executeJavaScript(prepScript);
            if (prep.error)
                return prep;
            const { cx, cy } = prep;
            if (action === 'click') {
                // PRIMARY: sendInputEvent — generates isTrusted:true events
                if (cx > 0 && cy > 0 && cx < 3000 && cy < 3000) {
                    wc.sendInputEvent({ type: 'mouseDown', x: cx, y: cy, button: 'left', clickCount: 1 });
                    await new Promise(r => setTimeout(r, 40));
                    wc.sendInputEvent({ type: 'mouseUp', x: cx, y: cy, button: 'left', clickCount: 1 });
                    await new Promise(r => setTimeout(r, 100));
                }
                // Fallback for links
                if (prep.isLink) {
                    try {
                        await wc.executeJavaScript(`(() => {
                            const els = document.querySelectorAll('a[href]');
                            for (const el of els) {
                                const r = el.getBoundingClientRect();
                                if (Math.abs(r.left + r.width/2 - ${cx}) < 5 && Math.abs(r.top + r.height/2 - ${cy}) < 5) {
                                    el.click(); break;
                                }
                            }
                        })()`);
                    }
                    catch (_) { }
                }
                return { success: true, message: "Element clicked.", tag: prep.tag, text: prep.text };
            }
            else if (action === 'right_click') {
                await wc.executeJavaScript(`
                    document.elementFromPoint(${cx}, ${cy})?.dispatchEvent(
                        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, view: window, clientX: ${cx}, clientY: ${cy}, button: 2 })
                    )
                `);
                return { success: true, message: "Element right-clicked." };
            }
            else if (action === 'hover') {
                wc.sendInputEvent({ type: 'mouseMove', x: cx, y: cy });
                return { success: true, message: "Hovered over element." };
            }
            else if (action === 'focus') {
                if (cx > 0 && cy > 0) {
                    wc.sendInputEvent({ type: 'mouseDown', x: cx, y: cy, button: 'left', clickCount: 1 });
                    await new Promise(r => setTimeout(r, 40));
                    wc.sendInputEvent({ type: 'mouseUp', x: cx, y: cy, button: 'left', clickCount: 1 });
                }
                return { success: true, message: "Element focused." };
            }
            return { error: "Unknown action" };
        }
        catch (e) {
            return { error: "Script injection failed: " + e.message };
        }
    }
}
