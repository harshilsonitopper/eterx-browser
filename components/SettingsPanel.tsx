import React, { useState, useEffect } from 'react';
import { X, Key, Search, Monitor, Save, RotateCcw, Shield, CircuitBoard, User, Bell } from 'lucide-react';
import { motion } from 'framer-motion';

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
    const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
    const [searchEngine, setSearchEngine] = useState('google');
    const [theme, setTheme] = useState('dark');
    const [activeTab, setActiveTab] = useState('ai');

    useEffect(() => {
        setGeminiModel(localStorage.getItem('eterx_gemini_model') || 'gemini-2.5-flash');
        setSearchEngine(localStorage.getItem('eterx_search_engine') || 'google');
        setTheme(localStorage.getItem('eterx_theme') || 'dark');
    }, []);

    const handleSave = () => {
        localStorage.setItem('eterx_gemini_model', geminiModel);
        localStorage.setItem('eterx_search_engine', searchEngine);
        localStorage.setItem('eterx_theme', theme);

        // Visual feedback
        const btn = document.getElementById('save-btn');
        if (btn) {
            const originalText = btn.innerText;
            btn.innerText = 'Saved!';
            btn.classList.add('bg-green-500');
            setTimeout(() => {
                btn.innerText = originalText;
                btn.classList.remove('bg-green-500');
            }, 1500);
        }
    };

    const tabs = [
        { id: 'ai', label: 'AI & Intelligence', icon: CircuitBoard },
        { id: 'browser', label: 'Browser & Search', icon: Search },
        { id: 'appearance', label: 'Appearance', icon: Monitor },
        { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    ];

    return (
        <div className="flex h-full bg-[#0c0c0e] text-white font-sans">
            {/* Sidebar */}
            <div className="w-64 bg-[#111113] border-r border-white/5 p-4 flex flex-col">
                <div className="flex items-center gap-3 px-2 mb-8 mt-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <SettingsIcon size={18} className="text-white" />
                    </div>
                    <span className="font-semibold text-lg tracking-tight">Settings</span>
                </div>

                <div className="space-y-1 flex-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${activeTab === tab.id
                                ? 'bg-violet-600/10 text-violet-400 font-semibold'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <tab.icon size={18} className={activeTab === tab.id ? 'text-violet-400' : 'text-white/40'} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="pt-4 border-t border-white/5">
                    <button onClick={onClose} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors text-sm">
                        <X size={18} />
                        Close Settings
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0c0c0e] relative">
                {/* Background Blobs */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[100px]" />
                </div>

                <div className="flex-1 overflow-y-auto p-12 relative z-10">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="max-w-2xl mx-auto space-y-8"
                    >
                        <h2 className="text-3xl font-semibold mb-8">{tabs.find(t => t.id === activeTab)?.label}</h2>

                        {activeTab === 'ai' && (
                            <div className="space-y-6">
                                <Section title="Model Configuration" description="Select your preferred Gemini model. API keys are configured in the .env file.">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-white/50 ml-1">Preferred Model</label>
                                        <div className="relative group">
                                            <CircuitBoard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-violet-400 transition-colors" />
                                            <select
                                                value={geminiModel}
                                                onChange={(e) => setGeminiModel(e.target.value)}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-violet-500/50 focus:bg-violet-900/10 outline-none transition-all text-white appearance-none"
                                            >
                                                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fastest)</option>
                                                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Powerful)</option>
                                                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite (Lightweight)</option>
                                                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy)</option>
                                                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Legacy)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <p className="text-xs text-white/30 mt-4">API keys are loaded from your .env file. Ensure VITE_API_KEY is set.</p>
                                </Section>
                            </div>
                        )}

                        {activeTab === 'browser' && (
                            <div className="space-y-6">
                                <Section title="Search Engine" description="Choose your preferred search engine.">
                                    <div className="grid grid-cols-2 gap-3">
                                        {['google', 'bing', 'duckduckgo', 'perplexity'].map(engine => (
                                            <button
                                                key={engine}
                                                onClick={() => setSearchEngine(engine)}
                                                className={`p-4 rounded-xl border transition-all text-left capitalize ${searchEngine === engine
                                                    ? 'bg-violet-600/20 border-violet-500/50 text-white'
                                                    : 'bg-white/5 border-white/5 text-white/60 hover:border-white/20'
                                                    }`}
                                            >
                                                {engine}
                                            </button>
                                        ))}
                                    </div>
                                </Section>
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="space-y-6">
                                <Section title="Theme" description="Customize the look and feel.">
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setTheme('dark')}
                                            className={`flex-1 p-6 rounded-2xl border ${theme === 'dark' ? 'bg-[#1a1a1c] border-violet-500' : 'bg-[#1a1a1c] border-white/10 opacity-50'} transition-all`}
                                        >
                                            <div className="h-20 bg-[#0a0a0c] rounded-lg mb-4 border border-white/5"></div>
                                            <span className="font-medium">Dark Mode</span>
                                        </button>
                                        <button
                                            onClick={() => setTheme('light')}
                                            className={`flex-1 p-6 rounded-2xl border ${theme === 'light' ? 'bg-white border-violet-500 text-black' : 'bg-white border-white/10 opacity-50 text-black'} transition-all`}
                                        >
                                            <div className="h-20 bg-gray-100 rounded-lg mb-4 border border-black/5"></div>
                                            <span className="font-medium">Light Mode</span>
                                        </button>
                                    </div>
                                </Section>
                            </div>
                        )}

                        {activeTab === 'privacy' && (
                            <div className="space-y-6">
                                <Section title="Data & Safety" description="Manage your browsing data.">
                                    <button
                                        onClick={() => { if (confirm('Clear all data?')) { localStorage.clear(); window.location.reload(); } }}
                                        className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors"
                                    >
                                        Clear Browsing Data
                                    </button>
                                </Section>
                            </div>
                        )}

                    </motion.div>
                </div>

                {/* Footer Save Area */}
                <div className="p-6 border-t border-white/5 bg-[#0f0f11] flex justify-end">
                    <button
                        id="save-btn"
                        onClick={handleSave}
                        className="px-8 py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition-all shadow-lg shadow-white/10 active:scale-95 flex items-center gap-2"
                    >
                        <Save size={18} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

const Section = ({ title, description, children }: any) => (
    <div className="bg-[#151518] border border-white/5 rounded-2xl p-6 space-y-6">
        <div>
            <h3 className="text-base font-medium text-white/90">{title}</h3>
            <p className="text-sm text-white/40">{description}</p>
        </div>
        {children}
    </div>
);

const Input = ({ label, icon: Icon, ...props }: any) => (
    <div className="space-y-2">
        <label className="text-xs font-medium text-white/50 ml-1">{label}</label>
        <div className="relative group">
            <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-violet-400 transition-colors" />
            <input
                {...props}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-violet-500/50 focus:bg-violet-900/10 outline-none transition-all placeholder:text-white/10"
            />
        </div>
    </div>
);

const SettingsIcon = ({ size, className }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);
