import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock, Quote, Target, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface KeyMoment {
    timestamp: string;
    seconds: number;
    title: string;
    description?: string;
}

interface VideoQuote {
    timestamp: string;
    seconds: number;
    quote: string;
}

interface VideoAnalysisCardProps {
    videoId: string;
    title?: string;
    channel?: string;
    thumbnail?: string;
    keyMoments?: KeyMoment[];
    quotes?: VideoQuote[];
    summary?: string;
    onTimestampClick?: (seconds: number) => void;
}

export const VideoAnalysisCard: React.FC<VideoAnalysisCardProps> = ({
    videoId,
    title,
    channel,
    thumbnail,
    keyMoments = [],
    quotes = [],
    summary,
    onTimestampClick
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const thumbnailUrl = thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    const handleTimestampClick = (seconds: number) => {
        if (onTimestampClick) {
            onTimestampClick(seconds);
        } else {
            window.open(`${videoUrl}&t=${seconds}`, '_blank');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="my-4 rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm"
        >
            {/* Video Header */}
            <div className="flex gap-4 p-4 bg-gradient-to-r from-gray-50 to-white">
                {/* Thumbnail */}
                <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 relative group"
                >
                    <img
                        src={thumbnailUrl}
                        alt={title || 'Video'}
                        className="w-40 h-24 object-cover rounded-lg shadow-sm transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                            <Play size={18} className="text-white ml-0.5" fill="white" />
                        </div>
                    </div>
                </a>

                {/* Video Info */}
                <div className="flex-1 min-w-0">
                    <a
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                    >
                        <h3 className="font-semibold text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors">
                            {title || 'Video Analysis'}
                        </h3>
                    </a>
                    {channel && (
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816z" />
                                </svg>
                            </span>
                            {channel}
                        </p>
                    )}

                    {summary && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{summary}</p>
                    )}
                </div>
            </div>

            {/* Key Moments Section */}
            {keyMoments.length > 0 && (
                <div className="border-t border-gray-100">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Target size={16} className="text-blue-500" />
                            <span>Key Moments ({keyMoments.length})</span>
                        </div>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 pb-4 space-y-2">
                                    {keyMoments.slice(0, 8).map((moment, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleTimestampClick(moment.seconds)}
                                            className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors text-left group"
                                        >
                                            <span className="flex-shrink-0 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-mono rounded group-hover:bg-blue-200 transition-colors">
                                                {moment.timestamp}
                                            </span>
                                            <span className="text-sm text-gray-700 group-hover:text-blue-700 transition-colors">
                                                {moment.title}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Quotes Section */}
            {quotes.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Quote size={14} className="text-amber-500" />
                        <span className="text-sm font-medium text-gray-700">Notable Quotes</span>
                    </div>
                    <div className="space-y-2">
                        {quotes.slice(0, 3).map((q, i) => (
                            <button
                                key={i}
                                onClick={() => handleTimestampClick(q.seconds)}
                                className="block w-full text-left p-2 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors"
                            >
                                <p className="text-sm text-gray-700 italic">"{q.quote}"</p>
                                <span className="text-xs text-amber-600 font-mono mt-1">
                                    at {q.timestamp}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Watch Button */}
            <div className="border-t border-gray-100 p-3">
                <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    <Play size={16} fill="white" />
                    Watch on YouTube
                    <ExternalLink size={14} />
                </a>
            </div>
        </motion.div>
    );
};

export default VideoAnalysisCard;
