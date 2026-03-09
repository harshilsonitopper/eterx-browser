
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TabBar } from './components/TabBar';
import { AddressBar } from './components/AddressBar';
import { NewTab } from './components/NewTab';
import { HistoryPanel } from './components/HistoryPanel';
import { FindBar } from './components/FindBar';
import { PermissionPrompt } from './components/PermissionPrompt';
import { SettingsPage, UserSettings } from './components/SettingsPage';
import { PasswordManager } from './components/PasswordManager';
import { HistoryPage } from './components/HistoryPage';
import { DownloadsPage } from './components/DownloadsPage';
import { ShortcutsPage } from './components/ShortcutsPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import SmartSidebar from './components/SmartSidebar';
import { AssistantTab } from './components/AssistantTab';
import { EterXUI } from './components/EterXUI';
import { CustomizePanel } from './components/CustomizePanel';
import { Tab, HistoryItem, Bookmark } from './types';
import { StorageService } from './services/StorageService';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Square, X, Maximize2, Loader2, MessageSquare, HelpCircle } from 'lucide-react';
import { SettingsPanel } from './components/SettingsPanel';

import { BrowserMenu } from './components/BrowserMenu';
import { TabSearchMenu } from './components/TabSearchMenu';
import { ProfileMenu } from './components/ProfileMenu';
import { ContextualSearch } from './components/ContextualSearch';
import { ChevronDown } from 'lucide-react';
import { AgentManager, AgentState } from './services/AgentManager';
import { ChatService } from './services/ChatService';
import { LLMService } from './services/LLMService';
import { GeminiService } from './services/GeminiService';
import { AgentCore } from './services/AgentCore'; // Initialize Agent Core
import { GeminiLiveService } from './services/GeminiLiveService'; // Agentic Browser Control


// New Advanced Components
import { LayoutEngine } from './components/LayoutEngine';
import { TabPreview } from './components/TabPreview';
import { AgentConsole } from './components/AgentConsole';
import { AgenticFrame, ClickIndicator } from './components/AgenticFrame';
import { AgentStatusPill } from './components/AgentStatusPill'; // UI Component
import { AgentVisualOverlay } from './components/AgentVisualOverlay';
import { MinimalLoader } from './components/MinimalLoader';
import { ShortcutManager } from './components/ShortcutManager';
import { useUndoRedo } from './hooks/useUndoRedo';
import { HelpGuide } from './components/HelpGuide';
import { LayoutPicker } from './components/LayoutPicker';
import { LayoutState, DEFAULT_LAYOUT_STATE, LayoutMode } from './types/layout';
import { CommandPalette, CommandAction } from './components/CommandPalette';
import { AIControlBar } from './components/AIControlBar';
import { QuickLinksAlgorithm } from './services/QuickLinksAlgorithm';
import { LiveAgentOverlay } from './components/LiveAgentOverlay';
import { StatusConsole } from './components/StatusConsole'; // Debug Console
import { Columns, Grid3X3, Layers, Monitor, Move, Plus, Sidebar, Sun, Moon, Palette, Settings, LayoutTemplate, Bot, Zap, StopCircle } from 'lucide-react';
import { PermissionManager } from './services/PermissionManager';
import { THEME_COLORS } from './components/ThemeConstants';







const INITIAL_TAB: Tab = {

    id: '1',
    title: 'New Tab',
    url: 'eterx://newtab',
    isLoading: false,
    history: ['eterx://newtab'],
    currentIndex: 0
};

declare global {
    interface Window {
        electron: any;
        ipcRenderer: any;
    }
    namespace JSX {
        interface IntrinsicElements {
            webview: any;
        }
    }
}



type SidePanelView = 'ai' | 'history' | 'settings' | 'bookmarks' | null;

interface ClickAnim { x: number; y: number; type: string; }

