/**
 * PageAnalyzer.ts — Deep Universal Page Understanding Engine
 * 
 * Runs inside the browser context (via executeJavaScript) and returns
 * a comprehensive structured map of the ENTIRE page to the planner.
 * 
 * NOT site-specific — works on ANY website by analyzing the live DOM.
 * The output gives the planner enough intelligence to handle:
 * - Forms with labeled inputs, selects, checkboxes, radios
 * - Tables/grids with clickable/editable cells
 * - Dropdown menus and option lists
 * - Scroll containers with hidden content
 * - Dialogs/modals blocking interaction
 * - Navigation bars, sidebars, toolbars
 * - Canvas-rendered content (Sheets, Docs)
 * - Rich text editors (contenteditable)
 * - File upload zones
 * - Multi-select, drag-drop zones
 */

import { webContents } from 'electron';

// ═══════════════════════════════════════════════════════════════════════
// OUTPUT TYPES — What the analyzer returns
// ═══════════════════════════════════════════════════════════════════════

export interface PageAnalysis {
    url: string;
    title: string;
    viewport: { width: number; height: number; scrollHeight: number; scrollTop: number };

    /** Is there more content below the fold? */
    hasMoreContent: boolean;
    /** Is a modal/dialog blocking interaction? */
    hasBlockingOverlay: boolean;
    overlayInfo?: string;

    /** Detected page type */
    pageType: 'form' | 'table' | 'editor' | 'dashboard' | 'article' | 'search' | 'list' | 'login' | 'settings' | 'generic';

    /** Canvas-rendered detection (Google Sheets/Docs/Slides) */
    isCanvasApp: boolean;
    canvasAppType?: 'sheets' | 'docs' | 'slides' | 'figma' | 'other';

    /** All interactive regions on the page */
    regions: PageRegion[];

    /** All actionable elements (top 80 most important) */
    elements: ActionableElement[];

    /** Detected forms with their fields */
    forms: DetectedForm[];

    /** Detected tables with their structure */
    tables: DetectedTable[];

    /** Detected dropdown menus currently open */
    openMenus: DetectedMenu[];

    /** Smart action suggestions based on page analysis */
    suggestedActions: string[];

    /** Keyboard shortcuts detected on the page */
    keyboardShortcuts: string[];

    /** Summary text for the AI planner (compact) */
    plannerContext: string;
}

export interface PageRegion {
    type: 'header' | 'nav' | 'sidebar' | 'main' | 'footer' | 'toolbar' | 'modal' | 'form' | 'table' | 'editor' | 'search' | 'unknown';
    bounds: { top: number; left: number; width: number; height: number };
    elementCount: number;
    description: string;
}

export interface ActionableElement {
    /** Unique ID for this element */
    id: string;
    /** Element type */
    type: 'button' | 'link' | 'input' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'editable' | 'cell' | 'tab' | 'menu_item' | 'file_input' | 'slider' | 'toggle' | 'icon_button' | 'clickable';
    /** Primary label (text, aria-label, placeholder, title) */
    label: string;
    /** Center coordinates for click_xy */
    x: number;
    y: number;
    /** Element dimensions */
    width: number;
    height: number;
    /** Best targeting strategy */
    target: string;
    /** CSS fallback */
    cssSelector?: string;
    /** Current value (for inputs) */
    currentValue?: string;
    /** Is it visible in viewport? */
    inViewport: boolean;
    /** Is it enabled/not disabled? */
    enabled: boolean;
    /** Additional context */
    meta?: Record<string, string>;
}

export interface DetectedForm {
    /** Form action URL */
    action?: string;
    /** Form method */
    method?: string;
    /** All fields in the form */
    fields: FormField[];
    /** Submit button info */
    submitButton?: { label: string; x: number; y: number; target: string };
    /** How many required fields */
    requiredCount: number;
}

export interface FormField {
    type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'time' | 'file' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'hidden' | 'search' | 'color' | 'range' | 'other';
    label: string;
    name?: string;
    placeholder?: string;
    currentValue?: string;
    required: boolean;
    options?: string[];  // For select/radio
    x: number;
    y: number;
    target: string;
}

export interface DetectedTable {
    /** Table location */
    x: number; y: number; width: number; height: number;
    /** Number of rows and columns */
    rows: number; cols: number;
    /** Header text if any */
    headers: string[];
    /** Are cells editable? */
    cellsEditable: boolean;
    /** Are cells clickable? */
    cellsClickable: boolean;
    /** First few rows of data as text */
    sampleData: string[][];
    /** CSS selector for the table */
    selector: string;
}

export interface DetectedMenu {
    /** Menu items */
    items: Array<{ label: string; x: number; y: number; hasSubmenu: boolean; disabled: boolean }>;
    /** How to dismiss */
    dismissMethod: 'escape' | 'click_outside' | 'close_button';
}

