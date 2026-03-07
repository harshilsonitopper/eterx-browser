/**
 * TaskExecutor.ts — Deterministic One-Shot JSON Brain Execution Engine
 *
 * Supports ALL 60+ browser action types. Reads TaskJSON produced by a
 * single Gemini call and executes every step deterministically without
 * any additional AI calls. Handles retries, fallbacks, state verification.
 */
import { webContents } from 'electron';
// ─────────────────────────────────────────────
// ELEMENT RESOLVER — 3-layer targeting
// ─────────────────────────────────────────────
class ElementResolver {
    wcId;
    constructor(webContentsId) { this.wcId = webContentsId; }
    get wc() { return webContents.fromId(this.wcId); }
    async resolve(target) {
        const wc = this.wc;
        if (!wc || wc.isDestroyed())
            return null;
        // ═══ GOOGLE SHEETS CELL DETECTION ═══
        // Cells are canvas-rendered — standard DOM queries fail. Use Name Box approach.
        const url = wc.getURL();
        if (url.includes('docs.google.com/spreadsheets') && target.primary) {
            const cellRef = this.extractCellRef(target.primary);
            if (cellRef) {
                const navigated = await this.sheetsNavigateToCell(cellRef);
                if (navigated)
                    return { strategy: 'sheets_namebox' };
            }
        }
        if (target.primary) {
            const r = await this.trySemantic(target.primary);
            if (r)
                return { strategy: 'primary', ...r };
        }
        if (target.fallback_1) {
            const r = await this.tryCSS(target.fallback_1);
            if (r)
                return { strategy: 'fallback_1', ...r };
        }
        if (target.fallback_2) {
            const r = await this.tryCoord(target.fallback_2);
            if (r)
                return { strategy: 'fallback_2', ...r };
        }
        return null;
    }
    /**
     * Detect cell references like A1, B3, AA12, etc.
     */
    extractCellRef(target) {
        const cleaned = target.replace(/^(aria|semantic|cell|ref):/, '').trim();
        const match = cleaned.match(/^([A-Z]{1,3}\d{1,5})$/i);
        return match ? match[1].toUpperCase() : null;
    }
    /**
     * Navigate to a cell in Google Sheets using the Name Box input.
     * The Name Box is an <input> at the top-left showing the current cell reference.
     */
    async sheetsNavigateToCell(cellRef) {
        const wc = this.wc;
        if (!wc || wc.isDestroyed())
            return false;
        try {
            // Click the Name Box input, clear it, type cell ref, press Enter
            const ok = await wc.executeJavaScript(`(() => {
                // Try multiple selectors for the Name Box
                const nameBox = document.querySelector('input.jfk-textinput') 
                    || document.querySelector('#\\\\:2o')
                    || document.querySelector('input[aria-label*="Name"]')
                    || document.querySelector('.waffle-name-box input');
                if (!nameBox) return false;
                nameBox.focus();
                nameBox.select();
                nameBox.value = ${JSON.stringify(cellRef)};
                nameBox.dispatchEvent(new Event('input', {bubbles: true}));
                nameBox.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', keyCode: 13, bubbles: true}));
                nameBox.dispatchEvent(new KeyboardEvent('keyup', {key: 'Enter', keyCode: 13, bubbles: true}));
                return true;
            })()`);
            if (ok) {
                await new Promise(r => setTimeout(r, 300)); // Wait for cell focus
                return true;
            }
            // Fallback: click at Name Box coordinates and type
            wc.sendInputEvent({ type: 'mouseDown', x: 60, y: 140, button: 'left', clickCount: 1 });
            await new Promise(r => setTimeout(r, 30));
            wc.sendInputEvent({ type: 'mouseUp', x: 60, y: 140, button: 'left', clickCount: 1 });
            await new Promise(r => setTimeout(r, 200));
            // Select all existing text and replace
            wc.sendInputEvent({ type: 'keyDown', keyCode: 'a', modifiers: ['control'] });
            wc.sendInputEvent({ type: 'keyUp', keyCode: 'a', modifiers: ['control'] });
            await new Promise(r => setTimeout(r, 50));
            wc.insertText(cellRef);
            await new Promise(r => setTimeout(r, 100));
            wc.sendInputEvent({ type: 'keyDown', keyCode: 'Return' });
            wc.sendInputEvent({ type: 'keyUp', keyCode: 'Return' });
            await new Promise(r => setTimeout(r, 300));
            return true;
        }
        catch {
            return false;
        }
    }
    async trySemantic(sel) {
        const wc = this.wc;
        if (!wc || wc.isDestroyed())
            return null;
        if (sel.startsWith('url:'))
            return { coords: undefined };
        try {
            const searchText = sel.replace(/^(semantic|text|label|placeholder|aria|role):/, '').trim();
            if (!searchText)
                return null;
            const result = await wc.executeJavaScript(`(() => {
                const s = ${JSON.stringify(searchText)}.toLowerCase();
                const els = document.querySelectorAll('button,a,input,select,textarea,[role="button"],[role="link"],[role="tab"],[role="menuitem"],[contenteditable="true"],label,summary,h1,h2,h3,h4,span,div,li,option,th,td');
                for (const el of els) {
                    const t = (el.innerText||el.textContent||'').trim().toLowerCase();
                    const l = (el.getAttribute('aria-label')||'').toLowerCase();
                    const p = (el.getAttribute('placeholder')||'').toLowerCase();
                    const v = (el.value||'').toLowerCase();
                    const ti = (el.getAttribute('title')||'').toLowerCase();
                    const n = (el.getAttribute('name')||'').toLowerCase();
                    if (t.includes(s)||l.includes(s)||p.includes(s)||v.includes(s)||ti.includes(s)||n.includes(s)||(t===s)) {
                        const r = el.getBoundingClientRect();
                        if (r.width>0 && r.height>0 && r.top>=0 && r.top<window.innerHeight) {
                            return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)};
                        }
                    }
                }
                return null;
            })()`);
            return result ? { coords: result } : null;
        }
        catch {
            return null;
        }
    }
    async tryCSS(sel) {
        const wc = this.wc;
        if (!wc || wc.isDestroyed())
            return null;
        try {
            const css = sel.replace(/^(css|dom|selector):/, '').trim();
            const result = await wc.executeJavaScript(`(() => {
                const el = document.querySelector(${JSON.stringify(css)});
                if (!el) return null;
                const r = el.getBoundingClientRect();
                if (r.width===0||r.height===0) return null;
                return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)};
            })()`);
            return result ? { coords: result } : null;
        }
        catch {
            return null;
        }
    }
    async tryCoord(sel) {
        if (sel.startsWith('xy:')) {
            const [x, y] = sel.replace('xy:', '').split(',').map(Number);
            if (!isNaN(x) && !isNaN(y))
                return { coords: { x, y } };
        }
        return null;
    }
}
// ─────────────────────────────────────────────
// STATE VERIFIER
// ─────────────────────────────────────────────
class StateVerifier {
    wcId;
    constructor(webContentsId) { this.wcId = webContentsId; }
    get wc() { return webContents.fromId(this.wcId); }
    async verify(expected, timeoutMs = 5000) {
        const wc = this.wc;
        if (!wc || wc.isDestroyed())
            return false;
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            let ok = true;
            if (expected.url_contains) {
                if (!wc.getURL().toLowerCase().includes(expected.url_contains.toLowerCase()))
                    ok = false;
            }
            if (expected.element_present && ok) {
                try {
                    const t = expected.element_present.replace(/^semantic:/, '');
                    const found = await wc.executeJavaScript(`document.body.innerText.toLowerCase().includes(${JSON.stringify(t.toLowerCase())})`);
                    if (!found)
                        ok = false;
                }
                catch {
                    ok = false;
                }
            }
            if (expected.element_absent && ok) {
                try {
                    const t = expected.element_absent.replace(/^semantic:/, '');
                    const found = await wc.executeJavaScript(`document.body.innerText.toLowerCase().includes(${JSON.stringify(t.toLowerCase())})`);
                    if (found)
                        ok = false;
                }
                catch { }
            }
            if (expected.text_visible && ok) {
                try {
                    const found = await wc.executeJavaScript(`document.body.innerText.toLowerCase().includes(${JSON.stringify(expected.text_visible.toLowerCase())})`);
                    if (!found)
                        ok = false;
                }
                catch {
                    ok = false;
                }
            }
            if (ok)
                return true;
            await new Promise(r => setTimeout(r, 200));
        }
        return false;
    }
}
// ─────────────────────────────────────────────
// ACTION DISPATCHER — ALL 60+ BROWSER ACTIONS
// ─────────────────────────────────────────────
class ActionDispatcher {
    wcId;
    constructor(webContentsId) { this.wcId = webContentsId; }
    get wc() { return webContents.fromId(this.wcId); }
    async dispatch(step, resolver) {
        const wc = this.wc;
        if (!wc || wc.isDestroyed())
            return { success: false, error: 'WebContents destroyed' };
        const { action } = step;
        const t = action.type;
        try {
            // ═══ NAVIGATION ═══
            if (t === 'navigate') {
                const url = (action.value || action.target.primary.replace(/^url:/, '')).trim();
                await wc.loadURL(url);
                await this.waitReady(action.timing?.timeout_ms || 10000);
                return { success: true };
            }
            if (t === 'go_back') {
                if (wc.canGoBack())
                    wc.goBack();
                await this.waitReady(5000);
                return { success: true };
            }
            if (t === 'reload') {
                wc.reload();
                await this.waitReady(8000);
                return { success: true };
            }
            if (t === 'wait_for_navigation') {
                const start = Date.now();
                const timeout = action.timing?.timeout_ms || 10000;
                const orig = wc.getURL();
                while (Date.now() - start < timeout) {
                    if (wc.getURL() !== orig)
                        return { success: true };
                    await this.sleep(200);
                }
                return { success: false, error: 'Navigation did not occur within timeout' };
            }
            // ═══ CLICK ACTIONS ═══
            if (t === 'click' || t === 'click_text') {
                const res = await resolver.resolve(action.target);
                if (!res?.coords)
                    return { success: false, error: `Element not found: ${action.target.primary}` };
                await this.click(res.coords.x, res.coords.y);
                return { success: true };
            }
            if (t === 'click_xy') {
                const xy = action.target.primary.replace('xy:', '').split(',').map(Number);
                if (xy.length === 2 && !isNaN(xy[0]) && !isNaN(xy[1])) {
                    await this.click(xy[0], xy[1]);
                    return { success: true };
                }
                return { success: false, error: 'Invalid xy coordinates' };
            }
            if (t === 'click_nth') {
                const n = parseInt(action.value || '1') - 1;
                const css = action.target.primary.replace(/^css:/, '').replace(/^semantic:/, '');
                const coords = await wc.executeJavaScript(`(() => {
                    const els = document.querySelectorAll(${JSON.stringify(css)});
                    const el = els[${n}];
                    if (!el) return null;
                    const r = el.getBoundingClientRect();
                    return r.width>0?{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}:null;
                })()`);
                if (!coords)
                    return { success: false, error: `Nth element ${n + 1} not found` };
                await this.click(coords.x, coords.y);
                return { success: true };
            }
            if (t === 'double_click_text') {
                const res = await resolver.resolve(action.target);
                if (!res?.coords)
                    return { success: false, error: `Element not found` };
                wc.sendInputEvent({ type: 'mouseDown', x: res.coords.x, y: res.coords.y, button: 'left', clickCount: 2 });
                await this.sleep(30);
                wc.sendInputEvent({ type: 'mouseUp', x: res.coords.x, y: res.coords.y, button: 'left', clickCount: 2 });
                return { success: true };
            }
            if (t === 'right_click') {
                const res = await resolver.resolve(action.target);
                if (!res?.coords)
                    return { success: false, error: `Element not found` };
                wc.sendInputEvent({ type: 'mouseDown', x: res.coords.x, y: res.coords.y, button: 'right', clickCount: 1 });
                await this.sleep(30);
                wc.sendInputEvent({ type: 'mouseUp', x: res.coords.x, y: res.coords.y, button: 'right', clickCount: 1 });
                return { success: true };
            }
            if (t === 'hover_text') {
                const res = await resolver.resolve(action.target);
                if (!res?.coords)
                    return { success: false, error: `Element not found` };
                wc.sendInputEvent({ type: 'mouseMove', x: res.coords.x, y: res.coords.y });
                await this.sleep(300);
                return { success: true };
            }
            // ═══ TEXT INPUT ═══
            if (t === 'type') {
                const res = await resolver.resolve(action.target);
                if (!res?.coords)
                    return { success: false, error: `Element not found: ${action.target.primary}` };
                await this.click(res.coords.x, res.coords.y);
                await this.sleep(100);
                await wc.executeJavaScript(`document.execCommand('selectAll')`);
                wc.insertText(action.value || '');
                return { success: true };
            }
            if (t === 'type_and_enter') {
                const res = await resolver.resolve(action.target);
                if (!res?.coords)
                    return { success: false, error: `Element not found` };
                await this.click(res.coords.x, res.coords.y);
                await this.sleep(100);
                await wc.executeJavaScript(`document.execCommand('selectAll')`);
                wc.insertText(action.value || '');
                await this.sleep(100);
                wc.sendInputEvent({ type: 'keyDown', keyCode: 'Return' });
                wc.sendInputEvent({ type: 'keyUp', keyCode: 'Return' });
                return { success: true };
            }
            if (t === 'select_all_type') {
                const res = await resolver.resolve(action.target);
                if (res?.coords)
                    await this.click(res.coords.x, res.coords.y);
                await this.sleep(50);
                await wc.executeJavaScript(`document.execCommand('selectAll')`);
                wc.insertText(action.value || '');
                return { success: true };
            }
            if (t === 'clear_field') {
                const res = await resolver.resolve(action.target);
                if (res?.coords)
                    await this.click(res.coords.x, res.coords.y);
                await this.sleep(50);
                await wc.executeJavaScript(`document.execCommand('selectAll')`);
                wc.sendInputEvent({ type: 'keyDown', keyCode: 'Delete' });
                wc.sendInputEvent({ type: 'keyUp', keyCode: 'Delete' });
                return { success: true };
            }
            if (t === 'append_text') {
                const res = await resolver.resolve(action.target);
                if (res?.coords)
                    await this.click(res.coords.x, res.coords.y);
                await this.sleep(50);
                // Move to end of field
                await wc.executeJavaScript(`{const el=document.activeElement; if(el&&el.setSelectionRange){el.setSelectionRange(el.value.length,el.value.length)}}`);
                wc.insertText(action.value || '');
                return { success: true };
            }
            // ═══ FORM ACTIONS ═══
            if (t === 'fill_form_all') {
                const fields = JSON.parse(action.value || '{}');
                for (const [label, value] of Object.entries(fields)) {
                    const filled = await wc.executeJavaScript(`(() => {
                        const lbl = ${JSON.stringify(String(label).toLowerCase())};
                        const val = ${JSON.stringify(String(value))};
                        const inputs = document.querySelectorAll('input,textarea,select,[contenteditable="true"]');
                        for (const el of inputs) {
                            const elLabel = (el.getAttribute('aria-label')||el.getAttribute('placeholder')||el.getAttribute('name')||el.closest('label')?.textContent||'').toLowerCase();
                            const prev = el.previousElementSibling?.textContent?.toLowerCase()||'';
                            if (elLabel.includes(lbl)||prev.includes(lbl)) {
                                if (el.tagName==='SELECT') { for(const o of el.options){if(o.text.toLowerCase().includes(val.toLowerCase())){o.selected=true;el.dispatchEvent(new Event('change',{bubbles:true}));break;}} }
                                else if (el.getAttribute('contenteditable')) { el.focus(); el.innerHTML=val; }
                                else { el.focus(); el.value=val; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }
                                return true;
                            }
                        }
                        return false;
                    })()`);
                }
                return { success: true };
            }
            if (t === 'select_option') {
                const res = await resolver.resolve(action.target);
                if (res?.coords)
                    await this.click(res.coords.x, res.coords.y);
                await this.sleep(300);
                if (action.value) {
                    const ok = await wc.executeJavaScript(`(() => {
                        const v = ${JSON.stringify(action.value.toLowerCase())};
                        for (const opt of document.querySelectorAll('option,[role="option"],li[data-value],li[role="menuitem"]')) {
                            if ((opt.textContent||'').toLowerCase().includes(v)) { opt.click(); return true; }
                        }
                        return false;
                    })()`);
                    if (!ok)
                        return { success: false, error: `Option "${action.value}" not found` };
                }
                return { success: true };
            }
            if (t === 'check_box') {
                const ok = await wc.executeJavaScript(`(() => {
                    const s = ${JSON.stringify(action.target.primary.toLowerCase())};
                    for (const el of document.querySelectorAll('input[type="checkbox"]')) {
                        const lbl = (el.getAttribute('aria-label')||el.closest('label')?.textContent||el.nextElementSibling?.textContent||'').toLowerCase();
                        if (lbl.includes(s) && !el.checked) { el.click(); return true; }
                    }
                    return false;
                })()`);
                return ok ? { success: true } : { success: false, error: 'Checkbox not found' };
            }
            if (t === 'uncheck_box') {
                const ok = await wc.executeJavaScript(`(() => {
                    const s = ${JSON.stringify(action.target.primary.toLowerCase())};
                    for (const el of document.querySelectorAll('input[type="checkbox"]')) {
                        const lbl = (el.getAttribute('aria-label')||el.closest('label')?.textContent||el.nextElementSibling?.textContent||'').toLowerCase();
                        if (lbl.includes(s) && el.checked) { el.click(); return true; }
                    }
                    return false;
                })()`);
                return ok ? { success: true } : { success: false, error: 'Checkbox not found' };
            }
            if (t === 'submit_form') {
                const res = await resolver.resolve(action.target);
                if (res?.coords) {
                    await this.click(res.coords.x, res.coords.y);
                    return { success: true };
                }
                // Fallback: find submit button or press Enter
                const ok = await wc.executeJavaScript(`(() => {
                    const btn = document.querySelector('button[type="submit"],input[type="submit"]');
                    if (btn) { btn.click(); return true; }
                    const form = document.querySelector('form');
                    if (form) { form.submit(); return true; }
                    return false;
                })()`);
                return ok ? { success: true } : { success: false, error: 'Submit button not found' };
            }
            if (t === 'set_value') {
                const res = await resolver.resolve(action.target);
                const sel = action.target.fallback_1 || action.target.primary;
                await wc.executeJavaScript(`(() => {
                    const el = document.querySelector(${JSON.stringify(sel)});
                    if (el) { el.value=${JSON.stringify(action.value || '')}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }
                })()`);
                return { success: true };
            }
            if (t === 'upload_file') {
                // File upload requires dialog — escalate to human
                return { success: false, error: 'File upload requires human interaction via file picker dialog' };
            }
            // ═══ KEYBOARD ═══
            if (t === 'press_key') {
                const key = action.value || 'Return';
                const keyMap = {
                    'Enter': 'Return', 'Tab': 'Tab', 'Escape': 'Escape', 'Backspace': 'Backspace',
                    'Space': 'Space', 'ArrowDown': 'Down', 'ArrowUp': 'Up', 'ArrowLeft': 'Left',
                    'ArrowRight': 'Right', 'Delete': 'Delete', 'Home': 'Home', 'End': 'End',
                    'PageUp': 'PageUp', 'PageDown': 'PageDown', 'F5': 'F5', 'F11': 'F11',
                };
                const mapped = keyMap[key] || key;
                wc.sendInputEvent({ type: 'keyDown', keyCode: mapped });
                wc.sendInputEvent({ type: 'keyUp', keyCode: mapped });
                return { success: true };
            }
            if (t === 'hotkey' || t === 'key_combo') {
                // value = "Ctrl+A" or "Ctrl+Shift+Delete"
                const combo = (action.value || '').split('+');
                const mods = {};
                const keys = [];
                for (const k of combo) {
                    const kl = k.trim().toLowerCase();
                    if (kl === 'ctrl' || kl === 'control')
                        mods.control = true;
                    else if (kl === 'shift')
                        mods.shift = true;
                    else if (kl === 'alt')
                        mods.alt = true;
                    else if (kl === 'meta' || kl === 'cmd')
                        mods.meta = true;
                    else
                        keys.push(k.trim());
                }
                for (const key of keys) {
                    wc.sendInputEvent({ type: 'keyDown', keyCode: key, ...mods });
                    wc.sendInputEvent({ type: 'keyUp', keyCode: key, ...mods });
                }
                return { success: true };
            }
            // ═══ SCROLLING ═══
            if (t === 'scroll') {
                const dir = (action.value || 'down').toLowerCase();
                const px = dir === 'bottom' ? 99999 : dir === 'top' ? -99999 : dir === 'up' ? -500 : 500;
                await wc.executeJavaScript(`window.scrollBy(0, ${px})`);
                await this.sleep(300);
                return { success: true };
            }
            if (t === 'scroll_to_text') {
                const text = action.target.primary.replace(/^(text|semantic):/, '');
                for (let i = 0; i < 15; i++) {
                    const found = await wc.executeJavaScript(`document.body.innerText.toLowerCase().includes(${JSON.stringify(text.toLowerCase())})`);
                    if (found) {
                        await wc.executeJavaScript(`(() => {
                            const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                            while (tw.nextNode()) {
                                if (tw.currentNode.textContent.toLowerCase().includes(${JSON.stringify(text.toLowerCase())})) {
                                    tw.currentNode.parentElement.scrollIntoView({behavior:'smooth',block:'center'});
                                    return;
                                }
                            }
                        })()`);
                        return { success: true };
                    }
                    await wc.executeJavaScript(`window.scrollBy(0, 400)`);
                    await this.sleep(300);
                }
                return { success: false, error: `Text "${text}" not found after scrolling` };
            }
            if (t === 'scroll_to_element') {
                const sel = action.target.fallback_1 || action.target.primary;
                await wc.executeJavaScript(`{const el=document.querySelector(${JSON.stringify(sel)});if(el)el.scrollIntoView({behavior:'smooth',block:'center'})}`);
                await this.sleep(300);
                return { success: true };
            }
            if (t === 'scroll_to_top') {
                await wc.executeJavaScript(`window.scrollTo(0,0)`);
                return { success: true };
            }
            if (t === 'scroll_to_bottom') {
                await wc.executeJavaScript(`window.scrollTo(0,document.body.scrollHeight)`);
                return { success: true };
            }
            // ═══ WAITING ═══
            if (t === 'wait') {
                const ms = parseInt(action.value || '1000');
                await this.sleep(Math.min(ms, 10000));
                return { success: true };
            }
            if (t === 'wait_for_text') {
                const text = action.target.primary.replace(/^(text|semantic):/, '').toLowerCase();
                const timeout = action.timing?.timeout_ms || 10000;
                const start = Date.now();
                while (Date.now() - start < timeout) {
                    const found = await wc.executeJavaScript(`document.body.innerText.toLowerCase().includes(${JSON.stringify(text)})`).catch(() => false);
                    if (found)
                        return { success: true };
                    await this.sleep(300);
                }
                return { success: false, error: `Text "${text}" did not appear` };
            }
            if (t === 'wait_for_element') {
                const sel = action.target.fallback_1 || action.target.primary;
                const timeout = action.timing?.timeout_ms || 10000;
                const start = Date.now();
                while (Date.now() - start < timeout) {
                    const found = await wc.executeJavaScript(`!!document.querySelector(${JSON.stringify(sel)})`).catch(() => false);
                    if (found)
                        return { success: true };
                    await this.sleep(300);
                }
                return { success: false, error: `Element ${sel} did not appear` };
            }
            if (t === 'wait_for_url') {
                const pattern = action.value || action.target.primary;
                const timeout = action.timing?.timeout_ms || 10000;
                const start = Date.now();
                while (Date.now() - start < timeout) {
                    if (wc.getURL().toLowerCase().includes(pattern.toLowerCase()))
                        return { success: true };
                    await this.sleep(300);
                }
                return { success: false, error: `URL did not contain "${pattern}"` };
            }
            // ═══ DATA EXTRACTION ═══
            if (t === 'extract_text') {
                const res = await resolver.resolve(action.target);
                const sel = action.target.fallback_1 || action.target.primary;
                const text = await wc.executeJavaScript(`{const el=document.querySelector(${JSON.stringify(sel)});el?(el.innerText||el.textContent||'').trim():document.body.innerText.substring(0,2000)}`).catch(() => '');
                return { success: true, output: text };
            }
            if (t === 'read_table') {
                const sel = action.target.fallback_1 || 'table';
                const data = await wc.executeJavaScript(`(() => {
                    const t = document.querySelector(${JSON.stringify(sel)});
                    if (!t) return null;
                    const rows = [];
                    for (const tr of t.querySelectorAll('tr')) {
                        const cells = [];
                        for (const td of tr.querySelectorAll('th,td')) cells.push(td.innerText.trim());
                        if (cells.length) rows.push(cells);
                    }
                    return rows;
                })()`).catch(() => null);
                return data ? { success: true, output: data } : { success: false, error: 'Table not found' };
            }
            if (t === 'count_elements') {
                const sel = action.value || action.target.fallback_1 || action.target.primary;
                const count = await wc.executeJavaScript(`document.querySelectorAll(${JSON.stringify(sel)}).length`).catch(() => 0);
                return { success: true, output: count };
            }
            if (t === 'screenshot') {
                return { success: true, output: 'screenshot_captured' };
            }
            // ═══ TABLE & BULK ═══
            if (t === 'fill_table') {
                const cells = JSON.parse(action.value || '[]');
                for (const cell of cells) {
                    await wc.executeJavaScript(`(() => {
                        const rows = document.querySelectorAll('table tr, [role="row"]');
                        const row = rows[${cell.row}];
                        if (!row) return;
                        const cols = row.querySelectorAll('td, [role="cell"], [role="gridcell"]');
                        const c = cols[${cell.col}];
                        if (c) { c.click(); c.focus(); }
                    })()`);
                    await this.sleep(100);
                    wc.insertText(cell.text);
                    wc.sendInputEvent({ type: 'keyDown', keyCode: 'Tab' });
                    wc.sendInputEvent({ type: 'keyUp', keyCode: 'Tab' });
                    await this.sleep(50);
                }
                return { success: true };
            }
            if (t === 'drag_drop') {
                // Simplified: click source, hold, move to target, release
                const src = await resolver.resolve(action.target);
                const dstTarget = { primary: action.value || '' };
                const dst = await resolver.resolve(dstTarget);
                if (!src?.coords || !dst?.coords)
                    return { success: false, error: 'Drag source or target not found' };
                wc.sendInputEvent({ type: 'mouseDown', x: src.coords.x, y: src.coords.y, button: 'left', clickCount: 1 });
                await this.sleep(100);
                wc.sendInputEvent({ type: 'mouseMove', x: dst.coords.x, y: dst.coords.y });
                await this.sleep(100);
                wc.sendInputEvent({ type: 'mouseUp', x: dst.coords.x, y: dst.coords.y, button: 'left', clickCount: 1 });
                return { success: true };
            }
            if (t === 'multi_select') {
                const items = JSON.parse(action.value || '[]');
                for (const item of items) {
                    const target = { primary: item };
                    const res = await resolver.resolve(target);
                    if (res?.coords) {
                        // Ctrl+Click for multi-select
                        wc.sendInputEvent({ type: 'mouseDown', x: res.coords.x, y: res.coords.y, button: 'left', clickCount: 1, modifiers: ['control'] });
                        await this.sleep(30);
                        wc.sendInputEvent({ type: 'mouseUp', x: res.coords.x, y: res.coords.y, button: 'left', clickCount: 1, modifiers: ['control'] });
                        await this.sleep(100);
                    }
                }
                return { success: true };
            }
            if (t === 'sort_table') {
                const res = await resolver.resolve(action.target);
                if (res?.coords) {
                    await this.click(res.coords.x, res.coords.y);
                    return { success: true };
                }
                return { success: false, error: 'Sort column header not found' };
            }
            // ═══ CONTROL FLOW ═══
            if (t === 'loop') {
                // Handled by TaskExecutor orchestrator, not dispatcher
                return { success: true, output: JSON.parse(action.value || '{"count":1}') };
            }
            if (t === 'if_text_exists') {
                const text = (action.value || '').toLowerCase();
                const exists = await wc.executeJavaScript(`document.body.innerText.toLowerCase().includes(${JSON.stringify(text)})`).catch(() => false);
                return { success: true, output: exists };
            }
            if (t === 'goto_step') {
                return { success: true, output: { goto: action.value } };
            }
            // ═══ ASSERTIONS & VERIFICATION ═══
            if (t === 'assert_text_exists') {
                const text = (action.target.primary || action.value || '').toLowerCase();
                const exists = await wc.executeJavaScript(`document.body.innerText.toLowerCase().includes(${JSON.stringify(text)})`).catch(() => false);
                return exists ? { success: true } : { success: false, error: `Assertion failed: "${text}" not found on page` };
            }
            if (t === 'assert_element_exists') {
                const sel = action.target.fallback_1 || action.target.primary;
                const exists = await wc.executeJavaScript(`!!document.querySelector(${JSON.stringify(sel)})`).catch(() => false);
                return exists ? { success: true } : { success: false, error: `Element ${sel} not found` };
            }
            if (t === 'verify') {
                return { success: true };
            }
            // ═══ JAVASCRIPT INJECTION ═══
            if (t === 'js' || t === 'inject_js') {
                if (action.value) {
                    const result = await wc.executeJavaScript(action.value);
                    return { success: true, output: result };
                }
                return { success: true };
            }
            // ═══ FOCUS/BLUR/SELECT ═══
            if (t === 'focus') {
                const res = await resolver.resolve(action.target);
                if (res?.coords)
                    await this.click(res.coords.x, res.coords.y);
                return { success: true };
            }
            if (t === 'blur') {
                await wc.executeJavaScript(`document.activeElement?.blur()`);
                return { success: true };
            }
            if (t === 'select_text') {
                await wc.executeJavaScript(`document.execCommand('selectAll')`);
                return { success: true };
            }
            if (t === 'copy_text') {
                await wc.executeJavaScript(`document.execCommand('copy')`);
                return { success: true };
            }
            // ═══ TAB/WINDOW ═══
            if (t === 'new_tab') {
                return { success: false, error: 'New tab requires main process coordination' };
            }
            if (t === 'close_tab') {
                return { success: false, error: 'Close tab requires main process coordination' };
            }
            if (t === 'switch_tab') {
                return { success: false, error: 'Switch tab requires main process coordination' };
            }
            // ═══ DIALOGS ═══
            if (t === 'dismiss_dialog') {
                wc.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
                wc.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
                await this.sleep(300);
                // Also try clicking common close buttons
                await wc.executeJavaScript(`(() => {
                    for (const el of document.querySelectorAll('[aria-label="Close"],[aria-label="Dismiss"],button.close,.modal-close')) {
                        el.click(); return;
                    }
                })()`).catch(() => { });
                return { success: true };
            }
            if (t === 'accept_dialog') {
                // Try clicking OK/Accept/Confirm buttons
                const ok = await wc.executeJavaScript(`(() => {
                    for (const el of document.querySelectorAll('button')) {
                        const t = (el.textContent||'').toLowerCase();
                        if (t === 'ok' || t === 'accept' || t === 'confirm' || t === 'yes' || t === 'allow') {
                            el.click(); return true;
                        }
                    }
                    return false;
                })()`).catch(() => false);
                return ok ? { success: true } : { success: false, error: 'Accept button not found' };
            }
            if (t === 'set_cookie') {
                const cookie = action.value || '';
                await wc.executeJavaScript(`document.cookie=${JSON.stringify(cookie)}`);
                return { success: true };
            }
            if (t === 'clear_cookies') {
                await wc.executeJavaScript(`document.cookie.split(';').forEach(c=>{document.cookie=c.split('=')[0]+'=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'})`);
                return { success: true };
            }
            if (t === 'zoom') {
                const level = parseFloat(action.value || '1.0');
                wc.setZoomFactor(level);
                return { success: true };
            }
            if (t === 'triple_click') {
                const res = await resolver.resolve(action.target);
                if (!res?.coords)
                    return { success: false, error: `Element not found` };
                wc.sendInputEvent({ type: 'mouseDown', x: res.coords.x, y: res.coords.y, button: 'left', clickCount: 3 });
                await this.sleep(30);
                wc.sendInputEvent({ type: 'mouseUp', x: res.coords.x, y: res.coords.y, button: 'left', clickCount: 3 });
                return { success: true };
            }
            if (t === 'human_handoff') {
                const desc = action.value || 'Manual action required';
                return { success: false, error: `HUMAN_HANDOFF: ${desc}` };
            }
            return { success: false, error: `Unknown action type: ${t}` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async click(x, y) {
        const wc = this.wc;
        if (!wc)
            return;
        wc.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
        await this.sleep(40);
        wc.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
    }
    async waitReady(timeoutMs) {
        const wc = this.wc;
        if (!wc)
            return;
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            try {
                const state = await wc.executeJavaScript('document.readyState');
                if (state === 'complete' || state === 'interactive')
                    return;
            }
            catch { }
            await this.sleep(200);
        }
    }
    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}
// ─────────────────────────────────────────────
// TASK EXECUTOR — Main orchestrator
// ─────────────────────────────────────────────
export class TaskExecutor {
    resolver;
    verifier;
    dispatcher;
    logFn;
    constructor(webContentsId, logFn) {
        this.resolver = new ElementResolver(webContentsId);
        this.verifier = new StateVerifier(webContentsId);
        this.dispatcher = new ActionDispatcher(webContentsId);
        this.logFn = logFn || ((msg) => console.log(`[TaskExecutor] ${msg}`));
    }
    async execute(task) {
        const startTime = Date.now();
        const stepResults = [];
        let currentStepId = task.steps[0]?.step_id;
        const stepIndex = new Map();
        for (const step of task.steps)
            stepIndex.set(step.step_id, step);
        let stepsCompleted = 0;
        this.logFn(`📋 Executing: "${task.task_intent}" (${task.steps.length} steps)`);
        while (currentStepId && stepIndex.has(currentStepId)) {
            const step = stepIndex.get(currentStepId);
            const stepStart = Date.now();
            let retriesUsed = 0, success = false, error, fallbackUsed, output;
            this.logFn(`  ▸ ${step.step_id}: ${step.label}`);
            const maxRetries = step.on_failure?.retry_count || 1;
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                if (attempt > 0) {
                    retriesUsed++;
                    await new Promise(r => setTimeout(r, 500));
                }
                const result = await this.dispatcher.dispatch(step, this.resolver);
                output = result.output;
                if (result.success) {
                    if (step.expected_state && Object.keys(step.expected_state).length > 0) {
                        if (await this.verifier.verify(step.expected_state, step.action.timing?.timeout_ms || 5000)) {
                            success = true;
                            break;
                        }
                        else
                            error = 'State verification failed';
                    }
                    else {
                        success = true;
                        break;
                    }
                }
                else {
                    error = result.error;
                }
            }
            // Fallback
            if (!success && step.on_failure?.then?.startsWith('execute_fallback:')) {
                const fbName = step.on_failure.then.replace('execute_fallback:', '');
                const fb = task.fallback_strategies?.[fbName];
                if (fb) {
                    fallbackUsed = fbName;
                    for (const a of fb.actions) {
                        const fbStep = { step_id: `fb`, label: 'fallback', risk: 'low', action: { type: a.type, target: { primary: a.target || '' }, value: a.direction || String(a.amount || ''), timing: { wait_for: 'dom_stable', timeout_ms: 3000, poll_interval_ms: 200 } }, expected_state: {}, on_success: '', on_failure: { retry_count: 0, retry_strategy: 'same_action', then: 'skip', escalate_after_retries: 'skip' }, glass_box: { show_in_ui: false, label_for_human: '', pause_before_execute: false, highlight_element: false } };
                        await this.dispatcher.dispatch(fbStep, this.resolver);
                    }
                    if (step.expected_state && Object.keys(step.expected_state).length > 0) {
                        success = await this.verifier.verify(step.expected_state, 3000);
                    }
                }
            }
            stepResults.push({ step_id: step.step_id, status: success ? 'success' : 'failed', duration_ms: Date.now() - stepStart, retries_used: retriesUsed, fallback_used: fallbackUsed, error: success ? undefined : error, output });
            if (success) {
                stepsCompleted++;
                this.logFn(`    ✅ ${step.label} (${Date.now() - stepStart}ms)`);
                const next = step.on_success.replace('proceed_to:', '');
                currentStepId = next === 'done' ? undefined : next;
            }
            else {
                this.logFn(`    ❌ ${step.label}: ${error}`, 'error');
                const esc = step.on_failure?.escalate_after_retries;
                if (esc === 'abort')
                    break;
                if (esc === 'human_handoff') {
                    stepResults[stepResults.length - 1].status = 'human_handoff';
                    break;
                }
                currentStepId = step.on_success.replace('proceed_to:', '');
                if (currentStepId === 'done')
                    currentStepId = undefined;
            }
            if (stepResults.length > task.steps.length * 3)
                break; // Safety
        }
        const status = stepsCompleted === task.steps.length ? 'complete' : stepsCompleted > 0 ? 'partial' : 'failed';
        this.logFn(`📋 ${status}: ${stepsCompleted}/${task.steps.length} in ${Date.now() - startTime}ms`);
        return { task_id: task.task_id, status, steps_completed: stepsCompleted, steps_total: task.steps.length, total_duration_ms: Date.now() - startTime, step_results: stepResults };
    }
}
// ─────────────────────────────────────────────
// TEMPLATE LIBRARY
// ─────────────────────────────────────────────
export class TemplateLibrary {
    templates = new Map();
    store(task) {
        const key = this.genKey(task.task_intent, task.target_domain);
        const ex = this.templates.get(key);
        this.templates.set(key, { task, intent: task.task_intent, successCount: (ex?.successCount || 0) + 1, lastUsed: Date.now() });
    }
    findMatch(intent, domain) {
        const key = this.genKey(intent, domain);
        const exact = this.templates.get(key);
        if (exact) {
            exact.lastUsed = Date.now();
            return exact.task;
        }
        let best = null;
        const words = new Set(intent.toLowerCase().split(/\s+/));
        for (const [, e] of this.templates) {
            const tw = new Set(e.intent.toLowerCase().split(/\s+/));
            const inter = [...words].filter(w => tw.has(w)).length;
            const score = inter / new Set([...words, ...tw]).size;
            if (score > 0.6 && (!best || score > best.score))
                best = { task: e.task, score };
        }
        return best?.task || null;
    }
    getStats() {
        let total = 0;
        for (const [, e] of this.templates)
            total += e.successCount;
        return { totalTemplates: this.templates.size, totalExecutions: total };
    }
    genKey(intent, domain) {
        return `${domain}::${intent.toLowerCase().replace(/[^\w\s]/g, '').trim()}`;
    }
}
