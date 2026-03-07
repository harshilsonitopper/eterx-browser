import React from 'react';
import { MapPin, Camera, Mic, Bell, X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PermissionPopupProps {
    isOpen: boolean;
    permission: string; // 'location', 'camera', 'microphone', 'notifications'
    origin: string;
    onAllow: () => void;
    onBlock: () => void;
    onClose: () => void;
}

export const PermissionPopup: React.FC<PermissionPopupProps> = ({
    isOpen,
    permission,
    origin,
    onAllow,
    onBlock,
    onClose
}) => {
    const getIcon = () => {
        switch (permission) {
            case 'location': return <MapPin size={20} className="text-blue-500" />;
            case 'camera': return <Camera size={20} className="text-blue-500" />;
            case 'microphone': return <Mic size={20} className="text-blue-500" />;
            case 'notifications': return <Bell size={20} className="text-blue-500" />;
            default: return <Shield size={20} className="text-blue-500" />;
        }
    };

    const getTitle = () => {
        switch (permission) {
            case 'location': return 'Know your location';
            case 'camera': return 'Use your camera';
            case 'microphone': return 'Use your microphone';
            case 'notifications': return 'Show notifications';
            default: return 'Access permissions';
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-12 left-4 z-[100] w-80 bg-white rounded-xl shadow-float border border-white/20 dark:border-gray-600 font-sans"
                    style={{
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between p-4 pb-2">
                        <div className="flex gap-3">
                            <div className="p-2 bg-blue-50 rounded-full flex-shrink-0">
                                {getIcon()}
                            </div>
                            <div className="pt-0.5">
                                <h3 className="text-[15px] font-semibold text-gray-900 leading-tight">
                                    {origin}
                                </h3>
                                <p className="text-[13px] text-gray-500 mt-0.5">
                                    wants to {getTitle()}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="p-2 space-y-1">
                        <button
                            onClick={onAllow}
                            className="w-full text-left px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-lg transition-colors"
                        >
                            Allow this time
                        </button>
                        <button
                            onClick={onAllow} // Treating as same for mock
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                        >
                            Allow on every visit
                        </button>
                        <button
                            onClick={onBlock}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                        >
                            Don't allow
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