// ═══════════════════════════════════════════════════════════════════════
// PAGE ANALYZER — Main engine
// ═══════════════════════════════════════════════════════════════════════

/**
 * The JavaScript that runs INSIDE the browser to analyze the page.
 * Returns a complete PageAnalysis JSON.
 * This is a single, highly optimized script designed to run fast.
 */
const PAGE_ANALYSIS_SCRIPT = `(() => {
    const MAX_ELEMENTS = 80;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scrollH = document.documentElement.scrollHeight;
    const scrollT = window.scrollY;
    
    // ─── Utility Functions ───
    const inVP = (r) => r.top < vh && r.bottom > 0 && r.left < vw && r.right > 0 && r.width > 0 && r.height > 0;
    const clean = (s) => (s || '').trim().replace(/\\s+/g, ' ').substring(0, 100);
    const getLabel = (el) => {
        return clean(
            el.getAttribute('aria-label')
            || el.getAttribute('title')
            || el.getAttribute('placeholder')
            || el.getAttribute('alt')
            || (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' 
                ? (el.closest('label')?.textContent || el.labels?.[0]?.textContent || el.getAttribute('name') || '')
                : (el.innerText || el.textContent || '').substring(0, 80))
        );
    };
    const bestCSS = (el) => {
        if (el.id) return '#' + CSS.escape(el.id);
        const tn = el.tagName.toLowerCase();
        if (el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
        if (el.getAttribute('name')) return tn + '[name="' + el.getAttribute('name') + '"]';
        if (el.getAttribute('aria-label')) return tn + '[aria-label="' + el.getAttribute('aria-label').substring(0,40) + '"]';
        if (el.className && typeof el.className === 'string') {
            const cls = el.className.split(/\\s+/).filter(c => c.length > 2 && c.length < 30).slice(0,2).join('.');
            if (cls) return tn + '.' + cls;
        }
        return tn;
    };
    const bestTarget = (el) => {
        const label = getLabel(el);
        if (label.length > 2) return label;
        const ph = el.getAttribute('placeholder');
        if (ph) return 'placeholder:' + ph;
        const aria = el.getAttribute('aria-label');
        if (aria) return 'aria:' + aria;
        return 'css:' + bestCSS(el);
    };
    
    // ─── Canvas App Detection ───
    const url = location.href;
    let isCanvasApp = false;
    let canvasAppType = null;
    if (url.includes('docs.google.com/spreadsheets')) { isCanvasApp = true; canvasAppType = 'sheets'; }
    else if (url.includes('docs.google.com/document')) { isCanvasApp = true; canvasAppType = 'docs'; }
    else if (url.includes('docs.google.com/presentation')) { isCanvasApp = true; canvasAppType = 'slides'; }
    else if (url.includes('figma.com')) { isCanvasApp = true; canvasAppType = 'figma'; }
    else if (document.querySelectorAll('canvas').length > 2) { isCanvasApp = true; canvasAppType = 'other'; }
    
    // ─── Overlay/Modal Detection ───
    let hasBlockingOverlay = false;
    let overlayInfo = '';
    const modals = document.querySelectorAll('[role="dialog"],[role="alertdialog"],.modal,.overlay,[aria-modal="true"],.ReactModal__Content,[class*="modal"][class*="open"],[class*="dialog"]');
    for (const m of modals) {
        const r = m.getBoundingClientRect();
        if (r.width > 100 && r.height > 100 && inVP(r)) {
            hasBlockingOverlay = true;
            const title = m.querySelector('h1,h2,h3,[class*="title"]');
            overlayInfo = 'Dialog: ' + clean(title?.textContent || m.getAttribute('aria-label') || 'Modal');
            break;
        }
    }
    
    // ─── Page Type Detection ───
    let pageType = 'generic';
    const forms = document.querySelectorAll('form');
    const tables = document.querySelectorAll('table,[role="grid"],[role="treegrid"]');
    const editors = document.querySelectorAll('[contenteditable="true"],.ql-editor,.ProseMirror,.CodeMirror,.monaco-editor');
    const searchInputs = document.querySelectorAll('input[type="search"],input[name*="search"],input[name*="query"],input[aria-label*="Search"]');
    const loginForms = document.querySelectorAll('input[type="password"]');
    
    if (loginForms.length > 0 && forms.length > 0) pageType = 'login';
    else if (forms.length > 0 && document.querySelectorAll('input,textarea,select').length > 3) pageType = 'form';
    else if (tables.length > 0 || isCanvasApp && canvasAppType === 'sheets') pageType = 'table';
    else if (editors.length > 0 || isCanvasApp) pageType = 'editor';
    else if (searchInputs.length > 0) pageType = 'search';
    else if (document.querySelectorAll('article,.article,[role="article"]').length > 0) pageType = 'article';
    else if (document.querySelectorAll('[role="listbox"],[role="list"],ul.list,ol.list').length > 2) pageType = 'list';
    else if (document.querySelectorAll('[role="tablist"],.tabs,nav').length > 2) pageType = 'dashboard';
    else if (url.includes('settings') || url.includes('preferences') || url.includes('config')) pageType = 'settings';
    
    // ─── Region Detection ───
    const regions = [];
    const regionSels = [
        { sel: 'header,[role="banner"]', type: 'header' },
        { sel: 'nav,[role="navigation"]', type: 'nav' },
        { sel: 'aside,[role="complementary"]', type: 'sidebar' },
        { sel: 'main,[role="main"]', type: 'main' },
        { sel: 'footer,[role="contentinfo"]', type: 'footer' },
        { sel: '[role="toolbar"],.toolbar', type: 'toolbar' },
        { sel: '[role="dialog"],[aria-modal="true"],.modal', type: 'modal' },
        { sel: 'form', type: 'form' },
        { sel: 'table,[role="grid"]', type: 'table' },
        { sel: '[role="search"]', type: 'search' },
    ];
    for (const { sel, type } of regionSels) {
        for (const el of document.querySelectorAll(sel)) {
            const r = el.getBoundingClientRect();
            if (r.width > 50 && r.height > 30) {
                regions.push({
                    type,
                    bounds: { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) },
                    elementCount: el.querySelectorAll('button,a,input,select,textarea').length,
                    description: clean(el.getAttribute('aria-label') || el.querySelector('h1,h2,h3')?.textContent || type),
                });
            }
        }
    }
    
    // ─── Actionable Elements ───
    const elements = [];
    const allInteractive = document.querySelectorAll(
        'button,a[href],input:not([type="hidden"]),textarea,select,' +
        '[role="button"],[role="link"],[role="tab"],[role="menuitem"],[role="option"],[role="switch"],[role="slider"],' +
        '[contenteditable="true"],[tabindex]:not([tabindex="-1"]),' +
        'label[for],summary,[onclick],[data-action],[role="checkbox"],[role="radio"],' +
        'input[type="file"],[role="combobox"],[role="listbox"],' +
        '[draggable="true"],[role="gridcell"]'
    );
    
    const seen = new Set();
    for (const el of allInteractive) {
        if (elements.length >= MAX_ELEMENTS) break;
        const r = el.getBoundingClientRect();
        if (r.width < 5 || r.height < 5) continue;
        if (!inVP(r) && elements.length > 40) continue; // Prioritize visible elements
        
        const key = Math.round(r.left) + ',' + Math.round(r.top);
        if (seen.has(key)) continue;
        seen.add(key);
        
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role') || '';
        const inputType = el.getAttribute('type') || '';
        
        let type = 'clickable';
        if (tag === 'button' || role === 'button') type = el.querySelector('svg,img') && !el.textContent.trim() ? 'icon_button' : 'button';
        else if (tag === 'a') type = 'link';
        else if (tag === 'input' && inputType === 'file') type = 'file_input';
        else if (tag === 'input' && (inputType === 'checkbox' || role === 'checkbox')) type = 'checkbox';
        else if (tag === 'input' && (inputType === 'radio' || role === 'radio')) type = 'radio';
        else if (tag === 'input' && inputType === 'range' || role === 'slider') type = 'slider';
        else if (tag === 'input') type = 'input';
        else if (tag === 'textarea') type = 'textarea';
        else if (tag === 'select' || role === 'combobox' || role === 'listbox') type = 'select';
        else if (el.getAttribute('contenteditable') === 'true') type = 'editable';
        else if (role === 'tab') type = 'tab';
        else if (role === 'menuitem' || role === 'option') type = 'menu_item';
        else if (role === 'switch') type = 'toggle';
        else if (role === 'gridcell') type = 'cell';
        
        const label = getLabel(el);
        const meta = {};
        if (el.value) meta.value = clean(String(el.value));
        if (el.checked !== undefined) meta.checked = String(el.checked);
        if (el.disabled) meta.disabled = 'true';
        if (el.getAttribute('href')) meta.href = el.getAttribute('href').substring(0,80);
        if (inputType) meta.inputType = inputType;
        if (el.required) meta.required = 'true';
        if (tag === 'select') {
            const opts = [...el.options].slice(0,8).map(o => o.text.trim()).filter(Boolean);
            if (opts.length) meta.options = opts.join(' | ');
        }
        
        elements.push({
            id: 'e' + elements.length,
            type,
            label: label || bestCSS(el),
            x: Math.round(r.left + r.width / 2),
            y: Math.round(r.top + r.height / 2),
            width: Math.round(r.width),
            height: Math.round(r.height),
            target: bestTarget(el),
            cssSelector: bestCSS(el),
            currentValue: el.value || undefined,
            inViewport: inVP(r),
            enabled: !el.disabled,
            meta: Object.keys(meta).length > 0 ? meta : undefined,
        });
    }
    
    // ─── Form Detection ───
    const detectedForms = [];
    for (const form of forms) {
        const r = form.getBoundingClientRect();
        if (r.width < 50 || r.height < 30) continue;
        
        const fields = [];
        let requiredCount = 0;
        for (const el of form.querySelectorAll('input:not([type="hidden"]),textarea,select')) {
            const fr = el.getBoundingClientRect();
            if (fr.width < 5 || fr.height < 5) continue;
            
            const inputType = el.getAttribute('type') || (el.tagName === 'SELECT' ? 'select' : el.tagName === 'TEXTAREA' ? 'textarea' : 'text');
            const label = getLabel(el);
            const required = el.required || el.getAttribute('aria-required') === 'true';
            if (required) requiredCount++;
            
            const options = el.tagName === 'SELECT' ? [...el.options].slice(0,10).map(o => o.text.trim()).filter(Boolean) : undefined;
            
            fields.push({
                type: inputType,
                label: label,
                name: el.getAttribute('name') || undefined,
                placeholder: el.getAttribute('placeholder') || undefined,
                currentValue: el.value || undefined,
                required,
                options,
                x: Math.round(fr.left + fr.width / 2),
                y: Math.round(fr.top + fr.height / 2),
                target: bestTarget(el),
            });
        }
        
        // Find submit button
        let submitButton = null;
        const submitEl = form.querySelector('button[type="submit"],input[type="submit"],button:not([type])');
        if (submitEl) {
            const sr = submitEl.getBoundingClientRect();
            submitButton = { label: getLabel(submitEl), x: Math.round(sr.left + sr.width / 2), y: Math.round(sr.top + sr.height / 2), target: bestTarget(submitEl) };
        }
        
        detectedForms.push({ action: form.action || undefined, method: form.method || undefined, fields, submitButton, requiredCount });
    }
    
    // ─── Table Detection ───
    const detectedTables = [];
    for (const tbl of tables) {
        const r = tbl.getBoundingClientRect();
        if (r.width < 100 || r.height < 50) continue;
        
        const allRows = tbl.querySelectorAll('tr,[role="row"]');
        const headers = [];
        const firstRow = allRows[0];
        if (firstRow) {
            for (const th of firstRow.querySelectorAll('th,td,[role="columnheader"]')) {
                headers.push(clean(th.textContent));
            }
        }
        
        const sampleData = [];
        for (let i = 1; i < Math.min(4, allRows.length); i++) {
            const row = [];
            for (const td of allRows[i].querySelectorAll('td,[role="cell"],[role="gridcell"]')) {
                row.push(clean(td.textContent).substring(0,30));
            }
            if (row.length) sampleData.push(row);
        }
        
        // Check if cells are editable
        const firstCell = tbl.querySelector('td,[role="cell"],[role="gridcell"]');
        const cellsEditable = firstCell ? (firstCell.getAttribute('contenteditable') === 'true' || firstCell.querySelector('input,textarea') !== null) : false;
        const cellsClickable = firstCell ? (firstCell.querySelector('a,button') !== null || firstCell.onclick !== null) : true;
        
        detectedTables.push({
            x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2),
            width: Math.round(r.width), height: Math.round(r.height),
            rows: allRows.length, cols: headers.length || (allRows[0]?.children.length || 0),
            headers, cellsEditable, cellsClickable, sampleData,
            selector: bestCSS(tbl),
        });
    }
    
    // ─── Open Menu Detection ───
    const openMenus = [];
    for (const menu of document.querySelectorAll('[role="menu"],[role="listbox"].show,ul.dropdown-menu.show,.dropdown.show ul,.MuiMenu-list,.MuiPopover-paper')) {
        const r = menu.getBoundingClientRect();
        if (r.width < 30 || r.height < 20 || !inVP(r)) continue;
        const items = [];
        for (const item of menu.querySelectorAll('[role="menuitem"],[role="option"],li')) {
            const ir = item.getBoundingClientRect();
            if (ir.height < 5) continue;
            items.push({
                label: clean(item.textContent),
                x: Math.round(ir.left + ir.width / 2),
                y: Math.round(ir.top + ir.height / 2),
                hasSubmenu: item.getAttribute('aria-haspopup') === 'true' || item.querySelector('[role="menu"]') !== null,
                disabled: item.getAttribute('aria-disabled') === 'true' || item.classList.contains('disabled'),
            });
        }
        if (items.length) {
            openMenus.push({ items, dismissMethod: 'escape' });
        }
    }
    
    // ─── Keyboard Shortcuts Detection ───
    const keyboardShortcuts = [];
    for (const el of document.querySelectorAll('[data-hotkey],[accesskey]')) {
        const hk = el.getAttribute('data-hotkey') || el.getAttribute('accesskey');
        const label = getLabel(el);
        if (hk && label) keyboardShortcuts.push(hk + ' → ' + label);
    }
    
    // ─── Images Detection ───
    const images = [];
    for (const img of document.querySelectorAll('img,[role="img"],svg[aria-label],picture')) {
        const r = img.getBoundingClientRect();
        if (r.width < 20 || r.height < 20 || !inVP(r)) continue;
        if (images.length >= 10) break;
        const alt = img.getAttribute('alt') || img.getAttribute('aria-label') || '';
        const src = (img.getAttribute('src') || '').substring(0,60);
        const clickable = !!img.closest('a,button,[role="button"],[onclick]');
        images.push({ alt: clean(alt), src, x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2), w: Math.round(r.width), h: Math.round(r.height), clickable });
    }
    
    // ─── Iframe Detection ───
    const iframes = [];
    for (const iframe of document.querySelectorAll('iframe')) {
        const r = iframe.getBoundingClientRect();
        if (r.width < 50 || r.height < 50 || !inVP(r)) continue;
        iframes.push({ src: (iframe.src || '').substring(0,80), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
    }
    
    // ─── Scroll Containers (not just page scroll) ───
    const scrollContainers = [];
    for (const el of document.querySelectorAll('div,section,main,aside,ul,ol')) {
        if (scrollContainers.length >= 5) break;
        const s = getComputedStyle(el);
        if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 50) {
            const r = el.getBoundingClientRect();
            if (r.width > 100 && r.height > 80 && inVP(r)) {
                scrollContainers.push({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), hiddenPx: el.scrollHeight - el.clientHeight, desc: clean(el.getAttribute('aria-label') || el.className || 'scrollable area') });
            }
        }
    }
    
    // ─── Focus State — What element currently has focus ───
    const focused = document.activeElement;
    let focusInfo = null;
    if (focused && focused !== document.body && focused.tagName !== 'IFRAME') {
        const fr = focused.getBoundingClientRect();
        focusInfo = { tag: focused.tagName.toLowerCase(), label: getLabel(focused), x: Math.round(fr.left+fr.width/2), y: Math.round(fr.top+fr.height/2), value: focused.value || '' };
    }
    
    // ─── Loading / Progress Indicators ───
    const loadingIndicators = [];
    for (const el of document.querySelectorAll('[role="progressbar"],progress,.spinner,.loading,[class*="spinner"],[class*="loading"],[aria-busy="true"]')) {
        const r = el.getBoundingClientRect();
        if (r.width > 5 && inVP(r)) {
            loadingIndicators.push({ type: el.getAttribute('role') || 'spinner', value: el.getAttribute('aria-valuenow') || '', x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2) });
        }
    }
    
    // ─── Tab Bars ───
    const tabBars = [];
    for (const tablist of document.querySelectorAll('[role="tablist"],.nav-tabs,.tabs')) {
        const tabs = [];
        for (const tab of tablist.querySelectorAll('[role="tab"],a,button')) {
            const tr = tab.getBoundingClientRect();
            if (tr.width < 5) continue;
            tabs.push({ label: clean(tab.textContent), active: tab.getAttribute('aria-selected') === 'true' || tab.classList.contains('active'), x: Math.round(tr.left+tr.width/2), y: Math.round(tr.top+tr.height/2) });
        }
        if (tabs.length > 1) tabBars.push(tabs);
    }
    
    // ─── Breadcrumbs ───
    const breadcrumbs = [];
    for (const nav of document.querySelectorAll('[aria-label="Breadcrumb"],[aria-label="breadcrumb"],.breadcrumb,nav ol')) {
        for (const item of nav.querySelectorAll('a,span,li')) {
            const text = clean(item.textContent);
            if (text && text.length > 1 && text.length < 40) breadcrumbs.push(text);
        }
        break;
    }
    
    // ─── Error / Success / Warning Banners ───
    const banners = [];
    for (const el of document.querySelectorAll('[role="alert"],[role="status"],.alert,.error,.success,.warning,.notification,.toast,.snackbar,[class*="error"],[class*="success"],[class*="warning"],[class*="alert"]')) {
        const r = el.getBoundingClientRect();
        if (r.width < 50 || !inVP(r)) continue;
        const text = clean(el.textContent);
        if (text.length < 3) continue;
        let severity = 'info';
        const cls = (el.className || '').toLowerCase();
        if (cls.includes('error') || cls.includes('danger')) severity = 'error';
        else if (cls.includes('success')) severity = 'success';
        else if (cls.includes('warning') || cls.includes('warn')) severity = 'warning';
        banners.push({ severity, text: text.substring(0,80), x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2) });
        if (banners.length >= 3) break;
    }
    
    // ─── Navigation Menus ───
    const navMenus = [];
    for (const nav of document.querySelectorAll('nav,[role="navigation"]')) {
        const navItems = [];
        for (const a of nav.querySelectorAll('a,button,[role="menuitem"]')) {
            const ar = a.getBoundingClientRect();
            if (ar.width < 5 || !inVP(ar)) continue;
            navItems.push({ label: clean(a.textContent).substring(0,25), href: (a.href||'').substring(0,60), x: Math.round(ar.left+ar.width/2), y: Math.round(ar.top+ar.height/2) });
        }
        if (navItems.length > 1 && navItems.length <= 20) navMenus.push(navItems);
    }
    
    // ─── Video / Audio Elements ───
    const mediaElements = [];
    for (const el of document.querySelectorAll('video,audio,[role="application"][aria-label*="player"]')) {
        const r = el.getBoundingClientRect();
        if (r.width < 50) continue;
        mediaElements.push({ type: el.tagName.toLowerCase(), playing: el.paused === false, duration: el.duration || 0, x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2) });
    }

    // ─── Smart Action Suggestions ───
    const suggestedActions = [];
    if (hasBlockingOverlay) suggestedActions.push('DISMISS the modal/dialog first (press Escape or click close button)');
    if (isCanvasApp && canvasAppType === 'sheets') {
        suggestedActions.push('SHEETS: Use Name Box (xy:60,140) + keyboard (Tab/Enter) for cell data. Do NOT target cells by aria/semantic.');
    }
    if (isCanvasApp && canvasAppType === 'docs') {
        suggestedActions.push('DOCS: Click in document body to position cursor, then type. Use keyboard shortcuts for formatting.');
    }
    if (detectedForms.length > 0) {
        const f = detectedForms[0];
        suggestedActions.push('FORM with ' + f.fields.length + ' fields (' + f.requiredCount + ' required). Fields: ' + f.fields.map(x => x.label).join(', '));
    }
    if (detectedTables.length > 0) {
        const t = detectedTables[0];
        suggestedActions.push('TABLE: ' + t.rows + 'x' + t.cols + (t.cellsEditable ? ' (editable cells)' : '') + '. Headers: ' + t.headers.join(', '));
    }
    if (scrollH > vh * 1.5) suggestedActions.push('Page has ' + Math.round((scrollH-vh)/vh*100) + '% more content below. Use scroll to find hidden elements.');
    if (openMenus.length > 0) suggestedActions.push('OPEN MENU with ' + openMenus[0].items.length + ' items: ' + openMenus[0].items.slice(0,5).map(i=>i.label).join(', '));
    if (loadingIndicators.length > 0) suggestedActions.push('LOADING in progress — wait before interacting.');
    if (banners.length > 0) suggestedActions.push('BANNER [' + banners[0].severity + ']: ' + banners[0].text);
    if (scrollContainers.length > 0) suggestedActions.push('SCROLL CONTAINER at (xy:' + scrollContainers[0].x + ',' + scrollContainers[0].y + ') has ' + scrollContainers[0].hiddenPx + 'px hidden content.');
    
    // ─── Compact Planner Context (EVERYTHING the AI needs) ───
    const visibleElements = elements.filter(e => e.inViewport);
    let plannerContext = 'PAGE: ' + document.title + ' | TYPE: ' + pageType + ' | VIEWPORT: ' + vw + 'x' + vh + ' | SCROLL: ' + Math.round(scrollT) + '/' + scrollH + '\\n';
    if (isCanvasApp) plannerContext += '⚠️ CANVAS APP (' + canvasAppType + '): Standard DOM targeting limited. Use coordinates/keyboard.\\n';
    if (hasBlockingOverlay) plannerContext += '⚠️ MODAL BLOCKING: ' + overlayInfo + '\\n';
    if (focusInfo) plannerContext += '🎯 FOCUSED: ' + focusInfo.tag + ' "' + focusInfo.label + '"' + (focusInfo.value ? ' [value="' + focusInfo.value.substring(0,30) + '"]' : '') + ' at xy:' + focusInfo.x + ',' + focusInfo.y + '\\n';
    if (loadingIndicators.length > 0) plannerContext += '⏳ LOADING: ' + loadingIndicators.length + ' indicator(s) active\\n';
    
    // Group elements by type for compact display  
    const byType = {};
    for (const e of visibleElements) {
        if (!byType[e.type]) byType[e.type] = [];
        byType[e.type].push(e);
    }
    for (const [type, els] of Object.entries(byType)) {
        const labels = els.slice(0, 8).map(e => '"' + e.label.substring(0,30) + '"(xy:' + e.x + ',' + e.y + ')' + (e.currentValue ? '[="' + e.currentValue.substring(0,20) + '"]' : ''));
        plannerContext += type.toUpperCase() + 'S[' + els.length + ']: ' + labels.join(', ') + (els.length > 8 ? ' +' + (els.length-8) + ' more' : '') + '\\n';
    }
    
    if (detectedForms.length > 0) {
        for (const f of detectedForms) {
            plannerContext += 'FORM[' + f.fields.length + ' fields]: ' + f.fields.map(fld => fld.label + '(' + fld.type + (fld.required?'*':'') + (fld.currentValue ? '="' + fld.currentValue.substring(0,15) + '"' : '') + ',xy:' + fld.x + ',' + fld.y + ')').join(', ');
            if (f.submitButton) plannerContext += ' → SUBMIT[' + f.submitButton.label + '](xy:' + f.submitButton.x + ',' + f.submitButton.y + ')';
            plannerContext += '\\n';
        }
    }
    
    if (detectedTables.length > 0) {
        for (const t of detectedTables) {
            plannerContext += 'TABLE[' + t.rows + 'x' + t.cols + ']: ' + t.headers.join(' | ') + (t.cellsEditable ? ' [EDITABLE]' : '') + ' at xy:' + t.x + ',' + t.y + '\\n';
            if (t.sampleData.length > 0) plannerContext += '  ROW1: ' + t.sampleData[0].join(' | ') + '\\n';
        }
    }
    
    if (images.length > 0) {
        plannerContext += 'IMAGES[' + images.length + ']: ' + images.slice(0,5).map(i => (i.alt || 'no-alt') + (i.clickable ? '[CLICKABLE]' : '') + '(xy:' + i.x + ',' + i.y + ',' + i.w + 'x' + i.h + ')').join(', ') + '\\n';
    }
    if (iframes.length > 0) {
        plannerContext += 'IFRAMES[' + iframes.length + ']: ' + iframes.map(f => f.src.substring(0,40) + '(xy:' + f.x + ',' + f.y + ')').join(', ') + '\\n';
    }
    if (navMenus.length > 0) {
        for (const nav of navMenus.slice(0,2)) {
            plannerContext += 'NAV: ' + nav.map(n => '"' + n.label + '"(xy:' + n.x + ',' + n.y + ')').join(', ') + '\\n';
        }
    }
    if (tabBars.length > 0) {
        for (const tabs of tabBars) {
            plannerContext += 'TABS: ' + tabs.map(t => (t.active ? '→' : '') + '"' + t.label + '"(xy:' + t.x + ',' + t.y + ')').join(', ') + '\\n';
        }
    }
    if (breadcrumbs.length > 0) plannerContext += 'BREADCRUMB: ' + breadcrumbs.join(' > ') + '\\n';
    if (mediaElements.length > 0) plannerContext += 'MEDIA: ' + mediaElements.map(m => m.type + (m.playing ? '[PLAYING]' : '') + '(xy:' + m.x + ',' + m.y + ')').join(', ') + '\\n';
    if (scrollContainers.length > 0) plannerContext += 'SCROLL AREAS: ' + scrollContainers.map(s => s.desc.substring(0,20) + '(' + s.hiddenPx + 'px hidden,xy:' + s.x + ',' + s.y + ')').join(', ') + '\\n';
    
    for (const b of banners) plannerContext += (b.severity === 'error' ? '❌' : b.severity === 'success' ? '✅' : '⚠️') + ' BANNER: ' + b.text + '\\n';
    for (const s of suggestedActions) plannerContext += '💡 ' + s + '\\n';
    
    return {
        url: location.href,
        title: document.title,
        viewport: { width: vw, height: vh, scrollHeight: scrollH, scrollTop: Math.round(scrollT) },
        hasMoreContent: scrollH > vh + scrollT + 100,
        hasBlockingOverlay,
        overlayInfo: overlayInfo || undefined,
        pageType,
        isCanvasApp,
        canvasAppType: canvasAppType || undefined,
        regions: regions.slice(0, 15),
        elements,
        forms: detectedForms,
        tables: detectedTables,
        openMenus,
        suggestedActions,
        keyboardShortcuts,
        plannerContext,
    };
})()`;

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════

