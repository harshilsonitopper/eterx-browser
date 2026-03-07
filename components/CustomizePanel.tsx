import React, { useState } from 'react';
import { X, Check, Monitor, Moon, Sun, LayoutGrid, Palette, Upload, Image as ImageIcon, Trash2, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WallpaperService, WALLPAPER_CATEGORIES } from '../services/WallpaperService';

import { THEME_COLORS } from './ThemeConstants';

export interface ThemeSettings {
    mode: 'light' | 'dark' | 'device';
    color: string;
    showShortcuts: boolean;
    showCards: boolean;
    showNews?: boolean;
    backgroundImage?: string | null;
}

interface CustomizePanelProps {
    isOpen: boolean;
    onClose: () => void;
    settings: ThemeSettings;
    onUpdateSettings: (s: ThemeSettings) => void;
}

export const CustomizePanel: React.FC<CustomizePanelProps> = ({
    isOpen,
    onClose,
    settings,
    onUpdateSettings
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('nature');

    const handleGenerateWallpaper = async () => {
        setIsGenerating(true);
        try {
            const imageUrl = await WallpaperService.generateWallpaper(selectedCategory);
            if (imageUrl) {
                onUpdateSettings({ ...settings, backgroundImage: imageUrl });
            }
        } catch (error) {
            console.error("Failed to generate", error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/5 z-[60] backdrop-blur-[1px]"
                    />

                    {/* Panel - Glass & Floating */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed top-0 right-0 h-full w-[360px] bg-white/80 backdrop-blur-2xl shadow-[-10px_0_30px_rgba(0,0,0,0.1)] z-[70] flex flex-col font-sans border-l border-white/50 supports-[backdrop-filter]:bg-white/60"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100/30 bg-white/40 backdrop-blur-md sticky top-0 z-10">
                            <h2 className="text-base font-medium text-gray-800 flex items-center gap-2">
                                <Palette size={18} className="text-blue-500" />
                                Customize
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/50 text-gray-500 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-gradient-to-b from-transparent to-white/30">

                            {/* PREVIEW CARD */}
                            <section>
                                <h3 className="text-xs font-semibold text-gray-500 mb-3">Appearance</h3>
                                {(() => {
                                    const activeTheme = THEME_COLORS.find(c => c.value === settings.color);
                                    const isDark = settings.mode === 'dark';

                                    // Frame Color: Secondary for presets, or fallback
                                    const frameColor = activeTheme
                                        ? activeTheme.secondary
                                        : (settings.color.startsWith('#') ? settings.color : (isDark ? '#0f172a' : '#f3f4f6'));

                                    // Accent: Primary for presets, or custom hex
                                    const accentColor = activeTheme
                                        ? activeTheme.primary
                                        : (settings.color.startsWith('#') ? settings.color : '#3b82f6');

                                    return (
                                        <div
                                            className={`
                                                w-full aspect-[1.8/1] rounded-2xl border shadow-sm overflow-hidden flex flex-col transition-colors duration-300
                                                ${ isDark ? 'border-slate-700' : 'border-gray-200' }
                                            `}
                                            style={{ backgroundColor: isDark && !activeTheme ? '#0f172a' : frameColor }}
                                        >
                                            {/* Mini Browser Toolbar */}
                                            <div className={`h-8 flex items-center px-3 gap-2 border-b ${ isDark ? 'border-slate-800 bg-slate-900' : 'border-white/50 bg-white' }`}>
                                                {/* Browser Controls */}
                                                <div className="flex gap-1.5 opacity-40">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${ isDark ? 'bg-slate-700' : 'bg-gray-300' }`} />
                                                    <div className={`w-2.5 h-2.5 rounded-full ${ isDark ? 'bg-slate-700' : 'bg-gray-300' }`} />
                                                    <div className={`w-2.5 h-2.5 rounded-full ${ isDark ? 'bg-slate-700' : 'bg-gray-300' }`} />
                                                </div>
                                                {/* Active Tab */}
                                                <div className={`ml-2 px-3 h-6 rounded-t-lg flex items-center text-[8px] font-medium w-24 shadow-sm ${ isDark ? 'bg-slate-800 text-gray-300' : 'bg-white text-gray-800' }`}>
                                                    New Tab
                                                </div>
                                            </div>

                                            <div className={`flex-1 p-4 flex flex-col items-center justify-center relative ${ isDark ? 'bg-slate-950' : 'bg-white/80' }`}>
                                                {settings.backgroundImage && (
                                                    <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${ settings.backgroundImage })` }} />
                                                )}
                                                <div
                                                    className="w-16 h-4 rounded-full mb-3"
                                                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : `${ accentColor }20` }}
                                                />
                                                <div className={`w-48 h-6 rounded-full shadow-sm border flex items-center px-2 gap-2 ${ isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100' }`}>
                                                    <div
                                                        className="w-3 h-3 rounded-full opacity-50"
                                                        style={{ backgroundColor: accentColor }}
                                                    />
                                                    <div className={`w-20 h-2 rounded-full ${ isDark ? 'bg-slate-800' : 'bg-gray-100' }`} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </section>

                            <section>
                                <div className="p-1 bg-gray-100 rounded-full flex gap-1">
                                    {[
                                        { id: 'light', icon: Sun, label: 'Light' },
                                        { id: 'dark', icon: Moon, label: 'Dark' },
                                        { id: 'device', icon: Monitor, label: 'Device' }
                                    ].map((mode) => (
                                        <button
                                            key={mode.id}
                                            onClick={() => onUpdateSettings({ ...settings, mode: mode.id as any })}
                                            className={`
                                                flex-1 py-1.5 px-3 rounded-full flex items-center justify-center gap-2 text-xs font-medium transition-all
                                                ${ settings.mode === mode.id
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                }
                                            `}
                                        >
                                            {mode.id === 'light' && <Sun size={14} />}
                                            {mode.id === 'dark' && <Moon size={14} />}
                                            {mode.id === 'device' && <Monitor size={14} />}
                                            <span className="capitalize">{mode.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* COLORS (Dual Tone Chrome Style) */}
                            <section className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/50 p-5 shadow-sm">
                                <h3 className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles size={12} /> Theme Colors
                                </h3>
                                <div className="grid grid-cols-4 gap-4 mb-4">
                                    {THEME_COLORS.map((color) => {
                                        const isSelected = settings.color === color.value;
                                        return (
                                            <button
                                                key={color.value}
                                                onClick={() => onUpdateSettings({ ...settings, color: color.value })}
                                                className="group relative flex items-center justify-center"
                                                title={color.name}
                                            >
                                                <div className={`
                                                    w-12 h-12 rounded-full overflow-hidden relative transition-transform group-hover:scale-105 shadow-sm border border-gray-100
                                                    ${ isSelected ? 'ring-2 ring-offset-2 ring-blue-500' : '' }
                                                `}>
                                                    {/* Dual Tone Effect: Top-Left Dark, Bottom-Right Light */}
                                                    <div
                                                        className="absolute inset-0"
                                                        style={{
                                                            background: `linear-gradient(135deg, ${ color.primary } 50%, ${ color.secondary } 50%)`
                                                        }}
                                                    />
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                                                            <Check size={12} className="text-white" strokeWidth={3} />
                                                        </div>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}

                                    {/* Custom Color Eyedropper */}
                                    <button
                                        onClick={() => {
                                            const isCustom = !THEME_COLORS.find(c => c.value === settings.color);
                                            if (!isCustom) onUpdateSettings({ ...settings, color: '#000000' }); // Default custom start
                                        }}
                                        className="group relative flex items-center justify-center"
                                        title="Custom Color"
                                    >
                                        <div className={`
                                            w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center relative transition-transform group-hover:scale-105 border border-gray-200 text-gray-500 hover:bg-gray-100
                                            ${ !THEME_COLORS.find(c => c.value === settings.color) ? 'ring-2 ring-offset-2 ring-blue-500 bg-blue-50 text-blue-600' : '' }
                                        `}>
                                            <Palette size={20} />
                                        </div>
                                    </button>
                                </div>

                                {/* Custom Color Picker Interface */}
                                {!THEME_COLORS.find(c => c.value === settings.color) && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="pt-4 border-t border-gray-100/50"
                                    >
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-700">Pick a color</span>
                                                <div className="flex items-center gap-2 bg-white/50 rounded-lg px-2 py-1 border border-gray-100">
                                                    <div
                                                        className="w-4 h-4 rounded-full border border-gray-300"
                                                        style={{ backgroundColor: settings.color }}
                                                    />
                                                    <span className="text-xs text-gray-500 font-mono uppercase">
                                                        {settings.color}
                                                    </span>
                                                </div>
                                            </div>
                                            <input
                                                type="color"
                                                value={settings.color.startsWith('#') ? settings.color : '#000000'}
                                                onChange={(e) => onUpdateSettings({ ...settings, color: e.target.value })}
                                                className="w-full h-10 rounded-lg cursor-pointer bg-transparent"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </section>

                            {/* SHORTCUTS & CARDS */}
                            <section className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/50 overflow-hidden shadow-sm">
                                {[
                                    { label: 'My Shortcuts', sub: 'Show quick links', checked: settings.showShortcuts, key: 'showShortcuts' },
                                    { label: 'Show Cards', sub: 'Recent tabs & widgets', checked: settings.showCards, key: 'showCards' }
                                ].map((item, idx) => (
                                    <div key={item.key} className={`flex items-center justify-between p-5 ${ idx !== 0 ? 'border-t border-gray-100/50' : '' }`}>
                                        <div>
                                            <div className="text-sm font-medium text-gray-800">{item.label}</div>
                                            <div className="text-xs text-gray-400">{item.sub}</div>
                                        </div>
                                        <div
                                            className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${ item.checked ? 'bg-blue-600' : 'bg-gray-200' }`}
                                            onClick={() => onUpdateSettings({ ...settings, [item.key]: !item.checked } as any)}
                                        >
                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${ item.checked ? 'translate-x-[1.25rem]' : '' }`} />
                                        </div>
                                    </div>
                                ))}
                            </section>

                            {/* BACKGROUND UPLOAD */}
                            <section className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/50 p-5 shadow-sm">
                                <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Background</h3>

                                {/* 1. Custom Upload */}
                                {settings.backgroundImage ? (
                                    <div className="relative group rounded-xl overflow-hidden border border-gray-200 h-32 mb-4">
                                        <img src={settings.backgroundImage} alt="Background" className="w-full h-full object-cover" />
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onUpdateSettings({ ...settings, backgroundImage: null })}
                                                className="p-2 bg-white/90 text-red-500 rounded-full shadow-sm hover:bg-white"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center h-24 rounded-xl border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer mb-6">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-1">
                                            <Upload size={16} />
                                        </div>
                                        <span className="text-xs font-medium text-gray-600">Upload Image</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        onUpdateSettings({ ...settings, backgroundImage: reader.result as string });
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </label>
                                )}

                                {/* 2. AI Wallpapers */}
                                <div className="border-t border-gray-100 pt-4">
                                    <h4 className="text-xs font-semibold text-blue-600 mb-3 flex items-center gap-1.5">
                                        <Sparkles size={12} /> AI Generated Wallpapers
                                    </h4>

                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        {WALLPAPER_CATEGORIES.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setSelectedCategory(cat.id)}
                                                className={`
                                                    py-2 px-1 rounded-lg text-[10px] font-medium transition-all shadow-sm border
                                                    ${ selectedCategory === cat.id
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200'
                                                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                                    }
                                                `}
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleGenerateWallpaper}
                                        disabled={isGenerating}
                                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-medium shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin" />
                                                Creating masterpiece...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw size={14} />
                                                Generate new wallpaper
                                            </>
                                        )}
                                    </button>
                                </div>
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => onUpdateSettings({ mode: 'device', color: 'blue', showShortcuts: true, showCards: true, showNews: true, backgroundImage: null })}
                                className="px-4 py-2 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:bg-white hover:text-gray-900 transition-colors"
                            >
                                Reset Settings
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence >
    );
};
