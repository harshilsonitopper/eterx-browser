import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, File, X, FolderOpen, MoreVertical, CheckCircle, AlertCircle, Pause, Play, Search, Calendar, FileImage, FileVideo, FileMusic, FileText, Package } from 'lucide-react';
import { clsx } from 'clsx';

interface DownloadsPageProps {
    onNavigate: (url: string) => void;
}

interface DownloadItem {
    id: string;
    filename: string;
    url: string;
    size: string;
    date: Date; // Transformed to Date object for grouping
    state: 'completed' | 'progressing' | 'paused' | 'failed' | 'cancelled';
    progress: number;
    speed?: string;
    timeLeft?: string;
    path: string;
}

// Mock Data for Visual Testing if no real downloads
const MOCK_DOWNLOADS: DownloadItem[] = [];

// Custom hook for managing downloads
const useDownloads = () => {
    const [downloads, setDownloads] = useState<DownloadItem[]>(MOCK_DOWNLOADS);

    useEffect(() => {
        const handleStart = (_: any, item: any) => {
            setDownloads(prev => [{
                id: item.id,
                filename: item.filename,
                url: item.url,
                size: (item.size / 1024 / 1024).toFixed(1) + ' MB',
                date: new Date(),
                state: 'progressing',
                progress: 0,
                path: item.path
            }, ...prev]);
        };

        const handleUpdate = (_: any, data: any) => {
            setDownloads(prev => prev.map(d => {
                if (d.id === data.id) {
                    return {
                        ...d,
                        state: data.state,
                        progress: data.progress || d.progress,
                        speed: data.speed ? (data.speed / 1024 / 1024).toFixed(1) + ' MB/s' : d.speed,
                        receivedBytes: data.receivedBytes,
                        totalBytes: data.totalBytes
                    };
                }
                return d;
            }));
        };

        window.ipcRenderer?.on('download-started', handleStart);
        window.ipcRenderer?.on('download-updated', handleUpdate);

        // Load initial state if available
        // window.ipcRenderer?.invoke('get-downloads').then(setDownloads); 

        return () => {
            window.ipcRenderer?.removeListener('download-started', handleStart);
            window.ipcRenderer?.removeListener('download-updated', handleUpdate);
        };
    }, []);

    const controlDownload = (id: string, action: string) => {
        window.ipcRenderer?.send('download-control', { id, action });
    };

    const clearAll = () => setDownloads([]);

    return { downloads, controlDownload, clearAll };
};

const FileIcon = ({ filename, className }: { filename: string, className?: string }) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) return <FileImage className={className} />;
    if (['mp4', 'mkv', 'webm', 'mov'].includes(ext || '')) return <FileVideo className={className} />;
    if (['mp3', 'wav', 'ogg'].includes(ext || '')) return <FileMusic className={className} />;
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return <FileText className={className} />;
    if (['zip', 'rar', '7z', 'exe', 'msi'].includes(ext || '')) return <Package className={className} />;
    return <File className={className} />;
};

