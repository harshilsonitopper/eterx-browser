import React, { useState, useMemo } from 'react';
import {
    Search, User, Key, Shield, HardDrive, Sparkles, Layout, Globe, Power, Languages, Download, Accessibility, Cpu, ChevronRight, Moon, Sun, Monitor, CheckCircle2, Zap, BrainCircuit, Palette, RotateCcw, Eye, Lock, Bell, Wifi, Sliders, Clock, FolderOpen, Type, Volume2, Keyboard, MousePointer, RefreshCw, HelpCircle, Info, ArrowLeft, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface UserSettings {
    searchEngine: 'google' | 'bing' | 'yahoo' | 'duckduckgo' | 'yandex';
    appearance: {
        mode: 'light' | 'dark' | 'system';
        browserMode: 'free' | 'stock';
        showHomeButton: boolean;
        showBookmarksBar: boolean;
        sidePanelPosition: 'left' | 'right';
        tabHoverPreview: boolean;
        accentColor: 'blue' | 'indigo' | 'violet' | 'teal' | 'rose' | 'sky' | 'midnight' | 'forest' | 'sunset' | 'lavender';
        uiDensity: 'compact' | 'comfortable' | 'spacious';
        animationSpeed: 'fast' | 'normal' | 'slow' | 'off';
    };
    privacy: {
        clearDataOnExit: boolean;
        adPrivacy: boolean;
        doNotTrack: boolean;
        blockThirdPartyCookies: boolean;
        httpsOnly: boolean;
    };
    performance: {
        mode: 'balanced' | 'highPerformance' | 'batterySaver';
        hardwareAcceleration: boolean;
        tabSleeping: boolean;
        preloadPages: boolean;
    };
    startup: {
        mode: 'newTab' | 'continue' | 'urls';
    };
    downloads: {
        askLocation: boolean;
        defaultPath: string;
    };
    language: string;
    ai: {
        model: 'gemini-1.5-flash' | 'gemini-1.5-pro';
        deepThinking: boolean;
        creativity: number;
        showSidebar: boolean;
    };
    accessibility: {
        textScale: number;
        reduceMotion: boolean;
        highContrast: boolean;
    };
    defaultBrowser: boolean;
    newTab: {
        showShortcuts: boolean;
        showCards: boolean;
        showNews: boolean;
        backgroundImage: string | null;
    };
}

interface SettingsPageProps {
    onNavigate?: (url: string) => void;
    settings: UserSettings;
    onSettingsChange: (newSettings: UserSettings) => void;
}

// ======================== COMPONENTS ========================

const Card = ({ title, children, description, className = "" }: { title?: string, children: React.ReactNode, description?: string, className?: string }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${ className }`}>
        {title && (
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-semibold text-gray-800 text-[15px]">{title}</h3>
                {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
            </div>
        )}
        <div className="p-6">{children}</div>
    </div>
);

const Toggle = ({ checked, onChange, label, description }: { checked: boolean, onChange: (v: boolean) => void, label: string, description?: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 group cursor-pointer" onClick={() => onChange(!checked)}>
        <div className="pr-4">
            <span className="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors">{label}</span>
            {description && <p className="text-xs text-gray-500 mt-0.5 max-w-md">{description}</p>}
        </div>
        <div className={`w-11 h-6 rounded-full relative transition-all duration-200 shrink-0 ${ checked ? 'bg-blue-500' : 'bg-gray-200' }`}>
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 shadow ${ checked ? 'translate-x-6' : 'translate-x-1' }`} />
        </div>
    </div>
);

