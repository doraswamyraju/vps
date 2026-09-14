import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    CreditCard,
    Plus,
    Check,
    HardDrive,
    MemoryStick,
    Cpu,
    Server,
    Database,
    Edit3,
    Trash2,
    Loader2,
    X,
    Sparkles
} from 'lucide-react';

const Plans = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        price: 499,
        currency: 'INR',
        interval_type: 'monthly',
        display_disk_gb: 50,
        display_memory_gb: 4,
        display_cpu_cores: 2,
        display_bandwidth_gb: 500,
        max_apps: 3,
        max_databases: 3
    });

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const res = await api.get('/plans');
            setPlans(res.data);
        } catch (err) {
            console.error('Error fetching plans:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleOpenCreate = () => {
        setEditingPlan(null);
        setFormData({
            name: '',
            price: 499,
            currency: 'INR',
            interval_type: 'monthly',
            display_disk_gb: 50,
            display_memory_gb: 4,
            display_cpu_cores: 2,
            display_bandwidth_gb: 500,
            max_apps: 3,
            max_databases: 3
        });
        setModalOpen(true);
    };

    const handleOpenEdit = (plan) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            price: plan.price,
            currency: plan.currency || 'INR',
            interval_type: plan.interval_type || 'monthly',
            display_disk_gb: plan.display_disk_gb || 50,
            display_memory_gb: plan.display_memory_gb || 4,
            display_cpu_cores: plan.display_cpu_cores || 2,
            display_bandwidth_gb: plan.display_bandwidth_gb || 500,
            max_apps: plan.max_apps || 3,
            max_databases: plan.max_databases || 3
        });
        setModalOpen(true);
    };

    const handleSavePlan = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingPlan) {
                await api.put(`/plans/${editingPlan.id}`, formData);
            } else {
                await api.post('/plans', formData);
            }
            setModalOpen(false);
            fetchPlans();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save plan');
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePlan = async (id) => {
        if (!window.confirm('Are you sure you want to delete this plan?')) return;
        try {
            await api.delete(`/plans/${id}`);
            fetchPlans();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete plan');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                        <CreditCard className="w-7 h-7 text-blue-500" />
                        Hosting Plans & Pricing Tiers
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Configure virtual quota tiers and subscription packages for tenant accounts.
                    </p>
                </div>

                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow"
                >
                    <Plus className="w-4 h-4" />
                    Create New Plan
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                    <p className="text-sm">Loading plans...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className="bg-gray-900 border border-gray-800 hover:border-blue-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all relative overflow-hidden"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-lg text-white">{plan.name}</h3>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleOpenEdit(plan)}
                                            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors"
                                            title="Edit Plan"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeletePlan(plan.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
                                            title="Delete Plan"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <span className="text-3xl font-extrabold text-white">
                                        {plan.currency === 'INR' ? '₹' : '$'}{plan.price}
                                    </span>
                                    <span className="text-xs text-gray-500 font-medium"> / {plan.interval_type}</span>
                                </div>

                                {/* Quota Features List */}
                                <div className="space-y-3 pt-4 border-t border-gray-800 text-sm">
                                    <div className="flex items-center gap-2.5 text-gray-300">
                                        <HardDrive className="w-4 h-4 text-purple-400" />
                                        <span className="font-semibold text-white">{plan.display_disk_gb} GB</span>
                                        <span className="text-gray-400 text-xs">Virtual Storage</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-gray-300">
                                        <MemoryStick className="w-4 h-4 text-blue-400" />
                                        <span className="font-semibold text-white">{plan.display_memory_gb} GB</span>
                                        <span className="text-gray-400 text-xs">RAM Allocation</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-gray-300">
                                        <Cpu className="w-4 h-4 text-amber-400" />
                                        <span className="font-semibold text-white">{plan.display_cpu_cores} Virtual Cores</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-gray-300">
                                        <Server className="w-4 h-4 text-emerald-400" />
                                        <span className="font-semibold text-white">Up to {plan.max_apps}</span>
                                        <span className="text-gray-400 text-xs">PM2 Apps</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-gray-300">
                                        <Database className="w-4 h-4 text-cyan-400" />
                                        <span className="font-semibold text-white">Up to {plan.max_databases}</span>
                                        <span className="text-gray-400 text-xs">Databases</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL: ADD / EDIT PLAN */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <form
                        onSubmit={handleSavePlan}
                        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4"
                    >
                        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                            <h3 className="font-bold text-white text-lg">
                                {editingPlan ? 'Edit Hosting Plan' : 'Create New Hosting Plan'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-400 mb-1">Plan Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Starter Cloud"
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Price (₹ / $)</label>
                                <input
                                    type="number"
                                    required
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Billing Interval</label>
                                <select
                                    value={formData.interval_type}
                                    onChange={(e) => setFormData({ ...formData, interval_type: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white"
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Display Disk (GB)</label>
                                <input
                                    type="number"
                                    value={formData.display_disk_gb}
                                    onChange={(e) => setFormData({ ...formData, display_disk_gb: parseInt(e.target.value, 10) || 0 })}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Display RAM (GB)</label>
                                <input
                                    type="number"
                                    value={formData.display_memory_gb}
                                    onChange={(e) => setFormData({ ...formData, display_memory_gb: parseInt(e.target.value, 10) || 0 })}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Display Cores</label>
                                <input
                                    type="number"
                                    value={formData.display_cpu_cores}
                                    onChange={(e) => setFormData({ ...formData, display_cpu_cores: parseInt(e.target.value, 10) || 0 })}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Max Apps</label>
                                <input
                                    type="number"
                                    value={formData.max_apps}
                                    onChange={(e) => setFormData({ ...formData, max_apps: parseInt(e.target.value, 10) || 0 })}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                                />
                            </div>
                        </div>

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
                                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                {editingPlan ? 'Update Plan' : 'Create Plan'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Plans;
