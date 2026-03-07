
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, MoreHorizontal, Globe } from 'lucide-react';
import { SearchResult } from '../services/SearchService';

interface SourceGroupProps {
    sources: SearchResult[];
    onSourceClick: (url: string) => void;
}

const SourceGroup: React.FC<SourceGroupProps> = ({ sources, onSourceClick }) => {
    // Show all sources by default since this is inside a scrollable sidebar
    const visibleSources = sources;

    // Helper to get domain
    const getDomain = (url: string) => {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return 'site.com';
        }
    };

    if (sources.length === 0) return null;

    return (
        <div className="w-full bg-transparent transition-all duration-300 overflow-hidden mb-6">
            {/* List of Sources */}
            <div className="flex flex-col gap-3">
                <AnimatePresence>
                    {visibleSources.map((source, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            onClick={() => onSourceClick(source.link)}
                            className="group relative flex gap-3 px-3 py-3 cursor-pointer glass-liquid-white corner-brand transition-all duration-300"
                        >
                            {/* Left Content */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-5 h-5 rounded-full bg-white/70 flex items-center justify-center flex-shrink-0 shadow-sm border border-white/50">
                                            <img
                                                src={`https://www.google.com/s2/favicons?domain=${source.link}&sz=32`}
                                                alt=""
                                                className="w-full h-full object-cover rounded-full"
                                                onError={(e) => { (e.target as HTMLImageElement).src = 'about:blank'; }}
                                            />
                                        </div>
                                        <h3 className="text-[13.5px] font-semibold text-[#1a0dab] leading-snug line-clamp-1 group-hover:text-blue-700 transition-colors">
                                            {source.title}
                                        </h3>
                                    </div>
                                    <div className="text-[12px] text-gray-600 leading-relaxed line-clamp-2 font-medium opacity-90 group-hover:opacity-100 transition-opacity">
                                        {source.snippet}
                                    </div>
                                </div>

                                {/* Bottom Row: Domain */}
                                <div className="flex items-center gap-2 mt-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[11px] font-bold text-gray-500 truncate max-w-[150px] tracking-wide">
                                        {getDomain(source.link)}
                                    </span>
                                </div>
                            </div>

                            {/* Right Thumbnail */}
                            <div className="flex-shrink-0 w-[80px] h-[64px] bg-white/50 corner-brand overflow-hidden border border-white/60 shadow-inner group-hover:scale-[1.02] transition-transform duration-300 mt-1">
                                {source.pagemap?.cse_image?.[0]?.src ? (
                                    <img
                                        src={source.pagemap.cse_image[0].src}
                                        alt=""
                                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300/50 bg-white/30 backdrop-blur-sm">
                                        <Globe size={20} />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default SourceGroup;
