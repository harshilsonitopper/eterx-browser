import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { LayoutMode } from '../types/layout';

interface LayoutPickerProps {
    isOpen: boolean;
    onClose: () => void;
    activeMode: LayoutMode;
    onSelectMode: (mode: LayoutMode) => void;
}

// Visual Mini-Preview for each layout
const LayoutPreview: React.FC<{ mode: LayoutMode }> = ({ mode }) => {
    const paneClass = "bg-blue-200 rounded-sm";
    switch (mode) {
        case 'single':
            return <div className={`w-full h-full ${paneClass}`} />;
        case 'split':
            return (
                <div className="flex gap-1 w-full h-full">
                    <div className={`w-1/2 h-full ${paneClass}`} />
                    <div className={`w-1/2 h-full ${paneClass}`} />
                </div>
            );
        case 'split-1-2':
            return (
                <div className="flex gap-1 w-full h-full">
                    <div className={`w-[60%] h-full ${paneClass}`} />
                    <div className="flex flex-col gap-1 w-[40%] h-full">
                        <div className={`flex-1 ${paneClass}`} />
                        <div className={`flex-1 ${paneClass}`} />
                    </div>
                </div>
            );
        case 'split-2-1':
            return (
                <div className="flex gap-1 w-full h-full">
                    <div className="flex flex-col gap-1 w-[40%] h-full">
                        <div className={`flex-1 ${paneClass}`} />
                        <div className={`flex-1 ${paneClass}`} />
                    </div>
                    <div className={`w-[60%] h-full ${paneClass}`} />
                </div>
            );
        case 'quad':
            return (
                <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-full">
                    <div className={paneClass} />
                    <div className={paneClass} />
                    <div className={paneClass} />
                    <div className={paneClass} />
                </div>
            );
        case 'grid':
            return (
                <div className="grid grid-cols-3 grid-rows-2 gap-0.5 w-full h-full">
                    {[...Array(6)].map((_, i) => <div key={i} className={paneClass} />)}
                </div>
            );
        case 'stack':
            return (
                <div className="relative w-full h-full flex items-center justify-center">
                    <div className={`absolute w-[70%] h-[70%] ${paneClass} opacity-40 translate-y-1`} />
                    <div className={`absolute w-[80%] h-[80%] ${paneClass} opacity-70`} />
                    <div className={`w-[90%] h-[90%] ${paneClass}`} />
                </div>
            );
        case 'free':
            return (
                <div className="relative w-full h-full">
                    <div className={`absolute top-1 left-1 w-[50%] h-[50%] ${paneClass}`} />
                    <div className={`absolute bottom-1 right-1 w-[40%] h-[45%] ${paneClass}`} />
                    <div className={`absolute top-4 right-2 w-[30%] h-[35%] ${paneClass}`} />
                </div>
            );
        case 'split-h':
            return (
                <div className="flex flex-col gap-1 w-full h-full">
                    <div className={`flex-1 ${paneClass}`} />
                    <div className={`flex-1 ${paneClass}`} />
                </div>
            );
        case 'split-v':
            return (
                <div className="flex gap-1 w-full h-full">
                    <div className={`flex-1 ${paneClass}`} />
                    <div className={`flex-1 ${paneClass}`} />
                </div>
            );
        case 'split-1-3':
            return (
                <div className="flex gap-1 w-full h-full">
                    <div className={`w-[70%] h-full ${paneClass}`} />
                    <div className="flex flex-col gap-1 w-[30%] h-full">
                        <div className={`flex-1 ${paneClass}`} />
                        <div className={`flex-1 ${paneClass}`} />
                        <div className={`flex-1 ${paneClass}`} />
                    </div>
                </div>
            );
        case 'split-3-1':
            return (
                <div className="flex gap-1 w-full h-full">
                    <div className="flex flex-col gap-1 w-[30%] h-full">
                        <div className={`flex-1 ${paneClass}`} />
                        <div className={`flex-1 ${paneClass}`} />
                        <div className={`flex-1 ${paneClass}`} />
                    </div>
                    <div className={`w-[70%] h-full ${paneClass}`} />
                </div>
            );
        default:
            return null;
    }
};

const LAYOUT_OPTIONS: { mode: LayoutMode; title: string; desc: string }[] = [
    { mode: 'single', title: 'Single', desc: 'Focused browsing' },
    { mode: 'split', title: 'Split 50/50', desc: 'Side-by-side' },
    { mode: 'split-h', title: 'Horizontal', desc: 'Top & bottom' },
    { mode: 'split-v', title: 'Vertical', desc: 'Left & right' },
    { mode: 'split-1-2', title: '1 + 2', desc: 'Big + 2 stacked' },
    { mode: 'split-2-1', title: '2 + 1', desc: '2 stacked + big' },
    { mode: 'split-1-3', title: '1 + 3', desc: 'Big + 3 stacked' },
    { mode: 'split-3-1', title: '3 + 1', desc: '3 stacked + big' },
    { mode: 'quad', title: 'Quad', desc: '2×2 grid' },
    { mode: 'grid', title: 'Grid', desc: 'All tabs' },
    { mode: 'stack', title: 'Stack', desc: '3D cards' },
    { mode: 'free', title: 'Free', desc: 'Floating' },
];

export const LayoutPicker: React.FC<LayoutPickerProps> = ({ isOpen, onClose, activeMode, onSelectMode }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-3xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Choose Layout</h2>
                            <p className="text-gray-500 text-sm">Select your workspace arrangement</p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                            <X size={22} className="text-gray-500" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {LAYOUT_OPTIONS.map((option) => {
                            const isActive = activeMode === option.mode;
                            return (
                                <motion.button
                                    key={option.mode}
                                    onClick={() => {
                                        onSelectMode(option.mode);
                                        onClose();
                                    }}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    className={`relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${isActive
                                        ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/10'
                                        : 'border-gray-100 hover:border-blue-300 hover:bg-gray-50'
                                        }`}
                                >
                                    {/* Visual Preview Box */}
                                    <div className="w-full aspect-[4/3] bg-gray-100 rounded-lg p-2 mb-3">
                                        <LayoutPreview mode={option.mode} />
                                    </div>
                                    <h3 className={`text-sm font-semibold ${isActive ? 'text-blue-900' : 'text-gray-800'}`}>{option.title}</h3>
                                    <p className={`text-xs ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{option.desc}</p>
                                    {isActive && <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-blue-500" />}
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