export const DownloadsPage: React.FC<DownloadsPageProps> = ({ onNavigate }) => {
    const { downloads, controlDownload, clearAll } = useDownloads();
    const [searchQuery, setSearchQuery] = useState('');

    // Grouping Logic
    const groupedDownloads = React.useMemo(() => {
        const groups: Record<string, DownloadItem[]> = { 'In Progress': [], 'Today': [], 'Yesterday': [], 'Earlier': [] };

        const now = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        downloads
            .filter(d => d.filename.toLowerCase().includes(searchQuery.toLowerCase()))
            .forEach(d => {
                if (d.state === 'progressing' || d.state === 'paused') {
                    groups['In Progress'].push(d);
                    return;
                }

                const date = new Date(d.date);
                if (date.toDateString() === now.toDateString()) {
                    groups['Today'].push(d);
                } else if (date.toDateString() === yesterday.toDateString()) {
                    groups['Yesterday'].push(d);
                } else {
                    groups['Earlier'].push(d);
                }
            });

        return groups;
    }, [downloads, searchQuery]);

    const hasDownloads = downloads.length > 0;

    return (
        <div className="flex flex-col h-full bg-[#f8f9fa] text-gray-900 overflow-hidden font-sans">
            {/* Header - Liquid Glass Style */}
            <div className="px-10 py-8 flex items-center justify-between z-10 sticky top-0 bg-[#f8f9fa]/80 backdrop-blur-xl border-b border-gray-200/50 transition-all">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <Download size={22} className="ml-0.5" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Downloads</h1>
                        <p className="text-gray-500 font-medium">Manage your files</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search - Liquid Style */}
                    <div className="relative group focus-within:w-72 w-64 transition-all duration-300">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-all shadow-sm focus:shadow-md"
                        />
                    </div>
                    <div className="h-8 w-[1px] bg-gray-300 mx-2" />
                    <button onClick={clearAll} className="px-5 py-3 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-100 hover:text-red-500 rounded-xl transition-all font-semibold text-sm shadow-sm text-gray-600">
                        Clear all
                    </button>
                    <button className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-semibold text-sm shadow-md shadow-blue-200 flex items-center gap-2">
                        <FolderOpen size={18} />
                        Open Folder
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                {!hasDownloads && !searchQuery ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center opacity-60">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <Download size={40} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-800">No downloads yet</h3>
                        <p className="text-gray-500 max-w-sm mt-2">Files you download will appear here.</p>
                    </div>
                ) : (
                    <div className="max-w-5xl mx-auto space-y-10">
                        {Object.entries(groupedDownloads).map(([group, items]) => (
                            items.length > 0 && (
                                <div key={group} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 ml-1 flex items-center gap-2">
                                        {group === 'Today' && <Calendar size={14} />}
                                        {group}
                                    </h2>
                                    <div className="space-y-3">
                                        {items.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.98 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all group relative overflow-hidden"
                                            >
                                                {/* Progress Bar Background */}
                                                {item.state === 'progressing' && (
                                                    <div className="absolute inset-0 bg-blue-50/30 z-0" />
                                                )}
                                                {item.state === 'progressing' && (
                                                    <div
                                                        className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-300 z-10"
                                                        style={{ width: `${ item.progress }%` }}
                                                    />
                                                )}

                                                <div className="flex items-center gap-5 relative z-10">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors ${ item.state === 'failed' ? 'bg-red-50 border-red-100 text-red-500' :
                                                            item.state === 'completed' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                                                                'bg-gray-50 border-gray-100 text-gray-500'
                                                        }`}>
                                                        <FileIcon filename={item.filename} className={item.state === 'completed' ? 'text-blue-500' : ''} />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h3 className="text-gray-900 font-semibold truncate text-[15px]" title={item.filename}>
                                                                {item.filename}
                                                            </h3>
                                                            {item.state === 'completed' && <CheckCircle size={14} className="text-green-500" />}
                                                        </div>
                                                        <div className="flex items-center text-xs font-medium text-gray-500 gap-2">
                                                            <span className="text-blue-600/80">{item.url.split('/')[2]}</span>
                                                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                            <span>{item.size}</span>

                                                            {item.state === 'progressing' && (
                                                                <>
                                                                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                                    <span className="text-blue-600">{item.speed} • {item.timeLeft}</span>
                                                                </>
                                                            )}

                                                            {item.state === 'failed' && <span className="text-red-500">• Failed</span>}
                                                            {item.state === 'paused' && <span className="text-orange-500">• Paused</span>}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-200">
                                                        {item.state === 'completed' && (
                                                            <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-semibold text-gray-700 transition-colors">
                                                                Show in folder
                                                            </button>
                                                        )}

                                                        {item.state === 'progressing' && (
                                                            <button
                                                                onClick={() => controlDownload(item.id, 'pause')}
                                                                className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                                                            >
                                                                <Pause size={18} />
                                                            </button>
                                                        )}

                                                        {item.state === 'paused' && (
                                                            <button
                                                                onClick={() => controlDownload(item.id, 'resume')}
                                                                className="p-2.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
                                                            >
                                                                <Play size={18} />
                                                            </button>
                                                        )}

                                                        {(item.state === 'progressing' || item.state === 'paused') && (
                                                            <button
                                                                className="p-2.5 rounded-xl bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                                                                onClick={() => controlDownload(item.id, 'cancel')}
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        )}

                                                        <button className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                                                            <MoreVertical size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