export class PageAnalyzer {
    /**
     * Run full page analysis on the given webContents.
     * Returns comprehensive PageAnalysis with all elements, forms, tables,
     * menus, regions, and a compact planner context string.
     */
    static async analyze(webContentsId: number): Promise<PageAnalysis | null> {
        const wc = webContents.fromId(webContentsId);
        if (!wc || wc.isDestroyed()) return null;

        try {
            const result = await wc.executeJavaScript(PAGE_ANALYSIS_SCRIPT);
            return result as PageAnalysis;
        } catch (err: any) {
            console.log(`[PageAnalyzer] Analysis failed: ${ err.message }`);
            return null;
        }
    }

    /**
     * Quick scan — returns only the planner context string (fast, minimal).
     * Use when you just need context for the AI, not the full analysis.
     */
    static async quickScan(webContentsId: number): Promise<string> {
        const wc = webContents.fromId(webContentsId);
        if (!wc || wc.isDestroyed()) return '';

        try {
            const result = await wc.executeJavaScript(`(() => {
                const vw = window.innerWidth, vh = window.innerHeight;
                const inVP = (r) => r.top < vh && r.bottom > 0 && r.left < vw && r.right > 0 && r.width > 5 && r.height > 5;
                const clean = (s) => (s || '').trim().replace(/\\s+/g, ' ').substring(0, 60);
                const getLabel = (el) => clean(el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder') || (el.innerText || el.textContent || '').substring(0, 50));
                
                let ctx = 'PAGE: ' + document.title + '\\n';
                ctx += 'URL: ' + location.href + '\\n';
                
                // Canvas detection
                if (location.href.includes('docs.google.com/spreadsheets')) ctx += '⚠️ SHEETS: Canvas cells. Use Name Box(xy:60,140)+keyboard(Tab/Enter)\\n';
                else if (location.href.includes('docs.google.com/document')) ctx += '⚠️ DOCS: Canvas body. Click to position, type to add text.\\n';
                
                // Modal
                const modal = document.querySelector('[role="dialog"],[aria-modal="true"],.modal');
                if (modal) { const r = modal.getBoundingClientRect(); if (r.width > 100 && inVP(r)) ctx += '⚠️ MODAL: ' + clean(modal.querySelector('h1,h2,h3')?.textContent || 'Dialog open') + '\\n'; }
                
                // Key elements
                const els = document.querySelectorAll('button,a[href],input:not([type="hidden"]),textarea,select,[role="button"],[contenteditable="true"]');
                const items = [];
                for (const el of els) {
                    if (items.length >= 30) break;
                    const r = el.getBoundingClientRect();
                    if (!inVP(r)) continue;
                    const label = getLabel(el);
                    if (!label || label.length < 2) continue;
                    const tag = el.tagName.toLowerCase();
                    const type = tag === 'input' ? (el.type || 'text') : tag === 'select' ? 'select' : tag === 'textarea' ? 'textarea' : el.getAttribute('contenteditable') ? 'editable' : 'btn';
                    items.push(type + ':"' + label + '"(xy:' + Math.round(r.left+r.width/2) + ',' + Math.round(r.top+r.height/2) + ')');
                }
                ctx += items.join(', ') + '\\n';
                
                // Forms summary
                const formCount = document.querySelectorAll('form').length;
                const inputCount = document.querySelectorAll('input:not([type="hidden"]),textarea,select').length;
                if (formCount) ctx += 'FORMS: ' + formCount + ' forms, ' + inputCount + ' inputs\\n';
                
                // Tables summary
                const tables = document.querySelectorAll('table,[role="grid"]');
                if (tables.length) { const t = tables[0]; ctx += 'TABLE: ' + t.querySelectorAll('tr').length + ' rows\\n'; }
                
                // Scroll
                if (document.documentElement.scrollHeight > vh * 1.5) ctx += '📜 More content below (scroll down)\\n';
                
                return ctx;
            })()`);
            return result as string;
        } catch {
            return '';
        }
    }

