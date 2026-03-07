import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, ExternalLink, Maximize2 } from 'lucide-react';

interface YouTubeEmbedProps {
    videoId: string;
    title?: string;
    channel?: string;
    thumbnail?: string;
    autoPlay?: boolean;
    onNavigate?: (url: string) => void;
}

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
    videoId,
    title,
    channel,
    thumbnail,
    autoPlay = false,
    onNavigate
}) => {
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    const thumbnailUrl = thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    const handlePlayClick = () => {
        setIsPlaying(true);
    };

    const handleExternalClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onNavigate) {
            onNavigate(videoUrl);
        } else {
            window.open(videoUrl, '_blank');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="my-3 rounded-xl overflow-hidden bg-gray-900 border border-gray-700 shadow-lg"
        >
            {/* Video Player Area */}
            <div className="relative aspect-video bg-black">
                {isPlaying ? (
                    /* Embedded YouTube Player */
                    <iframe
                        src={embedUrl}
                        title={title || 'YouTube Video'}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-picture; web-share"
                        allowFullScreen
                        frameBorder="0"
                    />
                ) : (
                    /* Thumbnail with Play Button */
                    <div className="relative w-full h-full cursor-pointer group" onClick={handlePlayClick}>
                        <img
                            src={thumbnailUrl}
                            alt={title || 'Video thumbnail'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                            }}
                        />
                        {/* Dark overlay */}
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />

                        {/* Play Button */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                                <Play size={28} className="text-white ml-1" fill="white" />
                            </div>
                        </div>

                        {/* Duration badge (if available) */}
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-xs font-medium rounded">
                            Click to play
                        </div>
                    </div>
                )}
            </div>

            {/* Video Info Bar */}
            <div className="p-3 bg-gray-900">
                <div className="flex items-start gap-3">
                    {/* YouTube Icon */}
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-600 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                        </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                        {title && (
                            <h4 className="font-medium text-white text-sm line-clamp-2">
                                {title}
                            </h4>
                        )}
                        {channel && (
                            <p className="text-xs text-gray-400 mt-0.5">{channel}</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleExternalClick}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                            title="Open on YouTube"
                        >
                            <ExternalLink size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default YouTubeEmbed;
