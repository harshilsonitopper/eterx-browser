
import React from 'react';
import { motion } from 'framer-motion';
import { Play, ExternalLink } from 'lucide-react';

export interface SourceCardProps {
    type?: 'video' | 'website' | 'image';
    title: string;
    url: string;
    thumbnail?: string;
    favicon?: string;
    description?: string;
    domain?: string;
    onClick?: () => void;
    index?: number;
    date?: string;
}

export const SourceCard: React.FC<SourceCardProps> = ({
    type = 'website',
    title,
    url,
    thumbnail,
    favicon,
    description,
    domain,
    onClick,
    index,
    date
}) => {
    const getDomain = () => {
        if (domain) return domain;
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return 'website';
        }
    };

    const displayDomain = getDomain();
    const displayFavicon = favicon || `https://www.google.com/s2/favicons?domain=${displayDomain}&sz=64`;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: (index || 0) * 0.05 }}
            onClick={onClick}
            className="group flex gap-3 w-full p-3 glass-liquid-white corner-brand cursor-pointer mb-3 last:mb-0"
        >
            {/* Left Content */}
            <div className="flex-1 flex flex-col min-w-0 justify-start">
                {/* Header: Icon + Name */}
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-5 rounded-full bg-white/70 flex items-center justify-center flex-shrink-0 shadow-sm border border-white/50">
                        <img
                            src={displayFavicon}
                            alt=""
                            className="w-full h-full object-cover rounded-full"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://www.google.com/s2/favicons?domain=google.com';
                            }}
                        />
                    </div>
                    <span className="text-[11px] font-bold text-gray-800 truncate tracking-wide">{title}</span>
                </div>

                {/* Title */}
                <h3 className="text-[13.5px] leading-snug font-semibold text-[#1a73e8] line-clamp-2 group-hover:text-blue-700 transition-colors">
                    {title}
                </h3>

                {/* Meta: Snippet / Date */}
                <div className="mt-1.5 flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed font-medium">
                        {date && <span className="text-gray-400 mr-1">{date} —</span>}
                        {description}
                    </p>
                </div>
            </div>

            {/* Right: Small Thumbnail */}
            {thumbnail && (
                <div className="flex-shrink-0 w-[90px] h-[64px] corner-brand overflow-hidden bg-white/50 border border-white/60 shadow-inner mt-0.5 group-hover:scale-[1.02] transition-transform duration-300">
                    <img
                        src={thumbnail}
                        alt=""
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                    />
                    {type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/5 group-hover:bg-transparent transition-colors">
                            <div className="w-6 h-6 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center border border-white/50">
                                <Play size={10} className="text-white fill-current ml-0.5" />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default SourceCard;
