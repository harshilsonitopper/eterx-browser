import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface QuickLink {
    title: string;
    url: string;
}

const DEFAULT_LINKS: QuickLink[] = [
    { title: 'YouTube', url: 'https://youtube.com' },
    { title: 'Google', url: 'https://google.com' },
    { title: 'Twitter', url: 'https://twitter.com' },
    { title: 'Twitch', url: 'https://twitch.tv' },
    { title: 'Reddit', url: 'https://reddit.com' },
    { title: 'GitHub', url: 'https://github.com' },
    { title: 'Gmail', url: 'https://mail.google.com' },
    { title: 'Add Shortcut', url: '' }
];

interface QuickLinksProps {
    onNavigate: (url: string) => void;
}

export const QuickLinks: React.FC<QuickLinksProps> = ({ onNavigate }) => {

    const getFaviconUrl = (url: string) => {
        if (!url) return '';
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        } catch {
            return '';
        }
    };

    return (
        <div className="w-full max-w-[560px] grid grid-cols-4 md:grid-cols-4 gap-4 md:gap-6 mb-12 px-4">
            {DEFAULT_LINKS.map((link, index) => (
                <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + (index * 0.05), duration: 0.4 }}
                    onClick={() => link.url ? onNavigate(link.url) : null}
                    className="flex flex-col items-center gap-3 group"
                >
                    <div className="w-12 h-12 rounded-full bg-[#f1f3f4] group-hover:bg-[#e8eaed] flex items-center justify-center transition-colors relative overflow-hidden">
                        {link.url ? (
                            <img
                                src={getFaviconUrl(link.url)}
                                alt={link.title}
                                className="w-6 h-6 object-contain"
                                loading="eager"
                            />
                        ) : (
                            <Plus size={20} className="text-gray-600" />
                        )}
                    </div>
                    <span className="text-[12px] font-medium text-gray-700 truncate max-w-[80px] group-hover:bg-gray-100 group-hover:text-gray-900 py-0.5 px-2 rounded-full transition-all">
                        {link.title}
                    </span>
                </motion.button>
            ))}
        </div>
    );
};
