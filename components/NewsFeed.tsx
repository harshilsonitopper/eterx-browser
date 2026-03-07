import React from 'react';
import { motion } from 'framer-motion';
import { Clock, ExternalLink, Sparkles } from 'lucide-react';

export interface NewsArticle {
    id: string;
    title: string;
    description: string;
    source: string;
    timeAgo: string;
    imageUrl?: string;
    readTime?: string;
    category: string;
}

interface NewsFeedProps {
    articles: NewsArticle[];
    onSelectArticle: (article: NewsArticle) => void;
    loading?: boolean;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ articles, onSelectArticle, loading = false }) => {
    // Skeleton Loader
    if (loading) {
        return (
            <div className="w-full max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-pulse h-64">
                        <div className="w-full h-32 bg-gray-100 rounded-xl mb-4" />
                        <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                        <div className="h-4 bg-gray-100 rounded w-1/2" />
                    </div>
                ))}
            </div>
        );
    }
    return (
        <div className="w-full max-w-[900px] mt-8 px-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-blue-500" size={18} />
                    <h2 className="text-lg font-semibold text-gray-800">For You</h2>
                </div>
                <button className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
                    Customize
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {articles.map((article, i) => (
                    <motion.div
                        key={article.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => onSelectArticle(article)}
                        className="group relative flex flex-col glass-liquid-white corner-brand transition-all cursor-pointer overflow-hidden h-[280px]"
                    >
                        {/* Image Section */}
                        <div className="h-32 w-full bg-white/50 relative overflow-hidden">
                            {article.imageUrl ? (
                                <img
                                    src={article.imageUrl}
                                    alt={article.title}
                                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 flex items-center justify-center backdrop-blur-sm">
                                    <Sparkles className="text-blue-300" size={32} />
                                </div>
                            )}
                            <div className="absolute top-3 left-3 px-2 py-1 bg-white/80 backdrop-blur-md rounded-md text-[10px] font-semibold text-blue-600 uppercase tracking-wide border border-white/60 shadow-sm">
                                {article.category}
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="p-4 flex flex-col flex-1">
                            <h3 className="line-clamp-2 text-base font-semibold text-gray-900 leading-snug group-hover:text-blue-700 transition-colors mb-2">
                                {article.title}
                            </h3>

                            <p className="line-clamp-2 text-xs text-gray-600 mb-auto opacity-80 group-hover:opacity-100 transition-opacity">
                                {article.description}
                            </p>

                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/40">
                                <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium tracking-wide">
                                    <span className="text-gray-700">{article.source}</span>
                                    <span>•</span>
                                    <span>{article.timeAgo}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-gray-400">
                                    <Clock size={12} />
                                    <span>{article.readTime || '3 min'}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
