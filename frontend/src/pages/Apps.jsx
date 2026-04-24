import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Play, Square, RotateCw, Server, Loader2, AlertCircle } from 'lucide-react';

const Apps = () => {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    const fetchApps = async () => {
        try {
            const res = await api.get('/apps');
            setApps(res.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch PM2 apps. Is PM2 running?');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApps();
        const interval = setInterval(fetchApps, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleAction = async (id, action) => {
        setActionLoading(`${action}-${id}`);
        try {
            await api.post(`/apps/${action}/${id}`);
            await fetchApps();
        } catch (err) {
            alert(`Failed to ${action} app`);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading && apps.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">PM2 Applications</h1>
                    <p className="text-sm text-gray-400 mt-1">Manage your Node.js processes</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {apps.length === 0 && !loading && !error && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
                        <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        No PM2 applications found.
                    </div>
                )}
                {apps.map((app) => (
                    <div key={app.pm_id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:border-gray-700">
                        <div className="flex items-center gap-4 flex-1">
                            <div className={`w-3 h-3 rounded-full ${app.pm2_env.status === 'online' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                            <div>
                                <h3 className="text-xl font-bold text-white">{app.name}</h3>
                                <div className="flex gap-4 mt-1 text-sm text-gray-400 font-mono">
                                    <span>ID: {app.pm_id}</span>
                                    <span>MEM: {(app.monit.memory / 1024 / 1024).toFixed(1)} MB</span>
                                    <span>CPU: {app.monit.cpu}%</span>
                                    <span>Restarts: {app.pm2_env.restart_time}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <button
                                onClick={() => handleAction(app.pm_id, 'start')}
                                disabled={app.pm2_env.status === 'online' || !!actionLoading}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-green-600 hover:text-white text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 hover:border-transparent"
                            >
                                {actionLoading === `start-${app.pm_id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                Start
                            </button>
                            <button
                                onClick={() => handleAction(app.pm_id, 'restart')}
                                disabled={!!actionLoading}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 hover:border-transparent"
                            >
                                {actionLoading === `restart-${app.pm_id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                                Restart
                            </button>
                            <button
                                onClick={() => handleAction(app.pm_id, 'stop')}
                                disabled={app.pm2_env.status !== 'online' || !!actionLoading}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-red-600 hover:text-white text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 hover:border-transparent"
                            >
                                {actionLoading === `stop-${app.pm_id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                                Stop
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Apps;
