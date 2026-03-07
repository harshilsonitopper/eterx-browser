/**
 * FastChatBar.tsx - Modern "Ask anything..." Input Bar 💬
 * 
 * Features:
 * - Clean, minimal design like Perplexity
 * - Plus button for attachments
 * - Mic button for voice
 * - Send arrow button
 * - Focus states and animations
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mic, ArrowUp, Globe, X, Paperclip, Image as ImageIcon, Loader2 } from 'lucide-react';

interface FastChatBarProps {
    onSend: (message: string) => void;
    onAttachment?: () => void;
    onVoice?: () => void;
    placeholder?: string;
    disabled?: boolean;
    isLoading?: boolean;
    showGlobeIcon?: boolean;
}

export const FastChatBar: React.FC<FastChatBarProps> = ({
    onSend,
    onAttachment,
    onVoice,
    placeholder = "Ask anything...",
    disabled = false,
    isLoading = false,
    showGlobeIcon = true
}) => {
    const [value, setValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
        }
    }, [value]);

    const handleSend = () => {
        if (!value.trim() || disabled || isLoading) return;
        onSend(value.trim());
        setValue('');
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const canSend = value.trim().length > 0 && !disabled && !isLoading;

    return (
        <div className="w-full">
            {/* Globe icon above input */}
            {showGlobeIcon && (
                <div className="flex justify-start mb-2">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <Globe size={16} className="text-white/50" />
                    </div>
                </div>
            )}

            {/* Main Input Container */}
            <div
                className={`
                    relative flex items-end gap-2 p-3 rounded-2xl
                    bg-white/5 border transition-all duration-200
                    ${isFocused
                        ? 'border-white/20 bg-white/8 shadow-lg shadow-black/20'
                        : 'border-white/10 hover:border-white/15'
                    }
                    ${disabled ? 'opacity-50 pointer-events-none' : ''}
                `}
            >
                {/* Attachment Button */}
                <button
                    onClick={onAttachment}
                    className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors"
                    title="Add attachment"
                >
                    <Plus size={20} />
                </button>

                {/* Input Area */}
                <div className="flex-1 min-w-0">
                    <textarea
                        ref={inputRef}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        disabled={disabled || isLoading}
                        rows={1}
                        className="
                            w-full bg-transparent text-white/90 text-sm
                            placeholder:text-white/40 resize-none
                            focus:outline-none
                            scrollbar-thin scrollbar-thumb-white/10
                        "
                        style={{ maxHeight: '120px' }}
                    />
                </div>

                {/* Right Side Buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Voice Button */}
                    {onVoice && (
                        <button
                            onClick={onVoice}
                            className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors"
                            title="Voice input"
                        >
                            <Mic size={20} />
                        </button>
                    )}

                    {/* Send Button */}
                    <motion.button
                        whileHover={{ scale: canSend ? 1.05 : 1 }}
                        whileTap={{ scale: canSend ? 0.95 : 1 }}
                        onClick={handleSend}
                        disabled={!canSend}
                        className={`
                            p-2 rounded-lg transition-all
                            ${canSend
                                ? 'bg-white/10 text-white hover:bg-white/20'
                                : 'text-white/30 cursor-not-allowed'
                            }
                        `}
                        title="Send message"
                    >
                        {isLoading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <ArrowUp size={20} />
                        )}
                    </motion.button>
                </div>
            </div>
        </div>
    );
};

/**
 * QuickActions - Action buttons below the chat bar
 */
interface QuickActionsProps {
    actions: Array<{ label: string; icon?: React.ReactNode; onClick: () => void }>;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
    if (actions.length === 0) return null;

    return (
        <div className="flex items-center gap-2 mt-2">
            {actions.map((action, idx) => (
                <button
                    key={idx}
                    onClick={action.onClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white/90 border border-white/5 transition-all"
                >
                    {action.icon}
                    <span>{action.label}</span>
                </button>
            ))}
        </div>
    );
};

export default FastChatBar;
