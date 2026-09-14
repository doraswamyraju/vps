import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';
import {
    User,
    CreditCard,
    Shield,
    HardDrive,
    MemoryStick,
    Cpu,
    Server,
    Database,
    Folder,
    CheckCircle2,
    Calendar,
    Lock,
    Save,
    Loader2,
    Layers,
    Sparkles,
    AlertCircle
} from 'lucide-react';

const Profile = () => {
    const { user: authUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await api.get('/auth/profile');
            const u = res.data.user;
            setProfile(u);
            setName(u.name || '');
            setEmail(u.email || '');
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (newPassword && newPassword !== confirmPassword) {
            setFeedback({ type: 'error', message: 'New passwords do not match' });
            return;
        }

        setSaving(true);
        setFeedback(null);
        try {
            const res = await api.put('/auth/profile', {
                name,
                email,
                currentPassword: currentPassword || undefined,
                newPassword: newPassword || undefined
            });
            setFeedback({ type: 'success', message: res.data.message || 'Profile updated successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            fetchProfile();
        } catch (err) {
            setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update profile' });
        } finally {
            setSaving(false);
        }
    };

    const isSuperAdmin = profile?.role === 'superadmin' || authUser?.role === 'superadmin';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full py-20 text-gray-400">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                    <User className="w-7 h-7 text-blue-500" />
                    Account & Subscription Profile
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                    Manage your profile, view subscription tier limits, and verify assigned resources.
                </p>
            </div>

            {feedback && (
                <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
                    feedback.type === 'error' 
                        ? 'bg-red-500/10 border border-red-500/40 text-red-400' 
                        : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-400'
                }`}>
                    {feedback.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                    <span>{feedback.message}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COLUMN: SUBSCRIPTION & PLAN SUMMARY */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Subscription Card */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-purple-400" />
                                Active Plan
                            </h2>
                            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-medium">
                                {profile?.subscription_status || 'Active'}
                            </span>
                        </div>

                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Package Tier</p>
                            <h3 className="text-2xl font-extrabold text-white mt-1">
                                {isSuperAdmin ? 'Super Administrator' : (profile?.plan_name || 'Standard Hosting')}
                            </h3>
                            {!isSuperAdmin && (
                                <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                                    <p className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">Subscription Rate</p>
                                    <div className="text-2xl font-bold text-white mt-0.5 font-mono">
                                        {profile?.plan_currency === 'INR' ? '₹' : '$'}{profile?.plan_price !== undefined ? profile.plan_price : 0}
                                        <span className="text-xs font-normal text-gray-400 font-sans"> / {profile?.plan_interval || 'monthly'}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Renewal Timeline */}
                        <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-blue-400 flex-shrink-0" />
                                <div>
                                    <p className="text-[11px] text-gray-400">Next Renewal / Expiry</p>
                                    <p className="text-xs font-semibold text-white">
                                        {profile?.renewal_date ? new Date(profile.renewal_date).toLocaleDateString() : 'Active / Continuous'}
                                    </p>
                                </div>
                            </div>
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono capitalize">
                                {profile?.role === 'superadmin' ? 'Super Admin' : 'Client Admin'}
                            </span>
                        </div>
                    </div>

                    {/* Virtual Quota Allocation Card */}
                    {!isSuperAdmin && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
                            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
                                <HardDrive className="w-5 h-5 text-blue-400" />
                                Virtual Quota Allocation
                            </h2>

                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-300 text-xs">
                                        <HardDrive className="w-4 h-4 text-purple-400" />
                                        <span>Allocated Disk</span>
                                    </div>
                                    <span className="font-bold text-white font-mono text-xs">
                                        {profile?.display_disk_gb || 100} GB
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-300 text-xs">
                                        <MemoryStick className="w-4 h-4 text-blue-400" />
                                        <span>Allocated RAM</span>
                                    </div>
                                    <span className="font-bold text-white font-mono text-xs">
                                        {profile?.display_memory_gb || 8} GB
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-300 text-xs">
                                        <Cpu className="w-4 h-4 text-amber-400" />
                                        <span>Virtual CPU Cores</span>
                                    </div>
                                    <span className="font-bold text-white font-mono text-xs">
                                        {profile?.display_cpu_cores || 4} Cores
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: ASSIGNED RESOURCES & EDIT PROFILE FORM */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Assigned Resources View */}
                    {!isSuperAdmin && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
                            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
                                <Layers className="w-5 h-5 text-blue-400" />
                                Assigned VPS Resources
                            </h2>

                            {(profile?.resources || []).length === 0 ? (
                                <p className="text-xs text-gray-500 py-2">
                                    No specific applications or databases are currently mapped to your account.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {profile.resources.map((res, i) => (
                                        <div
                                            key={i}
                                            className="p-3 bg-gray-950/60 border border-gray-800 rounded-xl flex items-center gap-3"
                                        >
                                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                                {res.type === 'pm2_app' && <Server className="w-4 h-4" />}
                                                {res.type === 'mysql_db' && <Database className="w-4 h-4 text-amber-400" />}
                                                {res.type === 'mongo_db' && <Database className="w-4 h-4 text-emerald-400" />}
                                                {res.type === 'file_path' && <Folder className="w-4 h-4 text-yellow-400" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[10px] text-gray-400 uppercase font-semibold">
                                                    {res.type === 'pm2_app' ? 'PM2 Process' : res.type === 'mysql_db' ? 'MySQL Database' : res.type === 'mongo_db' ? 'MongoDB Database' : 'Allowed Directory'}
                                                </p>
                                                <p className="text-xs font-semibold text-white truncate font-mono">
                                                    {res.identifier}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Profile Information & Password Form */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
                        <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
                            <Lock className="w-5 h-5 text-blue-400" />
                            Account & Security Settings
                        </h2>

                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Username (Read Only)</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={profile?.username || ''}
                                        className="w-full bg-gray-950/40 border border-gray-800/60 rounded-lg px-3.5 py-2 text-sm text-gray-500 cursor-not-allowed font-mono"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 border-t border-gray-800 space-y-3">
                                <p className="text-xs font-semibold text-gray-300">Change Password (Optional)</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Current Password</label>
                                        <input
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">New Password</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
