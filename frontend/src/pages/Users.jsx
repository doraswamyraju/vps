import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    Users as UsersIcon,
    UserPlus,
    Shield,
    HardDrive,
    CreditCard,
    Layers,
    Folder,
    Database,
    Server,
    Edit3,
    Trash2,
    CheckCircle2,
    XCircle,
    Loader2,
    AlertCircle,
    X,
    Plus,
    RefreshCw,
    ToggleLeft,
    ToggleRight,
    Calendar,
    IndianRupee
} from 'lucide-react';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        role: 'admin',
        status: 'active',
        plan_id: '',
        plan_name: 'Starter Cloud',
        custom_price: 499,
        currency: 'INR',
        interval_type: 'monthly',
        renewal_date: '',
        quotas: {
            display_disk_gb: 100,
            display_memory_gb: 8,
            display_cpu_cores: 4,
            display_bandwidth_gb: 1000
        },
        resources: []
    });

    const [newResourceType, setNewResourceType] = useState('pm2_app');
    const [newResourceIdentifier, setNewResourceIdentifier] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, plansRes] = await Promise.all([
                api.get('/users'),
                api.get('/plans')
            ]);
            setUsers(usersRes.data);
            setPlans(plansRes.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePlanSelect = (selectedPlanId) => {
        const found = plans.find(p => String(p.id) === String(selectedPlanId));
        if (found) {
            setFormData(prev => ({
                ...prev,
                plan_id: found.id,
                plan_name: found.name,
                custom_price: found.price,
                currency: found.currency || 'INR',
                interval_type: found.interval_type || 'monthly',
                quotas: {
                    display_disk_gb: found.display_disk_gb || 100,
                    display_memory_gb: found.display_memory_gb || 8,
                    display_cpu_cores: found.display_cpu_cores || 4,
                    display_bandwidth_gb: found.display_bandwidth_gb || 1000
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, plan_id: selectedPlanId }));
        }
    };

    const handleOpenCreateModal = () => {
        setEditingUser(null);
        const defaultPlan = plans[0];
        setFormData({
            name: '',
            username: '',
            email: '',
            password: '',
            role: 'admin',
            status: 'active',
            plan_id: defaultPlan?.id || '',
            plan_name: defaultPlan?.name || 'Custom Plan',
            custom_price: defaultPlan?.price !== undefined ? defaultPlan.price : 499,
            currency: defaultPlan?.currency || 'INR',
            interval_type: defaultPlan?.interval_type || 'monthly',
            renewal_date: '',
            quotas: {
                display_disk_gb: defaultPlan?.display_disk_gb || 100,
                display_memory_gb: defaultPlan?.display_memory_gb || 8,
                display_cpu_cores: defaultPlan?.display_cpu_cores || 4,
                display_bandwidth_gb: defaultPlan?.display_bandwidth_gb || 1000
            },
            resources: []
        });
        setModalOpen(true);
    };

    const handleOpenEditModal = (user) => {
        setEditingUser(user);
        const formattedRenewal = user.renewal_date ? new Date(user.renewal_date).toISOString().split('T')[0] : '';
        setFormData({
            name: user.name || '',
            username: user.username || '',
            email: user.email || '',
            password: '', // leave empty to keep current
            role: user.role || 'admin',
            status: user.status || 'active',
            plan_id: user.plan_id || '',
            plan_name: user.plan_name || 'Standard Plan',
            custom_price: user.custom_price !== undefined ? user.custom_price : 499,
            currency: user.currency || 'INR',
            interval_type: user.interval_type || 'monthly',
            renewal_date: formattedRenewal,
            quotas: {
                display_disk_gb: user.display_disk_gb || 100,
                display_memory_gb: user.display_memory_gb || 8,
                display_cpu_cores: user.display_cpu_cores || 4,
                display_bandwidth_gb: user.display_bandwidth_gb || 1000
            },
            resources: (user.resources || []).map(r => ({
                type: r.resource_type,
                identifier: r.resource_identifier
            }))
        });
        setModalOpen(true);
    };

    const handleToggleStatus = async (user) => {
        if (user.role === 'superadmin') return;
        const newStatus = user.status === 'active' ? 'suspended' : 'active';
        try {
            await api.patch(`/users/${user.id}/status`, { status: newStatus });
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update user status');
        }
    };

    const handleAddResource = () => {
        if (!newResourceIdentifier.trim()) return;
        setFormData(prev => ({
            ...prev,
            resources: [
                ...prev.resources,
                { type: newResourceType, identifier: newResourceIdentifier.trim() }
            ]
        }));
        setNewResourceIdentifier('');
    };

    const handleRemoveResource = (index) => {
        setFormData(prev => ({
            ...prev,
            resources: prev.resources.filter((_, i) => i !== index)
        }));
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingUser) {
                await api.put(`/users/${editingUser.id}`, formData);
            } else {
                await api.post('/users', formData);
            }
            setModalOpen(false);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save user');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.delete(`/users/${userId}`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete user');
        }
    };

    const totalAllocatedDisk = users.reduce((acc, u) => acc + (u.display_disk_gb || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                        <UsersIcon className="w-7 h-7 text-blue-500" />
                        Users & Tenant Management
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Configure user-wise pricing, activate/suspend client access, and assign isolated resources.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="p-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleOpenCreateModal}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add New User
                    </button>
                </div>
            </div>

            {/* Quota Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
                        <UsersIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs font-medium uppercase">Total Tenants</p>
                        <h3 className="text-2xl font-bold text-white mt-0.5">{users.length}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {users.filter(u => u.status === 'active').length} Active Accounts
                        </p>
                    </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg">
                        <HardDrive className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs font-medium uppercase">Allocated Virtual Disk</p>
                        <h3 className="text-2xl font-bold text-white mt-0.5">{totalAllocatedDisk} GB</h3>
                        <p className="text-xs text-purple-400 mt-0.5">Virtual Storage Limits</p>
                    </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs font-medium uppercase">User-Wise Billing</p>
                        <h3 className="text-2xl font-bold text-white mt-0.5">
                            {users.filter(u => u.role === 'admin').length} Subscriptions
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">Custom client rates</p>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                        <p className="text-sm">Loading users...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">No users found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-800 bg-gray-950/50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    <th className="py-3.5 px-4">User</th>
                                    <th className="py-3.5 px-4">Plan & Custom Price</th>
                                    <th className="py-3.5 px-4">Virtual Quotas</th>
                                    <th className="py-3.5 px-4">Assigned Resources</th>
                                    <th className="py-3.5 px-4">Access Status</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/60 text-sm">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-800/40 transition-colors">
                                        <td className="py-3.5 px-4">
                                            <div>
                                                <div className="font-semibold text-white">{user.name}</div>
                                                <div className="text-xs text-gray-400 font-mono">@{user.username}</div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {user.role === 'superadmin' ? (
                                                <span className="text-xs text-purple-400 font-semibold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                                    Super Admin
                                                </span>
                                            ) : (
                                                <div className="space-y-0.5">
                                                    <div className="font-semibold text-white text-xs">
                                                        {user.plan_name || 'Standard Plan'}
                                                    </div>
                                                    <div className="text-xs text-emerald-400 font-mono font-medium">
                                                        {user.currency === 'INR' ? '₹' : '$'}{user.custom_price || 0} / {user.interval_type || 'mo'}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {user.role === 'superadmin' ? (
                                                <span className="text-xs text-gray-500 font-mono">Physical Hardware</span>
                                            ) : (
                                                <div className="flex flex-wrap gap-1.5 text-xs">
                                                    <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono border border-gray-700">
                                                        {user.display_disk_gb || 100} GB Disk
                                                    </span>
                                                    <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono border border-gray-700">
                                                        {user.display_memory_gb || 8} GB RAM
                                                    </span>
                                                    <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono border border-gray-700">
                                                        {user.display_cpu_cores || 4} Cores
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {user.role === 'superadmin' ? (
                                                <span className="text-xs text-emerald-400 font-medium">All Server Resources</span>
                                            ) : (user.resources || []).length === 0 ? (
                                                <span className="text-xs text-gray-500">None assigned</span>
                                            ) : (
                                                <div className="flex flex-wrap gap-1">
                                                    {(user.resources || []).map((r, i) => (
                                                        <span
                                                            key={i}
                                                            className="inline-flex items-center gap-1 text-[11px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20"
                                                        >
                                                            {r.resource_type === 'pm2_app' && <Server className="w-3 h-3" />}
                                                            {r.resource_type === 'mysql_db' && <Database className="w-3 h-3 text-amber-400" />}
                                                            {r.resource_type === 'mongo_db' && <Database className="w-3 h-3 text-emerald-400" />}
                                                            {r.resource_type === 'file_path' && <Folder className="w-3 h-3 text-yellow-400" />}
                                                            {r.resource_identifier}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {user.role === 'superadmin' ? (
                                                <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleToggleStatus(user)}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                                                        user.status === 'active'
                                                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400 border border-emerald-500/30'
                                                            : 'bg-red-500/10 text-red-400 hover:bg-emerald-500/10 hover:text-emerald-400 border border-red-500/30'
                                                    }`}
                                                    title={`Click to ${user.status === 'active' ? 'Suspend' : 'Activate'} user`}
                                                >
                                                    {user.status === 'active' ? (
                                                        <>
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            <span>Active</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle className="w-3 h-3" />
                                                            <span>Suspended</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenEditModal(user)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors"
                                                    title="Edit User, Pricing & Quotas"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                {user.role !== 'superadmin' && (
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL: ADD / EDIT USER & VIRTUAL QUOTAS */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                    <form
                        onSubmit={handleSaveUser}
                        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 my-8"
                    >
                        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                            <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-blue-500" />
                                {editingUser ? 'Edit User, Pricing & Virtual Quotas' : 'Create New Tenant Admin'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Account Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. VR Here BMS"
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Username</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="vrherebms"
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Email (Optional)</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="admin@vrhere.com"
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                    {editingUser ? 'New Password (Leave blank to keep current)' : 'Password'}
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="admin">Resource Admin (Tenant)</option>
                                    <option value="superadmin">Super Admin (Full Server Access)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Access Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="active">Active (Access Granted)</option>
                                    <option value="suspended">Suspended (Access Blocked)</option>
                                </select>
                            </div>
                        </div>

                        {/* CUSTOM USER-WISE PRICING & PLAN */}
                        {formData.role === 'admin' && (
                            <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-emerald-400" />
                                        User-Wise Pricing & Subscription Plan
                                    </h4>
                                    <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                        Custom Client Rates
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Base Plan Template</label>
                                        <select
                                            value={formData.plan_id}
                                            onChange={(e) => handlePlanSelect(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white"
                                        >
                                            <option value="">Custom Package</option>
                                            {plans.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} ({p.currency === 'INR' ? '₹' : '$'}{p.price}/{p.interval_type})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Custom Plan Name</label>
                                        <input
                                            type="text"
                                            value={formData.plan_name}
                                            onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                                            placeholder="e.g. Dedicated Pro Plan"
                                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Custom Price</label>
                                        <div className="flex items-center gap-1">
                                            <select
                                                value={formData.currency}
                                                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                                className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-white"
                                            >
                                                <option value="INR">₹ INR</option>
                                                <option value="USD">$ USD</option>
                                            </select>
                                            <input
                                                type="number"
                                                value={formData.custom_price}
                                                onChange={(e) => setFormData({ ...formData, custom_price: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Billing Interval</label>
                                        <select
                                            value={formData.interval_type}
                                            onChange={(e) => setFormData({ ...formData, interval_type: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white"
                                        >
                                            <option value="monthly">Monthly</option>
                                            <option value="yearly">Yearly</option>
                                            <option value="quarterly">Quarterly</option>
                                            <option value="one-time">One-Time / Custom</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[11px] text-gray-400 mb-1">Next Renewal / Expiration Date</label>
                                        <input
                                            type="date"
                                            value={formData.renewal_date}
                                            onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* VIRTUAL QUOTAS CONFIGURATION */}
                        {formData.role === 'admin' && (
                            <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                                        <HardDrive className="w-4 h-4 text-purple-400" />
                                        Virtual Quotas (Numbers Displayed to Client)
                                    </h4>
                                    <span className="text-[11px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                                        Custom Display Metrics
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Display Disk (GB)</label>
                                        <input
                                            type="number"
                                            value={formData.quotas.display_disk_gb}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                quotas: { ...formData.quotas, display_disk_gb: parseInt(e.target.value, 10) || 0 }
                                            })}
                                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-white font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Display RAM (GB)</label>
                                        <input
                                            type="number"
                                            value={formData.quotas.display_memory_gb}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                quotas: { ...formData.quotas, display_memory_gb: parseInt(e.target.value, 10) || 0 }
                                            })}
                                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-white font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Display Cores</label>
                                        <input
                                            type="number"
                                            value={formData.quotas.display_cpu_cores}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                quotas: { ...formData.quotas, display_cpu_cores: parseInt(e.target.value, 10) || 0 }
                                            })}
                                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-white font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Bandwidth (GB)</label>
                                        <input
                                            type="number"
                                            value={formData.quotas.display_bandwidth_gb}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                quotas: { ...formData.quotas, display_bandwidth_gb: parseInt(e.target.value, 10) || 0 }
                                            })}
                                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-white font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ASSIGNED RESOURCES */}
                        {formData.role === 'admin' && (
                            <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 space-y-3">
                                <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-blue-400" />
                                    Assigned VPS Resources (Isolation)
                                </h4>
                                <p className="text-xs text-gray-400">
                                    Link specific PM2 apps, databases, or directory paths this user is authorized to manage.
                                </p>

                                <div className="flex items-center gap-2">
                                    <select
                                        value={newResourceType}
                                        onChange={(e) => setNewResourceType(e.target.value)}
                                        className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white"
                                    >
                                        <option value="pm2_app">PM2 App Name</option>
                                        <option value="mysql_db">MySQL Database</option>
                                        <option value="mongo_db">MongoDB Database</option>
                                        <option value="file_path">Directory Path</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder={
                                            newResourceType === 'pm2_app' 
                                                ? 'e.g. vrhere-api' 
                                                : newResourceType === 'mysql_db' 
                                                ? 'e.g. vrhere_db' 
                                                : newResourceType === 'mongo_db' 
                                                ? 'e.g. vrhere' 
                                                : 'e.g. /var/www/vrhere'
                                        }
                                        value={newResourceIdentifier}
                                        onChange={(e) => setNewResourceIdentifier(e.target.value)}
                                        className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddResource}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                                    >
                                        Add
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-1">
                                    {formData.resources.map((res, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 px-2.5 py-1 rounded-lg text-xs text-gray-200"
                                        >
                                            <span className="font-semibold text-blue-400">{res.type}:</span>
                                            <span>{res.identifier}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveResource(idx)}
                                                className="text-gray-500 hover:text-red-400 ml-1"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors shadow"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                {editingUser ? 'Update User' : 'Create User'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Users;
