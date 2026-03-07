/**
 * StepIndicator.tsx - Progress Steps UI 📊
 * 
 * Shows task progress with:
 * - Step count ("2 steps completed")
 * - Expandable step details
 * - Loading animations
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Loader2, AlertCircle, Search, Globe, Play, FileText } from 'lucide-react';

interface Step {
    id: string;
    title: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    details?: string;
}

interface StepIndicatorProps {
    steps: Step[];
    isExpanded?: boolean;
    onToggle?: () => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
    steps,
    isExpanded = false,
    onToggle
}) => {
    const completedCount = steps.filter(s => s.status === 'completed').length;
    const hasRunning = steps.some(s => s.status === 'running');

    if (steps.length === 0) return null;

    const getStepIcon = (step: Step) => {
        if (step.status === 'running') {
            return <Loader2 size={14} className="text-blue-400 animate-spin" />;
        }
        if (step.status === 'completed') {
            return <Check size={14} className="text-emerald-400" />;
        }
        if (step.status === 'error') {
            return <AlertCircle size={14} className="text-red-400" />;
        }
        return <div className="w-3 h-3 rounded-full bg-slate-600" />;
    };

    const getStepTypeIcon = (step: Step) => {
        if (step.title.toLowerCase().includes('search')) {
            return <Search size={12} className="text-white/40" />;
        }
        if (step.title.toLowerCase().includes('video') || step.title.toLowerCase().includes('youtube')) {
            return <Play size={12} className="text-red-400" />;
        }
        if (step.title.toLowerCase().includes('transcript')) {
            return <FileText size={12} className="text-cyan-400" />;
        }
        return <Globe size={12} className="text-white/40" />;
    };

    return (
        <div className="w-full">
            {/* Header - Clickable to expand */}
            <button
                onClick={onToggle}
                className="flex items-center gap-2 text-sm text-white/70 hover:text-white/90 transition-colors"
            >
                {hasRunning ? (
                    <Loader2 size={14} className="text-blue-400 animate-spin" />
                ) : (
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                )}
                <span>
                    {hasRunning
                        ? `Working... (${completedCount}/${steps.length} steps)`
                        : `${completedCount} steps completed`
                    }
                </span>
                <ChevronDown
                    size={14}
                    className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Expanded Step Details */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 space-y-2 pl-2 border-l-2 border-white/10 ml-1.5">
                            {steps.map((step) => (
                                <div
                                    key={step.id}
                                    className="flex items-start gap-2 pl-3"
                                >
                                    <div className="mt-0.5">
                                        {getStepIcon(step)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {getStepTypeIcon(step)}
                                            <span className={`text-sm ${step.status === 'completed' ? 'text-white/80' :
                                                    step.status === 'running' ? 'text-white/90' :
                                                        step.status === 'error' ? 'text-red-400' :
                                                            'text-white/50'
                                                }`}>
                                                {step.title}
                                            </span>
                                        </div>
                                        {step.details && (
                                            <span className="text-xs text-white/40 mt-0.5 block">
                                                {step.details}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StepIndicator;