    /**
     * Get a specific element's details by its analysis ID.
     * Useful for re-resolving elements after page changes.
     */
    static async getElementAt(webContentsId: number, x: number, y: number): Promise<ActionableElement | null> {
        const wc = webContents.fromId(webContentsId);
        if (!wc || wc.isDestroyed()) return null;

        try {
            const result = await wc.executeJavaScript(`(() => {
                const el = document.elementFromPoint(${ x }, ${ y });
                if (!el) return null;
                const r = el.getBoundingClientRect();
                const tag = el.tagName.toLowerCase();
                const clean = (s) => (s || '').trim().substring(0, 100);
                return {
                    id: 'point',
                    type: tag === 'button' ? 'button' : tag === 'input' ? 'input' : tag === 'a' ? 'link' : 'clickable',
                    label: clean(el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || ''),
                    x: Math.round(r.left + r.width / 2),
                    y: Math.round(r.top + r.height / 2),
                    width: Math.round(r.width),
                    height: Math.round(r.height),
                    target: clean(el.getAttribute('aria-label') || el.innerText || tag),
                    cssSelector: el.id ? '#' + el.id : tag,
                    currentValue: el.value || undefined,
                    inViewport: true,
                    enabled: !el.disabled,
                };
            })()`);
            return result;
        } catch { return null; }
    }
}
