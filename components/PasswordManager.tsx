import React, { useState, useEffect } from 'react';
import { PasswordService, SavedPassword } from '../services/PasswordService';
import { Search, Plus, Trash2, Eye, EyeOff, Copy, Key, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

interface PasswordManagerProps {
    onNavigate: (url: string) => void;
}

export const PasswordManager: React.FC<PasswordManagerProps> = ({ onNavigate }) => {
    const [passwords, setPasswords] = useState<SavedPassword[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

    // Form State
    const [newUrl, setNewUrl] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        setPasswords(PasswordService.getAll());
    }, []);

    const handleAdd = () => {
        if (!newUrl || !newUsername || !newPassword) return;
        const newEntry = PasswordService.save(newUrl, newUsername, newPassword);
        setPasswords(prev => [...prev, newEntry]);
        setShowAddModal(false);
        setNewUrl('');
        setNewUsername('');
        setNewPassword('');
    };

    const handleDelete = (id: string) => {
        PasswordService.delete(id);
        setPasswords(prev => prev.filter(p => p.id !== id));
    };

    const toggleReveal = (id: string) => {
        const newSet = new Set(revealedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setRevealedIds(newSet);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const filteredPasswords = passwords.filter(p =>
        p.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-[#f8f9fa] text-gray-900 overflow-hidden relative">
            {/* Header */}
            <div className="glass-toolbar px-8 py-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/50 backdrop-blur-md rounded-xl text-green-600 shadow-sm border border-white/60">
                        <Key size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-light text-gray-900">Passwords</h1>
                        <p className="text-gray-500 text-sm">Manage your saved passwords safely</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full max-w-md">
                    <div className="relative flex-1 group">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search passwords..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-white/60 rounded-xl focus:bg-white focus:border-green-500/50 outline-none transition-all shadow-sm focus:shadow-md"
                        />
                    </div>
                    <button
                        className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all text-sm font-medium flex items-center gap-2 shadow-sm"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus size={16} />
                        Add Password
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="max-w-4xl mx-auto space-y-4">
                    {filteredPasswords.length === 0 ? (
                        <div className="text-center py-20 opacity-50">
                            <Shield size={48} className="mx-auto mb-4 text-gray-400" />
                            <p className="text-lg">No passwords found</p>
                        </div>
                    ) : (
                        filteredPasswords.map(p => (
                            <motion.div
                                key={p.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white border border-[#dadce0] rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all"
                            >
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500 font-bold">
                                        {p.url.replace(/https?:\/\/(www\.)?/, '').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-medium truncate">{p.url}</div>
                                        <div className="text-sm text-gray-500 truncate">{p.username}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200 w-48 justify-between">
                                        <span className="font-mono text-sm truncate mr-2">
                                            {revealedIds.has(p.id) ? p.password : '••••••••••••'}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => toggleReveal(p.id)}
                                                className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                                                title={revealedIds.has(p.id) ? "Hide" : "Show"}
                                            >
                                                {revealedIds.has(p.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                            <button
                                                onClick={() => copyToClipboard(p.password)}
                                                className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                                                title="Copy"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(p.id)}
                                        className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-xl p-6 w-[400px]"
                    >
                        <h2 className="text-xl font-medium mb-4">Add Password</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Website URL</label>
                                <input
                                    type="text"
                                    value={newUrl}
                                    onChange={e => setNewUrl(e.target.value)}
                                    placeholder="e.g., netflix.com"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 ring-green-500/20 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Username / Email</label>
                                <input
                                    type="text"
                                    value={newUsername}
                                    onChange={e => setNewUsername(e.target.value)}
                                    placeholder="user@example.com"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 ring-green-500/20 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 ring-green-500/20 outline-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAdd}
                                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors font-medium"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};
