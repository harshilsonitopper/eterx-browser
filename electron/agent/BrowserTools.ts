/**
 * BrowserTools.ts — 50+ Advanced Browser Tools
 * 
 * All tool definitions + handlers for the NextGenAgent.
 * Organized by category: navigation, interaction, form, scrolling,
 * extraction, tab management, human emulation, advanced, control.
 */

import { ToolRegistry, ToolContext, ToolDefinition } from './ToolRegistry.js';
import { webContents } from 'electron';

export function registerAllBrowserTools(registry: ToolRegistry): void {

    // ═══════════════════════════════════════════
    // NAVIGATION TOOLS
    // ═══════════════════════════════════════════

    registry.register({
        name: 'navigate',
        description: 'Navigate the browser to a specific URL. Supports partial URLs (auto-adds https://).',
        category: 'navigation',
        parameters: {
            url: { type: 'STRING', description: 'The URL to navigate to.' }
        },
        requiredParams: ['url'],
        priority: 95,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const url = args.url.startsWith('http') ? args.url : `https://${ args.url }`;
            await wc.loadURL(url);
            await ctx.humanDelay(500, 1500);
            return { success: true, message: `Navigated to ${ url }`, title: wc.getTitle(), url: wc.getURL() };
        }
    });

    registry.register({
        name: 'go_back',
        description: 'Go back to the previous page in history.',
        category: 'navigation',
        parameters: {},
        requiredParams: [],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            if (wc.canGoBack()) { wc.goBack(); await ctx.humanDelay(300, 800); return { success: true }; }
            return { error: 'No history to go back to' };
        }
    });

    registry.register({
        name: 'go_forward',
        description: 'Go forward in history.',
        category: 'navigation',
        parameters: {},
        requiredParams: [],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            if (wc.canGoForward()) { wc.goForward(); await ctx.humanDelay(300, 800); return { success: true }; }
            return { error: 'No forward history' };
        }
    });

    registry.register({
        name: 'refresh',
        description: 'Refresh/reload the current page.',
        category: 'navigation',
        parameters: {},
        requiredParams: [],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            wc.reload();
            await ctx.humanDelay(1000, 2000);
            return { success: true, message: 'Page refreshed' };
        }
    });

    registry.register({
        name: 'wait_for_navigation',
        description: 'Wait until the page finishes loading (useful after clicking a link that triggers navigation).',
        category: 'navigation',
        parameters: {
            timeout_ms: { type: 'INTEGER', description: 'Max time to wait in ms (default 10000).' }
        },
        requiredParams: [],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const timeout = args.timeout_ms || 10000;
            return new Promise(resolve => {
                const timer = setTimeout(() => resolve({ success: true, message: 'Timeout reached, page may still be loading.' }), timeout);
                wc.once('did-finish-load', () => { clearTimeout(timer); resolve({ success: true, message: 'Page loaded.' }); });
            });
        }
    });

    // ═══════════════════════════════════════════
    // INTERACTION TOOLS (SOM-based)
    // ═══════════════════════════════════════════

    registry.register({
        name: 'click',
        description: 'Click an interactive element by its Set-of-Mark ID (the red numbered badge on elements). Use this for buttons, links, checkboxes, etc.',
        category: 'interaction',
        parameters: {
            element_id: { type: 'INTEGER', description: 'The red badge ID number on the target element.' },
            reason: { type: 'STRING', description: 'Brief reason for clicking (helps with planning).' }
        },
        requiredParams: ['element_id'],
        priority: 100,
        handler: async (args: any, ctx: ToolContext) => {
            return await performSOMAction(ctx, args.element_id, 'click');
        }
    });

    registry.register({
        name: 'double_click',
        description: 'Double-click an element by its SOM ID. Use for text selection, opening items, etc.',
        category: 'interaction',
        parameters: {
            element_id: { type: 'INTEGER', description: 'The red badge ID number.' }
        },
        requiredParams: ['element_id'],
        handler: async (args: any, ctx: ToolContext) => {
            return await performSOMAction(ctx, args.element_id, 'dblclick');
        }
    });

    registry.register({
        name: 'type_text',
        description: 'Type text into an element. First focuses the element by SOM ID, then types character by character with human-like delays.',
        category: 'interaction',
        parameters: {
            element_id: { type: 'INTEGER', description: 'SOM ID of the input/textarea to type into.' },
            text: { type: 'STRING', description: 'The text to type.' },
            clear_first: { type: 'BOOLEAN', description: 'Whether to clear existing text before typing (default false).' },
            press_enter: { type: 'BOOLEAN', description: 'Whether to press Enter after typing (submit form).' }
        },
        requiredParams: ['element_id', 'text'],
        priority: 95,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };

            // Step 1: Click the element to give it REAL focus (not just JS focus)
            const clickResult = await performSOMAction(ctx, args.element_id, 'click');
            if (clickResult.error) return clickResult;
            await ctx.humanDelay(100, 200);

            // Step 2: Clear if requested
            if (args.clear_first) {
                wc.sendInputEvent({ type: 'keyDown', keyCode: 'a', modifiers: ['control'] } as any);
                wc.sendInputEvent({ type: 'keyUp', keyCode: 'a', modifiers: ['control'] } as any);
                await new Promise(r => setTimeout(r, 50));
                wc.sendInputEvent({ type: 'keyDown', keyCode: 'Backspace' } as any);
                wc.sendInputEvent({ type: 'keyUp', keyCode: 'Backspace' } as any);
                await ctx.humanDelay(100, 200);
            }

            // Step 3: Type using execCommand('insertText') — the MOST compatible method
            // This triggers React/Vue/Angular synthetic events, works on contenteditable (WhatsApp, Slack),
            // and fires beforeinput/input/change events correctly
            const text = args.text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
            const typeScript = `(() => {
                const el = document.activeElement;
                if (!el) return { error: 'No focused element' };

                // Method 1: execCommand('insertText') — works on most modern sites
                let success = document.execCommand('insertText', false, '${ text }');
                
                if (!success || (el.value !== undefined && !el.value.includes('${ text.substring(0, 20) }'))) {
                    // Method 2: Direct value setting + React-compatible event dispatch
                    if (el.value !== undefined) {
                        // For regular input/textarea
                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                            window.HTMLInputElement.prototype, 'value'
                        )?.set || Object.getOwnPropertyDescriptor(
                            window.HTMLTextAreaElement.prototype, 'value'
                        )?.set;
                        if (nativeInputValueSetter) {
                            nativeInputValueSetter.call(el, (el.value || '') + '${ text }');
                        } else {
                            el.value = (el.value || '') + '${ text }';
                        }
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        success = true;
                    } else if (el.isContentEditable || el.contentEditable === 'true') {
                        // For contenteditable (WhatsApp, Slack, etc.)
                        el.textContent = (el.textContent || '') + '${ text }';
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        success = true;
                    }
                }

                const currentValue = el.value || el.textContent || el.innerText || '';
                return {
                    success: true,
                    typed: '${ text }'.substring(0, 30),
                    elementTag: el.tagName,
                    elementType: el.type || 'contenteditable',
                    hasValue: currentValue.length > 0,
                    valuePreview: currentValue.substring(Math.max(0, currentValue.length - 40))
                };
            })()`;

            const typeResult = await wc.executeJavaScript(typeScript);

            // Step 4: Press Enter if requested
            if (args.press_enter) {
                await ctx.humanDelay(200, 400);
                wc.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' } as any);
                await new Promise(r => setTimeout(r, 30));
                wc.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' } as any);
            }

            return typeResult;
        }
    });

    registry.register({
        name: 'hover',
        description: 'Hover over an element to trigger dropdowns, tooltips, or sub-menus.',
        category: 'interaction',
        parameters: {
            element_id: { type: 'INTEGER', description: 'SOM ID of element to hover.' }
        },
        requiredParams: ['element_id'],
        handler: async (args: any, ctx: ToolContext) => {
            return await performSOMAction(ctx, args.element_id, 'hover');
        }
    });

    registry.register({
        name: 'right_click',
        description: 'Right-click (context menu) on an element.',
        category: 'interaction',
        parameters: {
            element_id: { type: 'INTEGER', description: 'SOM ID of element.' }
        },
        requiredParams: ['element_id'],
        handler: async (args: any, ctx: ToolContext) => {
            return await performSOMAction(ctx, args.element_id, 'right_click');
        }
    });

    registry.register({
        name: 'press_key',
        description: 'Press a keyboard key. Use for Enter, Escape, Tab, ArrowDown, ArrowUp, Space, Backspace, Delete, etc.',
        category: 'interaction',
        parameters: {
            key: { type: 'STRING', description: 'Key name (Enter, Escape, Tab, ArrowDown, Space, Backspace, etc.).' },
            modifiers: { type: 'STRING', description: 'Optional modifiers: ctrl, shift, alt (comma-separated). E.g. "ctrl" for Ctrl+key.' }
        },
        requiredParams: ['key'],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const mods = args.modifiers ? args.modifiers.split(',').map((m: string) => m.trim()) : [];
            wc.sendInputEvent({ type: 'keyDown', keyCode: args.key, modifiers: mods } as any);
            wc.sendInputEvent({ type: 'keyUp', keyCode: args.key, modifiers: mods } as any);
            return { success: true, message: `Pressed ${ mods.length ? mods.join('+') + '+' : '' }${ args.key }` };
        }
    });

    registry.register({
        name: 'select_option',
        description: 'Select an option from a <select> dropdown by its value or visible text.',
        category: 'interaction',
        parameters: {
            element_id: { type: 'INTEGER', description: 'SOM ID of the <select> element.' },
            value: { type: 'STRING', description: 'The option value or visible text to select.' }
        },
        requiredParams: ['element_id', 'value'],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const script = `
                (() => {
                    ${ getSOMFinderScript(args.element_id) }
                    if (!target) return { error: 'Element not found' };
                    if (target.tagName !== 'SELECT') return { error: 'Not a select element' };
                    const opt = Array.from(target.options).find(o => o.value === '${ args.value }' || o.textContent.trim() === '${ args.value }');
                    if (!opt) return { error: 'Option not found: ${ args.value }' };
                    target.value = opt.value;
                    target.dispatchEvent(new Event('change', { bubbles: true }));
                    return { success: true, message: 'Selected: ' + opt.textContent.trim() };
                })()`;
            return await wc.executeJavaScript(script);
        }
    });

    registry.register({
        name: 'upload_file',
        description: 'Trigger a file input dialog on a file upload element.',
        category: 'interaction',
        parameters: {
            element_id: { type: 'INTEGER', description: 'SOM ID of the file input element.' }
        },
        requiredParams: ['element_id'],
        handler: async (args: any, ctx: ToolContext) => {
            return await performSOMAction(ctx, args.element_id, 'click');
        }
    });

    // ═══════════════════════════════════════════
    // SCROLLING TOOLS
    // ═══════════════════════════════════════════

    registry.register({
        name: 'scroll',
        description: 'Scroll the page up or down by a pixel amount.',
        category: 'scrolling',
        parameters: {
            direction: { type: 'STRING', description: 'up or down', enum: ['up', 'down'] },
            amount: { type: 'INTEGER', description: 'Pixels to scroll (default 400).' }
        },
        requiredParams: ['direction'],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const amt = args.amount || 400;
            const px = args.direction === 'up' ? -amt : amt;
            await wc.executeJavaScript(`window.scrollBy({ top: ${ px }, behavior: 'smooth' })`);
            await ctx.humanDelay(300, 600);
            return { success: true, message: `Scrolled ${ args.direction } by ${ amt }px` };
        }
    });

    registry.register({
        name: 'scroll_to_top',
        description: 'Scroll to the very top of the page.',
        category: 'scrolling',
        parameters: {},
        requiredParams: [],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            await wc.executeJavaScript(`window.scrollTo({ top: 0, behavior: 'smooth' })`);
            return { success: true };
        }
    });

    registry.register({
        name: 'scroll_to_bottom',
        description: 'Scroll to the very bottom of the page.',
        category: 'scrolling',
        parameters: {},
        requiredParams: [],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            await wc.executeJavaScript(`window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })`);
            await ctx.humanDelay(500, 1000);
            return { success: true };
        }
    });

    // ═══════════════════════════════════════════
    // EXTRACTION TOOLS (THE BRAIN — deep page understanding)
    // ═══════════════════════════════════════════

    registry.register({
        name: 'read_page_content',
        description: 'Read the FULL text content of the entire page (not just visible viewport). This gives you complete page understanding without needing to scroll. Use this when you first land on a page to understand its structure.',
        category: 'extraction',
        parameters: {
            target: { type: 'STRING', description: 'What to read: "full" (entire page), "main" (main content area only), "visible" (only viewport).', enum: ['full', 'main', 'visible'] }
        },
        requiredParams: ['target'],
        priority: 90,
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            let script: string;
            switch (args.target) {
                case 'main':
                    script = `(document.querySelector('main, article, [role="main"], .content, #content, .main-content') || document.body).innerText`;
                    break;
                case 'visible':
                    script = `(() => { const range = document.createRange(); range.selectNodeContents(document.body); return document.body.innerText.substring(0, 5000); })()`;
                    break;
                default:
                    script = `document.body.innerText`;
            }
            try {
                const text = await wc.executeJavaScript(script);
                return { success: true, content: (text || '').substring(0, 20000), length: (text || '').length };
            } catch (e: any) {
                return { error: `Failed to read page content: ${ e.message }` };
            }
        }
    });

    registry.register({
        name: 'analyze_page_structure',
        description: 'Deep analysis of the current page: headings hierarchy, forms, links, buttons, inputs, images, navigation. Use when landing on a NEW or COMPLEX website to understand its layout fast.',
        category: 'extraction',
        parameters: {},
        requiredParams: [],
        priority: 85,
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const script = `(() => {
                const headings = Array.from(document.querySelectorAll('h1,h2,h3')).slice(0,20).map(h => ({level: h.tagName, text: h.innerText.trim().substring(0,80)}));
                const forms = Array.from(document.querySelectorAll('form')).map((f,i) => ({id: f.id || 'form_'+i, action: f.action, fields: Array.from(f.querySelectorAll('input,select,textarea')).map(el => ({type: el.type||el.tagName.toLowerCase(), name: el.name, placeholder: el.placeholder, id: el.id})).slice(0,15)}));
                const navLinks = Array.from(document.querySelectorAll('nav a, header a')).slice(0,15).map(a => ({text: a.innerText.trim().substring(0,40), href: a.href}));
                const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]')).slice(0,15).map(b => b.innerText.trim().substring(0,40) || b.value || 'unnamed');
                const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]),textarea,select')).slice(0,15).map(i => ({type: i.type||i.tagName.toLowerCase(), name: i.name, placeholder: i.placeholder, id: i.id, value: i.value ? 'has_value' : 'empty'}));
                const iframes = document.querySelectorAll('iframe').length;
                const images = document.querySelectorAll('img').length;
                const scrollable = document.body.scrollHeight > window.innerHeight;
                const pageHeight = document.body.scrollHeight;
                const viewportHeight = window.innerHeight;
                const scrollPosition = window.scrollY;
                const title = document.title;
                const meta_desc = document.querySelector('meta[name="description"]')?.content || '';
                return {title, meta_desc, headings, forms, navLinks, buttons, inputs, iframes, images, scrollable, pageHeight, viewportHeight, scrollPosition};
            })()`;
            try {
                return await wc.executeJavaScript(script);
            } catch (e: any) {
                return { error: `Failed to analyze page structure: ${ e.message }`, suggestion: 'Try read_page_content instead, or wait for the page to fully load.' };
            }
        }
    });

    registry.register({
        name: 'extract_links',
        description: 'Extract all links from the current page with their text and URLs.',
        category: 'extraction',
        parameters: {
            filter: { type: 'STRING', description: 'Optional keyword filter for link text or URL.' }
        },
        requiredParams: [],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const filter = args.filter || '';
            const script = `(() => {
                const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({text: a.innerText.trim().substring(0,60), href: a.href})).filter(l => l.text.length > 0);
                const filtered = '${ filter }' ? links.filter(l => l.text.toLowerCase().includes('${ filter }'.toLowerCase()) || l.href.toLowerCase().includes('${ filter }'.toLowerCase())) : links;
                return filtered.slice(0, 50);
            })()`;
            try {
                return await wc.executeJavaScript(script);
            } catch (e: any) {
                return { error: `Failed to extract links: ${ e.message }` };
            }
        }
    });

    registry.register({
        name: 'extract_table',
        description: 'Extract tabular data from the page as structured JSON arrays. Auto-detects tables.',
        category: 'extraction',
        parameters: {
            table_index: { type: 'INTEGER', description: 'Which table to extract (0-indexed, default 0).' }
        },
        requiredParams: [],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const idx = args.table_index || 0;
            const script = `(() => {
                const tables = document.querySelectorAll('table');
                if (tables.length === 0) return { error: 'No tables found', tableCount: 0 };
                if (${ idx } >= tables.length) return { error: 'Table index out of range', tableCount: tables.length };
                const table = tables[${ idx }];
                const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim());
                const rows = Array.from(table.querySelectorAll('tbody tr, tr')).slice(0,100).map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim()));
                return { success: true, headers, rows: rows.filter(r => r.length > 0), tableCount: tables.length };
            })()`;
            try {
                return await wc.executeJavaScript(script);
            } catch (e: any) {
                return { error: `Failed to extract table: ${ e.message }` };
            }
        }
    });

    registry.register({
        name: 'get_page_metadata',
        description: 'Get page URL, title, favicon, scroll position, viewport size, and loading state.',
        category: 'extraction',
        parameters: {},
        requiredParams: [],
        isFastAction: true,
        estimatedMs: 50,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const script = `({
                url: location.href,
                title: document.title,
                scrollY: window.scrollY,
                scrollHeight: document.body.scrollHeight,
                viewportHeight: window.innerHeight,
                viewportWidth: window.innerWidth,
                readyState: document.readyState,
                isScrollable: document.body.scrollHeight > window.innerHeight,
                scrollProgress: Math.round((window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)) * 100) + '%'
            })`;
            return await wc.executeJavaScript(script);
        }
    });

    registry.register({
        name: 'find_text_on_page',
        description: 'Search for specific text on the page and return its context/location. Like Ctrl+F.',
        category: 'extraction',
        parameters: {
            query: { type: 'STRING', description: 'The text to search for.' }
        },
        requiredParams: ['query'],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const q = args.query.replace(/'/g, "\\'");
            const script = `(() => {
                const text = document.body.innerText;
                const idx = text.toLowerCase().indexOf('${ q }'.toLowerCase());
                if (idx === -1) return { found: false, query: '${ q }' };
                const start = Math.max(0, idx - 100);
                const end = Math.min(text.length, idx + '${ q }'.length + 100);
                const context = text.substring(start, end);
                const totalMatches = (text.toLowerCase().match(new RegExp('${ q }'.toLowerCase().replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 'g')) || []).length;
                return { found: true, totalMatches, context, query: '${ q }' };
            })()`;
            try {
                return await wc.executeJavaScript(script);
            } catch (e: any) {
                return { error: `Failed to search text: ${ e.message }` };
            }
        }
    });

    registry.register({
        name: 'detect_captcha',
        description: 'Check if the current page has any CAPTCHA or anti-bot challenge (reCAPTCHA, hCaptcha, Cloudflare, etc.).',
        category: 'extraction',
        parameters: {},
        requiredParams: [],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const script = `(() => {
                const recaptcha = !!document.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]');
                const hcaptcha = !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
                const cloudflare = !!document.querySelector('#cf-challenge-running, .cf-browser-verification, iframe[src*="challenges.cloudflare"]');
                const turnstile = !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]');
                const hasChallenge = recaptcha || hcaptcha || cloudflare || turnstile;
                let type = 'none';
                if (recaptcha) type = 'recaptcha';
                else if (hcaptcha) type = 'hcaptcha';
                else if (cloudflare) type = 'cloudflare';
                else if (turnstile) type = 'turnstile';
                return { hasCaptcha: hasChallenge, type, recaptcha, hcaptcha, cloudflare, turnstile };
            })()`;
            return await wc.executeJavaScript(script);
        }
    });

    // ═══════════════════════════════════════════
    // TAB MANAGEMENT
    // ═══════════════════════════════════════════

    registry.register({
        name: 'get_current_url',
        description: 'Get the current page URL and title instantly.',
        category: 'tab_management',
        parameters: {},
        requiredParams: [],
        isFastAction: true,
        estimatedMs: 10,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            return { url: wc.getURL(), title: wc.getTitle() };
        }
    });

    // ═══════════════════════════════════════════
    // HUMAN EMULATION TOOLS
    // ═══════════════════════════════════════════

    registry.register({
        name: 'human_mouse_move',
        description: 'Move the mouse in a human-like curved path to coordinates. Use before clicking to appear more natural.',
        category: 'human_emulation',
        parameters: {
            x: { type: 'INTEGER', description: 'Target X coordinate.' },
            y: { type: 'INTEGER', description: 'Target Y coordinate.' }
        },
        requiredParams: ['x', 'y'],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            // Generate Bezier curve path
            const startX = Math.random() * 200;
            const startY = Math.random() * 200;
            const steps = 15 + Math.floor(Math.random() * 10);
            const ctrlX = startX + (args.x - startX) / 2 + (Math.random() - 0.5) * 80;
            const ctrlY = startY + (args.y - startY) / 2 + (Math.random() - 0.5) * 80;

            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const x = Math.round((1 - t) ** 2 * startX + 2 * (1 - t) * t * ctrlX + t ** 2 * args.x);
                const y = Math.round((1 - t) ** 2 * startY + 2 * (1 - t) * t * ctrlY + t ** 2 * args.y);
                wc.sendInputEvent({ type: 'mouseMove', x, y } as any);
                await new Promise(r => setTimeout(r, 8 + Math.random() * 12));
            }
            return { success: true, message: `Mouse moved to (${ args.x }, ${ args.y }) with human-like curve` };
        }
    });

    registry.register({
        name: 'inject_stealth',
        description: 'Inject anti-detection scripts to avoid bot detection. Masks webdriver flag, spoofs plugins, randomizes canvas fingerprint. Call this ONCE when you suspect anti-bot measures.',
        category: 'human_emulation',
        parameters: {},
        requiredParams: [],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const script = `(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
                window.chrome = { runtime: {}, loadTimes: () => ({}), csi: () => ({}) };
                const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
                HTMLCanvasElement.prototype.toDataURL = function(type) {
                    const ctx = this.getContext('2d');
                    if (ctx) { const px = ctx.getImageData(0, 0, 1, 1); px.data[0] += 1; ctx.putImageData(px, 0, 0); }
                    return origToDataURL.apply(this, arguments);
                };
                const origGetParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function(p) {
                    if (p === 37445) return 'Intel Inc.';
                    if (p === 37446) return 'Intel Iris OpenGL Engine';
                    return origGetParameter.apply(this, arguments);
                };
                return { success: true, message: 'Stealth mode injected' };
            })()`;
            return await wc.executeJavaScript(script);
        }
    });

    // ═══════════════════════════════════════════
    // ADVANCED / POWER TOOLS
    // ═══════════════════════════════════════════

    registry.register({
        name: 'evaluate_js',
        description: 'Evaluate arbitrary JavaScript on the page. Extremely powerful. Use when standard tools fail or for complex DOM queries, custom interactions, or data extraction.',
        category: 'advanced',
        parameters: {
            script: { type: 'STRING', description: 'JavaScript code to execute. Must return a value. Wrap in async IIFE for await.' }
        },
        requiredParams: ['script'],
        priority: 80,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            try {
                const result = await wc.executeJavaScript(`(async () => { ${ args.script } })()`);
                return { success: true, result };
            } catch (e: any) {
                return { error: `JS Error: ${ e.message }` };
            }
        }
    });

    registry.register({
        name: 'wait',
        description: 'Wait for a specified duration. Use after actions that trigger slow animations, network requests, or page loads.',
        category: 'advanced',
        parameters: {
            ms: { type: 'INTEGER', description: 'Milliseconds to wait.' }
        },
        requiredParams: ['ms'],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            await new Promise(r => setTimeout(r, args.ms));
            return { success: true, message: `Waited ${ args.ms }ms` };
        }
    });

    registry.register({
        name: 'wait_for_selector',
        description: 'Wait until a specific CSS selector appears on the page. Useful for waiting for dynamic content to load.',
        category: 'advanced',
        parameters: {
            selector: { type: 'STRING', description: 'CSS selector to wait for.' },
            timeout_ms: { type: 'INTEGER', description: 'Max wait time in ms (default 10000).' }
        },
        requiredParams: ['selector'],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const timeout = args.timeout_ms || 10000;
            const sel = args.selector.replace(/'/g, "\\'");
            const script = `new Promise((resolve) => {
                if (document.querySelector('${ sel }')) return resolve({ found: true, waited: 0 });
                const start = Date.now();
                const obs = new MutationObserver(() => {
                    if (document.querySelector('${ sel }')) { obs.disconnect(); resolve({ found: true, waited: Date.now() - start }); }
                });
                obs.observe(document.body, { childList: true, subtree: true });
                setTimeout(() => { obs.disconnect(); resolve({ found: false, timeout: true }); }, ${ timeout });
            })`;
            return await wc.executeJavaScript(script);
        }
    });

    registry.register({
        name: 'screenshot',
        description: 'Capture a screenshot of the current viewport. Returns base64 PNG.',
        category: 'advanced',
        parameters: {},
        requiredParams: [],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const image = await wc.capturePage();
            const resized = image.resize({ width: ctx.screenWidth, height: ctx.screenHeight });
            return { success: true, screenshot: resized.toPNG().toString('base64').substring(0, 100) + '...(truncated)', width: ctx.screenWidth, height: ctx.screenHeight };
        }
    });

    registry.register({
        name: 'get_cookies',
        description: 'Get all cookies for the current domain.',
        category: 'advanced',
        parameters: {},
        requiredParams: [],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const url = wc.getURL();
            const cookies = await wc.session.cookies.get({ url });
            return { success: true, cookies: cookies.map((c: any) => ({ name: c.name, value: c.value.substring(0, 30), domain: c.domain })) };
        }
    });

    registry.register({
        name: 'set_cookie',
        description: 'Set a cookie for the current domain.',
        category: 'advanced',
        parameters: {
            name: { type: 'STRING', description: 'Cookie name.' },
            value: { type: 'STRING', description: 'Cookie value.' }
        },
        requiredParams: ['name', 'value'],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const url = wc.getURL();
            await wc.session.cookies.set({ url, name: args.name, value: args.value });
            return { success: true };
        }
    });

    registry.register({
        name: 'clear_input',
        description: 'Clear all text from an input field. Faster than selecting all + delete.',
        category: 'advanced',
        parameters: {
            element_id: { type: 'INTEGER', description: 'SOM ID of the input to clear.' }
        },
        requiredParams: ['element_id'],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const script = `(() => {
                ${ getSOMFinderScript(args.element_id) }
                if (!target) return { error: 'Element not found' };
                target.value = '';
                target.dispatchEvent(new Event('input', { bubbles: true }));
                target.dispatchEvent(new Event('change', { bubbles: true }));
                return { success: true };
            })()`;
            return await wc.executeJavaScript(script);
        }
    });

    // ═══════════════════════════════════════════
    // CONTROL TOOLS (terminal actions)
    // ═══════════════════════════════════════════

    registry.register({
        name: 'task_complete',
        description: 'Call this when the objective is successfully achieved. Provide a COMPREHENSIVE, well-formatted summary using markdown. Use bullet points for steps taken, bold for key info, include any extracted data/URLs/results. Format: brief intro → key findings/actions as bullet points → any data extracted. Make it detailed enough that the user understands exactly what was accomplished.',
        category: 'control',
        parameters: {
            outcome: { type: 'STRING', description: 'Rich markdown summary: use **bold**, bullet points (- item), headings (##), code blocks, and include all extracted data/URLs/results.' }
        },
        requiredParams: ['outcome'],
        isTerminal: true,
        priority: 100,
        handler: async (args: any, ctx: ToolContext) => {
            return { success: true, status: 'complete', outcome: args.outcome };
        }
    });

    registry.register({
        name: 'task_failed',
        description: 'Call this when the objective cannot be achieved. Explain why clearly.',
        category: 'control',
        parameters: {
            reason: { type: 'STRING', description: 'Why the task could not be completed.' },
            partial_result: { type: 'STRING', description: 'Any partial results obtained.' }
        },
        requiredParams: ['reason'],
        isTerminal: true,
        handler: async (args: any, ctx: ToolContext) => {
            return { success: false, status: 'failed', reason: args.reason, partial_result: args.partial_result };
        }
    });

    registry.register({
        name: 'ask_user',
        description: 'Ask the user for clarification or confirmation when the task is ambiguous or requires a decision.',
        category: 'control',
        parameters: {
            question: { type: 'STRING', description: 'The question to ask the user.' }
        },
        requiredParams: ['question'],
        isTerminal: true,
        handler: async (args: any, ctx: ToolContext) => {
            ctx.sendToRenderer('agent:ask-user', args.question);
            return { success: true, status: 'waiting_for_user', question: args.question };
        }
    });

    // ═══════════════════════════════════════════
    // DEEP PAGE INTELLIGENCE TOOLS
    // ═══════════════════════════════════════════

    registry.register({
        name: 'map_full_page',
        description: 'Get a COMPLETE map of the entire page WITHOUT scrolling. Returns all sections with headings, content snippets, forms, links, and semantic structure. Use this FIRST on any new page to understand it fully before acting. This eliminates the need to scroll up and down.',
        category: 'extraction',
        parameters: {},
        requiredParams: [],
        priority: 92,
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const script = `(() => {
                const result = { title: document.title, url: location.href, sections: [], forms: [], navigation: [], actionItems: [] };

                // Map all sections by headings
                const allHeadings = document.querySelectorAll('h1,h2,h3,h4');
                allHeadings.forEach((h, i) => {
                    let content = '';
                    let sibling = h.nextElementSibling;
                    let words = 0;
                    while (sibling && !['H1','H2','H3','H4'].includes(sibling.tagName) && words < 150) {
                        const text = sibling.innerText?.trim();
                        if (text) { content += text + ' '; words += text.split(/\\s+/).length; }
                        sibling = sibling.nextElementSibling;
                    }
                    result.sections.push({ level: h.tagName, heading: h.innerText.trim().substring(0, 80), preview: content.substring(0, 300).trim(), index: i });
                });

                // If no headings, get main content blocks
                if (result.sections.length === 0) {
                    const main = document.querySelector('main, article, [role="main"]') || document.body;
                    const paragraphs = main.querySelectorAll('p, li, div > span');
                    let fullText = '';
                    paragraphs.forEach(p => { const t = p.innerText?.trim(); if (t && t.length > 20) fullText += t + '\\n'; });
                    result.sections.push({ level: 'BODY', heading: 'Page Content', preview: fullText.substring(0, 3000) });
                }

                // Map all forms with their fields
                document.querySelectorAll('form').forEach((f, i) => {
                    const fields = [];
                    f.querySelectorAll('input:not([type="hidden"]),select,textarea').forEach(el => {
                        fields.push({ type: el.type || el.tagName.toLowerCase(), name: el.name || el.id, placeholder: el.placeholder, label: el.labels?.[0]?.innerText?.trim()?.substring(0, 40) || '', value: el.value ? '(has value)' : '(empty)', required: el.required });
                    });
                    const submitBtn = f.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
                    result.forms.push({ index: i, id: f.id, action: f.action?.substring(0, 60), method: f.method, fields, submitButton: submitBtn?.innerText?.trim() || submitBtn?.value || 'Submit' });
                });

                // Map navigation/menu structure
                document.querySelectorAll('nav, header, [role="navigation"]').forEach(nav => {
                    nav.querySelectorAll('a').forEach(a => {
                        const text = a.innerText?.trim();
                        if (text && text.length > 0 && text.length < 50) {
                            result.navigation.push({ text, href: a.href?.substring(0, 80) });
                        }
                    });
                });
                result.navigation = result.navigation.slice(0, 20);

                // Map action items (buttons, CTAs)
                document.querySelectorAll('button, [role="button"], a.btn, a.button, .cta').forEach(el => {
                    const text = el.innerText?.trim();
                    if (text && text.length > 0 && text.length < 50) {
                        result.actionItems.push(text);
                    }
                });
                result.actionItems = [...new Set(result.actionItems)].slice(0, 20);

                // Page stats
                result.stats = {
                    totalTextLength: document.body.innerText.length,
                    scrollHeight: document.body.scrollHeight,
                    viewportHeight: window.innerHeight,
                    pagesOfContent: Math.ceil(document.body.scrollHeight / window.innerHeight),
                    totalLinks: document.querySelectorAll('a').length,
                    totalImages: document.querySelectorAll('img').length,
                    totalForms: document.querySelectorAll('form').length
                };

                return result;
            })()`;
            try {
                return await wc.executeJavaScript(script);
            } catch (e: any) {
                return { error: `Failed to map page: ${ e.message }`, suggestion: 'Try read_page_content with target "full" instead.' };
            }
        }
    });

    registry.register({
        name: 'smart_search',
        description: 'Instantly search Google for any query. Navigates directly to Google search results. Use when you need information, are confused about a task, or need to find a specific website.',
        category: 'navigation',
        parameters: {
            query: { type: 'STRING', description: 'The search query.' }
        },
        requiredParams: ['query'],
        priority: 88,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const q = encodeURIComponent(args.query);
            await wc.loadURL(`https://www.google.com/search?q=${ q }`);
            await ctx.humanDelay(800, 1500);
            // Auto-read search results
            try {
                const results = await wc.executeJavaScript(`(() => {
                    const items = [];
                    document.querySelectorAll('.g, .tF2Cxc').forEach((el, i) => {
                        if (i >= 8) return;
                        const title = el.querySelector('h3')?.innerText || '';
                        const url = el.querySelector('a')?.href || '';
                        const snippet = el.querySelector('.VwiC3b, .st, .IsZvec')?.innerText || '';
                        if (title) items.push({ rank: i+1, title, url: url.substring(0, 80), snippet: snippet.substring(0, 120) });
                    });
                    return items;
                })()`);
                return { success: true, message: `Searched: "${ args.query }"`, results, resultCount: results.length };
            } catch (e) {
                return { success: true, message: `Navigated to Google search for: "${ args.query }"` };
            }
        }
    });

    registry.register({
        name: 'dismiss_popups',
        description: 'Auto-detect and dismiss ALL popups, cookie banners, modals, overlays, and notification prompts on the page. Call this when you see any overlay blocking the content.',
        category: 'interaction',
        parameters: {},
        requiredParams: [],
        priority: 93,
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const script = `(() => {
                let dismissed = 0;
                
                // Cookie consent buttons
                const cookieSelectors = [
                    'button[id*="accept"]', 'button[id*="consent"]', 'button[id*="agree"]',
                    'button[class*="accept"]', 'button[class*="consent"]', 'button[class*="agree"]',
                    'a[id*="accept"]', 'a[class*="accept"]',
                    '[data-testid*="accept"]', '[data-testid*="consent"]',
                    'button[aria-label*="Accept"]', 'button[aria-label*="accept"]',
                    'button[aria-label*="Allow"]', 'button[aria-label*="Agree"]'
                ];
                for (const sel of cookieSelectors) {
                    const btn = document.querySelector(sel);
                    if (btn && btn.offsetParent !== null) { btn.click(); dismissed++; break; }
                }

                // Generic close/dismiss buttons on modals
                const closeSelectors = [
                    '[class*="modal"] [class*="close"]', '[class*="modal"] button[aria-label="Close"]',
                    '[class*="dialog"] [class*="close"]', '[role="dialog"] [class*="close"]',
                    '[class*="popup"] [class*="close"]', '[class*="overlay"] [class*="close"]',
                    '[class*="banner"] [class*="close"]', '[class*="notification"] [class*="close"]',
                    'button[class*="dismiss"]', 'button[aria-label="Dismiss"]',
                    '[class*="modal"] .close', '[class*="modal"] button:last-child'
                ];
                for (const sel of closeSelectors) {
                    const btn = document.querySelector(sel);
                    if (btn && btn.offsetParent !== null) { btn.click(); dismissed++; }
                }

                // Remove overlay elements directly
                const overlaySelectors = [
                    '[class*="overlay"]:not(main):not(nav):not(header)',
                    '[class*="modal-backdrop"]', '[class*="popup-overlay"]',
                    '.backdrop', '#overlay'
                ];
                for (const sel of overlaySelectors) {
                    document.querySelectorAll(sel).forEach(el => {
                        if (el.style) { el.style.display = 'none'; dismissed++; }
                    });
                }

                // Remove fixed/sticky banners at top/bottom
                document.querySelectorAll('[class*="cookie"], [class*="consent"], [id*="cookie"], [id*="consent"]').forEach(el => {
                    const style = window.getComputedStyle(el);
                    if (style.position === 'fixed' || style.position === 'sticky') {
                        el.style.display = 'none';
                        dismissed++;
                    }
                });

                // Restore body scroll if locked
                if (document.body.style.overflow === 'hidden') {
                    document.body.style.overflow = '';
                    dismissed++;
                }

                return { success: true, dismissed, message: dismissed > 0 ? dismissed + ' popups/overlays dismissed' : 'No popups found' };
            })()`;
            return await wc.executeJavaScript(script);
        }
    });

    registry.register({
        name: 'check_page_changed',
        description: 'Verify if the page content has changed after an action. Returns what changed (URL, title, new content). Use this to confirm your last action worked.',
        category: 'extraction',
        parameters: {
            expected: { type: 'STRING', description: 'What you expect to see if the action succeeded (optional text to search for).' }
        },
        requiredParams: [],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const expected = args.expected || '';
            const script = `(() => {
                const result = {
                    url: location.href,
                    title: document.title,
                    readyState: document.readyState,
                    hasContent: document.body.innerText.length > 100,
                    contentLength: document.body.innerText.length,
                    h1: document.querySelector('h1')?.innerText?.trim()?.substring(0, 60) || '',
                    isLoading: !!document.querySelector('.loading, .spinner, [class*="loading"], [class*="spinner"]'),
                    hasError: !!document.querySelector('.error, [class*="error"], [role="alert"]'),
                    errorText: document.querySelector('.error, [class*="error"], [role="alert"]')?.innerText?.substring(0, 100) || ''
                };
                if ('${ expected }') {
                    result.foundExpected = document.body.innerText.toLowerCase().includes('${ expected }'.toLowerCase());
                }
                return result;
            })()`;
            return await wc.executeJavaScript(script);
        }
    });

    // ═══════════════════════════════════════════
    // SMART INTERACTION TOOLS (fallbacks + efficiency)
    // ═══════════════════════════════════════════

    registry.register({
        name: 'click_by_text',
        description: 'Click an element by its VISIBLE TEXT content. Use when SOM IDs fail or you know the button/link text. Searches buttons, links, and clickable elements.',
        category: 'interaction',
        parameters: {
            text: { type: 'STRING', description: 'The visible text of the element to click (exact or partial match).' },
            exact: { type: 'BOOLEAN', description: 'If true, require exact text match. Default false (partial match).' }
        },
        requiredParams: ['text'],
        priority: 85,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const searchText = args.text.replace(/'/g, "\\'");
            const exact = args.exact ? 'true' : 'false';
            const script = `(() => {
                const searchText = '${ searchText }';
                const exact = ${ exact };
                const clickable = document.querySelectorAll('button, a, [role="button"], input[type="submit"], input[type="button"], [onclick], [tabindex]');
                for (const el of clickable) {
                    const text = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim();
                    const match = exact ? text === searchText : text.toLowerCase().includes(searchText.toLowerCase());
                    if (match && el.offsetParent !== null) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.click();
                        return { success: true, clicked: text.substring(0, 50), tag: el.tagName };
                    }
                }
                return { error: 'No element found with text: ' + searchText };
            })()`;
            const result = await wc.executeJavaScript(script);
            if (result.success) await ctx.humanDelay(200, 500);
            return result;
        }
    });

    registry.register({
        name: 'scroll_to_element',
        description: 'Scroll a specific element into view by its SOM ID. Much better than blind scrolling — jumps directly to the element.',
        category: 'scrolling',
        parameters: {
            element_id: { type: 'INTEGER', description: 'SOM ID of the element to scroll to.' }
        },
        requiredParams: ['element_id'],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const script = `(() => {
                ${ getSOMFinderScript(args.element_id) }
                if (!target) return { error: 'Element not found' };
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return { success: true, message: 'Scrolled to element ' + ${ args.element_id } };
            })()`;
            return await wc.executeJavaScript(script);
        }
    });

    registry.register({
        name: 'fill_form_smart',
        description: 'Smart form filler — automatically matches input labels to your values and fills the entire form at once. Provide a JSON object mapping field names/labels to values. Much faster than filling fields one by one.',
        category: 'interaction',
        parameters: {
            fields: { type: 'STRING', description: 'JSON string mapping field labels/names/placeholders to values. Example: {"Email": "user@email.com", "Password": "secret", "Name": "John"}' }
        },
        requiredParams: ['fields'],
        priority: 90,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const fieldsJson = args.fields.replace(/'/g, "\\'");
            const script = `(() => {
                const fieldMap = JSON.parse('${ fieldsJson }');
                const filled = [];
                const notFound = [];
                for (const [key, value] of Object.entries(fieldMap)) {
                    let found = false;
                    // Try by label text
                    document.querySelectorAll('label').forEach(label => {
                        if (found) return;
                        if (label.innerText.toLowerCase().includes(key.toLowerCase())) {
                            const input = label.querySelector('input,select,textarea') || 
                                         (label.htmlFor ? document.getElementById(label.htmlFor) : null);
                            if (input) {
                                input.focus();
                                input.value = value;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                                filled.push(key);
                                found = true;
                            }
                        }
                    });
                    if (found) continue;
                    // Try by name, id, placeholder
                    const input = document.querySelector(
                        'input[name*="' + key.toLowerCase() + '"], ' +
                        'input[id*="' + key.toLowerCase() + '"], ' +
                        'input[placeholder*="' + key + '"], ' +
                        'textarea[name*="' + key.toLowerCase() + '"], ' +
                        'select[name*="' + key.toLowerCase() + '"]'
                    );
                    if (input) {
                        input.focus();
                        if (input.tagName === 'SELECT') {
                            const opt = Array.from(input.options).find(o => o.text.toLowerCase().includes(value.toLowerCase()) || o.value === value);
                            if (opt) input.value = opt.value;
                        } else {
                            input.value = value;
                        }
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        filled.push(key);
                    } else {
                        notFound.push(key);
                    }
                }
                return { success: true, filled, notFound, message: 'Filled ' + filled.length + ' fields' + (notFound.length > 0 ? ', could not find: ' + notFound.join(', ') : '') };
            })()`;
            return await wc.executeJavaScript(script);
        }
    });

    registry.register({
        name: 'click_and_wait',
        description: 'Click an element AND wait for the page to change (URL change, new content, or timeout). Combines click + smart wait in one action.',
        category: 'interaction',
        parameters: {
            element_id: { type: 'INTEGER', description: 'SOM ID to click.' },
            timeout_ms: { type: 'INTEGER', description: 'Max wait ms (default 3000).' }
        },
        requiredParams: ['element_id'],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const urlBefore = wc.getURL();
            const clickResult = await performSOMAction(ctx, args.element_id, 'click');
            if (clickResult.error) return clickResult;
            const timeout = args.timeout_ms || 3000;
            // Wait for URL change or content change
            await new Promise<void>(resolve => {
                const timer = setTimeout(resolve, timeout);
                const check = setInterval(() => {
                    if (wc.getURL() !== urlBefore) { clearInterval(check); clearTimeout(timer); resolve(); }
                }, 200);
            });
            await ctx.humanDelay(150, 300);
            return { success: true, urlChanged: wc.getURL() !== urlBefore, newUrl: wc.getURL(), newTitle: wc.getTitle() };
        }
    });

    registry.register({
        name: 'drag_and_drop',
        description: 'Drag an element from one position to another. Useful for sliders, sortable lists, and drag interfaces.',
        category: 'interaction',
        parameters: {
            from_id: { type: 'INTEGER', description: 'SOM ID of element to drag.' },
            to_id: { type: 'INTEGER', description: 'SOM ID of drop target.' }
        },
        requiredParams: ['from_id', 'to_id'],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const script = `(() => {
                ${ getSOMFinderScript(args.from_id) }
                const fromEl = target;
                if (!fromEl) return { error: 'Source element not found' };
                ${ getSOMFinderScript(args.to_id) }
                const toEl = target;
                if (!toEl) return { error: 'Target element not found' };
                const fromRect = fromEl.getBoundingClientRect();
                const toRect = toEl.getBoundingClientRect();
                const fromX = fromRect.left + fromRect.width / 2;
                const fromY = fromRect.top + fromRect.height / 2;
                const toX = toRect.left + toRect.width / 2;
                const toY = toRect.top + toRect.height / 2;
                fromEl.dispatchEvent(new MouseEvent('mousedown', { clientX: fromX, clientY: fromY, bubbles: true }));
                fromEl.dispatchEvent(new MouseEvent('mousemove', { clientX: toX, clientY: toY, bubbles: true }));
                toEl.dispatchEvent(new MouseEvent('mouseup', { clientX: toX, clientY: toY, bubbles: true }));
                toEl.dispatchEvent(new DragEvent('drop', { bubbles: true }));
                return { success: true, message: 'Dragged element ' + ${ args.from_id } + ' to ' + ${ args.to_id } };
            })()`;
            return await wc.executeJavaScript(script);
        }
    });

    // ═══════════════════════════════════════════
    // NETWORK & STATE INTELLIGENCE
    // ═══════════════════════════════════════════

    registry.register({
        name: 'wait_for_network_idle',
        description: 'Wait until all network requests (XHR/fetch) are complete. Much smarter than fixed waits — knows exactly when data has loaded.',
        category: 'advanced',
        parameters: {
            timeout_ms: { type: 'INTEGER', description: 'Max wait in ms (default 5000).' }
        },
        requiredParams: [],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const timeout = args.timeout_ms || 5000;
            const script = `new Promise(resolve => {
                let pending = 0;
                let settled = false;
                const origXHR = XMLHttpRequest.prototype.send;
                const origFetch = window.fetch;
                XMLHttpRequest.prototype.send = function(...a) {
                    pending++;
                    this.addEventListener('loadend', () => { pending--; checkIdle(); });
                    return origXHR.apply(this, a);
                };
                window.fetch = function(...a) {
                    pending++;
                    return origFetch.apply(this, a).finally(() => { pending--; checkIdle(); });
                };
                function checkIdle() {
                    if (pending <= 0 && !settled) {
                        setTimeout(() => {
                            if (pending <= 0) {
                                settled = true;
                                XMLHttpRequest.prototype.send = origXHR;
                                window.fetch = origFetch;
                                resolve({ idle: true, waited: Date.now() - start });
                            }
                        }, 300);
                    }
                }
                const start = Date.now();
                setTimeout(() => {
                    if (!settled) {
                        settled = true;
                        XMLHttpRequest.prototype.send = origXHR;
                        window.fetch = origFetch;
                        resolve({ idle: false, timeout: true, pendingRequests: pending });
                    }
                }, ${ timeout });
                setTimeout(checkIdle, 100);
            })`;
            return await wc.executeJavaScript(script);
        }
    });

    registry.register({
        name: 'get_console_errors',
        description: 'Check for any JavaScript errors on the page. Useful for debugging when something is not working.',
        category: 'extraction',
        parameters: {},
        requiredParams: [],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const script = `(() => {
                const errors = [];
                const origError = console.error;
                if (!window.__eterxErrors) {
                    window.__eterxErrors = [];
                    console.error = function(...args) {
                        window.__eterxErrors.push(args.map(a => String(a)).join(' ').substring(0, 200));
                        if (window.__eterxErrors.length > 20) window.__eterxErrors.shift();
                        origError.apply(this, args);
                    };
                }
                return { errors: window.__eterxErrors || [], count: (window.__eterxErrors || []).length };
            })()`;
            return await wc.executeJavaScript(script);
        }
    });

    registry.register({
        name: 'get_local_storage',
        description: 'Read a value from localStorage. Useful for checking login state, preferences, or cached data.',
        category: 'advanced',
        parameters: {
            key: { type: 'STRING', description: 'Key to read. Pass "*" to get all keys and values.' }
        },
        requiredParams: ['key'],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            if (args.key === '*') {
                const script = `(() => {
                    const data = {};
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        data[key] = localStorage.getItem(key)?.substring(0, 100);
                    }
                    return { keys: Object.keys(data).length, data };
                })()`;
                return await wc.executeJavaScript(script);
            }
            return await wc.executeJavaScript(`({ value: localStorage.getItem('${ args.key }') })`);
        }
    });

    registry.register({
        name: 'set_local_storage',
        description: 'Write a value to localStorage.',
        category: 'advanced',
        parameters: {
            key: { type: 'STRING', description: 'Key to set.' },
            value: { type: 'STRING', description: 'Value to store.' }
        },
        requiredParams: ['key', 'value'],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            await wc.executeJavaScript(`localStorage.setItem('${ args.key }', '${ args.value }')`);
            return { success: true };
        }
    });

    // ═══════════════════════════════════════════
    // ELEMENT INSPECTION TOOLS
    // ═══════════════════════════════════════════

    registry.register({
        name: 'get_element_info',
        description: 'Get detailed information about a specific element by SOM ID — its position, size, attributes, styles, visibility, and full text content.',
        category: 'extraction',
        parameters: {
            element_id: { type: 'INTEGER', description: 'SOM ID of the element.' }
        },
        requiredParams: ['element_id'],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const script = `(() => {
                ${ getSOMFinderScript(args.element_id) }
                if (!target) return { error: 'Element not found' };
                const rect = target.getBoundingClientRect();
                const styles = window.getComputedStyle(target);
                return {
                    tag: target.tagName.toLowerCase(),
                    id: target.id,
                    classes: target.className,
                    text: target.innerText?.substring(0, 200),
                    value: target.value,
                    type: target.type,
                    href: target.href,
                    src: target.src,
                    disabled: target.disabled,
                    checked: target.checked,
                    placeholder: target.placeholder,
                    ariaLabel: target.getAttribute('aria-label'),
                    position: { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) },
                    visible: rect.width > 0 && rect.height > 0 && styles.visibility !== 'hidden' && styles.display !== 'none',
                    inViewport: rect.top < window.innerHeight && rect.bottom > 0
                };
            })()`;
            return await wc.executeJavaScript(script);
        }
    });

    registry.register({
        name: 'count_elements',
        description: 'Count how many elements match a CSS selector. Useful for checking if search results loaded, items in a list, etc.',
        category: 'extraction',
        parameters: {
            selector: { type: 'STRING', description: 'CSS selector to count matches.' }
        },
        requiredParams: ['selector'],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const sel = args.selector.replace(/'/g, "\\'");
            return await wc.executeJavaScript(`({ count: document.querySelectorAll('${ sel }').length, selector: '${ sel }' })`);
        }
    });

    // ═══════════════════════════════════════════
    // CLIPBOARD TOOLS
    // ═══════════════════════════════════════════

    registry.register({
        name: 'copy_to_clipboard',
        description: 'Copy text to the clipboard.',
        category: 'advanced',
        parameters: {
            text: { type: 'STRING', description: 'Text to copy.' }
        },
        requiredParams: ['text'],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            await wc.executeJavaScript(`navigator.clipboard.writeText(${ JSON.stringify(args.text) })`);
            return { success: true, message: 'Copied to clipboard' };
        }
    });

    // ═══════════════════════════════════════════
    // PAGE CONTROL TOOLS
    // ═══════════════════════════════════════════

    registry.register({
        name: 'scroll_to_percentage',
        description: 'Scroll to a specific percentage of the page. 0% = top, 50% = middle, 100% = bottom. Much more precise than scroll up/down.',
        category: 'scrolling',
        parameters: {
            percent: { type: 'INTEGER', description: 'Scroll position as percentage (0-100).' }
        },
        requiredParams: ['percent'],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const pct = Math.max(0, Math.min(100, args.percent));
            await wc.executeJavaScript(`window.scrollTo({ top: (document.body.scrollHeight - window.innerHeight) * ${ pct / 100 }, behavior: 'smooth' })`);
            return { success: true, message: `Scrolled to ${ pct }%` };
        }
    });

    registry.register({
        name: 'zoom_page',
        description: 'Zoom the page in or out. Useful when elements are too small to read or interact with.',
        category: 'advanced',
        parameters: {
            level: { type: 'NUMBER', description: 'Zoom level. 1.0 = normal, 1.5 = 150%, 0.8 = 80%.' }
        },
        requiredParams: ['level'],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            wc.setZoomFactor(args.level);
            return { success: true, message: `Zoom set to ${ Math.round(args.level * 100) }%` };
        }
    });

    registry.register({
        name: 'switch_to_iframe',
        description: 'Execute a command inside a specific iframe. Use when content is inside an iframe (like payment forms, embedded widgets, etc.).',
        category: 'advanced',
        parameters: {
            iframe_selector: { type: 'STRING', description: 'CSS selector for the iframe (e.g., "iframe[name=payment]", "iframe:first-child").' },
            script: { type: 'STRING', description: 'JavaScript to execute inside the iframe.' }
        },
        requiredParams: ['iframe_selector', 'script'],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const sel = args.iframe_selector.replace(/'/g, "\\'");
            const innerScript = args.script.replace(/'/g, "\\'");
            const script = `(() => {
                const iframe = document.querySelector('${ sel }');
                if (!iframe) return { error: 'Iframe not found: ${ sel }' };
                try {
                    const result = iframe.contentWindow.eval('${ innerScript }');
                    return { success: true, result };
                } catch (e) {
                    return { error: 'Cross-origin iframe or eval failed: ' + e.message };
                }
            })()`;
            return await wc.executeJavaScript(script);
        }
    });

    registry.register({
        name: 'execute_and_wait',
        description: 'Execute JavaScript AND wait for DOM changes. Useful for triggering actions that cause async DOM updates.',
        category: 'advanced',
        parameters: {
            script: { type: 'STRING', description: 'JavaScript to execute.' },
            wait_ms: { type: 'INTEGER', description: 'Max ms to wait for DOM changes (default 2000).' }
        },
        requiredParams: ['script'],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const timeout = args.wait_ms || 2000;
            const userScript = args.script.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
            const script = `(async () => {
                let changed = false;
                const obs = new MutationObserver(() => { changed = true; });
                obs.observe(document.body, { childList: true, subtree: true, attributes: true });
                try {
                    const result = await eval(\`${ userScript }\`);
                    if (!changed) {
                        await new Promise(r => setTimeout(r, ${ timeout }));
                    }
                    obs.disconnect();
                    return { success: true, result, domChanged: changed };
                } catch (e) {
                    obs.disconnect();
                    return { error: e.message };
                }
            })()`;
            return await wc.executeJavaScript(script);
        }
    });

    registry.register({
        name: 'extract_all_text',
        description: 'Extract ALL visible text from the page, organized by sections. Better than read_page_content because it preserves structure.',
        category: 'extraction',
        parameters: {
            max_length: { type: 'INTEGER', description: 'Max characters to extract (default 15000).' }
        },
        requiredParams: [],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const maxLen = args.max_length || 15000;
            const script = `(() => {
                const sections = [];
                const walk = (el, depth) => {
                    if (depth > 5) return;
                    const tag = el.tagName?.toLowerCase();
                    if (['script','style','noscript','svg','path'].includes(tag)) return;
                    if (['h1','h2','h3','h4','p','li','td','th','blockquote','figcaption'].includes(tag)) {
                        const text = el.innerText?.trim();
                        if (text && text.length > 5) sections.push({ tag, text: text.substring(0, 500) });
                    } else {
                        for (const child of (el.children || [])) walk(child, depth + 1);
                    }
                };
                walk(document.body, 0);
                let result = '';
                for (const s of sections) {
                    const prefix = s.tag.startsWith('h') ? '\\n## ' : s.tag === 'li' ? '- ' : '';
                    result += prefix + s.text + '\\n';
                    if (result.length > ${ maxLen }) break;
                }
                return { success: true, text: result.substring(0, ${ maxLen }), sections: sections.length };
            })()`;
            return await wc.executeJavaScript(script);
        }
    });

    registry.register({
        name: 'multi_action',
        description: 'Execute multiple quick actions in sequence. Provide an array of steps. Much faster than calling tools one by one for simple sequences.',
        category: 'interaction',
        parameters: {
            steps: { type: 'STRING', description: 'JSON array of steps. Each step: {action: "click"|"type"|"press_key"|"wait", element_id?: number, text?: string, key?: string, ms?: number}' }
        },
        requiredParams: ['steps'],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            try {
                const steps = JSON.parse(args.steps);
                const results: any[] = [];
                for (const step of steps) {
                    if (step.action === 'click' && step.element_id) {
                        const r = await performSOMAction(ctx, step.element_id, 'click');
                        results.push({ action: 'click', ...r });
                        await ctx.humanDelay(100, 250);
                    } else if (step.action === 'type' && step.text) {
                        for (const char of step.text) {
                            wc.sendInputEvent({ type: 'char', keyCode: char });
                            await ctx.humanDelay(15, 50);
                        }
                        results.push({ action: 'type', success: true });
                    } else if (step.action === 'press_key' && step.key) {
                        wc.sendInputEvent({ type: 'keyDown', keyCode: step.key } as any);
                        wc.sendInputEvent({ type: 'keyUp', keyCode: step.key } as any);
                        results.push({ action: 'press_key', success: true, key: step.key });
                    } else if (step.action === 'wait' && step.ms) {
                        await new Promise(r => setTimeout(r, step.ms));
                        results.push({ action: 'wait', ms: step.ms });
                    }
                }
                return { success: true, stepsCompleted: results.length, results };
            } catch (e: any) {
                return { error: 'Invalid steps JSON: ' + e.message };
            }
        }
    });

    // ═══════════════════════════════════════════
    // AGI-LEVEL POWER TOOLS
    // ═══════════════════════════════════════════

    registry.register({
        name: 'wait_for_text',
        description: 'Wait until specific text appears on the page. Essential for async operations like sending messages, loading results, form submissions.',
        category: 'advanced',
        parameters: {
            text: { type: 'STRING', description: 'Text to wait for.' },
            timeout_ms: { type: 'INTEGER', description: 'Max wait ms (default 5000).' }
        },
        requiredParams: ['text'],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const timeout = args.timeout_ms || 5000;
            const searchText = args.text.replace(/'/g, "\\'");
            const startTime = Date.now();
            while (Date.now() - startTime < timeout) {
                const found = await wc.executeJavaScript(`document.body.innerText.includes('${ searchText }')`);
                if (found) return { success: true, found: true, waited: Date.now() - startTime };
                await new Promise(r => setTimeout(r, 300));
            }
            return { success: false, found: false, message: `Text "${ args.text }" not found after ${ timeout }ms` };
        }
    });

    registry.register({
        name: 'click_at_coordinates',
        description: 'Click at exact pixel coordinates on the page. Ultimate fallback when SOM IDs and text-based clicks fail.',
        category: 'interaction',
        parameters: {
            x: { type: 'INTEGER', description: 'X coordinate (pixels from left).' },
            y: { type: 'INTEGER', description: 'Y coordinate (pixels from top).' }
        },
        requiredParams: ['x', 'y'],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            wc.sendInputEvent({ type: 'mouseDown', x: args.x, y: args.y, button: 'left', clickCount: 1 } as any);
            await new Promise(r => setTimeout(r, 50));
            wc.sendInputEvent({ type: 'mouseUp', x: args.x, y: args.y, button: 'left', clickCount: 1 } as any);
            await ctx.humanDelay(100, 300);
            return { success: true, message: `Clicked at (${ args.x }, ${ args.y })` };
        }
    });

    registry.register({
        name: 'type_into_active',
        description: 'Type text into whatever element currently has focus. No element ID needed — just type. Also handles Ctrl+V paste for long text.',
        category: 'interaction',
        parameters: {
            text: { type: 'STRING', description: 'Text to type.' },
            press_enter: { type: 'BOOLEAN', description: 'Press Enter after typing.' }
        },
        requiredParams: ['text'],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            for (const char of args.text) {
                wc.sendInputEvent({ type: 'char', keyCode: char });
                await ctx.humanDelay(15, 50);
            }
            if (args.press_enter) {
                await ctx.humanDelay(50, 150);
                wc.sendInputEvent({ type: 'keyDown', keyCode: 'Return' } as any);
                wc.sendInputEvent({ type: 'keyUp', keyCode: 'Return' } as any);
            }
            return { success: true, message: `Typed "${ args.text.substring(0, 30) }..." into active element` };
        }
    });

    registry.register({
        name: 'get_all_clickable_text',
        description: 'Get a list of ALL clickable elements with their visible text. Use when you need to know what you CAN click on.',
        category: 'extraction',
        parameters: {},
        requiredParams: [],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const script = `(() => {
                const items = [];
                document.querySelectorAll('button, a, [role="button"], input[type="submit"], [tabindex]:not([tabindex="-1"]), [onclick]').forEach(el => {
                    const rect = el.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) return;
                    if (rect.top >= window.innerHeight || rect.bottom <= 0) return;
                    const text = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim();
                    if (text) items.push({ text: text.substring(0, 60), tag: el.tagName.toLowerCase(), pos: {x: Math.round(rect.left), y: Math.round(rect.top)} });
                });
                return { items: items.slice(0, 30), total: items.length };
            })()`;
            return await wc.executeJavaScript(script);
        }
    });

    registry.register({
        name: 'verify_action_result',
        description: 'Verify if your last action actually worked. Checks URL, title, visible content changes, and specific text presence.',
        category: 'advanced',
        parameters: {
            expected_text: { type: 'STRING', description: 'Text you expect to see if the action worked (optional).' },
            expected_url_contains: { type: 'STRING', description: 'URL substring expected (optional).' }
        },
        requiredParams: [],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const result: any = {
                url: wc.getURL(),
                title: wc.getTitle(),
            };
            if (args.expected_text) {
                const text = args.expected_text.replace(/'/g, "\\'");
                result.textFound = await wc.executeJavaScript(`document.body.innerText.includes('${ text }')`);
            }
            if (args.expected_url_contains) {
                result.urlMatches = wc.getURL().includes(args.expected_url_contains);
            }
            result.success = true;
            return result;
        }
    });

    registry.register({
        name: 'wait_for_element_change',
        description: 'Watch a specific element and wait for its content to change. Useful for waiting for chat messages to appear, counters to update, etc.',
        category: 'advanced',
        parameters: {
            selector: { type: 'STRING', description: 'CSS selector of element to watch.' },
            timeout_ms: { type: 'INTEGER', description: 'Max wait ms (default 5000).' }
        },
        requiredParams: ['selector'],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const timeout = args.timeout_ms || 5000;
            const sel = args.selector.replace(/'/g, "\\'");
            const script = `new Promise(resolve => {
                const el = document.querySelector('${ sel }');
                if (!el) { resolve({ error: 'Element not found' }); return; }
                const original = el.innerHTML;
                let settled = false;
                const obs = new MutationObserver(() => {
                    if (!settled && el.innerHTML !== original) {
                        settled = true;
                        obs.disconnect();
                        resolve({ changed: true, newContent: el.innerText?.substring(0, 200) });
                    }
                });
                obs.observe(el, { childList: true, subtree: true, characterData: true });
                setTimeout(() => {
                    if (!settled) { settled = true; obs.disconnect(); resolve({ changed: false, timeout: true }); }
                }, ${ timeout });
            })`;
            return await wc.executeJavaScript(script);
        }
    });

    registry.register({
        name: 'read_aria_tree',
        description: 'Get the accessibility tree of the page. Better than visual analysis for complex UIs — reveals semantic structure, roles, and states.',
        category: 'extraction',
        parameters: {
            max_depth: { type: 'INTEGER', description: 'Max depth to traverse (default 4).' }
        },
        requiredParams: [],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const maxDepth = args.max_depth || 4;
            const script = `(() => {
                const tree = [];
                const walk = (el, depth, path) => {
                    if (depth > ${ maxDepth }) return;
                    const role = el.getAttribute('role') || el.tagName?.toLowerCase();
                    const label = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || '';
                    const text = el.innerText?.trim().substring(0, 50) || '';
                    const state = el.getAttribute('aria-expanded') || el.getAttribute('aria-selected') || el.getAttribute('aria-checked') || '';
                    if (['script','style','svg','path','noscript'].includes(role)) return;
                    if (label || state || ['button','a','input','select','form','nav','main','dialog','alert','menu','tab','listbox'].includes(role)) {
                        tree.push({ role, label, text, state, depth });
                    }
                    for (const child of (el.children || [])) walk(child, depth + 1, path + '/' + role);
                };
                walk(document.body, 0, '');
                return { tree: tree.slice(0, 50), total: tree.length };
            })()`;
            return await wc.executeJavaScript(script);
        }
    });

    registry.register({
        name: 'select_all_and_delete',
        description: 'Select all text in the focused element and delete it. Equivalent to Ctrl+A then Delete.',
        category: 'interaction',
        parameters: {},
        requiredParams: [],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            wc.sendInputEvent({ type: 'keyDown', keyCode: 'a', modifiers: ['control'] } as any);
            wc.sendInputEvent({ type: 'keyUp', keyCode: 'a', modifiers: ['control'] } as any);
            await new Promise(r => setTimeout(r, 50));
            wc.sendInputEvent({ type: 'keyDown', keyCode: 'Backspace' } as any);
            wc.sendInputEvent({ type: 'keyUp', keyCode: 'Backspace' } as any);
            return { success: true, message: 'Selected all and deleted' };
        }
    });

    registry.register({
        name: 'get_scroll_info',
        description: 'Get detailed scroll information — current position, page height, viewport size, scroll percentage. Useful for knowing where you are on a long page.',
        category: 'extraction',
        parameters: {},
        requiredParams: [],
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            return await wc.executeJavaScript(`({
                scrollY: Math.round(window.scrollY),
                scrollX: Math.round(window.scrollX),
                pageHeight: document.body.scrollHeight,
                pageWidth: document.body.scrollWidth,
                viewportHeight: window.innerHeight,
                viewportWidth: window.innerWidth,
                scrollPercent: Math.round((window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)) * 100),
                atTop: window.scrollY < 10,
                atBottom: Math.abs(window.scrollY + window.innerHeight - document.body.scrollHeight) < 10
            })`);
        }
    });

    registry.register({
        name: 'find_and_click',
        description: 'Find and click an element by visible text OR CSS selector. If the query starts with CSS selector chars (#, ., [, etc), it is used as a CSS selector. Otherwise, it searches for matching visible text on buttons, links, and interactive elements. The most versatile click tool.',
        category: 'interaction',
        parameters: {
            text: { type: 'STRING', description: 'The visible text to find and click (e.g. "Submit", "Sign In", "Next"), OR a CSS selector (e.g. "#login-btn", ".submit-button").' }
        },
        requiredParams: ['text'],
        priority: 92,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const query = args.text || args.selector || '';
            const isCSS = /^[#.\[a-z]/i.test(query) && (query.startsWith('#') || query.startsWith('.') || query.startsWith('[') || query.includes('[') || query.includes('>') || query.includes(':'));

            const script = `(() => {
                let el = null;
                const query = ${ JSON.stringify(query) };
                const isCSS = ${ isCSS };
                
                if (isCSS) {
                    el = document.querySelector(query);
                }
                
                if (!el) {
                    // Text-based search: buttons, links, then all clickable elements
                    const queryLower = query.toLowerCase().trim();
                    const candidates = [
                        ...document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]'),
                        ...document.querySelectorAll('a[href]'),
                        ...document.querySelectorAll('[tabindex], [onclick], [role="link"], [role="tab"], [role="menuitem"]'),
                        ...document.querySelectorAll('label, summary, th')
                    ];
                    
                    // Exact match first
                    for (const c of candidates) {
                        const text = (c.innerText || c.value || c.textContent || c.getAttribute('aria-label') || '').trim();
                        if (text.toLowerCase() === queryLower) { el = c; break; }
                    }
                    
                    // Partial match
                    if (!el) {
                        for (const c of candidates) {
                            const text = (c.innerText || c.value || c.textContent || c.getAttribute('aria-label') || '').trim().toLowerCase();
                            if (text.includes(queryLower) || queryLower.includes(text)) { el = c; break; }
                        }
                    }
                    
                    // Fuzzy: any element containing the text
                    if (!el) {
                        const all = document.querySelectorAll('*');
                        for (const c of all) {
                            if (c.children.length > 3) continue;
                            const text = (c.innerText || c.textContent || '').trim().toLowerCase();
                            if (text === queryLower || (text.length < 100 && text.includes(queryLower))) {
                                el = c; break;
                            }
                        }
                    }
                }
                
                if (!el) return { error: 'Element not found: ' + query, tried: isCSS ? 'css+text' : 'text_only' };
                
                el.scrollIntoView({ behavior: 'instant', block: 'center' });
                const rect = el.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const opts = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, button: 0 };
                el.dispatchEvent(new MouseEvent('pointerdown', { ...opts, pointerId: 1, pointerType: 'mouse' }));
                el.dispatchEvent(new MouseEvent('mousedown', opts));
                el.dispatchEvent(new MouseEvent('pointerup', { ...opts, pointerId: 1, pointerType: 'mouse' }));
                el.dispatchEvent(new MouseEvent('mouseup', opts));
                el.dispatchEvent(new MouseEvent('click', opts));
                return { success: true, tag: el.tagName, text: (el.innerText || '').substring(0, 50), selector: isCSS ? query : 'text_match', rect: {x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height)} };
            })()`;
            const result = await wc.executeJavaScript(script);
            // Also send native click for maximum compatibility
            if (result.success && result.rect) {
                const x = result.rect.x + Math.round(result.rect.w / 2);
                const y = result.rect.y + Math.round(result.rect.h / 2);
                if (x > 0 && y > 0 && x < 3000 && y < 3000) {
                    wc.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 } as any);
                    await new Promise(r => setTimeout(r, 50));
                    wc.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 } as any);
                }
            }
            return result;
        }
    });

    // CLICK_XY — Click at exact viewport coordinates
    registry.register({
        name: 'click_xy',
        description: 'Click at exact X,Y viewport coordinates. Use when SOM IDs or text-based clicking fail. Get coordinates from SOM data (each element shows @(x,y)).',
        category: 'interaction',
        parameters: {
            x: { type: 'INTEGER', description: 'X coordinate (pixels from left).' },
            y: { type: 'INTEGER', description: 'Y coordinate (pixels from top).' }
        },
        requiredParams: ['x', 'y'],
        priority: 70,
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const x = Math.round(args.x);
            const y = Math.round(args.y);
            // Send full click sequence: mouseDown + mouseUp
            wc.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 } as any);
            await new Promise(r => setTimeout(r, 80));
            wc.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 } as any);
            await ctx.humanDelay(200, 400);
            // Check what was clicked
            const result = await wc.executeJavaScript(`(() => {
                const el = document.elementFromPoint(${ x }, ${ y });
                if (!el) return { success: true, message: 'Clicked at (${ x }, ${ y }), no element detected' };
                return { success: true, tag: el.tagName, text: (el.innerText || '').substring(0, 50), id: el.id || '', className: (el.className || '').substring(0, 40) };
            })()`);
            return result;
        }
    });

    // SCROLL_TO_TEXT — Scroll until specific text is visible
    registry.register({
        name: 'scroll_to_text',
        description: 'Scroll the page until specific text becomes visible. Searches the entire page content and scrolls to the matching element. Use when you need to find content below the fold.',
        category: 'scrolling',
        parameters: {
            text: { type: 'STRING', description: 'The text to find and scroll to.' }
        },
        requiredParams: ['text'],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const query = (args.text || '').replace(/'/g, "\\'");
            const script = `(() => {
                const query = '${ query }'.toLowerCase();
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                let node;
                while (node = walker.nextNode()) {
                    if (node.textContent.toLowerCase().includes(query)) {
                        const el = node.parentElement;
                        if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            return { found: true, tag: el.tagName, text: el.innerText?.substring(0, 80), y: Math.round(el.getBoundingClientRect().top) };
                        }
                    }
                }
                return { found: false, query: '${ query }' };
            })()`;
            const result = await wc.executeJavaScript(script);
            if (result.found) await ctx.humanDelay(400, 700);
            return result;
        }
    });

    // ═══════════════════════════════════════════════
    // ZERO-CLICK & AGI INTELLIGENCE TOOLS
    // ═══════════════════════════════════════════════

    // 1. BATCH FILL FORM — Fill ALL form fields at once (zero-click)
    registry.register({
        name: 'batch_fill_form',
        description: 'Fill ALL form fields at once using JavaScript. Provide a JSON object mapping field labels/names/placeholders to values. MUCH faster than clicking each field individually. Use this for ANY form filling task.',
        category: 'interaction',
        parameters: {
            fields: { type: 'STRING', description: 'JSON object mapping field identifiers (label text, name attribute, or placeholder) to values. Example: {"Name":"John","Email":"john@example.com","Message":"Hello"}' },
        },
        requiredParams: ['fields'],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const fieldsJson = typeof args.fields === 'string' ? args.fields : JSON.stringify(args.fields);
            const script = `(function() {
                const fields = ${ fieldsJson };
                const results = [];
                const inputs = document.querySelectorAll('input, textarea, select, [contenteditable="true"]');
                const labels = document.querySelectorAll('label');
                
                for (const [key, value] of Object.entries(fields)) {
                    let found = false;
                    const keyLower = key.toLowerCase();
                    
                    // Strategy 1: Match by label text
                    for (const label of labels) {
                        if (label.textContent.toLowerCase().includes(keyLower)) {
                            const forId = label.getAttribute('for');
                            let target = forId ? document.getElementById(forId) : label.querySelector('input, textarea, select');
                            if (!target) target = label.closest('.form-group, .field, [class*="field"]')?.querySelector('input, textarea, select');
                            if (target) {
                                target.focus();
                                if (target.tagName === 'SELECT') {
                                    const opt = Array.from(target.options).find(o => o.text.toLowerCase().includes(String(value).toLowerCase()));
                                    if (opt) { target.value = opt.value; target.dispatchEvent(new Event('change', {bubbles:true})); }
                                } else if (target.getAttribute('contenteditable') === 'true') {
                                    target.textContent = value;
                                    target.dispatchEvent(new Event('input', {bubbles:true}));
                                } else {
                                    target.value = '';
                                    document.execCommand('insertText', false, String(value));
                                    if (target.value !== String(value)) { target.value = value; target.dispatchEvent(new Event('input', {bubbles:true})); }
                                }
                                results.push({field: key, status: 'filled', method: 'label'});
                                found = true; break;
                            }
                        }
                    }
                    if (found) continue;
                    
                    // Strategy 2: Match by name/placeholder/aria-label
                    for (const input of inputs) {
                        const name = (input.name || '').toLowerCase();
                        const placeholder = (input.placeholder || '').toLowerCase();
                        const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
                        if (name.includes(keyLower) || placeholder.includes(keyLower) || ariaLabel.includes(keyLower)) {
                            input.focus();
                            if (input.tagName === 'SELECT') {
                                const opt = Array.from(input.options).find(o => o.text.toLowerCase().includes(String(value).toLowerCase()));
                                if (opt) { input.value = opt.value; input.dispatchEvent(new Event('change', {bubbles:true})); }
                            } else {
                                input.value = '';
                                document.execCommand('insertText', false, String(value));
                                if (input.value !== String(value)) { input.value = value; input.dispatchEvent(new Event('input', {bubbles:true})); }
                            }
                            results.push({field: key, status: 'filled', method: 'attribute'});
                            found = true; break;
                        }
                    }
                    if (!found) results.push({field: key, status: 'not_found'});
                }
                return { success: true, filled: results.filter(r => r.status === 'filled').length, total: Object.keys(fields).length, details: results };
            })()`;
            return await wc.executeJavaScript(script);
        }
    });

    // 2. AUTO TYPE AND SUBMIT — Type + Enter in one step
    registry.register({
        name: 'auto_type_and_submit',
        description: 'Type text into an element and automatically press Enter to submit. Combines type_text + press_key(Enter) into one step. Perfect for search boxes, login forms, chat inputs.',
        category: 'interaction',
        parameters: {
            element_id: { type: 'NUMBER', description: 'SOM element ID to type into' },
            text: { type: 'STRING', description: 'Text to type' },
            clear_first: { type: 'BOOLEAN', description: 'Clear field before typing (default: true)' },
        },
        requiredParams: ['element_id', 'text'],
        handler: async (args: any, ctx: ToolContext) => {
            // First type the text
            const typeResult = await registry.execute('type_text', { element_id: args.element_id, text: args.text, clear_first: args.clear_first ?? true }, ctx);
            if (!typeResult.success) return typeResult;

            // Brief pause then press Enter
            await new Promise(r => setTimeout(r, 200));
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            wc.sendInputEvent({ type: 'keyDown', keyCode: 'Return' } as any);
            await new Promise(r => setTimeout(r, 50));
            wc.sendInputEvent({ type: 'keyUp', keyCode: 'Return' } as any);

            return { ...typeResult, autoSubmitted: true, message: `Typed "${ args.text }" and pressed Enter` };
        }
    });

    // 3. EXECUTE JS SEQUENCE — Multiple JS commands in one call
    registry.register({
        name: 'execute_js_sequence',
        description: 'Execute multiple JavaScript operations in sequence with delays between them. Each step runs in the page context. MUCH faster than separate tool calls. Use for complex multi-step interactions.',
        category: 'advanced',
        parameters: {
            steps: { type: 'STRING', description: 'JSON array of JS code strings to execute in sequence. Example: ["document.querySelector(\\".btn\\").click()","document.querySelector(\\"input\\").value=\\"test\\""]' },
            delay_ms: { type: 'NUMBER', description: 'Delay between steps in ms (default: 500)' },
        },
        requiredParams: ['steps'],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const steps = typeof args.steps === 'string' ? JSON.parse(args.steps) : args.steps;
            const delay = args.delay_ms || 500;
            const results: any[] = [];

            for (let i = 0; i < steps.length; i++) {
                try {
                    const result = await wc.executeJavaScript(steps[i]);
                    results.push({ step: i + 1, success: true, result: String(result).substring(0, 200) });
                } catch (e: any) {
                    results.push({ step: i + 1, success: false, error: e.message });
                }
                if (i < steps.length - 1) await new Promise(r => setTimeout(r, delay));
            }

            return { success: results.every(r => r.success), stepsCompleted: results.filter(r => r.success).length, total: steps.length, results };
        }
    });

    // 4. PLAN AND DECOMPOSE — Internal reasoning tool
    registry.register({
        name: 'plan_task',
        description: 'Use this to create a structured plan for a complex task. Write out your numbered steps BEFORE acting. This helps you think systematically. Call this at the START of any complex task.',
        category: 'control',
        parameters: {
            goal: { type: 'STRING', description: 'The overall goal' },
            steps: { type: 'STRING', description: 'Your numbered plan as a string, e.g. "1. Navigate to site\\n2. Click create\\n3. Fill form\\n4. Submit"' },
            current_step: { type: 'NUMBER', description: 'Which step number you are currently on (default: 1)' },
        },
        requiredParams: ['goal', 'steps'],
        handler: async (args: any) => {
            return {
                success: true,
                plan_registered: true,
                goal: args.goal,
                steps: args.steps,
                current_step: args.current_step || 1,
                message: 'Plan registered. Now execute step ' + (args.current_step || 1) + '. After each step, update your progress.'
            };
        }
    });

    // 5. DRAG AND DROP — Move elements by dragging
    registry.register({
        name: 'drag_drop',
        description: 'Drag an element from one position to another. Supports SOM IDs or XY coordinates. Use for reordering, file dropping, or moving items.',
        category: 'interaction',
        parameters: {
            from_x: { type: 'INTEGER', description: 'Starting X coordinate.' },
            from_y: { type: 'INTEGER', description: 'Starting Y coordinate.' },
            to_x: { type: 'INTEGER', description: 'Destination X coordinate.' },
            to_y: { type: 'INTEGER', description: 'Destination Y coordinate.' },
            duration_ms: { type: 'INTEGER', description: 'Drag duration in ms (default 500). Longer = more natural.' }
        },
        requiredParams: ['from_x', 'from_y', 'to_x', 'to_y'],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const steps = 20;
            const duration = args.duration_ms || 500;
            const stepDelay = duration / steps;
            // Mouse down at source
            wc.sendInputEvent({ type: 'mouseDown', x: args.from_x, y: args.from_y, button: 'left', clickCount: 1 } as any);
            await new Promise(r => setTimeout(r, 100));
            // Smooth drag
            for (let i = 1; i <= steps; i++) {
                const progress = i / steps;
                const x = Math.round(args.from_x + (args.to_x - args.from_x) * progress);
                const y = Math.round(args.from_y + (args.to_y - args.from_y) * progress);
                wc.sendInputEvent({ type: 'mouseMove', x, y } as any);
                await new Promise(r => setTimeout(r, stepDelay));
            }
            // Mouse up at destination
            wc.sendInputEvent({ type: 'mouseUp', x: args.to_x, y: args.to_y, button: 'left', clickCount: 1 } as any);
            return { success: true, message: `Dragged from (${ args.from_x },${ args.from_y }) to (${ args.to_x },${ args.to_y })` };
        }
    });

    // 6. SMART TAB NAVIGATION — Tab through form fields
    registry.register({
        name: 'tab_through',
        description: 'Press Tab key N times to navigate through form fields. Useful for moving between fields without clicking.',
        category: 'interaction',
        parameters: {
            count: { type: 'NUMBER', description: 'Number of Tab presses (default: 1)' },
            shift: { type: 'BOOLEAN', description: 'If true, press Shift+Tab to go backwards (default: false)' },
        },
        requiredParams: [],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const count = args.count || 1;
            const shift = args.shift || false;

            for (let i = 0; i < count; i++) {
                if (shift) {
                    wc.sendInputEvent({ type: 'keyDown', keyCode: 'Shift' } as any);
                }
                wc.sendInputEvent({ type: 'keyDown', keyCode: 'Tab' } as any);
                await new Promise(r => setTimeout(r, 50));
                wc.sendInputEvent({ type: 'keyUp', keyCode: 'Tab' } as any);
                if (shift) {
                    wc.sendInputEvent({ type: 'keyUp', keyCode: 'Shift' } as any);
                }
                await new Promise(r => setTimeout(r, 100));
            }

            // Get info about currently focused element
            const focusInfo = await wc.executeJavaScript(`(() => {
                const el = document.activeElement;
                return el ? { tag: el.tagName, type: el.type || '', name: el.name || '', placeholder: el.placeholder || '', value: (el.value || '').substring(0, 50) } : null;
            })()`);

            return { success: true, tabCount: count, direction: shift ? 'backward' : 'forward', focusedElement: focusInfo };
        }
    });

    // 7. WAIT AND RETRY — Wait for condition then act
    registry.register({
        name: 'wait_for_and_click',
        description: 'Wait for an element with specific text to appear on the page, then click it. Useful for dynamically loaded content, modals, popups.',
        category: 'interaction',
        parameters: {
            text: { type: 'STRING', description: 'Text to wait for and click' },
            timeout_ms: { type: 'NUMBER', description: 'Max wait time in ms (default: 5000)' },
        },
        requiredParams: ['text'],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const timeout = args.timeout_ms || 5000;
            const searchText = args.text.replace(/'/g, "\\'");

            const script = `(async function() {
                const startTime = Date.now();
                const timeout = ${ timeout };
                const searchText = '${ searchText }'.toLowerCase();
                
                while (Date.now() - startTime < timeout) {
                    const all = document.querySelectorAll('button, a, [role="button"], span, div');
                    for (const el of all) {
                        const text = (el.textContent || '').toLowerCase().trim();
                        if (text.includes(searchText)) {
                            const rect = el.getBoundingClientRect();
                            if (rect.width > 0 && rect.height > 0) {
                                el.scrollIntoView({ block: 'center' });
                                el.click();
                                return { success: true, text: el.textContent?.substring(0, 50), waitedMs: Date.now() - startTime, rect: {x: Math.round(rect.x + rect.width/2), y: Math.round(rect.y + rect.height/2)} };
                            }
                        }
                    }
                    await new Promise(r => setTimeout(r, 300));
                }
                return { success: false, error: 'Text "' + searchText + '" not found after ' + timeout + 'ms' };
            })()`;

            const result = await wc.executeJavaScript(script);

            if (result.success && result.rect) {
                const { x, y } = result.rect;
                if (x > 0 && y > 0) {
                    wc.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 } as any);
                    await new Promise(r => setTimeout(r, 50));
                    wc.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 } as any);
                }
            }

            return result;
        }
    });

    // ═══════════════════════════════════════════════════════
    // 🚀 EXECUTE_ACTION_PLAN — THE ONE-API-CALL MEGA-TOOL
    // Model outputs entire action plan → system executes ALL locally
    // ═══════════════════════════════════════════════════════

    registry.register({
        name: 'execute_action_plan',
        description: `Execute an ENTIRE action plan in ONE call. ALL steps execute locally at max speed. Use text-based finding (no coordinates). THIS IS YOUR FASTEST TOOL.

Core actions:
- navigate: {"action":"navigate","url":"https://..."}
- click_text: {"action":"click_text","text":"Button Text"}
- type_into: {"action":"type_into","target":"label/placeholder","text":"value","clear":true}
- click_and_type: {"action":"click_and_type","text":"element text","value":"text to type","clear":true}
- type_and_enter: {"action":"type_and_enter","target":"field","text":"value"}
- clear_field: {"action":"clear_field","target":"field label"}
- select_option: {"action":"select_option","target":"label","value":"option"}
- press_key: {"action":"press_key","key":"Enter|Tab|Escape|Backspace"}
- wait: {"action":"wait","ms":500}
- scroll: {"action":"scroll","direction":"down","amount":300}

Advanced actions:
- double_click_text: {"action":"double_click_text","text":"text"}
- hover_text: {"action":"hover_text","text":"element text"}
- check_box: {"action":"check_box","label":"checkbox label"}
- uncheck_box: {"action":"uncheck_box","label":"checkbox label"}
- submit_form: {"action":"submit_form"}
- wait_for_text: {"action":"wait_for_text","text":"text to wait for","timeout":3000}
- focus: {"action":"focus","target":"field label"}
- set_value: {"action":"set_value","selector":"CSS selector","value":"val"}
- remove_element: {"action":"remove_element","selector":"CSS selector"}
- click_nth: {"action":"click_nth","text":"text","index":0}
- go_back: {"action":"go_back"}
- reload: {"action":"reload"}
- js: {"action":"js","code":"JS code"}

Coordinate & combo actions (for pixel-perfect precision):
- click_xy: {"action":"click_xy","x":100,"y":200} — Click exact coordinates
- click_xy_and_type: {"action":"click_xy_and_type","x":100,"y":200,"text":"value","clear":true} — Click coord → clear → type
- select_all_type: {"action":"select_all_type","target":"field","text":"new value"} — Ctrl+A then type (replaces all text)
- triple_click_type: {"action":"triple_click_type","target":"field","text":"new value"} — Triple-click select → type
- scroll_to_text: {"action":"scroll_to_text","text":"text to find"} — Scroll until text is visible

Example — Create Google Form (ONE call):
[{"action":"navigate","url":"https://docs.google.com/forms/"},{"action":"click_text","text":"Blank"},{"action":"wait","ms":1500},{"action":"type_into","target":"Untitled form","text":"Feedback Form","clear":true},{"action":"type_into","target":"Untitled Question","text":"Rate canteen","clear":true},{"action":"click_text","text":"Add question"},{"action":"wait","ms":500},{"action":"type_into","target":"Question","text":"Rate washroom","clear":true}]`,
        category: 'interaction',
        parameters: {
            steps: { type: 'STRING', description: 'JSON array of action steps to execute sequentially. Each step is an object with "action" type and parameters.' },
        },
        requiredParams: ['steps'],
        handler: async (args: any, ctx: ToolContext) => {
            const wc = ctx.webContents;
            if (!wc) return { error: 'No active tab' };
            const stepsJson = typeof args.steps === 'string' ? args.steps : JSON.stringify(args.steps);
            let steps: any[];
            try {
                steps = JSON.parse(stepsJson);
            } catch (e) {
                return { error: 'Invalid JSON for steps array', details: String(e) };
            }
            if (!Array.isArray(steps)) return { error: 'Steps must be a JSON array' };

            const results: any[] = [];
            let completed = 0;
            let failed = 0;

            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                const stepNum = i + 1;
                try {
                    switch (step.action) {
                        case 'navigate': {
                            wc.loadURL(step.url);
                            // Wait for page to be at least interactive
                            await new Promise<void>(resolve => {
                                const timer = setTimeout(resolve, 3000);
                                const check = setInterval(async () => {
                                    try {
                                        const state = await wc.executeJavaScript('document.readyState');
                                        if (state !== 'loading') { clearInterval(check); clearTimeout(timer); resolve(); }
                                    } catch (_) { }
                                }, 150);
                            });
                            results.push({ step: stepNum, action: 'navigate', success: true, url: step.url });
                            completed++;
                            break;
                        }

                        case 'click_text': {
                            const clickScript = `(() => {
                                const searchText = ${ JSON.stringify(step.text.toLowerCase()) };
                                const all = document.querySelectorAll('button, a, [role="button"], [role="link"], [role="tab"], [role="menuitem"], input[type="submit"], input[type="button"], div[class*="btn"], span[class*="btn"], [data-testid], [aria-label]');
                                let best = null;
                                let bestScore = 0;
                                for (const el of all) {
                                    if (el.offsetParent === null && el.offsetWidth === 0) continue;
                                    const elText = (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase().trim();
                                    if (elText === searchText) { best = el; bestScore = 100; break; }
                                    if (elText.includes(searchText) && elText.length < searchText.length * 3) {
                                        const score = searchText.length / elText.length * 100;
                                        if (score > bestScore) { best = el; bestScore = score; }
                                    }
                                }
                                if (!best) {
                                    // Fallback: search ALL visible elements
                                    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
                                    while (walker.nextNode()) {
                                        const n = walker.currentNode;
                                        if (n.offsetParent === null && n.offsetWidth === 0) continue;
                                        const t = (n.innerText || '').toLowerCase().trim();
                                        if (t === searchText || (t.includes(searchText) && t.length < searchText.length * 5)) {
                                            best = n;
                                            break;
                                        }
                                    }
                                }
                                if (best) {
                                    best.scrollIntoView({ behavior: 'instant', block: 'center' });
                                    best.click();
                                    return { success: true, text: (best.innerText || '').substring(0, 50) };
                                }
                                return { success: false, error: 'Text not found: ' + ${ JSON.stringify(step.text) } };
                            })()`;
                            const clickResult = await wc.executeJavaScript(clickScript);
                            results.push({ step: stepNum, action: 'click_text', ...clickResult });
                            if (clickResult.success) completed++; else failed++;
                            await new Promise(r => setTimeout(r, step.wait || 200));
                            break;
                        }

                        case 'type_into': {
                            const typeScript = `(() => {
                                const target = ${ JSON.stringify(step.target.toLowerCase()) };
                                const value = ${ JSON.stringify(step.text) };
                                const clear = ${ !!step.clear };
                                
                                // Strategy 1: Find by placeholder
                                let el = document.querySelector('input[placeholder*="' + target + '" i], textarea[placeholder*="' + target + '" i]');
                                
                                // Strategy 2: Find by label
                                if (!el) {
                                    const labels = document.querySelectorAll('label');
                                    for (const lbl of labels) {
                                        if (lbl.textContent.toLowerCase().includes(target)) {
                                            const forId = lbl.getAttribute('for');
                                            el = forId ? document.getElementById(forId) : lbl.querySelector('input, textarea');
                                            if (el) break;
                                        }
                                    }
                                }
                                
                                // Strategy 3: Find by aria-label
                                if (!el) el = document.querySelector('[aria-label*="' + target + '" i]');
                                
                                // Strategy 4: Find by visible text in contenteditable or input value
                                if (!el) {
                                    const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, [contenteditable="true"]');
                                    for (const inp of inputs) {
                                        const t = (inp.value || inp.innerText || inp.placeholder || inp.getAttribute('aria-label') || '').toLowerCase();
                                        if (t.includes(target)) { el = inp; break; }
                                    }
                                }
                                
                                // Strategy 5: Find by title attribute
                                if (!el) el = document.querySelector('[title*="' + target + '" i]');
                                
                                if (!el) return { success: false, error: 'Field not found: ' + ${ JSON.stringify(step.target) } };
                                
                                el.scrollIntoView({ behavior: 'instant', block: 'center' });
                                el.focus();
                                
                                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                                    if (clear) el.value = '';
                                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                                        el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value'
                                    )?.set;
                                    if (nativeInputValueSetter) nativeInputValueSetter.call(el, value);
                                    else el.value = value;
                                    el.dispatchEvent(new Event('input', { bubbles: true }));
                                    el.dispatchEvent(new Event('change', { bubbles: true }));
                                } else if (el.getAttribute('contenteditable') === 'true') {
                                    if (clear) el.innerHTML = '';
                                    el.focus();
                                    document.execCommand('insertText', false, value);
                                }
                                
                                return { success: true, field: ${ JSON.stringify(step.target) }, typed: value.substring(0, 30) };
                            })()`;
                            const typeResult = await wc.executeJavaScript(typeScript);
                            results.push({ step: stepNum, action: 'type_into', ...typeResult });
                            if (typeResult.success) completed++; else failed++;
                            await new Promise(r => setTimeout(r, 100));
                            break;
                        }

                        case 'select_option': {
                            const selectScript = `(() => {
                                const target = ${ JSON.stringify(step.target.toLowerCase()) };
                                const optVal = ${ JSON.stringify(step.value) };
                                const selects = document.querySelectorAll('select');
                                for (const sel of selects) {
                                    const label = sel.closest('label')?.textContent?.toLowerCase() || sel.getAttribute('aria-label')?.toLowerCase() || '';
                                    if (label.includes(target) || sel.name?.toLowerCase().includes(target)) {
                                        for (const opt of sel.options) {
                                            if (opt.text.toLowerCase().includes(optVal.toLowerCase())) {
                                                sel.value = opt.value;
                                                sel.dispatchEvent(new Event('change', { bubbles: true }));
                                                return { success: true };
                                            }
                                        }
                                    }
                                }
                                return { success: false, error: 'Select not found' };
                            })()`;
                            const selResult = await wc.executeJavaScript(selectScript);
                            results.push({ step: stepNum, action: 'select_option', ...selResult });
                            if (selResult.success) completed++; else failed++;
                            break;
                        }

                        case 'wait': {
                            await new Promise(r => setTimeout(r, step.ms || 500));
                            results.push({ step: stepNum, action: 'wait', success: true, ms: step.ms });
                            completed++;
                            break;
                        }

                        case 'scroll': {
                            const dir = step.direction === 'up' ? -1 : 1;
                            const amt = step.amount || 300;
                            await wc.executeJavaScript(`window.scrollBy(0, ${ dir * amt })`);
                            results.push({ step: stepNum, action: 'scroll', success: true });
                            completed++;
                            break;
                        }

                        case 'press_key': {
                            const keyMap: Record<string, string> = { 'Enter': '\r', 'Tab': '\t', 'Escape': '\u001b', 'Backspace': '\b' };
                            const keyCode = keyMap[step.key] || step.key;
                            wc.sendInputEvent({ type: 'keyDown', keyCode: step.key } as any);
                            wc.sendInputEvent({ type: 'char', keyCode } as any);
                            wc.sendInputEvent({ type: 'keyUp', keyCode: step.key } as any);
                            results.push({ step: stepNum, action: 'press_key', success: true, key: step.key });
                            completed++;
                            await new Promise(r => setTimeout(r, 100));
                            break;
                        }

                        case 'js': {
                            const jsResult = await wc.executeJavaScript(step.code);
                            results.push({ step: stepNum, action: 'js', success: true, result: String(jsResult).substring(0, 100) });
                            completed++;
                            break;
                        }

                        case 'clear_field': {
                            const cfResult = await wc.executeJavaScript(`(() => {
                                const target = ${ JSON.stringify(step.target.toLowerCase()) };
                                const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, [contenteditable="true"]');
                                for (const el of inputs) {
                                    const t = (el.value || el.innerText || el.placeholder || el.getAttribute('aria-label') || '').toLowerCase();
                                    if (t.includes(target)) {
                                        el.focus();
                                        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') { el.value = ''; }
                                        else { el.innerHTML = ''; }
                                        el.dispatchEvent(new Event('input', { bubbles: true }));
                                        return { success: true };
                                    }
                                }
                                return { success: false, error: 'Field not found: ' + ${ JSON.stringify(step.target) } };
                            })()`);
                            results.push({ step: stepNum, action: 'clear_field', ...cfResult });
                            if (cfResult.success) completed++; else failed++;
                            break;
                        }

                        case 'click_and_type': {
                            // Click element by text, then type into the focused element
                            const catResult = await wc.executeJavaScript(`(() => {
                                const searchText = ${ JSON.stringify(step.text.toLowerCase()) };
                                const value = ${ JSON.stringify(step.value) };
                                const clear = ${ !!step.clear };
                                const all = document.querySelectorAll('button, a, input, textarea, [role="button"], [contenteditable="true"], div, span, label');
                                for (const el of all) {
                                    if (el.offsetParent === null && el.offsetWidth === 0) continue;
                                    const t = (el.innerText || el.value || el.getAttribute('aria-label') || el.placeholder || '').toLowerCase().trim();
                                    if (t.includes(searchText)) {
                                        el.scrollIntoView({ behavior: 'instant', block: 'center' });
                                        el.click();
                                        el.focus();
                                        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                                            if (clear) el.value = '';
                                            const setter = Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value')?.set;
                                            if (setter) setter.call(el, value); else el.value = value;
                                            el.dispatchEvent(new Event('input', { bubbles: true }));
                                            el.dispatchEvent(new Event('change', { bubbles: true }));
                                        } else if (el.getAttribute('contenteditable') === 'true') {
                                            if (clear) el.innerHTML = '';
                                            document.execCommand('insertText', false, value);
                                        } else {
                                            // Clicked non-input, look for nearby input
                                            const nearby = el.querySelector('input, textarea, [contenteditable="true"]') || el.closest('label')?.querySelector('input, textarea');
                                            if (nearby) {
                                                nearby.focus();
                                                if (nearby.tagName === 'INPUT' || nearby.tagName === 'TEXTAREA') {
                                                    if (clear) nearby.value = '';
                                                    nearby.value = value;
                                                    nearby.dispatchEvent(new Event('input', { bubbles: true }));
                                                }
                                            }
                                        }
                                        return { success: true, text: t.substring(0, 30), typed: value.substring(0, 30) };
                                    }
                                }
                                return { success: false, error: 'Element not found: ' + ${ JSON.stringify(step.text) } };
                            })()`);
                            results.push({ step: stepNum, action: 'click_and_type', ...catResult });
                            if (catResult.success) completed++; else failed++;
                            await new Promise(r => setTimeout(r, 100));
                            break;
                        }

                        case 'type_and_enter': {
                            // Type into field then press Enter
                            const taeResult = await wc.executeJavaScript(`(() => {
                                const target = ${ JSON.stringify(step.target.toLowerCase()) };
                                const value = ${ JSON.stringify(step.text) };
                                let el = document.querySelector('input[placeholder*="' + target + '" i], textarea[placeholder*="' + target + '" i], [aria-label*="' + target + '" i]');
                                if (!el) {
                                    const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea');
                                    for (const inp of inputs) {
                                        const t = (inp.value || inp.placeholder || inp.getAttribute('aria-label') || '').toLowerCase();
                                        if (t.includes(target)) { el = inp; break; }
                                    }
                                }
                                if (!el) return { success: false, error: 'Field not found' };
                                el.focus();
                                el.value = value;
                                el.dispatchEvent(new Event('input', { bubbles: true }));
                                el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                                el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                                el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                                const form = el.closest('form');
                                if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
                                return { success: true, typed: value.substring(0, 30) };
                            })()`);
                            results.push({ step: stepNum, action: 'type_and_enter', ...taeResult });
                            if (taeResult.success) completed++; else failed++;
                            await new Promise(r => setTimeout(r, 300));
                            break;
                        }

                        case 'double_click_text': {
                            const dcResult = await wc.executeJavaScript(`(() => {
                                const searchText = ${ JSON.stringify(step.text.toLowerCase()) };
                                const all = document.querySelectorAll('*');
                                for (const el of all) {
                                    if (el.children.length > 3 || el.offsetParent === null) continue;
                                    const t = (el.innerText || '').toLowerCase().trim();
                                    if (t === searchText || (t.includes(searchText) && t.length < searchText.length * 3)) {
                                        el.scrollIntoView({ behavior: 'instant', block: 'center' });
                                        el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
                                        return { success: true, text: t.substring(0, 30) };
                                    }
                                }
                                return { success: false, error: 'Not found' };
                            })()`);
                            results.push({ step: stepNum, action: 'double_click_text', ...dcResult });
                            if (dcResult.success) completed++; else failed++;
                            break;
                        }

                        case 'hover_text': {
                            const hResult = await wc.executeJavaScript(`(() => {
                                const searchText = ${ JSON.stringify(step.text.toLowerCase()) };
                                const all = document.querySelectorAll('*');
                                for (const el of all) {
                                    if (el.children.length > 5 || el.offsetParent === null) continue;
                                    const t = (el.innerText || el.getAttribute('aria-label') || '').toLowerCase().trim();
                                    if (t.includes(searchText)) {
                                        el.scrollIntoView({ behavior: 'instant', block: 'center' });
                                        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                                        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                                        return { success: true };
                                    }
                                }
                                return { success: false, error: 'Not found' };
                            })()`);
                            results.push({ step: stepNum, action: 'hover_text', ...hResult });
                            if (hResult.success) completed++; else failed++;
                            break;
                        }

                        case 'check_box':
                        case 'uncheck_box': {
                            const shouldCheck = step.action === 'check_box';
                            const cbResult = await wc.executeJavaScript(`(() => {
                                const label = ${ JSON.stringify(step.label.toLowerCase()) };
                                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                                for (const cb of checkboxes) {
                                    const lbl = cb.closest('label')?.textContent?.toLowerCase() || cb.getAttribute('aria-label')?.toLowerCase() || '';
                                    const nearby = cb.parentElement?.textContent?.toLowerCase() || '';
                                    if (lbl.includes(label) || nearby.includes(label)) {
                                        if (cb.checked !== ${ shouldCheck }) {
                                            cb.click();
                                            cb.dispatchEvent(new Event('change', { bubbles: true }));
                                        }
                                        return { success: true, checked: cb.checked };
                                    }
                                }
                                return { success: false, error: 'Checkbox not found' };
                            })()`);
                            results.push({ step: stepNum, action: step.action, ...cbResult });
                            if (cbResult.success) completed++; else failed++;
                            break;
                        }

                        case 'submit_form': {
                            const sfResult = await wc.executeJavaScript(`(() => {
                                const forms = document.querySelectorAll('form');
                                if (forms.length === 0) {
                                    const submitBtn = document.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
                                    if (submitBtn) { submitBtn.click(); return { success: true, method: 'button_click' }; }
                                    return { success: false, error: 'No form or submit button found' };
                                }
                                const form = forms[forms.length - 1];
                                form.dispatchEvent(new Event('submit', { bubbles: true }));
                                try { form.submit(); } catch(e) {}
                                return { success: true, method: 'form_submit' };
                            })()`);
                            results.push({ step: stepNum, action: 'submit_form', ...sfResult });
                            if (sfResult.success) completed++; else failed++;
                            await new Promise(r => setTimeout(r, 500));
                            break;
                        }

                        case 'wait_for_text': {
                            const timeout = step.timeout || 3000;
                            const wftResult = await wc.executeJavaScript(`new Promise(resolve => {
                                const searchText = ${ JSON.stringify(step.text.toLowerCase()) };
                                const deadline = Date.now() + ${ timeout };
                                const check = () => {
                                    if (document.body.innerText.toLowerCase().includes(searchText)) {
                                        resolve({ success: true, found: true });
                                    } else if (Date.now() > deadline) {
                                        resolve({ success: false, error: 'Text not found within timeout' });
                                    } else {
                                        setTimeout(check, 200);
                                    }
                                };
                                check();
                            })`);
                            results.push({ step: stepNum, action: 'wait_for_text', ...wftResult });
                            if (wftResult.success) completed++; else failed++;
                            break;
                        }

                        case 'focus': {
                            const fResult = await wc.executeJavaScript(`(() => {
                                const target = ${ JSON.stringify(step.target.toLowerCase()) };
                                const el = document.querySelector('[aria-label*="' + target + '" i], [placeholder*="' + target + '" i], [title*="' + target + '" i]');
                                if (el) { el.scrollIntoView({ behavior: 'instant', block: 'center' }); el.focus(); return { success: true }; }
                                return { success: false, error: 'Element not found' };
                            })()`);
                            results.push({ step: stepNum, action: 'focus', ...fResult });
                            if (fResult.success) completed++; else failed++;
                            break;
                        }

                        case 'set_value': {
                            const svResult = await wc.executeJavaScript(`(() => {
                                const el = document.querySelector(${ JSON.stringify(step.selector) });
                                if (!el) return { success: false, error: 'Selector not found' };
                                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                                    el.value = ${ JSON.stringify(step.value) };
                                    el.dispatchEvent(new Event('input', { bubbles: true }));
                                    el.dispatchEvent(new Event('change', { bubbles: true }));
                                } else {
                                    el.innerText = ${ JSON.stringify(step.value) };
                                }
                                return { success: true };
                            })()`);
                            results.push({ step: stepNum, action: 'set_value', ...svResult });
                            if (svResult.success) completed++; else failed++;
                            break;
                        }

                        case 'remove_element': {
                            const reResult = await wc.executeJavaScript(`(() => {
                                const els = document.querySelectorAll(${ JSON.stringify(step.selector) });
                                if (els.length === 0) return { success: false, error: 'No elements found' };
                                els.forEach(el => el.remove());
                                return { success: true, removed: els.length };
                            })()`);
                            results.push({ step: stepNum, action: 'remove_element', ...reResult });
                            if (reResult.success) completed++; else failed++;
                            break;
                        }

                        case 'click_nth': {
                            const idx = step.index || 0;
                            const cnResult = await wc.executeJavaScript(`(() => {
                                const searchText = ${ JSON.stringify(step.text.toLowerCase()) };
                                const matches = [];
                                const all = document.querySelectorAll('button, a, [role="button"], div, span, input');
                                for (const el of all) {
                                    if (el.offsetParent === null && el.offsetWidth === 0) continue;
                                    const t = (el.innerText || el.value || el.getAttribute('aria-label') || '').toLowerCase().trim();
                                    if (t.includes(searchText)) matches.push(el);
                                }
                                if (matches.length <= ${ idx }) return { success: false, error: 'Only ' + matches.length + ' matches found, index ${ idx } out of range' };
                                matches[${ idx }].scrollIntoView({ behavior: 'instant', block: 'center' });
                                matches[${ idx }].click();
                                return { success: true, matchCount: matches.length, clickedIndex: ${ idx } };
                            })()`);
                            results.push({ step: stepNum, action: 'click_nth', ...cnResult });
                            if (cnResult.success) completed++; else failed++;
                            await new Promise(r => setTimeout(r, 200));
                            break;
                        }

                        case 'go_back': {
                            wc.goBack();
                            await new Promise(r => setTimeout(r, 500));
                            results.push({ step: stepNum, action: 'go_back', success: true });
                            completed++;
                            break;
                        }

                        case 'reload': {
                            wc.reload();
                            await new Promise<void>(resolve => {
                                const timer = setTimeout(resolve, 3000);
                                const check = setInterval(async () => {
                                    try {
                                        const state = await wc.executeJavaScript('document.readyState');
                                        if (state !== 'loading') { clearInterval(check); clearTimeout(timer); resolve(); }
                                    } catch (_) { }
                                }, 200);
                            });
                            results.push({ step: stepNum, action: 'reload', success: true });
                            completed++;
                            break;
                        }

                        case 'click_xy': {
                            const x = Math.round(step.x);
                            const y = Math.round(step.y);
                            wc.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 } as any);
                            await new Promise(r => setTimeout(r, 40));
                            wc.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 } as any);
                            results.push({ step: stepNum, action: 'click_xy', success: true, x, y });
                            completed++;
                            await new Promise(r => setTimeout(r, step.wait || 150));
                            break;
                        }

                        case 'click_xy_and_type': {
                            const cx = Math.round(step.x);
                            const cy = Math.round(step.y);
                            // Click
                            wc.sendInputEvent({ type: 'mouseDown', x: cx, y: cy, button: 'left', clickCount: 1 } as any);
                            await new Promise(r => setTimeout(r, 40));
                            wc.sendInputEvent({ type: 'mouseUp', x: cx, y: cy, button: 'left', clickCount: 1 } as any);
                            await new Promise(r => setTimeout(r, 100));
                            // Clear if needed
                            if (step.clear) {
                                await wc.executeJavaScript(`(() => {
                                    const el = document.activeElement;
                                    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) { el.value = ''; el.dispatchEvent(new Event('input', {bubbles:true})); }
                                    else if (el && el.getAttribute('contenteditable') === 'true') { el.innerHTML = ''; }
                                })()`);
                            }
                            // Type
                            for (const char of step.text) {
                                wc.sendInputEvent({ type: 'keyDown', keyCode: char } as any);
                                wc.sendInputEvent({ type: 'char', keyCode: char } as any);
                                wc.sendInputEvent({ type: 'keyUp', keyCode: char } as any);
                            }
                            results.push({ step: stepNum, action: 'click_xy_and_type', success: true, x: cx, y: cy, typed: step.text.substring(0, 30) });
                            completed++;
                            await new Promise(r => setTimeout(r, 100));
                            break;
                        }

                        case 'select_all_type': {
                            // Find field, Ctrl+A, then type (replaces all content)
                            const satResult = await wc.executeJavaScript(`(() => {
                                const target = ${ JSON.stringify(step.target.toLowerCase()) };
                                let el = document.querySelector('[placeholder*="' + target + '" i], [aria-label*="' + target + '" i], [title*="' + target + '" i]');
                                if (!el) {
                                    const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, [contenteditable="true"]');
                                    for (const inp of inputs) {
                                        const t = (inp.value || inp.innerText || inp.placeholder || inp.getAttribute('aria-label') || '').toLowerCase();
                                        if (t.includes(target)) { el = inp; break; }
                                    }
                                }
                                if (!el) return { success: false, error: 'Field not found' };
                                el.scrollIntoView({ behavior: 'instant', block: 'center' });
                                el.focus();
                                // Select all
                                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                                    el.select();
                                    const setter = Object.getOwnPropertyDescriptor(
                                        el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value'
                                    )?.set;
                                    if (setter) setter.call(el, ${ JSON.stringify(step.text) });
                                    else el.value = ${ JSON.stringify(step.text) };
                                    el.dispatchEvent(new Event('input', { bubbles: true }));
                                    el.dispatchEvent(new Event('change', { bubbles: true }));
                                } else if (el.getAttribute('contenteditable') === 'true') {
                                    document.execCommand('selectAll');
                                    document.execCommand('insertText', false, ${ JSON.stringify(step.text) });
                                }
                                return { success: true, typed: ${ JSON.stringify(step.text) }.substring(0, 30) };
                            })()`);
                            results.push({ step: stepNum, action: 'select_all_type', ...satResult });
                            if (satResult.success) completed++; else failed++;
                            break;
                        }

                        case 'triple_click_type': {
                            // Triple-click to select line, then type replacement
                            const tctResult = await wc.executeJavaScript(`(() => {
                                const target = ${ JSON.stringify(step.target.toLowerCase()) };
                                let el = document.querySelector('[placeholder*="' + target + '" i], [aria-label*="' + target + '" i]');
                                if (!el) {
                                    const all = document.querySelectorAll('input, textarea, [contenteditable="true"], div, span, p');
                                    for (const e of all) {
                                        if (e.offsetParent === null) continue;
                                        const t = (e.value || e.innerText || '').toLowerCase();
                                        if (t.includes(target)) { el = e; break; }
                                    }
                                }
                                if (!el) return { success: false, error: 'Not found' };
                                el.scrollIntoView({ behavior: 'instant', block: 'center' });
                                el.focus();
                                // Select all text in this element
                                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                                    el.select();
                                    el.value = ${ JSON.stringify(step.text) };
                                    el.dispatchEvent(new Event('input', { bubbles: true }));
                                } else {
                                    const range = document.createRange();
                                    range.selectNodeContents(el);
                                    const sel = window.getSelection();
                                    sel.removeAllRanges();
                                    sel.addRange(range);
                                    document.execCommand('insertText', false, ${ JSON.stringify(step.text) });
                                }
                                return { success: true, typed: ${ JSON.stringify(step.text) }.substring(0, 30) };
                            })()`);
                            results.push({ step: stepNum, action: 'triple_click_type', ...tctResult });
                            if (tctResult.success) completed++; else failed++;
                            break;
                        }

                        case 'scroll_to_text': {
                            const sttResult = await wc.executeJavaScript(`(() => {
                                const searchText = ${ JSON.stringify(step.text.toLowerCase()) };
                                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                                while (walker.nextNode()) {
                                    if (walker.currentNode.textContent.toLowerCase().includes(searchText)) {
                                        walker.currentNode.parentElement.scrollIntoView({ behavior: 'instant', block: 'center' });
                                        return { success: true, found: true };
                                    }
                                }
                                // Fallback: scroll down and retry
                                window.scrollBy(0, 500);
                                return { success: false, error: 'Text not visible, scrolled down' };
                            })()`);
                            results.push({ step: stepNum, action: 'scroll_to_text', ...sttResult });
                            if (sttResult.success) completed++; else failed++;
                            break;
                        }

                        case 'fill_table': {
                            // Fill spreadsheet/table cells row by row
                            const ftResult = await wc.executeJavaScript(`(() => {
                                const data = ${ JSON.stringify(step.data) };
                                const startRow = ${ step.start_row || 0 };
                                const tables = document.querySelectorAll('table');
                                const results = { filled: 0, errors: 0 };
                                
                                // Strategy 1: Real HTML table
                                if (tables.length > 0) {
                                    const table = tables[tables.length - 1];
                                    const rows = table.querySelectorAll('tr');
                                    for (let r = 0; r < data.length; r++) {
                                        const rowIdx = startRow + r;
                                        if (rowIdx >= rows.length) break;
                                        const cells = rows[rowIdx].querySelectorAll('td, th');
                                        for (let c = 0; c < data[r].length; c++) {
                                            if (c >= cells.length) break;
                                            const cell = cells[c];
                                            const input = cell.querySelector('input, textarea, [contenteditable]');
                                            if (input) {
                                                if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
                                                    input.value = String(data[r][c]);
                                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                                } else {
                                                    input.innerText = String(data[r][c]);
                                                }
                                                results.filled++;
                                            } else {
                                                // Try clicking cell then typing
                                                cell.click();
                                                cell.innerText = String(data[r][c]);
                                                results.filled++;
                                            }
                                        }
                                    }
                                    return { success: true, ...results };
                                }
                                
                                // Strategy 2: Spreadsheet-like (Google Sheets)
                                // Look for grid cells
                                const gridCells = document.querySelectorAll('[role="gridcell"], .cell, [class*="cell"]');
                                if (gridCells.length > 0) {
                                    let idx = 0;
                                    for (let r = 0; r < data.length; r++) {
                                        for (let c = 0; c < data[r].length; c++) {
                                            if (idx < gridCells.length) {
                                                gridCells[idx].click();
                                                gridCells[idx].innerText = String(data[r][c]);
                                                results.filled++;
                                            }
                                            idx++;
                                        }
                                    }
                                    return { success: true, ...results };
                                }
                                
                                return { success: false, error: 'No table or grid found' };
                            })()`);
                            results.push({ step: stepNum, action: 'fill_table', ...ftResult });
                            if (ftResult.success) completed++; else failed++;
                            break;
                        }

                        case 'read_table': {
                            const rtResult = await wc.executeJavaScript(`(() => {
                                const selector = ${ JSON.stringify(step.selector || 'table') };
                                const table = document.querySelector(selector);
                                if (!table) return { success: false, error: 'Table not found' };
                                const rows = table.querySelectorAll('tr');
                                const data = [];
                                for (const row of rows) {
                                    const cells = row.querySelectorAll('td, th');
                                    data.push(Array.from(cells).map(c => c.innerText.trim()));
                                }
                                return { success: true, rows: data.length, cols: data[0]?.length || 0, data: data.slice(0, 20) };
                            })()`);
                            results.push({ step: stepNum, action: 'read_table', ...rtResult });
                            if (rtResult.success) completed++; else failed++;
                            break;
                        }

                        case 'fill_form_all': {
                            const ffResult = await wc.executeJavaScript(`(() => {
                                const data = ${ JSON.stringify(step.data) };
                                let filled = 0, missed = 0;
                                const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), textarea, select, [contenteditable="true"]');
                                const labels = document.querySelectorAll('label');
                                
                                for (const [key, value] of Object.entries(data)) {
                                    const keyLower = key.toLowerCase();
                                    let found = false;
                                    
                                    // Try label matching first
                                    for (const label of labels) {
                                        if (label.textContent.toLowerCase().includes(keyLower)) {
                                            const forId = label.getAttribute('for');
                                            let target = forId ? document.getElementById(forId) : label.querySelector('input, textarea, select');
                                            if (!target) target = label.closest('.form-group, .field')?.querySelector('input, textarea, select');
                                            if (target) {
                                                if (target.tagName === 'SELECT') {
                                                    for (const opt of target.options) {
                                                        if (opt.text.toLowerCase().includes(String(value).toLowerCase())) {
                                                            target.value = opt.value;
                                                            break;
                                                        }
                                                    }
                                                } else {
                                                    target.value = String(value);
                                                }
                                                target.dispatchEvent(new Event('input', { bubbles: true }));
                                                target.dispatchEvent(new Event('change', { bubbles: true }));
                                                filled++;
                                                found = true;
                                                break;
                                            }
                                        }
                                    }
                                    
                                    // Try placeholder/name/aria-label matching
                                    if (!found) {
                                        for (const inp of inputs) {
                                            const t = (inp.placeholder || inp.name || inp.getAttribute('aria-label') || '').toLowerCase();
                                            if (t.includes(keyLower)) {
                                                if (inp.tagName === 'SELECT') {
                                                    for (const opt of inp.options) {
                                                        if (opt.text.toLowerCase().includes(String(value).toLowerCase())) {
                                                            inp.value = opt.value; break;
                                                        }
                                                    }
                                                } else {
                                                    inp.value = String(value);
                                                }
                                                inp.dispatchEvent(new Event('input', { bubbles: true }));
                                                inp.dispatchEvent(new Event('change', { bubbles: true }));
                                                filled++;
                                                found = true;
                                                break;
                                            }
                                        }
                                    }
                                    if (!found) missed++;
                                }
                                return { success: missed === 0, filled, missed, total: Object.keys(data).length };
                            })()`);
                            results.push({ step: stepNum, action: 'fill_form_all', ...ffResult });
                            if (ffResult.success) completed++; else failed++;
                            break;
                        }

                        case 'extract_text': {
                            const etResult = await wc.executeJavaScript(`(() => {
                                const el = document.querySelector(${ JSON.stringify(step.selector) });
                                if (!el) return { success: false, error: 'Element not found' };
                                return { success: true, text: el.innerText.substring(0, 500) };
                            })()`);
                            results.push({ step: stepNum, action: 'extract_text', ...etResult });
                            if (etResult.success) completed++; else failed++;
                            break;
                        }

                        case 'count_elements': {
                            const ceResult = await wc.executeJavaScript(`(() => {
                                const els = document.querySelectorAll(${ JSON.stringify(step.selector) });
                                return { success: true, count: els.length };
                            })()`);
                            results.push({ step: stepNum, action: 'count_elements', ...ceResult });
                            completed++;
                            break;
                        }

                        case 'assert_text_exists': {
                            const ateResult = await wc.executeJavaScript(`(() => {
                                const text = ${ JSON.stringify(step.text.toLowerCase()) };
                                const exists = document.body.innerText.toLowerCase().includes(text);
                                return { success: exists, found: exists };
                            })()`);
                            results.push({ step: stepNum, action: 'assert_text_exists', ...ateResult });
                            if (ateResult.success) completed++; else failed++;
                            break;
                        }

                        case 'assert_url_contains': {
                            const url = wc.getURL();
                            const match = url.toLowerCase().includes(step.text.toLowerCase());
                            results.push({ step: stepNum, action: 'assert_url_contains', success: match, url });
                            if (match) completed++; else failed++;
                            break;
                        }

                        case 'drag_drop': {
                            const ddResult = await wc.executeJavaScript(`(() => {
                                const fromText = ${ JSON.stringify(step.from.toLowerCase()) };
                                const toText = ${ JSON.stringify(step.to.toLowerCase()) };
                                let fromEl = null, toEl = null;
                                const all = document.querySelectorAll('*');
                                for (const el of all) {
                                    if (el.offsetParent === null) continue;
                                    const t = (el.innerText || el.getAttribute('aria-label') || '').toLowerCase().trim();
                                    if (!fromEl && t.includes(fromText)) fromEl = el;
                                    if (!toEl && t.includes(toText)) toEl = el;
                                    if (fromEl && toEl) break;
                                }
                                if (!fromEl || !toEl) return { success: false, error: 'Elements not found' };
                                const fromRect = fromEl.getBoundingClientRect();
                                const toRect = toEl.getBoundingClientRect();
                                const dataTransfer = new DataTransfer();
                                fromEl.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
                                toEl.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer }));
                                toEl.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer }));
                                fromEl.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
                                return { success: true };
                            })()`);
                            results.push({ step: stepNum, action: 'drag_drop', ...ddResult });
                            if (ddResult.success) completed++; else failed++;
                            break;
                        }

                        case 'wait_for_navigation': {
                            const startUrl = wc.getURL();
                            const wfnTimeout = step.timeout || 5000;
                            let navSuccess = false;
                            for (let t = 0; t < wfnTimeout; t += 200) {
                                await new Promise(r => setTimeout(r, 200));
                                if (wc.getURL() !== startUrl) { navSuccess = true; break; }
                            }
                            results.push({ step: stepNum, action: 'wait_for_navigation', success: navSuccess, newUrl: navSuccess ? wc.getURL() : undefined });
                            if (navSuccess) completed++; else failed++;
                            break;
                        }

                        case 'loop': {
                            const times = step.times || 1;
                            const subSteps = step.steps || [];
                            let loopCompleted = 0, loopFailed = 0;
                            for (let iter = 0; iter < times; iter++) {
                                for (const subStep of subSteps) {
                                    // Recursively add to the main steps queue
                                    // Execute inline by pushing to results
                                    try {
                                        const subAction = subStep.action;
                                        if (subAction === 'click_text') {
                                            const r = await wc.executeJavaScript(`(() => {
                                                const t = ${ JSON.stringify(subStep.text.toLowerCase()) };
                                                const all = document.querySelectorAll('button, a, [role="button"], div, span, input');
                                                for (const el of all) {
                                                    if (el.offsetParent === null && el.offsetWidth === 0) continue;
                                                    if ((el.innerText || el.value || '').toLowerCase().includes(t)) { el.scrollIntoView({behavior:'instant',block:'center'}); el.click(); return {success:true}; }
                                                }
                                                return {success:false};
                                            })()`);
                                            if (r.success) loopCompleted++; else loopFailed++;
                                        } else if (subAction === 'wait') {
                                            await new Promise(r => setTimeout(r, subStep.ms || 300));
                                            loopCompleted++;
                                        } else if (subAction === 'type_into') {
                                            const r = await wc.executeJavaScript(`(() => {
                                                const target = ${ JSON.stringify(subStep.target.toLowerCase()) };
                                                let el = document.querySelector('[placeholder*="' + target + '" i], [aria-label*="' + target + '" i]');
                                                if (!el) { const inputs = document.querySelectorAll('input,textarea,[contenteditable]'); for(const i of inputs){if((i.value||i.innerText||i.placeholder||'').toLowerCase().includes(target)){el=i;break;}} }
                                                if(!el) return {success:false};
                                                el.focus();
                                                if(el.tagName==='INPUT'||el.tagName==='TEXTAREA'){if(${ !!subStep.clear })el.value='';el.value=${ JSON.stringify(subStep.text) };el.dispatchEvent(new Event('input',{bubbles:true}));}
                                                else{if(${ !!subStep.clear })el.innerHTML='';document.execCommand('insertText',false,${ JSON.stringify(subStep.text) });}
                                                return{success:true};
                                            })()`);
                                            if (r.success) loopCompleted++; else loopFailed++;
                                        } else if (subAction === 'press_key') {
                                            wc.sendInputEvent({ type: 'keyDown', keyCode: subStep.key } as any);
                                            wc.sendInputEvent({ type: 'char', keyCode: subStep.key } as any);
                                            wc.sendInputEvent({ type: 'keyUp', keyCode: subStep.key } as any);
                                            loopCompleted++;
                                        } else if (subAction === 'js') {
                                            await wc.executeJavaScript(subStep.code);
                                            loopCompleted++;
                                        }
                                    } catch (_) { loopFailed++; }
                                }
                            }
                            results.push({ step: stepNum, action: 'loop', success: loopFailed === 0, iterations: times, completed: loopCompleted, failed: loopFailed });
                            if (loopFailed === 0) completed++; else failed++;
                            break;
                        }

                        case 'if_text_exists': {
                            const pageText = await wc.executeJavaScript('document.body.innerText.toLowerCase()');
                            const conditionMet = pageText.includes(step.text.toLowerCase());
                            const branchSteps = conditionMet ? (step.then || []) : (step.else || []);
                            // Execute branch steps inline
                            let branchOk = 0, branchFail = 0;
                            for (const bs of branchSteps) {
                                try {
                                    if (bs.action === 'click_text') {
                                        const r = await wc.executeJavaScript(`(() => {
                                            const t = ${ JSON.stringify((bs.text || '').toLowerCase()) };
                                            const all = document.querySelectorAll('button,a,[role="button"],div,span');
                                            for(const el of all){if(el.offsetParent===null)continue;if((el.innerText||'').toLowerCase().includes(t)){el.click();return{s:true};}}
                                            return{s:false};
                                        })()`);
                                        if (r.s) branchOk++; else branchFail++;
                                    } else if (bs.action === 'wait') {
                                        await new Promise(r => setTimeout(r, bs.ms || 300));
                                        branchOk++;
                                    } else if (bs.action === 'js') {
                                        await wc.executeJavaScript(bs.code);
                                        branchOk++;
                                    }
                                } catch (_) { branchFail++; }
                            }
                            results.push({ step: stepNum, action: 'if_text_exists', conditionMet, branch: conditionMet ? 'then' : 'else', completed: branchOk, failed: branchFail, success: branchFail === 0 });
                            if (branchFail === 0) completed++; else failed++;
                            break;
                        }

                        case 'multi_select': {
                            const msResult = await wc.executeJavaScript(`(() => {
                                const target = ${ JSON.stringify(step.target.toLowerCase()) };
                                const values = ${ JSON.stringify(step.values) };
                                const selects = document.querySelectorAll('select[multiple]');
                                for (const sel of selects) {
                                    const lbl = sel.closest('label')?.textContent?.toLowerCase() || sel.getAttribute('aria-label')?.toLowerCase() || sel.name?.toLowerCase() || '';
                                    if (lbl.includes(target)) {
                                        let selected = 0;
                                        for (const opt of sel.options) {
                                            const match = values.some(v => opt.text.toLowerCase().includes(v.toLowerCase()));
                                            if (match) { opt.selected = true; selected++; }
                                        }
                                        sel.dispatchEvent(new Event('change', { bubbles: true }));
                                        return { success: selected > 0, selected };
                                    }
                                }
                                return { success: false, error: 'Multi-select not found' };
                            })()`);
                            results.push({ step: stepNum, action: 'multi_select', ...msResult });
                            if (msResult.success) completed++; else failed++;
                            break;
                        }

                        case 'click': {
                            // Click by SOM element_id or CSS selector
                            if (step.element_id !== undefined) {
                                const somScript = getSOMFinderScript(step.element_id);
                                const clickResult = await wc.executeJavaScript(`(() => {
                                    ${ somScript }
                                    const el = findSOMElement();
                                    if (!el) return { success: false, error: 'Element #' + ${ step.element_id } + ' not found' };
                                    el.scrollIntoView({ behavior: 'instant', block: 'center' });
                                    el.click();
                                    return { success: true, tag: el.tagName, text: (el.innerText || '').substring(0, 40) };
                                })()`);
                                results.push({ step: stepNum, action: 'click', ...clickResult });
                                if (clickResult.success) completed++; else failed++;
                            } else if (step.selector) {
                                const clickResult = await wc.executeJavaScript(`(() => {
                                    const el = document.querySelector(${ JSON.stringify(step.selector) });
                                    if (!el) return { success: false, error: 'Selector not found' };
                                    el.scrollIntoView({ behavior: 'instant', block: 'center' });
                                    el.click();
                                    return { success: true, tag: el.tagName, text: (el.innerText || '').substring(0, 40) };
                                })()`);
                                results.push({ step: stepNum, action: 'click', ...clickResult });
                                if (clickResult.success) completed++; else failed++;
                            } else {
                                results.push({ step: stepNum, action: 'click', success: false, error: 'No element_id or selector provided' });
                                failed++;
                            }
                            await new Promise(r => setTimeout(r, 200));
                            break;
                        }

                        case 'type': {
                            // Type into element by CSS selector
                            if (step.selector && step.text) {
                                const typeResult = await wc.executeJavaScript(`(() => {
                                    const el = document.querySelector(${ JSON.stringify(step.selector) });
                                    if (!el) return { success: false, error: 'Selector not found' };
                                    el.focus();
                                    if (${ !!step.clear }) { el.value = ''; }
                                    el.value = ${ JSON.stringify(step.text || '') };
                                    el.dispatchEvent(new Event('input', { bubbles: true }));
                                    el.dispatchEvent(new Event('change', { bubbles: true }));
                                    return { success: true };
                                })()`);
                                results.push({ step: stepNum, action: 'type', ...typeResult });
                                if (typeResult.success) completed++; else failed++;
                            } else {
                                results.push({ step: stepNum, action: 'type', success: false, error: 'Missing selector or text' });
                                failed++;
                            }
                            break;
                        }

                        case 'scroll': {
                            const dir = step.direction || 'down';
                            const px = step.pixels || 400;
                            await wc.executeJavaScript(`window.scrollBy(0, ${ dir === 'up' ? -px : px })`);
                            results.push({ step: stepNum, action: 'scroll', success: true, direction: dir });
                            completed++;
                            await new Promise(r => setTimeout(r, 200));
                            break;
                        }

                        default:
                            results.push({ step: stepNum, action: step.action, success: false, error: 'Unknown action type' });
                            failed++;
                    }
                } catch (e: any) {
                    results.push({ step: stepNum, action: step.action, success: false, error: e.message?.substring(0, 100) });
                    failed++;
                    // Continue executing remaining steps even if one fails
                }
            }

            return {
                success: failed === 0,
                completed,
                failed,
                total: steps.length,
                results: results.slice(-10), // Return last 10 results to save tokens
                summary: `Executed ${ completed }/${ steps.length } steps successfully${ failed > 0 ? `, ${ failed } failed` : '' }`
            };
        }
    });

    // ═══════════════════════════════════════════════
    // SHADOW AGENT TOOLS — Zero-Click Parallel Web Intelligence
    // These run in a HIDDEN browser window, completely independent of the visible UI.
    // Use for research, data fetching, checking other sites, getting info fast.
    // ═══════════════════════════════════════════════

    // Lazy import to avoid circular deps
    let _shadowAgent: any = null;
    async function getShadow() {
        if (!_shadowAgent) {
            const mod = await import('./ShadowAgent.js');
            _shadowAgent = mod.getShadowAgent();
        }
        return _shadowAgent;
    }

    registry.register({
        name: 'shadow_search',
        description: 'Search Google in the BACKGROUND without touching the visible browser. Returns search results (titles, URLs, snippets) instantly. Use when you need information from the web while working on another task. The visible browser stays untouched. Auto-falls back to fast_search (HTTP) if browser fails.',
        category: 'shadow',
        parameters: {
            query: { type: 'STRING', description: 'Search query' },
            max_results: { type: 'INTEGER', description: 'Max results to return (default 8)' }
        },
        requiredParams: ['query'],
        priority: 88,
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            try {
                const shadow = await getShadow();
                const result = await shadow.search(args.query, args.max_results || 8);
                if (result.success && result.results.length > 0) return result;
                // Shadow returned empty — fallback to HTTP
                const scraper = await getScraper();
                const httpResult = await scraper.fastSearch(args.query, args.max_results || 8);
                if (httpResult.success && httpResult.results.length > 0) {
                    (httpResult as any)._fallback = 'fast_search';
                    return httpResult;
                }
                return result; // Return whatever we have
            } catch (e: any) {
                // Shadow browser completely failed — use HTTP
                try {
                    const scraper = await getScraper();
                    const httpResult = await scraper.fastSearch(args.query, args.max_results || 8);
                    (httpResult as any)._fallback = 'fast_search';
                    return httpResult;
                } catch (_) { }
                return { success: false, query: args.query, results: [], error: e.message };
            }
        }
    });

    registry.register({
        name: 'shadow_read_page',
        description: 'Read ANY webpage content in the BACKGROUND without touching the visible browser. Fetches the page headlessly and extracts text, links, tables. Use to check Gmail, read docs, get prices, etc. while working on something else in the main browser.',
        category: 'shadow',
        parameters: {
            url: { type: 'STRING', description: 'URL to read (auto-adds https://)' },
            max_length: { type: 'INTEGER', description: 'Max content length (default 15000)' }
        },
        requiredParams: ['url'],
        priority: 85,
        handler: async (args: any, ctx: ToolContext) => {
            const shadow = await getShadow();
            return await shadow.readPage(args.url, { maxLength: args.max_length || 15000 });
        }
    });

    registry.register({
        name: 'shadow_research',
        description: 'Full research pipeline: searches Google → reads top pages → returns combined results. All in the BACKGROUND. Use for complex research tasks where you need deep info from multiple sources. Returns search results AND page contents.',
        category: 'shadow',
        parameters: {
            query: { type: 'STRING', description: 'Research topic or question' },
            depth: { type: 'INTEGER', description: 'How many top pages to read (default 3, max 5)' }
        },
        requiredParams: ['query'],
        priority: 86,
        handler: async (args: any, ctx: ToolContext) => {
            const shadow = await getShadow();
            return await shadow.research(args.query, Math.min(args.depth || 3, 5));
        }
    });

    registry.register({
        name: 'shadow_quick_answer',
        description: 'Get a QUICK answer from Google without any navigation. Returns the featured snippet or top result snippet. Fastest possible way to get factual info (weather, conversions, definitions, etc.).',
        category: 'shadow',
        parameters: {
            question: { type: 'STRING', description: 'Question to answer' }
        },
        requiredParams: ['question'],
        priority: 87,
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const shadow = await getShadow();
            return await shadow.quickAnswer(args.question);
        }
    });

    registry.register({
        name: 'shadow_execute',
        description: 'Execute ANY JavaScript on ANY website silently in background. Navigate to a URL and run custom JS code. Uses SHARED session — all logged-in sites accessible. Use for: composing Gmail drafts, clicking buttons on other sites, extracting data, triggering actions, API calls, etc. The visible browser stays UNTOUCHED.',
        category: 'shadow',
        parameters: {
            url: { type: 'STRING', description: 'URL to navigate to first' },
            script: { type: 'STRING', description: 'JavaScript code to execute on the page. Use (() => { ... })() wrapper.' },
            wait_ms: { type: 'INTEGER', description: 'Wait time after page load before executing script (default 2000)' }
        },
        requiredParams: ['url', 'script'],
        priority: 90,
        handler: async (args: any, ctx: ToolContext) => {
            const shadow = await getShadow();
            return await shadow.executeAction(args.url, args.script);
        }
    });

    registry.register({
        name: 'shadow_fill_and_submit',
        description: 'Fill a form on ANY website and submit it — all in background. Navigate to URL, fill fields by label/name/placeholder matching, click submit. Uses SHARED session. Use for: sending contact forms, filling applications, posting data, etc.',
        category: 'shadow',
        parameters: {
            url: { type: 'STRING', description: 'URL of the page with the form' },
            fields: { type: 'OBJECT', description: 'Field name/label → value mapping. Example: {"email": "test@test.com", "message": "Hello"}' },
            submit_selector: { type: 'STRING', description: 'Optional CSS selector for submit button (auto-detected if not provided)' }
        },
        requiredParams: ['url', 'fields'],
        priority: 84,
        handler: async (args: any, ctx: ToolContext) => {
            const shadow = await getShadow();
            return await shadow.fillAndSubmit(args.url, args.fields, args.submit_selector);
        }
    });

    registry.register({
        name: 'shadow_read_emails',
        description: 'Read Gmail inbox silently in background. Returns recent emails with from, subject, snippet, date. Uses SHARED session — user must be logged into Gmail in the main browser. The visible browser stays UNTOUCHED.',
        category: 'shadow',
        parameters: {
            max_emails: { type: 'INTEGER', description: 'Max emails to return (default 10)' }
        },
        requiredParams: [],
        priority: 83,
        handler: async (args: any, ctx: ToolContext) => {
            const shadow = await getShadow();
            return await shadow.readEmails(args.max_emails || 10);
        }
    });

    registry.register({
        name: 'shadow_agent_task',
        description: 'Delegate a FULL TASK to an AI-powered shadow sub-agent. It has its own Gemini brain and autonomously navigates websites, reads content, fills forms, clicks buttons, extracts data — all in the BACKGROUND using shared session. Use for: "check Gmail for emails from X", "find the cheapest price on Amazon for Y", "read my GitHub notifications", "fill this form on website Z". It figures out the steps itself — you just describe WHAT you want.',
        category: 'shadow',
        parameters: {
            task: { type: 'STRING', description: 'Natural language task description. Be specific about what you want. Example: "Check Gmail inbox for any emails from Amazon received today"' },
            context: { type: 'STRING', description: 'Optional extra context to help the sub-agent (current page info, user preferences, etc.)' }
        },
        requiredParams: ['task'],
        priority: 95, // Highest priority shadow tool
        handler: async (args: any, ctx: ToolContext) => {
            // Get API key from memory or use default
            let apiKey = ctx.memory?.get('gemini_api_key') || '';
            if (!apiKey) {
                // Try to get from environment
                try {
                    const mod = await import('./ShadowAgent.js');
                    // Check if there's a stored key
                    apiKey = ctx.memory?.get('api_key') || process.env.GEMINI_API_KEY || '';
                } catch (_) { }
            }
            if (!apiKey) {
                return { error: 'No API key available for shadow sub-agent. Set it via memory.set("gemini_api_key", "key").' };
            }
            const { getShadowSubAgent } = await import('./ShadowAgent.js');
            const subAgent = getShadowSubAgent(apiKey);
            return await subAgent.delegateTask(args.task, args.context);
        }
    });

    // ═══════════════════════════════════════════════
    // AGI-LEVEL TOOLS — Speed + Parallelism + Context
    // ═══════════════════════════════════════════════

    // --- Fast HTTP Scraper Tools (10x faster, no browser overhead) ---

    let _scraper: any = null;
    async function getScraper() {
        if (!_scraper) {
            const mod = await import('./FastScraper.js');
            _scraper = mod.getFastScraper();
        }
        return _scraper;
    }

    let _pool: any = null;
    async function getPool() {
        if (!_pool) {
            const mod = await import('./ShadowAgent.js');
            _pool = mod.getShadowPool();
        }
        return _pool;
    }

    let _footprint: any = null;
    async function getFootprint() {
        if (!_footprint) {
            const mod = await import('./UserFootprint.js');
            _footprint = mod.getUserFootprint();
        }
        return _footprint;
    }

    registry.register({
        name: 'fast_search',
        description: 'INSTANT Google search via HTTP — no browser needed. Returns results in ~500ms (10x faster than shadow_search). Use this as your DEFAULT search tool. Auto-falls back to shadow_search if blocked.',
        category: 'fast',
        parameters: {
            query: { type: 'STRING', description: 'Search query' },
            max_results: { type: 'INTEGER', description: 'Max results (default 8)' },
            reason: { type: 'STRING', description: 'Why you are searching this' }
        },
        requiredParams: ['query'],
        priority: 92,
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const scraper = await getScraper();
            const result = await scraper.fastSearch(args.query, args.max_results || 8);
            // Track search in footprint
            try { const fp = await getFootprint(); fp.recordSearch(args.query); } catch (_) { }
            // AUTO-FALLBACK: If fast_search fails or returns empty, try shadow_search
            if (!result.success || result.results.length === 0) {
                try {
                    const shadow = await getShadow();
                    const shadowResult = await shadow.search(args.query, args.max_results || 8);
                    if (shadowResult.success && shadowResult.results.length > 0) {
                        (shadowResult as any)._fallback = 'shadow_search';
                        return shadowResult;
                    }
                } catch (_) { }
            }
            return result;
        }
    });

    registry.register({
        name: 'fast_read',
        description: 'INSTANT page read via HTTP — no browser needed. Fetches page content in ~200ms. Returns title, text content, links. Uses shared session cookies so logged-in sites work. Use as DEFAULT page reader. Falls back to shadow_read_page for JS-heavy sites.',
        category: 'fast',
        parameters: {
            url: { type: 'STRING', description: 'URL to read' },
            max_length: { type: 'INTEGER', description: 'Max content length (default 5000)' },
            reason: { type: 'STRING', description: 'Why you are reading this page' }
        },
        requiredParams: ['url'],
        priority: 91,
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const scraper = await getScraper();
            // SMART PAGE FALLBACK: fast_read → shadow_read_page if content too short
            const readResult = await scraper.fastRead(args.url, args.max_length || 5000);
            if (readResult.success && readResult.content && readResult.content.length >= 100) {
                return readResult;
            }
            // Content too short (JS-rendered page?) — fall back to shadow
            try {
                const shadow = await getShadow();
                const shadowResult = await shadow.readPage(args.url, { maxLength: args.max_length || 5000 });
                if (shadowResult.success && shadowResult.content.length > (readResult.content?.length || 0)) {
                    (shadowResult as any)._fallback = 'shadow_read_page';
                    return shadowResult;
                }
            } catch (_) { }
            // Track in footprint
            try { const fp = await getFootprint(); fp.recordPageVisit(args.url, readResult.title || '', 0); } catch (_) { }
            return readResult; // Return fast result even if short
        }
    });

    registry.register({
        name: 'fast_research',
        description: 'INSTANT full research pipeline: searches Google via HTTP, then reads top pages in parallel. All via HTTP — no browser needed. Returns search results AND page contents. ~2 seconds total. Use for any research or information gathering task.',
        category: 'fast',
        parameters: {
            query: { type: 'STRING', description: 'Research topic or question' },
            depth: { type: 'INTEGER', description: 'How many pages to read (default 3, max 5)' },
            reason: { type: 'STRING', description: 'Why you are researching this' }
        },
        requiredParams: ['query'],
        priority: 93,
        handler: async (args: any, ctx: ToolContext) => {
            const scraper = await getScraper();
            const result = await scraper.fastResearch(args.query, Math.min(args.depth || 3, 5));
            try { const fp = await getFootprint(); fp.recordSearch(args.query); } catch (_) { }
            return result;
        }
    });

    registry.register({
        name: 'parallel_search',
        description: 'Search MULTIPLE queries SIMULTANEOUSLY using 3 parallel browsers. All searches run at the same time — 3x faster than sequential. Use when you need to compare info from different searches or gather diverse data quickly.',
        category: 'parallel',
        parameters: {
            queries: { type: 'ARRAY', description: 'Array of search queries to run in parallel (max 5)', items: { type: 'STRING' } },
            max_results: { type: 'INTEGER', description: 'Max results per query (default 6)' },
            reason: { type: 'STRING', description: 'Why you are searching these' }
        },
        requiredParams: ['queries'],
        priority: 89,
        handler: async (args: any, ctx: ToolContext) => {
            const pool = await getPool();
            const queries = (args.queries || []).slice(0, 5);
            return await pool.parallelSearch(queries, args.max_results || 6);
        }
    });

    registry.register({
        name: 'parallel_read',
        description: 'Read MULTIPLE pages SIMULTANEOUSLY using 3 parallel browsers. All pages load at the same time. Use when you need content from multiple URLs (e.g., comparing products, reading multiple articles, checking multiple accounts).',
        category: 'parallel',
        parameters: {
            urls: { type: 'ARRAY', description: 'Array of URLs to read in parallel (max 5)', items: { type: 'STRING' } },
            max_length: { type: 'INTEGER', description: 'Max content length per page (default 3000)' },
            reason: { type: 'STRING', description: 'Why you are reading these pages' }
        },
        requiredParams: ['urls'],
        priority: 88,
        handler: async (args: any, ctx: ToolContext) => {
            const pool = await getPool();
            const urls = (args.urls || []).slice(0, 5);
            return await pool.parallelRead(urls, args.max_length || 3000);
        }
    });

    registry.register({
        name: 'parallel_execute',
        description: 'Execute JavaScript on MULTIPLE websites SIMULTANEOUSLY using 3 parallel browsers. Run arbitrary code on different sites at the same time.',
        category: 'parallel',
        parameters: {
            tasks: { type: 'ARRAY', description: 'Array of {url, script} objects. Each script runs on its URL. Max 5.', items: { type: 'OBJECT', properties: { url: { type: 'STRING', description: 'URL to navigate to' }, script: { type: 'STRING', description: 'JavaScript to execute' } } } },
            reason: { type: 'STRING', description: 'Why you are executing these' }
        },
        requiredParams: ['tasks'],
        priority: 87,
        handler: async (args: any, ctx: ToolContext) => {
            const pool = await getPool();
            const tasks = (args.tasks || []).slice(0, 5);
            return await pool.parallelExecute(tasks);
        }
    });

    registry.register({
        name: 'get_user_history',
        description: 'Get the user\'s recent browsing history, frequent sites, recent searches, logged-in sites, and unfinished videos. Use this to understand what the user has been doing, personalize your actions, and resume where they left off. ALWAYS check this before asking the user for context they might have already provided.',
        category: 'context',
        parameters: {
            type: { type: 'STRING', description: 'What to get: "history" (recent pages), "frequent" (top sites), "searches" (recent searches), "videos" (unfinished videos), "all" (everything). Default: "all"' },
            count: { type: 'INTEGER', description: 'How many items to return (default 10)' },
            reason: { type: 'STRING', description: 'Why you need this context' }
        },
        requiredParams: [],
        priority: 80,
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const fp = await getFootprint();
            const type = args.type || 'all';
            const count = args.count || 10;
            const result: any = {};
            if (type === 'history' || type === 'all') result.recentHistory = fp.getRecentHistory(count);
            if (type === 'frequent' || type === 'all') result.frequentSites = fp.getFrequentSites(count);
            if (type === 'searches' || type === 'all') result.recentSearches = fp.getRecentSearches(count);
            if (type === 'videos' || type === 'all') result.unfinishedVideos = fp.getVideoResume();
            if (type === 'all') {
                result.loggedInSites = fp.getLoggedInSites();
                result.lastActiveTab = fp.getLastActiveTab();
            }
            return { success: true, ...result };
        }
    });

    registry.register({
        name: 'get_video_resume',
        description: 'Get where the user left off in a specific video (timestamp, total duration, completion status). Use when user asks to "continue watching" or "resume video". Returns null if video not tracked.',
        category: 'context',
        parameters: {
            url: { type: 'STRING', description: 'URL of the video' },
            reason: { type: 'STRING', description: 'Why you need this' }
        },
        requiredParams: ['url'],
        priority: 79,
        isFastAction: true,
        handler: async (args: any, ctx: ToolContext) => {
            const fp = await getFootprint();
            const state = fp.getVideoResume(args.url);
            return state ? { success: true, ...state } : { success: false, error: 'Video not tracked' };
        }
    });

}