const App: React.FC = () => {
    console.log('[App] Component rendering...');
    const [tabs, setTabs] = useState<Tab[]>([INITIAL_TAB]);
    // @ts-ignore
    const WebView: any = 'webview';
    const [activeTabId, setActiveTabId] = useState<string>('1');
    const activeTabIdRef = useRef(activeTabId);
    useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);

    const tabsRef = useRef(tabs);
    useEffect(() => { tabsRef.current = tabs; }, [tabs]);

    const [sidePanelView, setSidePanelView] = useState<SidePanelView>('ai');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isAgentConsoleOpen, setIsAgentConsoleOpen] = useState(false);
    const [isWindowFocused, setIsWindowFocused] = useState(true);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isTabSearchOpen, setIsTabSearchOpen] = useState(false);
    const [closedTabs, setClosedTabs] = useState<Tab[]>([]); // Track closed tabs
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [contextualSearch, setContextualSearch] = useState<{ isOpen: boolean; x: number; y: number }>({ isOpen: false, x: 0, y: 0 });
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
    const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);
    const [isQuickChatOpen, setIsQuickChatOpen] = useState(false);
    const [layoutMode, setLayoutMode] = useState<LayoutMode>('single');
    const [secondaryActiveTabId, setSecondaryActiveTabId] = useState<string | null>(null);
    const [focusedPane, setFocusedPane] = useState<'primary' | 'secondary'>('primary');
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isLiveAgentOpen, setIsLiveAgentOpen] = useState(false); // New State

    // Advanced Layout State
    const [layoutState, setLayoutState] = useState<LayoutState>(DEFAULT_LAYOUT_STATE);

    // User state for profile menu
    const [user, setUser] = useState<{ name?: string; email?: string; avatar?: string } | null>(null);
    const [isShortcutManagerOpen, setIsShortcutManagerOpen] = useState(false);
    const [isHelpGuideOpen, setIsHelpGuideOpen] = useState(false);
    const [isLayoutPickerOpen, setIsLayoutPickerOpen] = useState(false);
    const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
    const [tabPreview, setTabPreview] = useState<{ tabId: string; x: number; y: number } | null>(null);

    // Agentic Visual State
    const [clickIndicators, setClickIndicators] = useState<{ id: string; x: number; y: number }[]>([]);

    const webviewRefs = useRef<Map<string, any>>(new Map());

    // Undo/Redo Hook
    const { undo, redo, record, canUndo, canRedo } = useUndoRedo(
        (tab) => {
            // Restore Tab
            setTabs(prev => [...prev, tab]);
            setActiveTabId(tab.id);
        },
        (id) => {
            // Close Tab (without recording again to avoid loop, handled by direct setTabs in hook usually, 
            // but here we call handleCloseTab which might record.
            // We need a 'silent' close or check context. 
            // For simplicity, we'll just implement raw Close logic here or use a flag.)
            setTabs(prev => {
                const newTabs = prev.filter(t => t.id !== id);
                if (newTabs.length === 0) {
                    setTimeout(() => window.electron?.close?.(), 100);
                }
                if (activeTabId === id && newTabs.length > 0) {
                    setActiveTabId(newTabs[newTabs.length - 1].id);
                }
                return newTabs;
            });
        },
        (url, tabId) => {
            // Navigate
            setTabs(prev => prev.map(t => {
                if (t.id === tabId) {
                    // Simple URL update for undo/redo navigation (resets history stack forward)
                    return { ...t, url: url, internalUrl: url, isLoading: true };
                }
                return t;
            }));
        }
    );

    // Persistence State
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

    // 🧠 NEW Agent System State
    const [activeAgentState, setActiveAgentState] = useState<AgentState | null>(null);

    // Sync Agent State with Active Tab
    useEffect(() => {
        const tabId = activeTabId;
        const current = AgentManager.getState(tabId);
        setActiveAgentState(current);

        // Subscribe to updates
        const unsubscribe = AgentManager.subscribe((tid, state) => {
            if (tid === tabId) {
                setActiveAgentState(state);
            }
        });
        return unsubscribe;
    }, [activeTabId]);

    // Focus Webview on Tab Switch to prevent "White Screen" glitch
    useEffect(() => {
        const wv = webviewRefs.current.get(activeTabId);
        if (wv) {
            setTimeout(() => {
                try {
                    wv.focus();
                } catch (e) {
                    console.warn('[App] Webview focus failed:', e);
                }
            }, 100);
        }
    }, [activeTabId]);

    // Sync Active WebContents for CDP/Vision Loop
    useEffect(() => {
        const wv = webviewRefs.current.get(activeTabId);
        if (wv) {
            const syncWC = () => {
                try {
                    const wcId = typeof wv.getWebContentsId === 'function' ? wv.getWebContentsId() : null;
                    if (wcId && window.electron && window.electron.setActiveWebContents) {
                        window.electron.setActiveWebContents(wcId);
                        console.log(`[App] Synced active webContents ID to main process: ${ wcId }`);
                    }
                } catch (e) { }
            };

            // Try to sync immediately if possible
            syncWC();

            // Also sync on dom-ready to handle fast loads
            wv.addEventListener('dom-ready', syncWC);
            return () => {
                try { wv.removeEventListener('dom-ready', syncWC); } catch (e) { }
            };
        }
    }, [activeTabId, tabs]);

    // Font Application
    useEffect(() => {
        const applyFont = () => {
            const font = localStorage.getItem('eterx_font') || 'Inter, sans-serif';
            document.documentElement.style.fontFamily = font;
        };
        applyFont();
        window.addEventListener('eterx-settings-updated', applyFont);
        return () => window.removeEventListener('eterx-settings-updated', applyFont);
    }, []);

    // Helpers for agent state
    const isAgentRunning = activeAgentState?.isRunning || false;
    const agentStatus = activeAgentState?.status || 'idle';
    const agentStatusMessage = activeAgentState?.message || '';



    const [settings, setSettings] = useState<UserSettings>({
        searchEngine: 'google',
        appearance: {
            mode: 'light',
            browserMode: 'stock',
            showHomeButton: true,
            showBookmarksBar: false,
            sidePanelPosition: 'right',
            tabHoverPreview: true,
            accentColor: 'blue',
            uiDensity: 'comfortable',
            animationSpeed: 'normal'
        },
        privacy: {
            clearDataOnExit: false,
            adPrivacy: true,
            doNotTrack: true,
            blockThirdPartyCookies: false,
            httpsOnly: true
        },
        startup: {
            mode: 'newTab'
        },
        language: 'en-US',
        defaultBrowser: false,
        performance: {
            mode: 'balanced',
            hardwareAcceleration: true,
            tabSleeping: true,
            preloadPages: true
        },
        downloads: {
            askLocation: true,
            defaultPath: ''
        },
        accessibility: {
            textScale: 100,
            reduceMotion: false,
            highContrast: false
        },
        ai: {
            model: 'gemini-1.5-flash',
            deepThinking: true,
            creativity: 0.7,
            showSidebar: true
        },
        newTab: {
            showShortcuts: true,
            showCards: true,
            showNews: true,
            backgroundImage: null
        }
    });

    const [permissionRequest, setPermissionRequest] = useState<{ permission: string, origin: string } | null>(null);

    const [isUniversalAIOpen, setIsUniversalAIOpen] = useState(false);


    // Listen for global permission requests (from main process)
    useEffect(() => {
        const handleRequest = (_: any, data: { permission: string, origin: string }) => {
            console.log("Permission Requested:", data);

            // 1. Check for persistent permission
            const domain = PermissionManager.getDomain(data.origin);
            const savedState = PermissionManager.getPermission(domain, data.permission as any);

            if (savedState === 'allow') {
                console.log(`[App] Auto-allowing ${ data.permission } for ${ domain }`);
                window.ipcRenderer?.send(`permission-response-${ data.permission }`, { allowed: true, persist: false });
                return;
            } else if (savedState === 'block') {
                console.log(`[App] Auto-blocking ${ data.permission } for ${ domain }`);
                window.ipcRenderer?.send(`permission-response-${ data.permission }`, { allowed: false, persist: false });
                return;
            }

            // 2. Ask user if no preference
            setPermissionRequest(data);
        };

        window.ipcRenderer?.on('request-permission', handleRequest);
        return () => {
            window.ipcRenderer?.removeListener('request-permission', handleRequest);
        };
    }, []);

    const handlePermissionDecision = (allowed: boolean, persist: boolean) => {
        if (!permissionRequest) return;

        // Save if persist is requested
        if (persist) {
            const domain = PermissionManager.getDomain(permissionRequest.origin);
            PermissionManager.setPermission(domain, permissionRequest.permission as any, allowed ? 'allow' : 'block');
        }

        window.ipcRenderer?.send(`permission-response-${ permissionRequest.permission }`, { allowed, persist: false });
        setPermissionRequest(null);
    };

    // Load settings from storage
    useEffect(() => {
        const load = async () => {
            const savedSettings = StorageService.loadSettings();
            if (savedSettings) {
                setSettings(prev => ({
                    ...prev,
                    ...savedSettings,
                    appearance: { ...prev.appearance, ...savedSettings.appearance }
                }));
            }

            const savedHistory = StorageService.loadHistory();
            if (savedHistory) setHistory(savedHistory);

            const savedBookmarks = StorageService.loadBookmarks();
            if (savedBookmarks) setBookmarks(savedBookmarks);
        };
        load();
    }, []);

    // Theme Engine Effect
    useEffect(() => {
        const mode = settings.appearance.mode;
        if (mode === 'dark') document.documentElement.classList.add('dark');
        else if (mode === 'light') document.documentElement.classList.remove('dark');
        else {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
        }

        // Apply accent color theming
        const root = document.documentElement;
        const colors: Record<string, string> = {
            blue: '#2563eb', indigo: '#4f46e5', violet: '#7c3aed',
            teal: '#14b8a6', rose: '#e11d48', sky: '#0284c7',
            midnight: '#1e293b', forest: '#16a34a', sunset: '#ea580c', lavender: '#9333ea'
        };
        root.style.setProperty('--accent-color', colors[settings.appearance.accentColor] || colors.blue);
    }, [settings.appearance.mode, settings.appearance.accentColor]);

    // Universal AI Keyboard Shortcut (Ctrl+Space)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                setIsUniversalAIOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // === CONTINUOUS VISION: Initial Context on Connect ===
    useEffect(() => {
        if (!window.electron?.onGeminiStatus) return;

        const cleanup = window.electron.onGeminiStatus(async (data: any) => {
            if (data.status === 'connected') {
                console.log('[App] 🟢 Gemini Connected - Capturing Initial Context...');

                // Wait for any UI transitions
                await new Promise(r => setTimeout(r, 1000));

                const currentTabId = activeTabId;
                const webview = webviewRefs.current.get(currentTabId);

                if (webview) {
                    try {
                        // 1. Capture Screenshot
                        const image = await webview.capturePage();
                        if (image && !image.isEmpty()) {
                            const screenshotBase64 = image.toDataURL();
                            const base64Data = screenshotBase64.includes(',') ? screenshotBase64.split(',')[1] : screenshotBase64;

                            if (base64Data && base64Data.length > 1000) {
                                window.electron.sendRealtimeInput({
                                    mimeType: 'image/png',
                                    data: base64Data
                                });
                                console.log('[App] 📷 Initial Vision Sent:', Math.round(base64Data.length / 1024), 'KB');
                            }
                        }

                        // 2. Extract DOM Context (Rich Accessibility Tree)
                        const pageInfo = await webview.executeJavaScript(`
                            (function() {
                                const elements = [];
                                let id = 1;
                                // Core interactive selectors
                                const selectors = 'a, button, input, textarea, select, [onclick], [role="button"], [role="link"], [tabindex], video, [contenteditable]';
                                document.querySelectorAll(selectors).forEach(el => {
                                    if (id > 40) return; // Limit to most relevant
                                    const rect = el.getBoundingClientRect();
                                    if (rect.width < 3 || rect.height < 3) return;
                                    if (rect.top > window.innerHeight || rect.bottom < 0) return;
                                    
                                    // Extract primary label
                                    const coreText = el.innerText?.trim().slice(0, 40) || el.value || el.placeholder || el.title || '';
                                    const ariaLabel = el.getAttribute('aria-label') || '';
                                    const role = el.getAttribute('role') || el.tagName.toLowerCase();
                                    
                                    elements.push({
                                        id: id++,
                                        role: role,
                                        label: (coreText + ' ' + ariaLabel).trim().slice(0, 50),
                                        x: Math.round(((rect.left + rect.width/2) / window.innerWidth) * 1000),
                                        y: Math.round(((rect.top + rect.height/2) / window.innerHeight) * 1000)
                                    });
                                });
                                return {
                                    title: document.title,
                                    url: window.location.href,
                                    elements: elements
                                };
                            })()
                        `);

                        // 3. Send Initial DOM Context
                        if (pageInfo?.elements?.length > 0) {
                            const elList = pageInfo.elements.map((e: any) =>
                                "[" + e.id + "] " + e.role + ": \"" + e.label + "\" @(" + e.x + "," + e.y + ")"
                            ).join('\n');
                            const domContext = "[INITIAL VIEW] Page: " + pageInfo.title + "\nURL: " + pageInfo.url + "\nAccessibility Tree:\n" + elList;

                            if ((window.electron as any).sendClientContent) {
                                (window.electron as any).sendClientContent(domContext);
                                console.log('[App] 📄 Initial Accessibility Tree Sent');
                            }
                        }

                    } catch (e) {
                        console.warn('[App] Initial context capture failed:', e);
                    }
                }
            }
        });

        return () => { if (typeof cleanup === 'function') (cleanup as any)(); };
    }, [activeTabId]);






    // Theme Engine Effect
    useEffect(() => {
        const root = document.documentElement;

        // Handle Dark/Light Mode
        const mode = settings.appearance.mode;
        if (mode === 'dark') root.classList.add('dark');
        else if (mode === 'light') root.classList.remove('dark');
        else {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark');
            else root.classList.remove('dark');
        }

        // Handle Color Theme (Chrome-style)
        // We try to use the specific color set in NewTab settings if available, falling back to appearance.accentColor
        // Note: In a real app we should unify these. For now we read from local settings if we can, or just use App settings.
        // Let's rely on settings.appearance.accentColor for now, but map it to our rich THEME_COLORS if possible.

        // Search for matching preset
        const activeColor = settings.appearance.accentColor;
        const theme = THEME_COLORS.find(c => c.value === activeColor);

        if (theme) {
            // Preset found
            root.style.setProperty('--chrome-primary', theme.primary);
            root.style.setProperty('--chrome-secondary', theme.secondary);
            // Also map legacy variables
            root.style.setProperty('--accent-primary', theme.primary);
            root.style.setProperty('--accent-secondary', theme.secondary);
            root.style.setProperty('--accent-soft', `${ theme.primary } 15`);
            root.style.setProperty('--accent', theme.primary);
        } else if (activeColor.startsWith('#')) {
            // Custom Hex
            root.style.setProperty('--chrome-primary', activeColor);
            root.style.setProperty('--chrome-secondary', `${ activeColor } 20`); // 12% opacity roughly
            // Legacy
            root.style.setProperty('--accent-primary', activeColor);
            root.style.setProperty('--accent-secondary', `${ activeColor } 20`);
            root.style.setProperty('--accent-soft', `${ activeColor } 15`);
            root.style.setProperty('--accent', activeColor);
        } else {
            // Fallback default
            const def = THEME_COLORS.find(c => c.value === 'blue')!;
            root.style.setProperty('--chrome-primary', def.primary);
            root.style.setProperty('--chrome-secondary', def.secondary);
            // Legacy
            root.style.setProperty('--accent-primary', def.primary);
            root.style.setProperty('--accent-secondary', def.secondary);
            root.style.setProperty('--accent', def.primary);
        }

    }, [settings.appearance.mode, settings.appearance.accentColor]);

    useEffect(() => {
        StorageService.saveSettings(settings);
    }, [settings]);

    // Helper to get current active tab based on focus (for global address bar sync)
    // Only use secondary pane tab if in a multi-pane layout mode AND secondary is focused
    const currentActiveTabId = (layoutState.mode === 'split' || layoutState.mode === 'grid')
        ? (focusedPane === 'secondary' && secondaryActiveTabId ? secondaryActiveTabId : activeTabId)
        : activeTabId;
    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

    // Tab management
    const handleNewTab = useCallback((url?: string | any, options?: { partition?: string, pinned?: boolean, insertIndex?: number }) => {
        const targetUrl = typeof url === 'string' ? url : 'eterx://newtab';
        const newTab: Tab = {
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            title: targetUrl === 'eterx://newtab' ? 'New Tab' : 'Loading...',
            url: targetUrl,
            internalUrl: targetUrl, // Fix: Ensure internalUrl is set on creation
            isLoading: targetUrl !== 'eterx://newtab',
            history: [targetUrl],
            currentIndex: 0,
            pinned: options?.pinned || false,
            muted: false,
            partition: options?.partition || 'persist:default' // Support incognito or profiles
        };
        setTabs(prev => {
            if (options?.insertIndex !== undefined && options.insertIndex >= 0) {
                const newTabs = [...prev];
                newTabs.splice(options.insertIndex, 0, newTab);
                return newTabs;
            }
            return [...prev, newTab];
        });

        setActiveTabId(newTab.id);

        // Record Action
        if (options?.insertIndex === undefined) {
            // Only record explicit new tabs
            record({ type: 'TAB_OPEN', tab: newTab });
        }
    }, [record]);

    const handleNewTabRight = useCallback((sourceTabId: string) => {
        const idx = tabs.findIndex(t => t.id === sourceTabId);
        if (idx !== -1) {
            handleNewTab('eterx://newtab', { insertIndex: idx + 1 });
        } else {
            handleNewTab();
        }
    }, [tabs, handleNewTab]);

    const handleAddToGroup = useCallback((tabId: string) => {
        const colors = ['#EF5350', '#AB47BC', '#5C6BC0', '#26A69A', '#FFEE58', '#FFA726'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        setTabs(prev => prev.map(t => t.id === tabId ? { ...t, groupId: 'group-' + Date.now(), groupColor: randomColor } : t));
    }, []);

    const handleNewIncognitoTab = useCallback(() => {
        handleNewTab('eterx://newtab', { partition: 'incognito' });
    }, [handleNewTab]);

    // Command Palette Logic
    const commands: CommandAction[] = [
        { id: 'split', label: 'Split View', group: 'Layout', icon: Columns, action: () => setLayoutState(p => ({ ...p, mode: 'split' })) },
        { id: 'single', label: 'Single View', group: 'Layout', icon: Square, action: () => setLayoutState(p => ({ ...p, mode: 'single' })) },
        { id: 'grid', label: 'Grid View', group: 'Layout', icon: Grid3X3, action: () => setLayoutState(p => ({ ...p, mode: 'grid' })) },
        { id: 'new-tab', label: 'New Tab', group: 'Tabs', icon: Plus, shortcut: 'Ctrl+T', action: () => handleNewTab() },
        { id: 'sidebar', label: 'Toggle Sidebar', group: 'General', icon: Sidebar, action: () => setIsSidebarOpen(v => !v) },
        { id: 'settings', label: 'Open Settings', group: 'General', icon: Settings, action: () => handleNewTab('eterx://settings') },

        { id: 'theme-midnight', label: 'Theme: Midnight', group: 'Appearance', icon: Moon, action: () => setSettings(s => ({ ...s, appearance: { ...s.appearance, accentColor: 'midnight' } })) },
        { id: 'theme-forest', label: 'Theme: Forest', group: 'Appearance', icon: Palette, action: () => setSettings(s => ({ ...s, appearance: { ...s.appearance, accentColor: 'forest' } })) },
        { id: 'theme-sunset', label: 'Theme: Sunset', group: 'Appearance', icon: Sun, action: () => setSettings(s => ({ ...s, appearance: { ...s.appearance, accentColor: 'sunset' } })) },
        { id: 'theme-lavender', label: 'Theme: Lavender', group: 'Appearance', icon: Palette, action: () => setSettings(s => ({ ...s, appearance: { ...s.appearance, accentColor: 'lavender' } })) },
    ];

    const handleZoom = useCallback((type: 'in' | 'out' | 'reset') => {
        const tab = tabs.find(t => t.id === activeTabId);
        if (!tab) return;

        let newZoom = tab.zoomLevel || 1.0;
        if (type === 'in') newZoom = Math.min(3.0, newZoom + 0.1);
        else if (type === 'out') newZoom = Math.max(0.25, newZoom - 0.1);
        else newZoom = 1.0;

        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, zoomLevel: newZoom } : t));

        // Apply immediately to the active webview
        const wv = webviewRefs.current.get(activeTabId);
        if (wv) {
            try {
                wv.setZoomFactor(newZoom);
            } catch (e) {
                console.warn('[Zoom] Failed to apply zoom:', e);
            }
        }
    }, [tabs, activeTabId]);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsCommandPaletteOpen((open) => !open);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const handleCloseTab = useCallback((id: string) => {
        setTabs(prev => {
            const tabToClose = prev.find(t => t.id === id);
            if (tabToClose) setClosedTabs(ct => [tabToClose, ...ct.slice(0, 9)]);

            const newTabs = prev.filter(t => t.id !== id);
            if (newTabs.length === 0) {
                setTimeout(() => window.electron?.close?.(), 100);
                return prev;
            }
            if (activeTabId === id) {
                const index = prev.findIndex(t => t.id === id);
                setActiveTabId(newTabs[Math.max(0, index - 1)].id);
            }
            // Exit split view if secondary tab is closed
            if (secondaryActiveTabId === id) {
                setLayoutMode('single');
                setSecondaryActiveTabId(null);
            }
            return newTabs;
        });

        // Record Action (Capture the tab before closing? We need 'prev' state. 
        // We can find it in 'tabs' state, but 'setTabs' is async.
        // Better to record synchronously if possible, or use a ref for current tabs if needed.
        // For MVP, we trust 'tabs' state is fresh enough or find it.)
        const tab = tabs.find(t => t.id === id);
        if (tab) {
            record({ type: 'TAB_CLOSE', tab: tab, index: tabs.indexOf(tab) });
        }

    }, [activeTabId, secondaryActiveTabId, tabs, record]);

    const handleCloseTabWithHistory = useCallback((id: string) => {
        handleCloseTab(id);
    }, [handleCloseTab]);

    const handleReopenClosedTab = useCallback(() => {
        if (closedTabs.length > 0) {
            const [tabToReopen, ...rest] = closedTabs;
            setClosedTabs(rest);
            setTabs(prev => [...prev, tabToReopen]);
            setActiveTabId(tabToReopen.id);
        }
    }, [closedTabs]);

    const handleRestoreTab = useCallback((id: string) => {
        const tab = closedTabs.find(t => t.id === id);
        if (tab) {
            setClosedTabs(ct => ct.filter(t => t.id !== id));
            setTabs(prev => [...prev, tab]);
            setActiveTabId(tab.id);
        }
    }, [closedTabs]);

    // Update handleSwitchTab to support split view focus
    const handleSwitchTab = (id: string) => {
        if (layoutState.mode === 'split') {
            if (focusedPane === 'primary') setActiveTabId(id);
            else setSecondaryActiveTabId(id);
        } else {
            setActiveTabId(id);
        }
    };

    // Split View Handler
    const handleSplitView = useCallback((tabId: string) => {
        if (layoutState.mode === 'single') {
            setLayoutState(prev => ({ ...prev, mode: 'split' }));
            setSecondaryActiveTabId(tabId);
            setFocusedPane('secondary');
        } else {
            // Already split, change secondary tab
            setSecondaryActiveTabId(tabId);
            setFocusedPane('secondary');
        }
    }, [layoutState.mode]);

    // Navigation
    const handleNavigate = useCallback((url: string, targetTabId?: string) => {
        const id = targetTabId || activeTabId;
        console.log(`[App] Navigate called for ${ id }: ${ url } `);

        let finalUrl = url;
        if (!url.startsWith('http') && !url.startsWith('eterx://') && !url.startsWith('file://')) {
            if (url.includes('.') && !url.includes(' ')) {
                finalUrl = 'https://' + url;
            } else {
                finalUrl = `https://www.google.com/search?q=${ encodeURIComponent(url) }`;
            }
        }

        const currentTab = tabs.find(t => t.id === id);

        setTabs(prev => {
            // Record Navigation (Side Effect)
            // Ideally we shouldn't record inside setTabs but we need access to prev state for consistency if we didn't trust 'tabs'
            // But since we are using 'tabs' dependency now, we can record outside.
            return prev.map(t => {
                if (t.id === id) {
                    const newHistory = [...t.history.slice(0, t.currentIndex + 1), finalUrl];
                    return {
                        ...t,
                        url: finalUrl,
                        internalUrl: finalUrl,
                        isLoading: true, // Optimistic loading state
                        history: newHistory,
                        currentIndex: newHistory.length - 1
                    };
                }
                return t;
            });
        });

        if (currentTab && currentTab.url !== finalUrl) {
            record({ type: 'NAVIGATE', tabId: id, fromUrl: currentTab.url, toUrl: finalUrl });
        }

        // OPTIMIZATION: Optimistic Pre-Connect
        try {
            const domain = new URL(finalUrl).origin;
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = domain;
            document.head.appendChild(link);
            setTimeout(() => document.head.removeChild(link), 5000);
        } catch (e) { }

    }, [activeTabId, tabs, record]);

    const handleBack = useCallback((targetTabId?: string | any) => {
        const id = typeof targetTabId === 'string' ? targetTabId : activeTabId;
        const wv = webviewRefs.current.get(id);
        if (wv && wv.canGoBack()) {
            wv.goBack();
        }
    }, [activeTabId]);

    const handleForward = useCallback((targetTabId?: string | any) => {
        const id = typeof targetTabId === 'string' ? targetTabId : activeTabId;
        const wv = webviewRefs.current.get(id);
        if (wv && wv.canGoForward()) {
            wv.goForward();
        }
    }, [activeTabId]);

    const handleReload = useCallback((targetTabId?: string | any) => {
        const id = typeof targetTabId === 'string' ? targetTabId : activeTabId;
        const wv = webviewRefs.current.get(id);
        if (wv) wv.reload();
    }, [activeTabId]);

    // History utility
    const addToHistory = useCallback((url: string, title: string) => {
        if (url.startsWith('eterx://')) return;
        const newItem: HistoryItem = {
            id: Date.now().toString(),
            url,
            title,
            visitedAt: Date.now(),
            timestamp: Date.now()
        };
        setHistory(prev => {
            const updated = [newItem, ...prev.filter(h => h.url !== url)].slice(0, 1000);
            StorageService.saveHistory(updated);
            return updated;
        });
    }, []);

    // --- AGENT & PERMISSION HANDLERS ---

    // --- AGENT HANDLERS ---
    const handleStartAgent = useCallback(async (taskOrTabId?: string) => {
        // If called with string that looks like a task (contains spaces or > 10 chars), treat as task
        // If called with tabId (short string), treat as empty start
        let task = '';
        let tabId = activeTabId;

        if (taskOrTabId && taskOrTabId.length > 10) {
            task = taskOrTabId;
        } else if (taskOrTabId) {
            tabId = taskOrTabId;
        }

        console.log(`[App] 🤖 Starting Agent on tab ${ tabId } for task: "${ task }"`);
        const wv = webviewRefs.current.get(tabId);

        if (wv) {
            try {
                // screenshot arg removed as it was not defined
                await AgentManager.startTask(activeTabId, task, wv);
            } catch (e) {
                console.error('[App] Agent failed to start:', e);
            }
        } else {
            console.error('[App] No webview found for agent execution');
        }
    }, [activeTabId]);

    const handleStopAgent = useCallback(() => {
        AgentManager.stop(activeTabId);
    }, [activeTabId]);



    // --- Context Menu Listeners ---
    useEffect(() => {
        const onTriggerAskEterX = (_: any, text: string) => {
            setIsSidebarOpen(true);
            // We need to inject this into the Sidebar component via state or event
            // For now, let's dispatch a custom event that Sidebar listens to, or update a global store/ref
            // Simplest is to pass it as a prop if Sidebar was controlled, but it receives internal state.
            // Let's use a window event for the Unified Sidebar to pick up.
            window.dispatchEvent(new CustomEvent('ask-eterx-query', { detail: text }));
        };

        const onInspectElement = (_: any, { x, y }: { x: number, y: number }) => {
            const wv = webviewRefs.current.get(activeTabId);
            if (wv) {
                // Determine which webview is active and inspect it
                // Using the method: inspectElement(x, y)
                wv.inspectElement(x, y);
            }
        };

        const onGoBack = () => { if (webviewRefs.current.get(activeTabId)?.canGoBack()) webviewRefs.current.get(activeTabId)?.goBack(); };
        const onGoForward = () => { if (webviewRefs.current.get(activeTabId)?.canGoForward()) webviewRefs.current.get(activeTabId)?.goForward(); };
        const onReloadPage = () => { webviewRefs.current.get(activeTabId)?.reload(); };

        window.ipcRenderer.on('trigger-ask-eterx', onTriggerAskEterX);
        window.ipcRenderer.on('inspect-element', onInspectElement);
        window.ipcRenderer.on('go-back', onGoBack);
        window.ipcRenderer.on('go-forward', onGoForward);
        window.ipcRenderer.on('reload', onReloadPage);

        return () => {
            window.ipcRenderer.removeListener('trigger-ask-eterx', onTriggerAskEterX);
            window.ipcRenderer.removeListener('inspect-element', onInspectElement);
            window.ipcRenderer.removeListener('go-back', onGoBack);
            window.ipcRenderer.removeListener('go-forward', onGoForward);
            window.ipcRenderer.removeListener('reload', onReloadPage);
        };
    }, [activeTabId]); // Re-bind if activeTab changes, though ipcRenderer is global. Better to depend on empty [] or refs.

    // --- Agent Core Listeners (Gemini Live Actions) ---
    useEffect(() => {
        const onAgentOpenTab = (e: CustomEvent) => {
            console.log('[App] Agent opening tab:', e.detail.url);
            handleNewTab(e.detail.url);
        };

        const onAgentScroll = (e: CustomEvent) => {
            const wv = webviewRefs.current.get(activeTabId);
            if (!wv) return;
            const { direction, amount } = e.detail;
            const px = amount || 500;
            const script = `window.scrollBy({ top: ${ direction === 'up' ? -px : px }, behavior: 'smooth' })`;
            wv.executeJavaScript(script).catch(() => { });
        };

        const onAgentReadDOM = async () => {
            const wv = webviewRefs.current.get(activeTabId);
            let content = 'No active tab or page not loaded';
            if (wv) {
                try {
                    // Get only main text content, trimmed
                    content = await wv.executeJavaScript(`
                        (function() {
                            // Simple readout
                            return document.body.innerText.slice(0, 15000) || 'Empty page';
                        })()
                    `);
                } catch (err: any) {
                    content = `Error reading page: ${ err.message }`;
                }
            }
            window.dispatchEvent(new CustomEvent('agent:page-content-response', { detail: { content } }));
        };

        window.addEventListener('agent:open-tab', onAgentOpenTab as EventListener);
        window.addEventListener('agent:scroll', onAgentScroll as EventListener);
        window.addEventListener('agent:read-dom', onAgentReadDOM as EventListener);

        return () => {
            window.removeEventListener('agent:open-tab', onAgentOpenTab as EventListener);
            window.removeEventListener('agent:scroll', onAgentScroll as EventListener);
            window.removeEventListener('agent:read-dom', onAgentReadDOM as EventListener);
        };
    }, [handleNewTab, activeTabId]);

    // Gemini Live Browser Actions (Agentic Control)
    useEffect(() => {
        const handleBrowserAction = async (data: { name: string; args: any; id: string }) => {
            const wv = webviewRefs.current.get(activeTabId);
            console.log('[App] 🎯 Executing Browser Action:', data.name, data.args);

            // Show visual feedback
            // Show visual feedback
            AgentManager.setState(activeTabId, { status: 'acting', message: `Executing ${ data.name }...`, isRunning: true });

            let result = 'ok';

            try {
                switch (data.name) {
                    case 'navigate_to_url': {
                        let url = data.args?.url || '';
                        if (url && !url.includes('://')) url = 'https://' + url;
                        if (url) {
                            console.log(`[App] 🌐 Navigating to: ${ url } (Tab: ${ activeTabId })`);
                            handleNavigate(url, activeTabId);
                            result = `Navigating to ${ url }`;
                        } else {
                            result = 'No URL provided';
                        }
                        break;
                    }
                    case 'open_new_tab': {
                        const url = data.args?.url || 'eterx://newtab';
                        handleNewTab(url.includes('://') ? url : (url ? 'https://' + url : 'eterx://newtab'));
                        result = `Opened new tab: ${ url }`;
                        break;
                    }
                    case 'close_current_tab': {
                        handleCloseTab(activeTabId);
                        result = 'Closed current tab';
                        break;
                    }
                    case 'go_back': {
                        if (wv) { wv.goBack(); result = 'Went back'; }
                        else result = 'No active webview';
                        break;
                    }
                    case 'go_forward': {
                        if (wv) { wv.goForward(); result = 'Went forward'; }
                        else result = 'No active webview';
                        break;
                    }
                    case 'refresh_page': {
                        if (wv) { wv.reload(); result = 'Refreshed page'; }
                        else result = 'No active webview';
                        break;
                    }
                    case 'scroll_page': {
                        if (wv) {
                            const dir = data.args?.direction || 'down';
                            const amt = data.args?.amount || 'half';

                            if (amt === 'max') {
                                // Scroll to top or bottom
                                if (dir === 'up') {
                                    await wv.executeJavaScript(`window.scrollTo({ top: 0, behavior: 'smooth' })`);
                                    result = 'Scrolled to top';
                                } else {
                                    await wv.executeJavaScript(`window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })`);
                                    result = 'Scrolled to bottom';
                                }
                            } else {
                                let px = 400; // default half
                                if (amt === 'little') px = 100;
                                else if (amt === 'full') px = 800;
                                await wv.executeJavaScript(`window.scrollBy({ top: ${ dir === 'up' ? -px : px }, behavior: 'smooth' })`);
                                result = `Scrolled ${ dir } ${ amt }`;
                            }
                        } else result = 'No active webview';
                        break;
                    }
                    case 'search_web': {
                        const query = data.args?.query || '';
                        if (query) {
                            handleNavigate(`https://www.google.com/search?q=${ encodeURIComponent(query) }`, activeTabId);
                            result = `Searching for ${ query }`;
                        } else result = 'No query provided';
                        break;
                    }
                    case 'read_page_content': {
                        if (wv) {
                            result = await wv.executeJavaScript(`document.body.innerText.slice(0, 5000)`);
                        } else result = 'No active webview';
                        break;
                    }
                    case 'click_element': {
                        if (wv && (data.args?.element_id || data.args?.text)) {
                            const targetId = data.args?.element_id;
                            const text = data.args?.text;

                            result = await wv.executeJavaScript(`
                                (function() {
                                    // Mode 1: ID-based Logic (Matches Accessiblity Tree Generation)
                                    if (${ typeof targetId === 'number' }) {
                                        let id = 1;
                                        // EXACT match of selectors from extraction script
                                        const selectors = 'a, button, input, textarea, select, [onclick], [role="button"], [role="link"], [tabindex], video, [contenteditable]';
                                        const query = document.querySelectorAll(selectors);
                                        
                                        for (const el of query) {
                                            if (id > 40) break;
                                            
                                            // Visibility check (Must match extraction script)
                                            const rect = el.getBoundingClientRect();
                                            if (rect.width < 3 || rect.height < 3) continue;
                                            if (rect.top > window.innerHeight || rect.bottom < 0) continue;
                                            
                                            if (id === ${ targetId }) {
                                                el.click();
                                                el.focus();
                                                // Try to trigger common frameworks (React/Vue)
                                                el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                                                el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                                                return 'Clicked element #' + id + ': ' + (el.innerText || el.tagName);
                                            }
                                            id++;
                                        }
                                        return 'Element ID ' + ${ targetId } + ' not found in current view';
                                    }
                                    
                                    // Mode 2: Text-based Fallback
                                    if ('${ text }') {
                                        const search = "${ (text || '').replace(/'/g, "\\'") }".toLowerCase();
                                        const elements = document.querySelectorAll('a, button, [role="button"], input[type="submit"], [onclick]');
                                        for (const el of elements) {
                                            if (el.innerText?.toLowerCase().includes(search) ||
                                                el.getAttribute('aria-label')?.toLowerCase().includes(search)) {
                                                el.click();
                                                return 'Clicked by text: ' + (el.innerText || el.tagName);
                                            }
                                        }
                                        return 'Element text "' + search + '" not found';
                                    }
                                    return 'Invalid arguments';
                                })()
                            `);
                        } else result = 'No element_id or text provided';
                        break;
                    }
                    case 'type_text': {
                        if (wv && data.args?.text) {
                            const text = data.args.text;
                            const submit = data.args?.submit || false;
                            result = await wv.executeJavaScript(`
                                (function() {
                                    const active = document.activeElement;
                                    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
                                        active.value = '${ text.replace(/'/g, "\\'") }';
                                        active.dispatchEvent(new Event('input', { bubbles: true }));
                                        ${ submit ? "active.form?.submit() || active.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));" : '' }
                                        return 'Typed "${ text }" in ' + active.tagName;
                                    }
                                    return 'No input field focused';
                                })()
                            `);
                        } else result = 'No text provided';
                        break;
                    }
                    case 'click_coordinates': {
                        if (wv && typeof data.args?.x === 'number' && typeof data.args?.y === 'number') {
                            const rect = (wv as any).getBoundingClientRect();
                            const x = Math.round((data.args.x / 1000) * rect.width);
                            const y = Math.round((data.args.y / 1000) * rect.height);

                            // Show visual click indicator at screen position
                            const screenX = rect.left + x;
                            const screenY = rect.top + y;
                            const clickId = Date.now().toString();
                            setClickIndicators(prev => [...prev, { id: clickId, x: screenX, y: screenY }]);

                            console.log(`[App] 🖱️ Clicking coordinates: (${ data.args.x }, ${ data.args.y }) -> [${ x }, ${ y }]`);
                            (wv as any).sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
                            (wv as any).sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
                            result = `Clicked coordinates [${ x }, ${ y }]`;
                        } else result = 'Missing coordinates';
                        break;
                    }
                    case 'click_and_type': {
                        if (wv && typeof data.args?.x === 'number' && typeof data.args?.y === 'number' && data.args?.text) {
                            const rect = (wv as any).getBoundingClientRect();
                            const x = Math.round((data.args.x / 1000) * rect.width);
                            const y = Math.round((data.args.y / 1000) * rect.height);
                            const text = data.args.text;
                            const submit = data.args?.submit !== false; // default true

                            // Show visual click indicator
                            const screenX = rect.left + x;
                            const screenY = rect.top + y;
                            const clickId = Date.now().toString();
                            setClickIndicators(prev => [...prev, { id: clickId, x: screenX, y: screenY }]);

                            console.log(`[App] 🖱️⌨️ Click at (${ x }, ${ y }) and type: "${ text }" (submit: ${ submit })`);

                            // 1. Click to focus
                            (wv as any).sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
                            (wv as any).sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });

                            // 2. Small delay for focus
                            await new Promise(r => setTimeout(r, 200));

                            // 3. Type text
                            for (const char of text) {
                                (wv as any).sendInputEvent({ type: 'char', keyCode: char });
                            }

                            // 4. Press Enter if submit
                            if (submit) {
                                await new Promise(r => setTimeout(r, 100));
                                (wv as any).sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
                                (wv as any).sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
                            }

                            result = `Clicked, typed "${ text }"${ submit ? ', pressed Enter' : '' }`;
                        } else result = 'Missing x, y, or text';
                        break;
                    }
                    case 'hover_element': {
                        if (wv && typeof data.args?.x === 'number' && typeof data.args?.y === 'number') {
                            const rect = (wv as any).getBoundingClientRect();
                            const x = Math.round((data.args.x / 1000) * rect.width);
                            const y = Math.round((data.args.y / 1000) * rect.height);

                            console.log(`[App] 🎯 Hovering at (${ x }, ${ y })`);
                            (wv as any).sendInputEvent({ type: 'mouseMove', x, y });

                            // Hold hover for a moment to trigger menus
                            await new Promise(r => setTimeout(r, 300));

                            result = `Hovering at [${ x }, ${ y }]`;
                        } else result = 'Missing coordinates';
                        break;
                    }
                    case 'press_key': {
                        if (wv && data.args?.key) {
                            const keyMap: { [key: string]: string } = {
                                'Enter': 'Enter', 'Return': 'Enter',
                                'Escape': 'Escape', 'Esc': 'Escape',
                                'Tab': 'Tab',
                                'ArrowDown': 'Down', 'Down': 'Down',
                                'ArrowUp': 'Up', 'Up': 'Up',
                                'ArrowLeft': 'Left', 'Left': 'Left',
                                'ArrowRight': 'Right', 'Right': 'Right',
                                'Backspace': 'Backspace',
                                'Delete': 'Delete',
                                'Space': ' '
                            };
                            const key = keyMap[data.args.key] || data.args.key;
                            console.log(`[App] ⌨️ Pressing key: ${ key }`);
                            (wv as any).sendInputEvent({ type: 'keyDown', keyCode: key });
                            (wv as any).sendInputEvent({ type: 'keyUp', keyCode: key });
                            result = `Pressed ${ data.args.key }`;
                        } else result = 'No key provided';
                        break;
                    }
                    case 'wait': {
                        const seconds = Math.min(Math.max(data.args?.seconds || 2, 1), 10);
                        console.log(`[App] ⏳ Waiting ${ seconds }s...`);
                        await new Promise(r => setTimeout(r, seconds * 1000));
                        result = `Waited ${ seconds } seconds`;
                        break;
                    }
                    case 'spoof_gps': {
                        const lat = data.args?.latitude;
                        const lng = data.args?.longitude;

                        if (typeof lat === 'number' && typeof lng === 'number') {
                            await wv.executeJavaScript(`
                                (function() {
                                    const mockGeolocation = {
                                        getCurrentPosition: function(success) {
                                            success({ coords: { latitude: ${ lat }, longitude: ${ lng }, accuracy: 10 }, timestamp: Date.now() });
                                        },
                                        watchPosition: function(success) {
                                            success({ coords: { latitude: ${ lat }, longitude: ${ lng }, accuracy: 10 }, timestamp: Date.now() });
                                            return 123;
                                        }
                                    };
                                    Object.defineProperty(navigator, 'geolocation', { value: mockGeolocation, configurable: true, writable: true });
                                })();
                            `);
                            result = `GPS Spoofed to ${ lat }, ${ lng }`;
                        } else result = 'Invalid coordinates';
                        break;
                    }
                    default:
                        result = `Unknown action: ${ data.name }`;
                }
            } catch (error: any) {
                console.error('[App] Browser Action Error:', error);
                result = `Error: ${ error.message }`;
            }

            // NOTE: Vision is now handled natively at 3 FPS in main.ts
            // We only need to wait slightly for DOM/UI updates before reporting tool completion.
            const isNavigating = data.name === 'navigate_to_url' || data.name === 'search_web' || data.name === 'refresh_page';
            if (isNavigating) {
                await new Promise(r => setTimeout(r, 2000)); // Wait for navigation to stabilize
            } else {
                await new Promise(r => setTimeout(r, 800)); // Wait for UI update
            }

            // Send result back to Main -> Gemini Live
            if (data.id && data.id !== 'unknown' && window.electron.sendBrowserActionResult) {
                // Strong prompt for continuous autonomous execution
                const augmentedResult = `${ result }.[CONTINUE: Screenshot attached.Analyze and execute NEXT action NOW.Do NOT stop.]`;
                console.log('[App] 📤 Sends result:', data.id, augmentedResult);
                window.electron.sendBrowserActionResult({ id: data.id, result: augmentedResult });
            }
        };

        let cleanupBrowserAction: (() => void) | undefined;
        if (window.electron.onGeminiBrowserAction) {
            console.log(`[App] 🔌 Setting up Browser Action Listener(Tab: ${ activeTabId })`);
            // New: Capture the cleanup function (cast to any to bypass outdated TS defs)
            cleanupBrowserAction = (window.electron.onGeminiBrowserAction as any)(handleBrowserAction);
        } else {
            console.error('[App] ⚠️ onGeminiBrowserAction missing in preload!');
        }

        return () => {
            // New: Execute cleanup to remove the specific listener (Safety check)
            if (cleanupBrowserAction && typeof cleanupBrowserAction === 'function') {
                cleanupBrowserAction();
                console.log('[App] 🧹 Cleaned up Browser Action Listener');
            }
        };
    }, [handleNewTab, handleCloseTab, handleNavigate, activeTabId]);

    // Bookmarks
    const toggleBookmark = useCallback((url: string, title: string) => {
        setBookmarks(prev => {
            const exists = prev.find(b => b.url === url);
            let updated: Bookmark[];
            if (exists) {
                updated = prev.filter(b => b.url !== url);
            } else {
                updated = [...prev, { id: Date.now().toString(), url, title, createdAt: Date.now() }];
            }
            StorageService.saveBookmarks(updated);
            return updated;
        });
    }, []);

    // Advanced Tab Actions
    const handleTogglePin = useCallback((tabId: string) => {
        setTabs(prev => {
            const newTabs = prev.map(t => t.id === tabId ? { ...t, pinned: !t.pinned } : t);
            // Sort tabs: Pinned first
            return newTabs.sort((a, b) => (Number(b.pinned) - Number(a.pinned)));
        });
    }, []);

    const handleToggleMute = useCallback((tabId: string) => {
        setTabs(prev => prev.map(t => {
            if (t.id === tabId) {
                const newMutedState = !t.muted;
                const wv = webviewRefs.current.get(tabId);
                if (wv) {
                    try {
                        wv.setAudioMuted(newMutedState);
                    } catch (e) {
                        console.warn("Could not mute webview, it may not be ready:", e);
                    }
                }
                return { ...t, muted: newMutedState };
            }
            return t;
        }));
    }, []);

    // Tab navigation helpers
    const handleNextTab = useCallback(() => {
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTabId(tabs[nextIndex].id);
    }, [tabs, activeTabId]);

    const handlePrevTab = useCallback(() => {
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        setActiveTabId(tabs[prevIndex].id);
    }, [tabs, activeTabId]);

    // Window controls
    const handleMinimize = () => window.electron?.minimize?.();
    const handleMaximize = () => {
        window.electron?.maximize?.();
        setIsMaximized(prev => !prev);
    };
    const handleClose = () => window.electron?.close?.();
    const handleFullscreen = () => window.electron?.fullscreen?.();



    // Webview event handlers are defined INSIDE the Loop now for Closure access

    const handleAskAI = useCallback(async (query: string) => {
        setIsSidebarOpen(true);
        setSidePanelView('ai');

        const activeTab = tabs.find(t => t.id === activeTabId);
        if (!activeTab) return;

        const webview = webviewRefs.current.get(activeTabId);

        const capture = async () => {
            if (webview) {
                try {
                    const image = await webview.capturePage();
                    return image.toDataURL();
                } catch (e) {
                    console.error('Capture failed', e);
                    return '';
                }
            }
            return '';
        };

        const context = {
            url: activeTab.url,
            onCaptureScreen: capture
        };

        // Trigger ChatService (updates AgentManager state observed by UI)
        ChatService.processMessage(activeTabId, query, context);
    }, [activeTabId, tabs]);

    useEffect(() => {
        const handleFocus = () => setIsWindowFocused(true);
        const handleBlur = () => setIsWindowFocused(false);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);

        // Listen for "Ask AI" from Context Menu
        window.ipcRenderer?.on('renderer:ask-ai', (_event: any, query: string) => {
            if (query) {
                handleAskAI(query);
            }
        });

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    // === KEYBOARD SHORTCUTS ===
    const addressBarRef = useRef<HTMLInputElement>(null);

    // --- MEMORY LEAK FIX: Keep latest handleNewTab ref without re-registering IPC ---
    const handleNewTabRef = useRef(handleNewTab);
    useEffect(() => {
        handleNewTabRef.current = handleNewTab;
    }, [handleNewTab]);

    const lastTabRequestRef = useRef<{ url: string, time: number }>({ url: '', time: 0 });

    // Listen for new tab requests from main process EXACTLY ONCE
    useEffect(() => {
        const handleOpenNewTab = (_event: any, url: string) => {
            const now = Date.now();
            const last = lastTabRequestRef.current;
            // Extremely tight 500ms debounce for the exact same URL to prevent
            // Chromium "new window" dual-firing bug on certain links.
            if (last.url === url && (now - last.time) < 500) {
                console.log(`[App] 🚫 Blocked duplicate tab request for: ${ url }`);
                return;
            }
            lastTabRequestRef.current = { url, time: now };

            console.log(`[App] Received app:open-new-tab for: ${ url }`);
            handleNewTabRef.current(url);
        };

        // Aggressively clear old listeners (fixes hot-reload duplication bugs)
        try { window.ipcRenderer?.removeAllListeners('app:open-new-tab'); } catch (e) { }
        window.ipcRenderer?.on('app:open-new-tab', handleOpenNewTab);

        return () => {
            try { window.ipcRenderer?.removeListener('app:open-new-tab', handleOpenNewTab); } catch (e) { }
        };
    }, []);

    // === CONTEXTUAL AI QUERY ===
    const handleContextualQuery = async (query: string): Promise<string> => {
        try {
            const webview = webviewRefs.current.get(activeTabId);
            let screenshot = '';

            if (webview) {
                try {
                    // Capture Page Context
                    const image = await webview.capturePage();
                    screenshot = image.toDataURL();
                } catch (e) {
                    console.error("Failed to capture screenshot:", e);
                }
            }

            // EterX AI System Prompt - Trained for Browser Context
            const eterxPrompt = `You are ** EterX **, an intelligent AI assistant built into the EterX Browser.
You analyze the user's current screen (via screenshot) and answer questions with perfect understanding.

        ** YOUR CAPABILITIES:**
• ** Summarize **: Condense website content, articles, videos into key points
• ** Navigate **: Explain how to use the current page, find buttons, complete actions
• ** Learn **: Break down complex topics shown on screen in simple terms
• ** Extract **: Pull specific data, prices, dates, names from the visible page
• ** Compare **: Help compare options shown(products, plans, features)
• ** Assist **: Guide through forms, signups, checkout processes

        ** RESPONSE RULES:**
            1. Keep answers SHORT(2 - 5 sentences max unless asked for more)
        2. Use bullet points for lists
3. Bold ** key terms ** and important info
    4. If something isn't visible on screen, say so
    5. Be direct - no filler phrases like "Based on the screenshot..."
    6. Use Markdown formatting for readability

        ** USER QUERY:** "${ query }"

Analyze the attached screenshot and respond helpfully.`;

            if (screenshot) {
                return await GeminiService.analyzeImage(eterxPrompt, screenshot.split(',')[1], 'image/png');
            } else {
                // Fix: Handle object return type
                const result = await GeminiService.generateContent(query, eterxPrompt);
                return typeof result === 'string' ? result : result.text;
            }

        } catch (error: any) {
            return "Unable to analyze page context: " + error.message;
        }
    };

    // Keyboard shortcuts handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 1. Contextual AI Trigger (Priority)
            if (e.getModifierState('CapsLock') && e.code === 'Space') {
                e.preventDefault();
                e.stopImmediatePropagation(); // Stop other handlers
                const x = (e as any).clientX || window.innerWidth / 2;
                const y = (e as any).clientY || window.innerHeight / 2;
                setContextualSearch({ isOpen: true, x, y });
                return;
            }

            const ctrl = e.ctrlKey || e.metaKey;
            const shift = e.shiftKey;

            // Ctrl+K - Command Palette (Priority)
            if (ctrl && e.code === 'KeyK') {
                e.preventDefault();
                setIsCommandPaletteOpen(prev => !prev);
                return;
            }
            // Ctrl+Shift+L - Layout Picker
            if (ctrl && shift && e.code === 'KeyL') {
                e.preventDefault();
                setIsLayoutPickerOpen(prev => !prev);
                return;
            }
            // Ctrl+Shift+F - Focus Mode
            if (ctrl && shift && e.code === 'KeyF') {
                e.preventDefault();
                setIsFocusMode(prev => !prev);
                return;
            }
            // Ctrl+Shift+A - Agent Console
            if (ctrl && shift && e.code === 'KeyA') {
                e.preventDefault();
                setIsAgentConsoleOpen(prev => !prev);
                return;
            }

            // Ctrl+T - New Tab
            if (ctrl && e.key === 't' && !shift) {
                e.preventDefault();
                handleNewTab();
            }
            // Ctrl+W - Close Tab
            else if (ctrl && e.key === 'w' && !shift) {
                e.preventDefault();
                handleCloseTabWithHistory(activeTabId);
            }
            // Ctrl+Shift+T - Reopen Closed Tab
            else if (ctrl && shift && e.key === 'T') {
                e.preventDefault();
                handleReopenClosedTab();
            }
            // Ctrl+Tab - Next Tab
            else if (ctrl && e.key === 'Tab' && !shift) {
                e.preventDefault();
                handleNextTab();
            }
            // Ctrl+Shift+Tab - Previous Tab
            else if (ctrl && shift && e.key === 'Tab') {
                e.preventDefault();
                handlePrevTab();
            }
            // Ctrl+L - Focus Address Bar
            else if (ctrl && e.key === 'l') {
                e.preventDefault();
                addressBarRef.current?.focus();
                addressBarRef.current?.select();
            }
            // F5 - Reload
            else if (e.key === 'F5') {
                e.preventDefault();
                handleReload();
            }
            // F11 - Fullscreen
            else if (e.key === 'F11') {
                e.preventDefault();
                handleFullscreen();
            }
            // Ctrl+H - History
            else if (ctrl && e.key === 'h') {
                e.preventDefault();
                setSidePanelView('history');
                setIsSidebarOpen(true);
            }
            // Escape - Close sidebar/menu
            else if (e.key === 'Escape') {
                if (isMenuOpen) setIsMenuOpen(false);
                else if (isLayoutPickerOpen) setIsLayoutPickerOpen(false);
                else if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
                else if (isSidebarOpen && sidePanelView !== 'ai') {
                    setSidePanelView('ai');
                }
            }
            // Ctrl+D - Bookmark (placeholder)
            else if (ctrl && e.key === 'd') {
                e.preventDefault();
                // TODO: Add bookmark functionality
                console.log('[Shortcut] Bookmark page - Coming soon');
            }
            // Alt+Left - Back
            else if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                handleBack();
            }
            // Alt+Right - Forward
            else if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                handleForward();
            }
            // Ctrl+1-9 - Switch to tab by number
            else if (ctrl && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                const tabIndex = parseInt(e.key) - 1;
                if (e.key === '9') {
                    // Ctrl+9 always goes to last tab
                    setActiveTabId(tabs[tabs.length - 1].id);
                } else if (tabIndex < tabs.length) {
                    setActiveTabId(tabs[tabIndex].id);
                }
            }
            else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                setIsShortcutsOpen(prev => !prev);
            }
            // Ctrl+0 - Reset Zoom
            else if (ctrl && e.key === '0') {
                e.preventDefault();
                handleZoom('reset');
            }
            // Ctrl++ / Ctrl+= - Zoom In
            else if (ctrl && (e.key === '+' || e.key === '=')) {
                e.preventDefault();
                handleZoom('in');
            }
            // Ctrl+- - Zoom Out
            else if (ctrl && e.key === '-') {
                e.preventDefault();
                handleZoom('out');
            }
            // Ctrl+Shift+T - Reopen closed tab (Standard Browser Behavior)
            else if (ctrl && shift && e.key.toLowerCase() === 't') {
                e.preventDefault();
                handleReopenClosedTab();
            }
        };


        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        activeTabId, tabs, closedTabs, isMenuOpen, isSidebarOpen, sidePanelView,
        handleNewTab, handleCloseTabWithHistory, handleReopenClosedTab,
        handleNextTab, handlePrevTab, handleReload, handleFullscreen,
        handleBack, handleForward
    ]);




    const handleStartLive = useCallback(() => {
        setIsLiveAgentOpen(true);
        setIsSidebarOpen(false);
        setIsUniversalAIOpen(false);
    }, []);


    // Helper to render tab content (Webview or Internal Page)
    // ⚡ visibility:hidden stops GPU painting (saves resources)
    // ⚡ backgroundThrottling:false in main.ts keeps renderer alive for media
    const renderTabContent = (tab: Tab, style?: React.CSSProperties) => {
        return (
            <>
                {tab.url.startsWith('eterx://') ? (
                    (() => {
                        const url = tab.url;
                        if (url === 'eterx://settings' || url.startsWith('eterx://settings/')) {
                            return <SettingsPage onNavigate={handleNavigate} settings={settings} onSettingsChange={setSettings} />;
                        }
                        if (url === 'eterx://passwords') return <PasswordManager onNavigate={handleNavigate} />;
                        if (url === 'eterx://history') return <HistoryPage onNavigate={handleNavigate} history={history} />;
                        if (url === 'eterx://downloads') return <DownloadsPage onNavigate={handleNavigate} />;
                        if (url === 'eterx://shortcuts') return <ShortcutsPage onNavigate={handleNavigate} />;
                        if (url === 'eterx://agent' || url.startsWith('eterx://agent')) {
                            return <AssistantTab
                                onStartAgent={handleStartAgent}
                                onNavigate={handleNavigate}
                                isAgentRunning={isAgentRunning}
                                agentStatus={agentStatus}
                                onStopAgent={handleStopAgent}
                                currentTabTitle={tab.title}
                            />;
                        }
                        if (url === 'eterx://workspace' || url.startsWith('eterx://workspace')) {
                            return <EterXUI
                                onNavigate={handleNavigate}
                                onOpenNewTab={(u) => handleNewTab(u)}
                                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                            />;
                        }
                        return (
                            <NewTab
                                onNavigate={handleNavigate}
                                onStartAgent={handleStartAgent}
                                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                                onOpenNewTab={(url) => handleNewTab(url)}
                                themeSettings={{
                                    mode: settings.appearance.mode as any,
                                    color: settings.appearance.accentColor,
                                    showShortcuts: settings.newTab?.showShortcuts ?? true,
                                    showCards: settings.newTab?.showCards ?? true,
                                    showNews: settings.newTab?.showNews ?? true,
                                    backgroundImage: settings.newTab?.backgroundImage,
                                    onOpenCustomize: () => setIsCustomizeOpen(true)
                                }}
                                onUpdateTheme={(newTheme) => {
                                    setSettings(prev => ({
                                        ...prev,
                                        appearance: {
                                            ...prev.appearance,
                                            mode: newTheme.mode === 'device' ? 'system' : newTheme.mode,
                                            accentColor: newTheme.color as any
                                        },
                                        newTab: {
                                            showShortcuts: newTheme.showShortcuts,
                                            showCards: newTheme.showCards,
                                            showNews: newTheme.showNews ?? prev.newTab?.showNews ?? true,
                                            backgroundImage: newTheme.backgroundImage || null
                                        }
                                    }));
                                }}
                                userName={user?.name || 'Harshil'}
                            />
                        );
                    })()
                ) : (
                    <div key={tab.id} className="relative w-full h-full" style={style}>
                        {/* Agent status now shown in SmartSidebar */}

                        <WebView
                            ref={(el: any) => {
                                if (el) {
                                    webviewRefs.current.set(tab.id, el);

                                    // Event listeners must be attached safely to avoid duplication if re-rendered
                                    // A simple way is to remove old ones or check a flag, but for now we re-attach
                                    // Note: In React, ref callback runs when node attaches.

                                    const onNewWindow = (e: any) => handleNewTab(e.url);
                                    const onTitleUpdated = (e: any) => {
                                        setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, title: e.title || t.title } : t));
                                        if (tab.id === activeTabIdRef.current) {
                                            const currentTab = tabsRef.current.find(t => t.id === tab.id);
                                            const url = currentTab?.url || tab.url;
                                            addToHistory(url, e.title);
                                            // 🧠 Deep Track into Algorithm
                                            if (!url.startsWith('eterx://') && !url.startsWith('chrome://')) {
                                                QuickLinksAlgorithm.getInstance().recordVisit(url, e.title, currentTab?.favicon);
                                            }
                                        }
                                    };
                                    const onDidStartLoading = () => setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, isLoading: true } : t));
                                    const onDidStopLoading = () => setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, isLoading: false } : t));
                                    const onFaviconUpdated = (e: any) => {
                                        if (e.favicons && e.favicons.length > 0) {
                                            // 🌟 QUALITY BOOST: Choose the highest resolution favicon if multiple exist
                                            // The array is often sorted smallest to largest, or the last items are apple-touch-icons
                                            const bestFavicon = e.favicons[e.favicons.length - 1];
                                            setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, favicon: bestFavicon } : t));

                                            // Deep update the algorithm with the exact highest-res favicon we just found
                                            const currentTab = tabsRef.current.find(t => t.id === tab.id);
                                            const url = currentTab?.url || tab.url;
                                            if (!url.startsWith('eterx://') && !url.startsWith('chrome://')) {
                                                QuickLinksAlgorithm.getInstance().recordVisit(url, currentTab?.title || tab.title, bestFavicon);
                                            }
                                        }
                                    };

                                    const onNavigateState = (e: any) => {
                                        setTabs(prev => prev.map(t => {
                                            if (t.id === tab.id) {
                                                const currentUrl = t.history[t.currentIndex];
                                                if (currentUrl === e.url) {
                                                    return { ...t, url: e.url, isLoading: false, canGoBack: el.canGoBack(), canGoForward: el.canGoForward() };
                                                }

                                                // Detect Back Navigation
                                                if (t.currentIndex > 0 && t.history[t.currentIndex - 1] === e.url) {
                                                    return { ...t, url: e.url, currentIndex: t.currentIndex - 1, isLoading: false, canGoBack: el.canGoBack(), canGoForward: el.canGoForward() };
                                                }

                                                // Detect Forward Navigation
                                                if (t.currentIndex < t.history.length - 1 && t.history[t.currentIndex + 1] === e.url) {
                                                    return { ...t, url: e.url, currentIndex: t.currentIndex + 1, isLoading: false, canGoBack: el.canGoBack(), canGoForward: el.canGoForward() };
                                                }

                                                // New Navigation (Wipes forward history)
                                                const newHistory = [...t.history.slice(0, t.currentIndex + 1), e.url];
                                                return {
                                                    ...t,
                                                    url: e.url,
                                                    history: newHistory,
                                                    currentIndex: newHistory.length - 1,
                                                    isLoading: false,
                                                    canGoBack: el.canGoBack(),
                                                    canGoForward: el.canGoForward()
                                                };
                                            }
                                            return t;
                                        }));
                                    };

                                    // Simplified for stability
                                    // Use a custom property to track if listeners have been attached
                                    if (!el._hasEventListenersAttached) {
                                        el.addEventListener('page-title-updated', onTitleUpdated);
                                        el.addEventListener('did-start-loading', onDidStartLoading);
                                        el.addEventListener('did-stop-loading', onDidStopLoading);
                                        el.addEventListener('page-favicon-updated', onFaviconUpdated);
                                        el.addEventListener('did-navigate', onNavigateState);
                                        el.addEventListener('did-navigate-in-page', onNavigateState);
                                        el.addEventListener('media-started-playing', () => setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, isPlaying: true } : t)));
                                        el.addEventListener('media-paused', () => setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, isPlaying: false } : t)));

                                        el._hasEventListenersAttached = true;
                                    }
                                }
                            }}
                            src={tab.internalUrl || tab.url}
                            className="w-full h-full"
                            useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                            // Use default session (undefined) for normal tabs to share cookies with main process.
                            // Use memory-only partition for incognito.
                            partition={tab.isIncognito ? `session: incognito - ${ tab.id } ` : undefined}
                            allowpopups="true"
                            plugins="true"
                            disablewebsecurity="true"
                            webpreferences="contextIsolation=yes, nodeIntegration=no, backgroundThrottling=no, spellcheck=no"
                            onDomReady={() => {
                                const wv = webviewRefs.current.get(tab.id);
                                if (wv) {
                                    try {
                                        const url = wv.getURL();
                                        const title = wv.getTitle();

                                        // === SECURITY: REMOVE WEBDRIVER FLAG ===
                                        // This helps bypass "This browser is not secure"
                                        wv.executeJavaScript(`
    try {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
    } catch (e) { }
    `).catch(() => { });


                                        setTabs(prev => prev.map(t => t.id === tab.id ? {
                                            ...t,
                                            title: title || t.title,
                                            url: url
                                        } : t));

                                        // Update history if needed
                                        if (tab.id === activeTabIdRef.current) {
                                            const currentTab = tabsRef.current.find(t => t.id === tab.id);
                                            addToHistory(url, title || currentTab?.title || tab.title);
                                        }

                                        // Apply Zoom Factor
                                        if (tab.zoomLevel) {
                                            wv.setZoomFactor(tab.zoomLevel);
                                        }

                                    } catch (e) {
                                        console.warn("Failed to sync onDomReady", e);
                                    }
                                }
                            }}
                            onContextMenu={(e: any) => {
                                window.ipcRenderer.send('show-context-menu', e.params);
                            }}
                        />

                    </div>
                )}
            </>
        );
    };

    return (
        <ErrorBoundary>
            <div className={`flex h-screen w-screen overflow-hidden text-gray-900 ${ isWindowFocused ? '' : 'opacity-95' } `}>
                {/* Permission Prompt Overlay */}


                <div className="flex-1 flex flex-col relative overflow-hidden">

                    {/* CONTROL BAR (Unified with Tab Bar logic for space saving, but distinct visual separation) */}
                    <AnimatePresence>
                        {!isFocusMode && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="flex flex-col w-full z-50 glass-toolbar text-gray-900"
                                style={{ backgroundColor: '#f2f0ff' }}
                            >

                                {/* Top Row: Window Controls + Tabs (Chrome Style: 44px height) */}
                                <div className="flex items-end w-full h-[44px] pl-2 pr-0 title-bar-drag z-50 relative">
                                    {/* Tab Search Trigger (Moved to Start) */}
                                    <button
                                        onClick={() => setIsTabSearchOpen(!isTabSearchOpen)}
                                        className={`mr-0.5 mb-1.5 w-8 h-8 rounded-full flex items-center justify-center transition-all ${ isTabSearchOpen ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-black/5 text-gray-700' } `}
                                    >
                                        <ChevronDown size={16} strokeWidth={2.5} />
                                    </button>
                                    <TabSearchMenu
                                        isOpen={isTabSearchOpen}
                                        onClose={() => setIsTabSearchOpen(false)}
                                        tabs={tabs}
                                        closedTabs={closedTabs}
                                        onSwitchTab={handleSwitchTab}
                                        onRestoreTab={handleRestoreTab}
                                    />

                                    <TabBar
                                        tabs={tabs}
                                        activeTabId={activeTabId}
                                        onSwitchTab={handleSwitchTab}
                                        onCloseTab={handleCloseTab}
                                        onNewTab={handleNewTab}
                                        onSplitView={handleSplitView}
                                        onTogglePin={handleTogglePin}
                                        onToggleMute={handleToggleMute}
                                        onFloatTab={() => setLayoutMode('free')}
                                        onNewTabRight={handleNewTabRight}
                                        onAddToGroup={handleAddToGroup}
                                        onMoveToWindow={(id) => console.log('Move to window placeholder', id)}
                                        onReorderTabs={setTabs}
                                    />

                                    {/* Window Controls - Modern Windows Style */}
                                    <div className="flex items-center h-full gap-0 no-drag ml-auto pr-1">
                                        <button onClick={handleMinimize} className="window-btn flex items-center justify-center hover:bg-black/5 w-10 h-full transition-colors text-gray-600">
                                            <Minus size={14} strokeWidth={2} />
                                        </button>
                                        <button onClick={handleMaximize} className="window-btn flex items-center justify-center hover:bg-black/5 w-10 h-full transition-colors text-gray-600">
                                            {isMaximized ? <Maximize2 size={13} strokeWidth={2} /> : <Square size={12} strokeWidth={2} />}
                                        </button>
                                        <button onClick={handleClose} className="window-btn flex items-center justify-center hover:bg-red-500 hover:text-white w-10 h-full transition-colors text-gray-600">
                                            <X size={14} strokeWidth={2} />
                                        </button>
                                    </div>
                                </div>

                                {/* Navigation Actions Row - Curved Island Style (Connected to Tabs) */}
                                <div className="mx-1.5 mb-1.5 h-[48px] px-3 flex items-center gap-3 no-drag z-40 relative shadow-[0_4px_12px_rgba(0,0,0,0.05)] bg-white rounded-b-2xl rounded-t-none">

                                    {/* 2. Navigation Controls & Address Bar */}
                                    <AddressBar
                                        url={activeTab.url}
                                        onNavigate={(url) => handleNavigate(url, activeTab.id)}
                                        onToggleSidebar={() => {
                                            if (isSidebarOpen && sidePanelView === 'ai') {
                                                setIsSidebarOpen(false);
                                            } else {
                                                setSidePanelView('ai');
                                                setIsSidebarOpen(true);
                                            }
                                        }}
                                        onToggleSmartSidebar={() => setIsUniversalAIOpen(!isUniversalAIOpen)}
                                        isSidebarOpen={isSidebarOpen && sidePanelView === 'ai'} // Reflect AIControlBar state
                                        isSmartSidebarOpen={isUniversalAIOpen}
                                        canGoBack={activeTab.canGoBack ?? (activeTab.currentIndex > 0)}
                                        canGoForward={activeTab.canGoForward ?? (activeTab.currentIndex < activeTab.history.length - 1)}
                                        onBack={handleBack}
                                        onForward={handleForward}
                                        onReload={handleReload}
                                        onNewTab={handleNewTab}
                                        onOpenSettings={() => { setSidePanelView('settings'); setIsSidebarOpen(true); }}
                                        onOpenHistory={() => setSidePanelView(sidePanelView === 'history' ? null : 'history')}
                                        onOpenServices={() => { }} // Placeholder
                                        onOpenSpreadsheet={() => { }} // Placeholder
                                        onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
                                        onAskAI={handleAskAI}
                                        onProfileClick={() => setIsProfileOpen(!isProfileOpen)}
                                        searchEngine={settings.searchEngine}
                                        showHomeButton={settings.appearance.showHomeButton}
                                        isBookmarked={bookmarks.some(b => b.url === activeTab.url)}
                                        onToggleBookmark={() => toggleBookmark(activeTab.url, activeTab.title)}
                                        onStartLive={handleStartLive}
                                    />
                                </div>

                            </motion.div>
                        )}
                    </AnimatePresence>



                    {/* Content Area: Layout + Sidebar side by side */}
                    <div className="flex-1 flex flex-row relative overflow-hidden" style={{ backgroundColor: '#f2f0ff' }}>
                        {/* Main Content - LayoutEngine - Curved Island Style */}
                        <div className="flex-1 relative overflow-hidden flex flex-col mx-1 mb-1 rounded-2xl shadow-sm bg-transparent">
                            <LayoutEngine
                                tabs={tabs}
                                activeTabId={activeTabId}
                                secondaryActiveTabId={secondaryActiveTabId}
                                layoutState={layoutState}
                                onLayoutChange={setLayoutState}
                                onTabSelect={(id, pane) => {
                                    if (pane === 'secondary') {
                                        setSecondaryActiveTabId(id);
                                        setFocusedPane('secondary');
                                    } else {
                                        setActiveTabId(id);
                                        setFocusedPane('primary');
                                    }
                                }}
                                onTabClose={handleCloseTab}
                                onTabDuplicate={(id) => {
                                    const tab = tabs.find(t => t.id === id);
                                    if (tab) handleNewTab(tab.url);
                                }}
                                focusedPane={focusedPane}
                                onFocusPane={setFocusedPane}
                                onSwapPanes={() => {
                                    if (secondaryActiveTabId) {
                                        const temp = activeTabId;
                                        setActiveTabId(secondaryActiveTabId);
                                        setSecondaryActiveTabId(temp);
                                    }
                                }}
                                onNewTab={() => handleNewTab()}
                                onNavigate={handleNavigate}
                                onBack={handleBack}
                                onForward={handleForward}
                                onReload={handleReload}
                                renderWebview={(tab, style) => {
                                    return renderTabContent(tab, style);
                                }}
                            />

                            {/* --- AI CONTROL BAR (Centered in Content Area) --- */}
                            <AnimatePresence>
                                {isSidebarOpen && sidePanelView === 'ai' && (
                                    <AIControlBar
                                        onClose={() => setIsSidebarOpen(false)}
                                        onToggleMute={() => { }}
                                        onSpeechResult={(text) => handleAskAI(text)}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                        {/* Sidebars stay inside this flex row */}
                        {/* Floating Modern Sidebar */}
                        <AnimatePresence>
                            {isUniversalAIOpen && (
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: 420 }}
                                    exit={{ width: 0 }}
                                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} // "Apple-style" smooth ease-out
                                    className="z-[60] flex flex-col flex-shrink-0 mb-1 mr-1"
                                >
                                    <div className="h-full w-full bg-white border-l border-gray-200 shadow-2xl rounded-2xl overflow-hidden">
                                        <SmartSidebar
                                            isOpen={isUniversalAIOpen}
                                            onClose={() => setIsUniversalAIOpen(false)}
                                            activeTabUrl={tabs.find(t => t.id === activeTabId)?.url}
                                            tabId={Number(activeTabId)}
                                            onNavigate={(url) => handleNewTab(url)}
                                            onCaptureScreen={async () => {
                                                const wv = webviewRefs.current.get(activeTabId);
                                                if (wv) {
                                                    try {
                                                        const image = await wv.capturePage();
                                                        return image.toDataURL();
                                                    } catch (e) {
                                                        console.error('[App] Screenshot capture failed:', e);
                                                        return '';
                                                    }
                                                }
                                                return '';
                                            }}
                                            onStartLive={() => {
                                                setIsUniversalAIOpen(false); // Close sidebar
                                                setIsLiveAgentOpen(true);    // Open Live Overlay
                                            }}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>


                        <AnimatePresence>
                            {isProfileOpen && (
                                <div className="absolute top-16 right-4 z-[200]">
                                    <ProfileMenu
                                        isOpen={isProfileOpen}
                                        onClose={() => setIsProfileOpen(false)}
                                        user={user ? { name: user.name || 'User', email: user.email || 'user@example.com', avatar: user.avatar || '' } : { name: 'User', email: 'user@example.com', avatar: '' }}
                                        onSignOut={() => setUser(null)}
                                        onManageAccount={() => handleNewTab('https://myaccount.google.com/')}
                                        onSignIn={() => {
                                            // Mock Google Auth Success
                                            setUser({
                                                name: 'Harshil Bains',
                                                email: 'harshil@example.com',
                                                avatar: 'https://ui-avatars.com/api/?name=Harshil+Bains&background=0D8ABC&color=fff'
                                            });
                                            setIsProfileOpen(false);
                                        }}
                                    />
                                </div>
                            )}
                        </AnimatePresence>



                        {/* Tab Search Menu */}
                        <TabSearchMenu
                            isOpen={isTabSearchOpen}
                            onClose={() => setIsTabSearchOpen(false)}
                            tabs={tabs}
                            closedTabs={closedTabs}
                            onSwitchTab={setActiveTabId}
                            onRestoreTab={(id) => {
                                const tab = closedTabs.find(t => t.id === id);
                                if (tab) {
                                    setTabs(prev => [...prev, tab]);
                                    setActiveTabId(tab.id);
                                    setClosedTabs(prev => prev.filter(t => t.id !== id));
                                }
                            }}
                        />

                        <AnimatePresence>
                            {isSidebarOpen && sidePanelView && sidePanelView !== 'ai' && (
                                <motion.div
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 400, opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    className="h-full border-l border-gray-100 bg-white z-[60] flex flex-col shadow-2xl flex-shrink-0"
                                >
                                    {sidePanelView === 'settings' && (
                                        <SettingsPanel
                                            isOpen={true}
                                            onClose={() => setIsSidebarOpen(false)}
                                        />
                                    )}
                                    {sidePanelView === 'history' && (
                                        <HistoryPanel
                                            isOpen={true}
                                            onClose={() => setIsSidebarOpen(false)}
                                            onNavigate={handleNavigate}
                                            history={history}
                                        />
                                    )}
                                    {sidePanelView === 'bookmarks' && (
                                        <div className="p-4">
                                            <h2 className="text-lg font-bold">Bookmarks</h2>
                                            <p className="text-gray-500">Coming soon</p>
                                            <button onClick={() => setIsSidebarOpen(false)}>Close</button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Global Overlays & Modals */}
                    <div className="fixed inset-0 pointer-events-none z-[9999]">
                        {/* Comet Floating Stop Button */}
                        <AnimatePresence>
                            {isAgentRunning && (
                                <motion.button
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    onClick={() => handleStopAgent()}
                                    className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[200] pointer-events-auto flex items-center gap-3 px-6 py-3 bg-[#1A1A1A] text-white rounded-full shadow-2xl hover:bg-black transition-all hover:scale-105 active:scale-95 border border-gray-800"
                                >
                                    <div className="w-2.5 h-2.5 bg-white rounded-sm animate-pulse" />
                                    <span className="font-medium text-[15px] tracking-wide font-sans">Stop Comet Assistant</span>
                                </motion.button>
                            )}
                        </AnimatePresence>

                        {permissionRequest && (
                            <div className="pointer-events-auto">
                                <PermissionPrompt
                                    origin={permissionRequest.origin}
                                    permission={permissionRequest.permission}
                                    onAllow={(persist) => handlePermissionDecision(true, persist)}
                                    onBlock={(persist) => handlePermissionDecision(false, persist)}
                                    onClose={() => setPermissionRequest(null)}
                                />
                            </div>
                        )}
                    </div>


                    <BrowserMenu
                        isOpen={isMenuOpen}
                        onClose={() => setIsMenuOpen(false)}
                        onNewTab={() => handleNewTab('eterx://newtab')}
                        onNewIncognitoTab={handleNewIncognitoTab}
                        onNewWindow={() => handleNewTab(activeTab.url)}
                        onHistory={() => {
                            handleNewTab('eterx://history');
                            setIsMenuOpen(false);
                        }}
                        onDownloads={() => {
                            handleNewTab('eterx://downloads');
                            setIsMenuOpen(false);
                        }}
                        onBookmarks={() => {
                            // Placeholder for now, or open bookmarks manager if it existed
                            setSidePanelView('bookmarks'); // Keep side panel for simple bookmarks? Or tab?
                            // Chrome opens bookmark manager in tab.
                            // But I don't have eterx://bookmarks implemented likely.
                            // I'll leave empty or alert.
                        }}
                        onSettings={() => {
                            handleNewTab('eterx://settings');
                            setIsMenuOpen(false);
                        }}
                        onPrint={() => {
                            window.print();
                            setIsMenuOpen(false);
                        }}
                        onExtensions={() => {
                            // handleNewTab('eterx://extensions');
                            setIsMenuOpen(false);
                        }}
                        onToggleTheme={() => setSettings(s => ({ ...s, appearance: { ...s.appearance, mode: s.appearance.mode === 'dark' ? 'light' : 'dark' } }))}
                        theme={settings.appearance.mode}
                    />

                    <LayoutPicker
                        isOpen={isLayoutPickerOpen}
                        onClose={() => setIsLayoutPickerOpen(false)}
                        activeMode={layoutState.mode}
                        onSelectMode={(mode) => setLayoutState({ ...layoutState, mode })}
                    />

                    <CommandPalette
                        isOpen={isCommandPaletteOpen}
                        onClose={() => setIsCommandPaletteOpen(false)}
                        actions={commands}
                    />

                    {/* Shortcut Manager Modal */}
                    <ShortcutManager
                        isOpen={isShortcutManagerOpen}
                        onClose={() => setIsShortcutManagerOpen(false)}
                    />

                    {/* Help Guide Modal */}
                    <HelpGuide
                        isOpen={isHelpGuideOpen}
                        onClose={() => setIsHelpGuideOpen(false)}
                    />

                    {/* Tab Preview on Hover */}
                    {
                        tabPreview && (
                            <TabPreview
                                tabId={tabPreview.tabId}
                                tabTitle={tabs.find(t => t.id === tabPreview.tabId)?.title || ''}
                                tabUrl={tabs.find(t => t.id === tabPreview.tabId)?.url || ''}
                                isVisible={true}
                                position={{ x: tabPreview.x, y: tabPreview.y }}
                                webviewRef={webviewRefs.current.get(tabPreview.tabId)}
                                onClose={() => setTabPreview(null)}
                            />
                        )
                    }

                </div>
                {/* Agent Visual Overlay - The "Soul" of the browser */}
                <AgentVisualOverlay
                    isActive={activeAgentState?.isRunning || false}
                    status={activeAgentState?.status || 'idle'}
                    statusMessage={activeAgentState?.message || ''}
                    metadata={activeAgentState?.metadata}
                    currentURL={tabs.find(t => t.id === activeTabId)?.url}
                    onStop={() => AgentManager.complete(activeTabId, 'Stopped by user')}
                />

                {/* GEMINI LIVE AGENT OVERLAY */}
                <LiveAgentOverlay
                    isOpen={isLiveAgentOpen}
                    onClose={() => setIsLiveAgentOpen(false)}
                    onCaptureScreen={async () => {
                        const webview = webviewRefs.current.get(activeTabId);
                        if (webview) {
                            try {
                                const image = await webview.capturePage();
                                return image.toDataURL();
                            } catch (e) {
                                console.error('[LiveAgent] Screenshot capture failed:', e);
                                return '';
                            }
                        }
                        return '';
                    }}
                />

                {/* Agent Console Panel */}
                <div className="absolute bottom-0 left-0 right-0 z-[60]">
                    <AgentConsole
                        tabId={activeTabId}
                        isOpen={isAgentConsoleOpen}
                        onClose={() => setIsAgentConsoleOpen(false)}
                    />
                </div>
                {/* Customize Panel */}
                <CustomizePanel
                    isOpen={isCustomizeOpen}
                    onClose={() => setIsCustomizeOpen(false)}
                    settings={{
                        mode: settings.appearance.mode as any,
                        color: settings.appearance.accentColor,
                        showShortcuts: settings.newTab?.showShortcuts ?? true,
                        showCards: settings.newTab?.showCards ?? true,
                        backgroundImage: settings.newTab?.backgroundImage
                    }}
                    onUpdateSettings={(newTheme) => {
                        setSettings(prev => ({
                            ...prev,
                            appearance: {
                                ...prev.appearance,
                                mode: newTheme.mode === 'device' ? 'system' : newTheme.mode,
                                accentColor: newTheme.color as any
                            },
                            newTab: {
                                showShortcuts: newTheme.showShortcuts,
                                showCards: newTheme.showCards,
                                showNews: newTheme.showNews ?? true,
                                backgroundImage: newTheme.backgroundImage || null
                            }
                        }));
                    }}
                />

                {/* Agentic Visual Feedback */}
                <AgenticFrame isActive={activeAgentState?.isRunning || false} status={activeAgentState?.status || ''} />
                <AgentStatusPill
                    status={activeAgentState?.status || 'idle'}
                    isWorking={activeAgentState?.isRunning || false}
                    onStop={() => handleStopAgent()}
                    onTakeControl={() => handleStopAgent()}
                />
                {clickIndicators.map(indicator => (
                    <ClickIndicator
                        key={indicator.id}
                        x={indicator.x}
                        y={indicator.y}
                        onComplete={() => setClickIndicators(prev => prev.filter(c => c.id !== indicator.id))}
                    />
                ))}
            </div >
        </ErrorBoundary >
    );
};

export default App;