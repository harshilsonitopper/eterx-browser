import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, LogOut, Plus, Users, Edit3, ExternalLink, RefreshCw, LogIn } from 'lucide-react';

interface ProfileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onManageAccount: () => void;
    onSignOut: () => void;
    user: { email: string; name?: string; avatar?: string } | null;
    onSignIn?: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
    isOpen, onClose, onManageAccount, onSignOut, user, onSignIn
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[100] bg-transparent" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10, x: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10, x: 10 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="absolute top-12 right-12 w-80 glass-panel rounded-2xl z-[101] overflow-hidden flex flex-col shadow-2xl border border-white/60"
                        style={{ transformOrigin: 'top right' }}
                    >
                        {/* Profile Header */}
                        <div className="p-5 flex flex-col items-center border-b border-gray-100 bg-white/40">
                            {user ? (
                                <>
                                    <div className="relative group cursor-pointer">
                                        {user.avatar ? (
                                            <img src={user.avatar} alt="Profile" className="w-16 h-16 rounded-full shadow-lg mb-3 object-cover" />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-3">
                                                {user.name ? user.name.substring(0, 2).toUpperCase() : user.email.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Edit3 size={12} className="text-gray-600" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-800">{user.name || 'User'}</h3>
                                    <p className="text-sm text-gray-500">{user.email}</p>

                                    <div className="mt-3 px-3 py-1 rounded-full bg-green-50 border border-green-100 flex items-center gap-2 text-xs font-medium text-green-700">
                                        <RefreshCw size={12} className="animate-spin-slow" />
                                        Sync is on
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                                        <User size={32} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-800">Not Signed In</h3>
                                    <p className="text-sm text-gray-500 text-center mb-4">Sign in to sync your history, passwords, and other settings.</p>
                                    <button
                                        onClick={onSignIn}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
                                    >
                                        <LogIn size={16} />
                                        Sign in with Google
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Main Actions (Only if logged in) */}
                        {user && (
                            <div className="p-2 space-y-1">
                                <button
                                    onClick={onManageAccount}
                                    className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-black/5 flex items-center gap-3 transition-colors text-sm text-gray-700"
                                >
                                    <ExternalLink size={16} className="text-gray-400" />
                                    Manage your Google Account
                                </button>
                                <button className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-black/5 flex items-center gap-3 transition-colors text-sm text-gray-700">
                                    <Edit3 size={16} className="text-gray-400" />
                                    Customize your Chrome profile
                                </button>
                            </div>
                        )}

                        {/* Other Profiles */}
                        <div className="border-t border-gray-100 p-2 space-y-1">
                            <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Other Profiles</div>
                            <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 flex items-center gap-3 transition-colors group">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                    <Users size={16} />
                                </div>
                                <div className="flex-1 text-sm font-medium text-gray-700">Guest Mode</div>
                            </button>
                            <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 flex items-center gap-3 transition-colors group">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                    <Plus size={16} />
                                </div>
                                <div className="flex-1 text-sm font-medium text-gray-700">Add Profile</div>
                            </button>
                        </div>

                        {/* Footer */}
                        {user && (
                            <div className="border-t border-gray-100 p-2">
                                <button
                                    onClick={onSignOut}
                                    className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-red-50 hover:text-red-600 flex items-center gap-3 transition-colors text-sm text-gray-700 group"
                                >
                                    <LogOut size={16} className="text-gray-400 group-hover:text-red-500" />
                                    Sign out
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