// ═══════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════

/** Generate the SOM finder script that locates an element by its sequential ID.
 *  MUST match the exact same selectors, filtering, and sorting as SOM_INJECT_SCRIPT. */
function getSOMFinderScript(elementId: number): string {
    return `
        const interactiveSelectors = [
            'button', 'a[href]', 'input:not([type="hidden"])', 'select', 'textarea',
            '[role="button"]', '[role="link"]', '[role="checkbox"]', '[role="radio"]',
            '[role="switch"]', '[role="tab"]', '[role="menuitem"]', '[role="option"]',
            '[role="combobox"]', '[role="searchbox"]', '[role="textbox"]',
            '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]',
            'summary', 'label[for]', 'th[onclick]', 'td[onclick]',
            '[data-action]', '[data-click]', '.clickable', '.btn'
        ].join(', ');
        const _allEls = Array.from(document.querySelectorAll(interactiveSelectors));
        const _visible = [];
        for (const el of _allEls) {
            const rect = el.getBoundingClientRect();
            if (rect.width < 4 || rect.height < 4) continue;
            if (el.disabled && el.tagName !== 'A') continue;
            const style = window.getComputedStyle(el);
            if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity) < 0.1) continue;
            if (rect.top >= window.innerHeight || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.right <= 0) continue;
            _visible.push({ el, y: Math.round(rect.top + rect.height / 2), x: Math.round(rect.left + rect.width / 2) });
        }
        _visible.sort((a, b) => a.y - b.y || a.x - b.x);
        const target = ${ elementId } <= _visible.length ? _visible[${ elementId } - 1].el : null;
    `;
}