const SettingRow = ({ icon: Icon, label, description, children }: { icon?: React.ElementType, label: string, description?: string, children: React.ReactNode }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
        <div className="flex items-center gap-4">
            {Icon && <Icon size={20} className="text-gray-400" />}
            <div>
                <div className="text-sm font-medium text-gray-800">{label}</div>
                {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
            </div>
        </div>
        <div className="flex items-center gap-2">{children}</div>
    </div>
);

const ColorSwatch = ({ color, selected, onClick }: { color: string, selected: boolean, onClick: () => void }) => {
    const colorMap: Record<string, string> = {
        'blue': '#2563eb', 'indigo': '#4f46e5', 'violet': '#7c3aed', 'teal': '#0d9488',
        'rose': '#e11d48', 'sky': '#0ea5e9', 'midnight': '#334155', 'forest': '#10b981',
        'sunset': '#f97316', 'lavender': '#8b5cf6'
    };
    return (
        <button onClick={onClick} style={{ backgroundColor: colorMap[color] }}
            className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${ selected ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105' }`}>
            {selected && <CheckCircle2 size={14} className="text-white" />}
        </button>
    );
};

const Select = ({ value, onChange, options }: { value: string, onChange: (v: string) => void, options: { value: string, label: string }[] }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
);

// ======================== MAIN COMPONENT ========================

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate, settings, onSettingsChange }) => {
    const [activeSection, setActiveSection] = useState('appearance');
    const [searchQuery, setSearchQuery] = useState('');

    // Safe defaults
    const safeSettings: UserSettings = {
        ...settings,
        ai: settings.ai || { model: 'gemini-1.5-flash', deepThinking: false, creativity: 0.7, showSidebar: true },
        appearance: {
            ...settings.appearance,
            accentColor: settings.appearance?.accentColor || 'blue',
            uiDensity: settings.appearance?.uiDensity || 'comfortable',
            animationSpeed: settings.appearance?.animationSpeed || 'normal',
        },
        privacy: {
            clearDataOnExit: settings.privacy?.clearDataOnExit ?? false,
            adPrivacy: settings.privacy?.adPrivacy ?? true,
            doNotTrack: settings.privacy?.doNotTrack ?? true,
            blockThirdPartyCookies: settings.privacy?.blockThirdPartyCookies ?? false,
            httpsOnly: settings.privacy?.httpsOnly ?? true,
        },
        performance: settings.performance || { mode: 'balanced', hardwareAcceleration: true, tabSleeping: true, preloadPages: true },
        downloads: settings.downloads || { askLocation: true, defaultPath: '' },
        accessibility: settings.accessibility || { textScale: 100, reduceMotion: false, highContrast: false },
        newTab: settings.newTab || { showShortcuts: true, showCards: true, showNews: true, backgroundImage: null },
    };

    const update = (path: string, value: any) => {
        const keys = path.split('.');
        const newSettings = { ...safeSettings };
        let obj: any = newSettings;
        for (let i = 0; i < keys.length - 1; i++) {
            obj[keys[i]] = { ...obj[keys[i]] };
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
        onSettingsChange(newSettings);
    };

    const sections = [
        { id: 'account', label: 'You & Account', icon: User, keywords: 'profile sync sign in' },
        { id: 'appearance', label: 'Appearance', icon: Palette, keywords: 'theme dark light color' },
        { id: 'ai', label: 'EterX AI', icon: BrainCircuit, keywords: 'gemini intelligence' },
        { id: 'privacy', label: 'Privacy & Security', icon: Shield, keywords: 'cookies tracking https' },
        { id: 'performance', label: 'Performance', icon: Zap, keywords: 'speed memory cpu battery' },
        { id: 'search', label: 'Search Engine', icon: Search, keywords: 'google bing duckduckgo' },
        { id: 'downloads', label: 'Downloads', icon: Download, keywords: 'files location' },
        { id: 'languages', label: 'Languages', icon: Languages, keywords: 'translation locale' },
        { id: 'accessibility', label: 'Accessibility', icon: Accessibility, keywords: 'text size motion' },
        { id: 'startup', label: 'On Startup', icon: Power, keywords: 'session restore' },
        { id: 'system', label: 'System', icon: HardDrive, keywords: 'default browser background' },
        { id: 'reset', label: 'Reset & Backup', icon: RotateCcw, keywords: 'restore defaults export' },
        { id: 'about', label: 'About EterX', icon: Info, keywords: 'version' },
    ];

    const filteredSections = useMemo(() => {
        if (!searchQuery.trim()) return sections;
        const q = searchQuery.toLowerCase();
        return sections.filter(s => s.label.toLowerCase().includes(q) || s.keywords.includes(q));
    }, [searchQuery]);

    // =================== SECTION CONTENT ===================
    const renderContent = () => {
        switch (activeSection) {
            case 'account':
                return (
                    <div className="space-y-6">
                        <div><h2 className="text-xl font-bold text-gray-900">You & Account</h2><p className="text-sm text-gray-500">Manage your profile and sync settings.</p></div>
                        <Card title="Profile" description="Your EterX browser profile">
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                                    U
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">Guest User</h3>
                                    <p className="text-sm text-gray-500">Not signed in</p>
                                </div>
                                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
                                    Sign In
                                </button>
                            </div>
                        </Card>
                        <Card title="Sync" description="Keep your data synchronized across devices">
                            <Toggle label="Sync Enabled" description="Turn off to stop syncing data" checked={true} onChange={() => { }} />
                            <div className="pl-4 border-l-2 border-gray-200 ml-4 mt-3 space-y-2">
                                <Toggle label="Bookmarks" description="Sync your saved sites" checked={true} onChange={() => { }} />
                                <Toggle label="History" description="Sync browsing history" checked={true} onChange={() => { }} />
                                <Toggle label="Passwords" description="Sync saved passwords" checked={true} onChange={() => { }} />
                                <Toggle label="Settings" description="Sync browser settings" checked={true} onChange={() => { }} />
                                <Toggle label="Open Tabs" description="Sync tabs across devices" checked={true} onChange={() => { }} />
                            </div>
                        </Card>
                        <Card title="Profile Management">
                            <SettingRow icon={User} label="Switch Profile" description="Change to a different browser profile">
                                <button className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm font-medium hover:bg-gray-200">Manage</button>
                            </SettingRow>
                            <SettingRow icon={Plus} label="Add Profile" description="Create a new browser profile">
                                <button className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600">Add</button>
                            </SettingRow>
                        </Card>
                    </div>
                );

            case 'appearance':
                const THEME_PRESETS = [
                    { id: 'default', name: 'Default', bg: '#ffffff', sidebar: '#f8fafc', accent: '#2563eb' },
                    { id: 'midnight', name: 'Midnight', bg: '#0f172a', sidebar: '#1e293b', accent: '#38bdf8' },
                    { id: 'ocean', name: 'Ocean', bg: '#f0f9ff', sidebar: '#e0f2fe', accent: '#0284c7' },
                    { id: 'forest', name: 'Forest', bg: '#f0fdf4', sidebar: '#dcfce7', accent: '#16a34a' },
                    { id: 'sunset', name: 'Sunset', bg: '#fff7ed', sidebar: '#ffedd5', accent: '#ea580c' },
                    { id: 'lavender', name: 'Lavender', bg: '#faf5ff', sidebar: '#f3e8ff', accent: '#9333ea' },
                    { id: 'rose', name: 'Rose', bg: '#fff1f2', sidebar: '#ffe4e6', accent: '#e11d48' },
                    { id: 'slate', name: 'Slate', bg: '#f8fafc', sidebar: '#e2e8f0', accent: '#475569' },
                ];
                return (
                    <div className="space-y-6">
                        <div><h2 className="text-xl font-bold text-gray-900">Appearance</h2><p className="text-sm text-gray-500">Customize how EterX looks and feels. Changes apply instantly.</p></div>

                        <Card title="Theme Mode" description="Choose between light, dark, or system preference">
                            <div className="flex gap-3 flex-wrap">
                                {[{ id: 'light', icon: Sun, label: 'Light', desc: 'Bright and clean' }, { id: 'dark', icon: Moon, label: 'Dark', desc: 'Easy on eyes' }, { id: 'system', icon: Monitor, label: 'System', desc: 'Follows OS setting' }].map(t => (
                                    <button key={t.id} onClick={() => update('appearance.mode', t.id)}
                                        className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all min-w-[100px] ${ safeSettings.appearance.mode === t.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white' }`}>
                                        <div className={`p-3 rounded-xl mb-2 ${ safeSettings.appearance.mode === t.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600' }`}><t.icon size={24} /></div>
                                        <span className="font-semibold text-sm">{t.label}</span>
                                        <span className="text-xs text-gray-500">{t.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </Card>

                        <Card title="Theme Presets" description="Choose a complete theme with matching colors">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {THEME_PRESETS.map(theme => (
                                    <button key={theme.id} onClick={() => update('appearance.accentColor', theme.id === 'default' ? 'blue' : theme.id)}
                                        className={`relative rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] ${ safeSettings.appearance.accentColor === (theme.id === 'default' ? 'blue' : theme.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200' }`}>
                                        <div className="h-16 flex" style={{ background: theme.bg }}>
                                            <div className="w-1/4 h-full" style={{ background: theme.sidebar }} />
                                            <div className="flex-1 flex items-end justify-end p-2">
                                                <div className="w-8 h-2 rounded-full" style={{ background: theme.accent }} />
                                            </div>
                                        </div>
                                        <div className="p-2 bg-white text-center">
                                            <span className="text-xs font-medium text-gray-700">{theme.name}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </Card>

                        <Card title="Accent Color" description="Fine-tune your accent color">
                            <div className="flex gap-3 flex-wrap">
                                {['blue', 'indigo', 'violet', 'teal', 'sky', 'rose', 'midnight', 'forest', 'sunset', 'lavender'].map(c => (
                                    <ColorSwatch key={c} color={c} selected={safeSettings.appearance.accentColor === c} onClick={() => update('appearance.accentColor', c)} />
                                ))}
                            </div>
                        </Card>

                        <Card title="New Tab Page">
                            <Toggle label="Show News Feed" description="Display trending news and articles" checked={safeSettings.newTab.showNews} onChange={v => update('newTab.showNews', v)} />
                        </Card>

                        <Card title="UI Density" description="Control spacing and compactness">
                            <div className="flex gap-3">
                                {[{ id: 'compact', label: 'Compact', desc: 'More content, less space' }, { id: 'comfortable', label: 'Comfortable', desc: 'Balanced (default)' }, { id: 'spacious', label: 'Spacious', desc: 'Relaxed, airy layout' }].map(d => (
                                    <button key={d.id} onClick={() => update('appearance.uiDensity', d.id)}
                                        className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${ safeSettings.appearance.uiDensity === d.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300' }`}>
                                        <div className="font-semibold text-sm">{d.label}</div>
                                        <div className="text-xs text-gray-500">{d.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </Card>

                        <Card title="Animations" description="Control motion and transition speed">
                            <div className="flex gap-2 flex-wrap">
                                {[{ id: 'fast', label: '🚀 Fast' }, { id: 'normal', label: '✨ Normal' }, { id: 'slow', label: '🐢 Slow' }, { id: 'off', label: '⛔ Off' }].map(a => (
                                    <button key={a.id} onClick={() => update('appearance.animationSpeed', a.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${ safeSettings.appearance.animationSpeed === a.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200' }`}>
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                        </Card>

                        <Card title="Interface Options">
                            <Toggle label="Show Home Button" description="Display a home icon in the toolbar" checked={safeSettings.appearance.showHomeButton} onChange={v => update('appearance.showHomeButton', v)} />
                            <Toggle label="Show Bookmarks Bar" description="Always show your favorite sites below the address bar" checked={safeSettings.appearance.showBookmarksBar} onChange={v => update('appearance.showBookmarksBar', v)} />
                            <Toggle label="Tab Hover Preview" description="Show a mini preview when hovering over tabs" checked={safeSettings.appearance.tabHoverPreview} onChange={v => update('appearance.tabHoverPreview', v)} />
                        </Card>
                    </div>
                );

            case 'ai':
                return (
                    <div className="space-y-6">
                        <div><h2 className="text-xl font-bold text-gray-900">EterX Intelligence</h2><p className="text-sm text-gray-500">Configure your AI assistant.</p></div>
                        <Card title="AI Model">
                            <SettingRow icon={BrainCircuit} label="Model" description="Choose which AI powers your assistant">
                                <Select value={safeSettings.ai.model} onChange={v => update('ai.model', v)} options={[{ value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Fast)' }, { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Powerful)' }]} />
                            </SettingRow>
                            <Toggle label="Deep Thinking Mode" description="Allow AI to reason step-by-step for complex tasks" checked={safeSettings.ai.deepThinking} onChange={v => update('ai.deepThinking', v)} />
                            <Toggle label="Show AI Sidebar" description="Display the AI panel by default" checked={safeSettings.ai.showSidebar} onChange={v => update('ai.showSidebar', v)} />
                        </Card>
                    </div>
                );

            case 'privacy':
                return (
                    <div className="space-y-6">
                        <div><h2 className="text-xl font-bold text-gray-900">Privacy & Security</h2><p className="text-sm text-gray-500">Control how your data is used and protected.</p></div>
                        <Card title="Tracking Protection">
                            <Toggle label="Send Do Not Track" description="Request websites not to track your activity" checked={safeSettings.privacy.doNotTrack} onChange={v => update('privacy.doNotTrack', v)} />
                            <Toggle label="Block Third-Party Cookies" description="Prevent cross-site tracking via cookies" checked={safeSettings.privacy.blockThirdPartyCookies} onChange={v => update('privacy.blockThirdPartyCookies', v)} />
                            <Toggle label="Ad Privacy Controls" description="Limit personalized advertising" checked={safeSettings.privacy.adPrivacy} onChange={v => update('privacy.adPrivacy', v)} />
                        </Card>
                        <Card title="Security">
                            <Toggle label="HTTPS-Only Mode" description="Always upgrade connections to HTTPS when possible" checked={safeSettings.privacy.httpsOnly} onChange={v => update('privacy.httpsOnly', v)} />
                            <Toggle label="Clear Data on Exit" description="Automatically clear browsing data when you close the browser" checked={safeSettings.privacy.clearDataOnExit} onChange={v => update('privacy.clearDataOnExit', v)} />
                        </Card>
                        <Card title="Manage Data">
                            <button className="px-4 py-2 rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors">Clear Browsing Data</button>
                        </Card>
                    </div>
                );

            case 'performance':
                return (
                    <div className="space-y-6">
                        <div><h2 className="text-xl font-bold text-gray-900">Performance</h2><p className="text-sm text-gray-500">Optimize speed, memory, and battery usage.</p></div>
                        <Card title="Performance Mode">
                            <div className="flex gap-2 flex-wrap">
                                {[{ id: 'balanced', label: 'Balanced', desc: 'Optimized for most users' }, { id: 'highPerformance', label: 'High Performance', desc: 'Maximum speed, higher power' }, { id: 'batterySaver', label: 'Battery Saver', desc: 'Reduces background activity' }].map(m => (
                                    <button key={m.id} onClick={() => update('performance.mode', m.id)}
                                        className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all ${ safeSettings.performance.mode === m.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300' }`}>
                                        <span className="font-semibold text-sm">{m.label}</span>
                                        <span className="text-xs text-gray-500">{m.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </Card>
                        <Card title="Advanced">
                            <Toggle label="Hardware Acceleration" description="Use GPU for better graphics performance" checked={safeSettings.performance.hardwareAcceleration} onChange={v => update('performance.hardwareAcceleration', v)} />
                            <Toggle label="Tab Sleeping" description="Put inactive tabs to sleep to save memory" checked={safeSettings.performance.tabSleeping} onChange={v => update('performance.tabSleeping', v)} />
                            <Toggle label="Preload Pages" description="Load pages faster by predicting your clicks" checked={safeSettings.performance.preloadPages} onChange={v => update('performance.preloadPages', v)} />
                        </Card>
                    </div>
                );

            case 'search':
                return (
                    <div className="space-y-6">
                        <div><h2 className="text-xl font-bold text-gray-900">Search Engine</h2><p className="text-sm text-gray-500">Choose your default search provider.</p></div>
                        <Card title="Default Search Engine">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {[{ id: 'google', label: 'Google' }, { id: 'bing', label: 'Bing' }, { id: 'duckduckgo', label: 'DuckDuckGo' }, { id: 'yahoo', label: 'Yahoo' }, { id: 'yandex', label: 'Yandex' }].map(e => (
                                    <button key={e.id} onClick={() => update('searchEngine', e.id)}
                                        className={`p-4 rounded-xl border-2 font-medium text-sm transition-all ${ safeSettings.searchEngine === e.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:border-gray-300' }`}>
                                        {e.label}
                                    </button>
                                ))}
                            </div>
                        </Card>
                    </div>
                );

            case 'downloads':
                return (
                    <div className="space-y-6">
                        <div><h2 className="text-xl font-bold text-gray-900">Downloads</h2><p className="text-sm text-gray-500">Manage how files are downloaded.</p></div>
                        <Card title="Download Behavior">
                            <Toggle label="Ask where to save each file" description="Choose location before downloading" checked={safeSettings.downloads.askLocation} onChange={v => update('downloads.askLocation', v)} />
                            <SettingRow icon={FolderOpen} label="Default Download Location" description={safeSettings.downloads.defaultPath || 'Default system downloads folder'}>
                                <button className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm font-medium hover:bg-gray-200">Change</button>
                            </SettingRow>
                        </Card>
                    </div>
                );

            case 'languages':
                const LANGUAGES = [
                    { value: 'en-US', label: 'English (US)' }, { value: 'en-GB', label: 'English (UK)' },
                    { value: 'hi-IN', label: 'हिन्दी (Hindi)' }, { value: 'es', label: 'Español (Spanish)' },
                    { value: 'fr', label: 'Français (French)' }, { value: 'de', label: 'Deutsch (German)' },
                    { value: 'zh-CN', label: '中文 (Chinese)' }, { value: 'ja', label: '日本語 (Japanese)' },
                    { value: 'ko', label: '한국어 (Korean)' }, { value: 'pt-BR', label: 'Português (Portuguese)' },
                    { value: 'ru', label: 'Русский (Russian)' }, { value: 'ar', label: 'العربية (Arabic)' },
                    { value: 'it', label: 'Italiano (Italian)' }, { value: 'nl', label: 'Nederlands (Dutch)' },
                    { value: 'tr', label: 'Türkçe (Turkish)' }, { value: 'vi', label: 'Tiếng Việt (Vietnamese)' },
                ];
                return (
                    <div className="space-y-6">
                        <div><h2 className="text-xl font-bold text-gray-900">Languages</h2><p className="text-sm text-gray-500">Set your language and translation preferences.</p></div>
                        <Card title="Display Language" description="Choose the language for EterX interface">
                            <SettingRow icon={Globe} label="Browser Language" description="Changes will apply after restart">
                                <Select value={safeSettings.language} onChange={v => update('language', v)} options={LANGUAGES} />
                            </SettingRow>
                        </Card>
                        <Card title="Translation" description="Automatic translation for web pages">
                            <Toggle label="Offer to translate pages" description="Show translation prompt for foreign language pages" checked={true} onChange={() => { }} />
                            <Toggle label="Always translate pages in Hindi" description="Automatically translate Hindi pages to English" checked={false} onChange={() => { }} />
                        </Card>
                        <Card title="Writing">
                            <Toggle label="Spell Check" description="Check spelling as you type in text fields" checked={true} onChange={() => { }} />
                        </Card>
                    </div>
                );

            case 'accessibility':
                return (
                    <div className="space-y-6">
                        <div><h2 className="text-xl font-bold text-gray-900">Accessibility</h2><p className="text-sm text-gray-500">Make EterX easier to use for everyone.</p></div>
                        <Card title="Vision">
                            <SettingRow icon={Type} label="Text Scale" description={`${ safeSettings.accessibility.textScale }% - Adjust the size of text`}>
                                <input type="range" min="50" max="200" value={safeSettings.accessibility.textScale} onChange={e => update('accessibility.textScale', parseInt(e.target.value))} className="w-32" />
                            </SettingRow>
                            <Toggle label="High Contrast Mode" description="Increase contrast for better visibility" checked={safeSettings.accessibility.highContrast} onChange={v => update('accessibility.highContrast', v)} />
                        </Card>
                        <Card title="Motion">
                            <Toggle label="Reduce Motion" description="Minimize animations for those sensitive to motion" checked={safeSettings.accessibility.reduceMotion} onChange={v => update('accessibility.reduceMotion', v)} />
                        </Card>
                    </div>
                );

            case 'startup':
                return (
                    <div className="space-y-6">
                        <div><h2 className="text-xl font-bold text-gray-900">On Startup</h2><p className="text-sm text-gray-500">What happens when you open EterX.</p></div>
                        <Card title="Startup Behavior">
                            <div className="space-y-2">
                                {[{ id: 'newTab', label: 'Open New Tab page' }, { id: 'continue', label: 'Continue where you left off' }, { id: 'urls', label: 'Open specific pages' }].map(opt => (
                                    <label key={opt.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                                        <input type="radio" name="startup" checked={safeSettings.startup.mode === opt.id} onChange={() => update('startup.mode', opt.id)} className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </Card>
                    </div>
                );

            case 'system':
                return (
                    <div className="space-y-6">
                        <div><h2 className="text-xl font-bold text-gray-900">System</h2><p className="text-sm text-gray-500">System-level browser settings.</p></div>
                        <Card title="Default Browser">
                            <SettingRow icon={Globe} label="Make EterX your default browser" description="Open links from other apps in EterX">
                                <button className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium text-sm hover:bg-blue-600">Set as Default</button>
                            </SettingRow>
                        </Card>
                    </div>
                );

            case 'reset':
                return (
                    <div className="space-y-6">
                        <div><h2 className="text-xl font-bold text-gray-900">Reset & Backup</h2><p className="text-sm text-gray-500">Restore defaults or manage your settings.</p></div>
                        <Card title="Reset Options">
                            <div className="space-y-3">
                                <button className="w-full text-left p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                                    <div className="font-medium text-gray-800">Reset Appearance Settings</div>
                                    <div className="text-xs text-gray-500">Restore theme, colors, and layout to defaults</div>
                                </button>
                                <button className="w-full text-left p-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors">
                                    <div className="font-medium text-red-700">Reset All Settings</div>
                                    <div className="text-xs text-red-600">Restore everything to factory defaults</div>
                                </button>
                            </div>
                        </Card>
                    </div>
                );

            case 'about':
                return (
                    <div className="space-y-6">
                        <div><h2 className="text-xl font-bold text-gray-900">About EterX</h2><p className="text-sm text-gray-500">Browser information.</p></div>
                        <Card>
                            <div className="text-center py-8">
                                <div className="text-4xl font-bold text-blue-600 mb-2">EterX</div>
                                <div className="text-sm text-gray-500">Version 1.0.0</div>
                                <div className="text-xs text-gray-400 mt-4">Built with ❤️ for the future of browsing</div>
                            </div>
                        </Card>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="flex h-full bg-gray-50">
            {/* LEFT SIDEBAR */}
            <div className="w-72 border-r border-gray-200 bg-white flex flex-col">
                {/* Search */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search settings..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-2">
                    {filteredSections.map(section => {
                        const Icon = section.icon;
                        const isActive = activeSection === section.id;
                        return (
                            <button
                                key={section.id}
                                onClick={() => { setActiveSection(section.id); setSearchQuery(''); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all mb-1 ${ isActive ? 'bg-blue-500 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100' }`}
                            >
                                <Icon size={20} className={isActive ? 'text-white' : 'text-gray-500'} />
                                <span className="font-medium text-sm">{section.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* RIGHT CONTENT PANEL */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-3xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSection}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
