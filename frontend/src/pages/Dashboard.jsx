import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Cpu, HardDrive, MemoryStick, Clock, Activity, Loader2 } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, description, trend }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-start gap-4">
        <div className="p-3 bg-gray-800 rounded-lg text-blue-500">
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <p className="text-gray-400 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
            {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
        </div>
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStats = async () => {
        try {
            const res = await api.get('/system/stats');
            setStats(res.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch system stats');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (error && !stats) {
        return <div className="text-red-500 text-center p-4 bg-red-500/10 rounded-lg border border-red-500/50">{error}</div>;
    }

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatUptime = (seconds) => {
        const d = Math.floor(seconds / (3600*24));
        const h = Math.floor(seconds % (3600*24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        return `${d}d ${h}h ${m}m`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white tracking-tight">System Overview</h1>
                <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
                    <Activity className="w-4 h-4 text-green-500 animate-pulse" />
                    Live Updates
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="CPU Usage" 
                    value={`${stats?.cpu.usage}%`} 
                    icon={Cpu} 
                    description={`${stats?.cpu.cores} Cores`} 
                />
                <StatCard 
                    title="Memory Usage" 
                    value={`${stats?.memory.usagePercent}%`} 
                    icon={MemoryStick} 
                    description={`${formatBytes(stats?.memory.used)} / ${formatBytes(stats?.memory.total)}`} 
                />
                <StatCard 
                    title="Disk Usage" 
                    value={`${stats?.disk.usagePercent}%`} 
                    icon={HardDrive} 
                    description={`${formatBytes(stats?.disk.used)} / ${formatBytes(stats?.disk.total)}`} 
                />
                <StatCard 
                    title="Uptime" 
                    value={formatUptime(stats?.system.uptime)} 
                    icon={Clock} 
                    description={stats?.system.platform} 
                />
            </div>
            
            {/* Future area for charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 min-h-[300px] flex items-center justify-center">
                    <p className="text-gray-500">CPU Chart Coming Soon</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 min-h-[300px] flex items-center justify-center">
                    <p className="text-gray-500">Memory Chart Coming Soon</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
