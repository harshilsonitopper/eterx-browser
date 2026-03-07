import React from 'react';
import { Star, Folder, ChevronRight, Plus, Globe } from 'lucide-react';
import { Bookmark } from '../types';

interface BookmarksBarProps {
    bookmarks: Bookmark[];
    onNavigate: (url: string) => void;
}

export const BookmarksBar: React.FC<BookmarksBarProps> = ({ bookmarks, onNavigate }) => {
    return (
        <div className="h-8 flex items-center px-2 bg-white border-b border-[#dadce0] text-[13px] text-[#5f6368]">
            {bookmarks.map((b) => (
                <div
                    key={b.id}
                    className="flex items-center gap-2 px-2 py-1 hover:bg-[#e8f0fe] hover:text-[#1967d2] rounded-md cursor-pointer transition-colors max-w-[150px]"
                    onClick={() => onNavigate(b.url)}
                >
                    {b.folder ? (
                        <Folder size={14} className="fill-gray-400 text-gray-400" />
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">
                            <Globe size={10} />
                        </div>
                    )}
                    <span className="truncate">{b.title}</span>
                </div>
            ))}
            {bookmarks.length === 0 && (
                <div className="px-2 text-gray-400 italic">No bookmarks yet</div>
            )}
        </div>
    );
};
