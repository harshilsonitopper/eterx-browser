import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, History, FileText, Grid3X3, BarChart3, MoreHorizontal,
    ArrowUpCircle, Bell, User, Monitor, Sparkles, PanelLeftClose, PanelLeft
} from 'lucide-react';

interface NavSidebarProps {
    activeView?: string;
    onViewChange?: (view: string) => void;
    onNewTab?: () => void;
    onOpenSettings?: () => void;
    onOpenHistory?: () => void;
    onOpenAI?: () => void;
    onOpenProfile?: () => void;
}

const NavItem = ({
    icon: Icon,
    label,
    isActive,
    onClick,
    color = "#4f46e5",
    badge = false,
    delay = 0
}: {
    icon: any;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
    color?: string;
    badge?: boolean;
    delay?: number;
}) => {
    return (
        <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
            onClick={onClick}
            className="group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300"
        >
            {/* Hover Background Glow */}
            <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${ isActive ? 'bg-black/5' : 'group-hover:bg-black/5'
                }`} />

            {/* Icon with Dynamic Coloring & Motion */}
            <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                className={`relative z-10 transition-colors duration-300 ${ isActive ? 'text-black' : 'text-gray-400 group-hover:text-black'
                    }`}
            >
                <Icon size={20} strokeWidth={2} />

                {/* Active Indicator Dot */}
                {isActive && (
                    <motion.div
                        layoutId="nav-active-dot"
                        className="absolute -right-1 -top-1 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                    />
                )}

                {/* Status Badge */}
                {badge && (
                    <div className="absolute -right-0.5 -top-0.5 w-[7px] h-[7px] bg-teal-500 rounded-full border border-white" />
                )}
            </motion.div>

            {/* Premium Tooltip */}
            <div className="absolute left-[54px] px-3 py-1.5 bg-gray-900 text-white text-[10px] font-medium rounded-lg opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-[110] shadow-xl">
                {label}
                <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-r-[4px] border-r-gray-900 border-b-[4px] border-b-transparent" />
            </div>
        </motion.button>
    );
};

export const NavSidebar: React.FC<NavSidebarProps> = ({
    activeView,
    onViewChange,
    onNewTab,
    onOpenSettings,
    onOpenHistory,
    onOpenAI,
    onOpenProfile
}) => {
    return (
        <div className="w-[64px] h-full flex flex-col items-center py-5 bg-white/40 backdrop-blur-xl border-r border-black/[0.05] select-none z-[100] relative overflow-visible">
            {/* Subtle background glow */}
            <div className="absolute top-[-10%] left-[-20%] w-[140%] h-[40%] bg-gradient-to-br from-blue-500/5 via-transparent to-transparent rotate-12 pointer-events-none" />

            {/* Top Branding Block */}
            <div className="flex flex-col items-center gap-2 mb-6">
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="w-10 h-10 bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-black/[0.03] flex items-center justify-center group cursor-pointer"
                >
                    {/* Sidebar Toggle Icon (Open/Close Style) */}
                    <PanelLeft size={20} className="text-black group-hover:scale-110 transition-transform" />
                </motion.div>

                {/* Secondary Feature Icon (Laptop/Workspace) */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={onOpenAI}
                    className="w-10 h-10 bg-black/[0.04] rounded-xl flex items-center justify-center text-gray-600 hover:text-black transition-colors"
                >
                    <Monitor size={18} />
                </motion.button>
            </div>

            {/* Main Navigation Stack */}
            <div className="flex-1 flex flex-col items-center gap-3">
                <div className="w-8 h-[1px] bg-black/[0.05] mb-2" />

                <NavItem icon={Plus} label="New Tab" onClick={onNewTab} delay={0.1} />
                <NavItem icon={History} label="History" onClick={onOpenHistory} delay={0.15} />
                <NavItem icon={FileText} label="Reading List" delay={0.2} />
                <NavItem icon={Grid3X3} label="Explore" delay={0.25} />
                <NavItem icon={BarChart3} label="Analytics" delay={0.3} />

                <div className="mt-2 group cursor-pointer">
                    <MoreHorizontal size={20} className="text-gray-300 group-hover:text-black transition-colors" />
                </div>
            </div>

            {/* Bottom Utilities */}
            <div className="flex flex-col items-center gap-4 mt-auto">
                <NavItem icon={ArrowUpCircle} label="Updates" badge delay={0.4} />
                <NavItem icon={Bell} label="Notifications" delay={0.45} />

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onOpenProfile}
                    className="relative w-10 h-10 bg-black/[0.03] rounded-full flex items-center justify-center border border-black/[0.05] group"
                >
                    <User size={18} className="text-gray-600 group-hover:text-black transition-colors" />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-teal-600 rounded-full border-2 border-white shadow-sm" />
                </motion.button>
            </div>
        </div>
    );
};

export default NavSidebar;