/** Perform a Set-of-Mark action on an element */
async function performSOMAction(ctx: ToolContext, elementId: number, action: string): Promise<any> {
    const wc = ctx.webContents;
    if (!wc) return { error: 'No active tab' };

    // Phase 1: Find element, scroll into view, get coordinates
    const prepScript = `(() => {
        ${ getSOMFinderScript(elementId) }
        if (!target) return { error: 'Element ID ${ elementId } not found in viewport.' };

        // Scroll into view
        target.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
        const rect = target.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const info = {
            tag: target.tagName.toLowerCase(),
            text: (target.innerText || target.value || target.getAttribute('aria-label') || '').substring(0, 60).trim(),
            rect: {x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height)},
            href: target.href || '',
            type: target.type || '',
            cx: Math.round(cx),
            cy: Math.round(cy)
        };

        return { found: true, ...info };
    })()`;

    try {
        const prep = await wc.executeJavaScript(prepScript);
        if (prep.error) return prep;

        const { cx, cy, rect } = prep;

        if (action === 'click') {
            // ═══ PRIMARY: Electron sendInputEvent (generates isTrusted:true events) ═══
            // This is REAL mouse input — goes through Chromium's event pipeline
            // ALL websites respond to this, including React, Vue, Angular, WhatsApp, Gmail
            if (cx > 0 && cy > 0 && cx < 3000 && cy < 3000) {
                wc.sendInputEvent({ type: 'mouseDown', x: cx, y: cy, button: 'left', clickCount: 1 } as any);
                await new Promise(r => setTimeout(r, 40));
                wc.sendInputEvent({ type: 'mouseUp', x: cx, y: cy, button: 'left', clickCount: 1 } as any);
                await new Promise(r => setTimeout(r, 100)); // Let click handler fire
            }

            // ═══ FALLBACK: JS click for any edge cases ═══
            const fallbackScript = `(() => {
                ${ getSOMFinderScript(elementId) }
                if (!target) return {};
                // Focus for inputs
                if (target.focus) target.focus();
                // Native click for links
                if (target.tagName === 'A' && target.href) {
                    try { target.click(); } catch(e) {}
                }
                return {};
            })()`;
            try { await wc.executeJavaScript(fallbackScript); } catch (_) { }

            return { success: true, message: 'Element clicked.', tag: prep.tag, text: prep.text, rect: prep.rect, href: prep.href, type: prep.type };

        } else if (action === 'dblclick') {
            if (cx > 0 && cy > 0) {
                wc.sendInputEvent({ type: 'mouseDown', x: cx, y: cy, button: 'left', clickCount: 1 } as any);
                wc.sendInputEvent({ type: 'mouseUp', x: cx, y: cy, button: 'left', clickCount: 1 } as any);
                await new Promise(r => setTimeout(r, 50));
                wc.sendInputEvent({ type: 'mouseDown', x: cx, y: cy, button: 'left', clickCount: 2 } as any);
                wc.sendInputEvent({ type: 'mouseUp', x: cx, y: cy, button: 'left', clickCount: 2 } as any);
            }
            return { success: true, message: 'Double-clicked.', tag: prep.tag, text: prep.text, rect: prep.rect };

        } else if (action === 'right_click') {
            const rcScript = `(() => {
                ${ getSOMFinderScript(elementId) }
                if (!target) return {};
                target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, view: window, clientX: ${ cx }, clientY: ${ cy }, button: 2 }));
                return {};
            })()`;
            await wc.executeJavaScript(rcScript);
            return { success: true, message: 'Right-clicked.', tag: prep.tag, text: prep.text };

        } else if (action === 'hover') {
            // Move mouse to element
            if (cx > 0 && cy > 0) {
                wc.sendInputEvent({ type: 'mouseMove', x: cx, y: cy } as any);
            }
            const hScript = `(() => {
                ${ getSOMFinderScript(elementId) }
                if (!target) return {};
                target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: ${ cx }, clientY: ${ cy } }));
                target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: ${ cx }, clientY: ${ cy } }));
                target.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, clientX: ${ cx }, clientY: ${ cy } }));
                return {};
            })()`;
            await wc.executeJavaScript(hScript);
            return { success: true, message: 'Hovered.', tag: prep.tag, text: prep.text };

        } else if (action === 'focus') {
            // Click to activate, then focus
            if (cx > 0 && cy > 0) {
                wc.sendInputEvent({ type: 'mouseDown', x: cx, y: cy, button: 'left', clickCount: 1 } as any);
                await new Promise(r => setTimeout(r, 40));
                wc.sendInputEvent({ type: 'mouseUp', x: cx, y: cy, button: 'left', clickCount: 1 } as any);
            }
            const fScript = `(() => {
                ${ getSOMFinderScript(elementId) }
                if (!target) return {};
                target.focus();
                if (target.select) target.select();
                return {};
            })()`;
            await wc.executeJavaScript(fScript);
            return { success: true, message: 'Focused.', tag: prep.tag, text: prep.text };
        }

        return { error: 'Unknown action: ' + action };
    } catch (e: any) {
        return { error: `SOM action failed: ${ e.message }` };
    }
}
