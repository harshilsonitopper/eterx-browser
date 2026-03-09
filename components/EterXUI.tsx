import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Plus, MessageSquare, Monitor, X, CheckCircle2,
    FileText, LayoutDashboard, Folder, Sun, ChevronDown, ArrowUp
} from 'lucide-react';
import { NavSidebar } from './NavSidebar';

interface EterXUIProps {
    onNavigate: (url: string) => void;
    onOpenNewTab?: (url: string) => void;
    onToggleSidebar?: () => void;
}

export const EterXUI: React.FC<EterXUIProps> = ({ onNavigate, onOpenNewTab, onToggleSidebar }) => {
    const [activeTab, setActiveTab] = useState<'Chat' | 'Code' | 'Cowork'>('Cowork');
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const handleNewTask = () => {
        setInputValue('');
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <div className="flex h-full w-full bg-white text-gray-900 font-sans overflow-hidden select-none">
            {/* Extremely crisp, precise light-gray grid background for that "blueprint/deep work" feel */}
            <div
                className="absolute inset-0 z-0 pointer-events-none opacity-[0.3]"
                style={{
                    backgroundImage: `linear-gradient(to right, #e2e2e2 1px, transparent 1px), linear-gradient(to bottom, #e2e2e2 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />

            {/* 1. Global Navigation Sidebar */}
            <div className="z-20 h-full flex-shrink-0 relative">
                <NavSidebar
                    onNewTab={handleNewTask}
                    onOpenAI={() => onNavigate('eterx://workspace')}
                    onOpenHistory={() => onNavigate('eterx://history')}
                    onOpenSettings={() => onNavigate('eterx://settings')}
                />
            </div>

            {/* 2. Inner Workspace Sidebar */}
            {/* Changed from off-white to a very clean cool gray/white balance */}
            <div className="w-[260px] flex-shrink-0 bg-[#fafafa] border-r border-black/[0.06] flex flex-col h-full z-10">
                {/* Top Control Segment */}
                <div className="p-4 pt-6">
                    <div className="bg-black/[0.04] p-1 rounded-[10px] flex items-center justify-between mb-5 shadow-inner">
                        {['Chat', 'Code', 'Cowork'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`flex-1 py-1.5 px-3 text-[12.5px] font-medium rounded-md transition-all duration-300 ${ activeTab === tab
                                        ? 'bg-black text-white shadow-md'
                                        : 'text-gray-500 hover:text-black hover:bg-black/[0.04]'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleNewTask}
                        className="w-full flex items-center gap-2.5 px-1 py-1.5 rounded-xl hover:bg-black/[0.04] text-gray-800 transition-colors font-medium text-[13.5px] group"
                    >
                        {/* Custom Black & White Add Button */}
                        <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center shadow-md">
                            <Plus size={13} className="text-white" strokeWidth={3} />
                        </div>
                        New task
                    </button>
                </div>

                {/* Empty Tasks State */}
                <div className="px-5 pt-2 flex flex-col">
                    <span className="text-[12.5px] text-gray-400 font-medium tracking-tight">No tasks yet</span>

                    <span className="text-[11.5px] text-gray-400/80 mt-6 leading-relaxed block max-w-[90%]">
                        These tasks run locally and aren't synced across devices.
                    </span>
                </div>

                <div className="flex-1" />

                {/* Footer Profile */}
                <div className="p-4 border-t border-transparent">
                    <button className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-black/[0.04] transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center shadow-sm overflow-hidden">
                                {/* Minimalist B&W Avatar Pattern */}
                                <div className="w-3 h-3 bg-white rotate-45 transform"></div>
                            </div>
                            <div className="flex flex-col items-start leading-tight">
                                <span className="text-[13px] font-semibold text-gray-900">Joakim Jardenberg</span>
                                <span className="text-[11.5px] text-gray-500">Max plan</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-[2px] text-gray-400">
                            <ChevronDown size={10} className="rotate-180" />
                            <ChevronDown size={10} />
                        </div>
                    </button>
                </div>
            </div>

            {/* 3. Main Central Work Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative px-8 z-10 overflow-y-auto w-full max-w-[800px] mx-auto pb-[10vh]">

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="w-full max-w-[600px] flex flex-col items-start mt-[10vh]"
                >
                    {/* Unique EterX Abstract Logo - Pure Black & Geometric */}
                    <div className="mb-5 flex items-center justify-center w-10 h-10 bg-black rounded-[12px] shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 12H9V22L19 12H12V2Z" fill="white" />
                        </svg>
                    </div>

                    <h1 className="text-[30px] font-bold text-black mb-6 tracking-tight" style={{ fontFamily: '"Playfair Display", "Times New Roman", serif', letterSpacing: '-0.02em' }}>
                        Let's knock something off your list
                    </h1>

                    {/* Info Banner - Cool Gray & Technical */}
                    <div className="w-full bg-[#f4f4f5] border border-gray-200/60 rounded-[14px] p-4 flex items-start justify-between mb-8 shadow-sm">
                        <p className="text-[13px] text-gray-700 leading-relaxed max-w-[90%] font-medium">
                            Cowork is an early research preview. New improvements ship frequently. <a href="#" className="underline underline-offset-4 decoration-gray-300 hover:decoration-black hover:text-black transition-colors">Learn more</a> or <a href="#" className="underline underline-offset-4 decoration-gray-300 hover:decoration-black hover:text-black transition-colors">give us feedback</a>.
                        </p>
                        <button className="text-gray-400 hover:text-black mt-0.5 transition-colors">
                            <X size={16} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Action Grid - Stark Borders & Deep Shadows on Hover */}
                    <div className="grid grid-cols-2 gap-3 mb-6 w-full">
                        {[
                            { icon: FileText, label: 'Create a file' },
                            { icon: LayoutDashboard, label: 'Crunch data' },
                            { icon: Monitor, label: 'Make a prototype' },
                            { icon: Folder, label: 'Organize files' },
                            { icon: Sun, label: 'Prep for the day' },
                            { icon: MessageSquare, label: 'Send a message' }
                        ].map((action, idx) => (
                            <button
                                key={idx}
                                className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-black hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 group shadow-sm"
                            >
                                <action.icon size={18} className="text-gray-400 group-hover:text-black transition-colors" strokeWidth={1.5} />
                                <span className="text-[13px] font-semibold text-gray-700 group-hover:text-black transition-colors">{action.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Chat Input Container - Pure High-Contrast Branding */}
                    <div className="relative group w-full mt-4">
                        <div className="bg-white border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-[20px] rounded-br-[20px] p-3 pl-4 transition-all duration-300 focus-within:border-black focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col">

                            <textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="How can I help you today?"
                                className="w-full bg-transparent border-none outline-none resize-none min-h-[50px] text-[15px] placeholder:text-gray-400 text-black pt-1 pb-4 leading-relaxed font-medium"
                                rows={1}
                            />

                            <div className="flex items-center justify-between mt-auto">
                                {/* Left Tools (Cool Gray) */}
                                <div className="flex items-center gap-3 text-gray-400">
                                    <button className="hover:text-black transition-colors">
                                        <Folder size={18} strokeWidth={2} />
                                    </button>
                                    <button className="hover:text-black transition-colors">
                                        <Plus size={18} strokeWidth={2.5} />
                                    </button>
                                </div>

                                {/* Right Tools & Submit (Black/White Focus) */}
                                <div className="flex items-center gap-3">
                                    <button className="flex items-center gap-1.5 text-gray-500 hover:text-black transition-colors text-[12.5px] font-semibold">
                                        Opus 4.5
                                        <ChevronDown size={14} strokeWidth={2.5} />
                                    </button>

                                    <button
                                        className={`w-8 h-8 rounded-[10px] flex items-center justify-center transition-all duration-300 shadow-sm ${ inputValue.trim().length > 0
                                                ? 'bg-black hover:bg-gray-800 text-white shadow-md transform hover:scale-105'
                                                : 'bg-gray-100 text-gray-300'
                                            }`}
                                    >
                                        <ArrowUp size={16} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </motion.div>

            </div>

            {/* 4. Right Utility Panel - Minimalist Gray Structure */}
            <div className="w-[280px] flex-shrink-0 bg-[#fafafa] p-6 lg:block hidden z-10 pt-10 border-l border-black/[0.06]">

                {/* Progress Card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-4 transition-shadow hover:shadow-md">
                    <h3 className="text-[13px] font-bold text-black mb-4">Progress</h3>
                    <div className="flex items-center gap-1.5 mb-5 opacity-50">
                        <div className="w-6 h-6 rounded-full border border-black flex items-center justify-center bg-transparent text-black">
                            <CheckCircle2 size={13} strokeWidth={2} />
                        </div>
                        <div className="w-4 h-[1.5px] bg-black" />
                        <div className="w-6 h-6 rounded-full border border-gray-400 flex items-center justify-center bg-transparent text-gray-400">
                            <CheckCircle2 size={13} strokeWidth={1.5} />
                        </div>
                        <div className="w-4 h-[1.5px] bg-gray-300" />
                        <div className="w-6 h-6 rounded-full border border-gray-200 bg-gray-50" />
                    </div>
                    <p className="text-[12px] font-medium text-gray-500 leading-tight">Steps will show as the task unfolds.</p>
                </div>

                {/* Artifacts Card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-4 transition-shadow hover:shadow-md">
                    <h3 className="text-[13px] font-bold text-black mb-4">Artifacts</h3>
                    <div className="w-10 h-8 rounded-[6px] border border-gray-300 flex items-end justify-center p-1.5 gap-[3px] mb-4 bg-transparent opacity-50">
                        <div className="w-1.5 h-3 bg-gray-400 rounded-[1px]" />
                        <div className="w-1.5 h-4 bg-gray-400 rounded-[1px]" />
                        <div className="w-1.5 h-2 bg-gray-400 rounded-[1px]" />
                    </div>
                    <p className="text-[12px] font-medium text-gray-500 leading-tight">Outputs created during the task land here.</p>
                </div>

                {/* Context Card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-4 transition-shadow hover:shadow-md">
                    <h3 className="text-[13px] font-bold text-black mb-5">Context</h3>
                    <div className="flex items-center gap-[-10px] mb-4 relative h-10 opacity-60">
                        <div className="absolute left-0 w-7 h-9 bg-white border border-gray-300 rounded-[4px] shadow-sm transform -rotate-12 origin-bottom-left z-10 flex items-start justify-start p-[3px]">
                            <div className="w-full flex gap-0.5">
                                <div className="w-full h-0.5 bg-gray-200" />
                            </div>
                        </div>
                        <div className="absolute left-3 w-7 h-9 bg-white border border-gray-300 rounded-[4px] shadow-md z-20 flex items-start justify-start p-[3px] transform -rotate-6">
                            <div className="w-full flex gap-0.5">
                                <div className="w-full h-0.5 bg-gray-200" />
                            </div>
                        </div>
                        <div className="absolute left-6 w-8 h-10 bg-white border border-black rounded-[4px] shadow-lg z-30 flex flex-col gap-[3px] p-[4px] pt-1.5">
                            <div className="w-1/2 h-[2px] bg-black" />
                            <div className="w-3/4 h-[2px] bg-gray-300" />
                            <div className="w-full h-[2px] bg-gray-300" />
                            <div className="w-2/3 h-[2px] bg-gray-300" />
                        </div>
                    </div>
                    <p className="text-[12px] font-medium text-gray-500 leading-tight">Track the tools and files in use as EterX works.</p>
                </div>

            </div>

        </div>
    );
};
