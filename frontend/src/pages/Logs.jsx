import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';
import { ScrollText, RefreshCw, AlertCircle, Loader2, Server } from 'lucide-react';

const Logs = () => {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'superadmin';

    const [apps, setApps] = useState([]);
    const [selectedApp, setSelectedApp] = useState('');
    const [logs, setLogs] = useState('');
    const [loading, setLoading] = useState(false);
    const [appsLoading, setAppsLoading] = useState(true);
    const [error, setError] = useState(null);
    const logsEndRef = useRef(null);

    useEffect(() => {
        const fetchApps = async () => {
            setAppsLoading(true);
            try {
                const res = await api.get('/apps');
                const appList = res.data || [];
                setApps(appList);

                if (isSuperAdmin) {
                    setSelectedApp('system');
                } else if (appList.length > 0) {
                    setSelectedApp(appList[0].name || String(appList[0].id));
                } else {
                    setSelectedApp('');
                }
            } catch (err) {
                console.error("Failed to fetch apps for logs");
            } finally {
                setAppsLoading(false);
            }
        };
        fetchApps();
    }, [isSuperAdmin]);

    const fetchLogs = async () => {
        if (!selectedApp) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/logs/${encodeURIComponent(selectedApp)}`);
            setLogs(res.data.logs || 'No logs recorded yet.');
            setTimeout(() => {
                logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch logs for this application.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedApp) {
            fetchLogs();
        }
    }, [selectedApp]);

    return (
        <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                        <ScrollText className="w-7 h-7 text-blue-500" />
                        Application & System Logs
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Live log streams from your allocated processes
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {appsLoading ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            Loading processes...
                        </div>
                    ) : apps.length === 0 && !isSuperAdmin ? (
                        <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
                            No PM2 Apps Assigned
                        </div>
                    ) : (
                        <select
                            value={selectedApp}
                            onChange={(e) => setSelectedApp(e.target.value)}
                            className="bg-gray-900 border border-gray-800 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-3.5 py-2 min-w-[200px]"
                        >
                            {isSuperAdmin && (
                                <option value="system">System Logs (Syslog)</option>
                            )}
                            {apps.map((app) => (
                                <option key={app.id} value={app.name || app.id}>
                                    {app.name} (PM2)
                                </option>
                            ))}
                        </select>
                    )}

                    <button 
                        onClick={fetchLogs}
                        disabled={loading || !selectedApp}
                        className="p-2.5 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-colors border border-gray-800 disabled:opacity-50"
                        title="Refresh Logs"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-500' : ''}`} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-3 shrink-0 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {!selectedApp && !loading && !appsLoading && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                    <Server className="w-10 h-10 text-gray-600" />
                    <p className="font-semibold text-white">No Assigned Application Selected</p>
                    <p className="text-xs text-gray-500 max-w-md">
                        Your account currently has no PM2 apps mapped, or no application was selected. Please contact your Super Administrator to map your applications.
                    </p>
                </div>
            )}

            {selectedApp && (
                <div className="flex-1 bg-[#0d1117] border border-gray-800 rounded-xl p-4 overflow-hidden flex flex-col relative font-mono text-xs shadow-inner">
                    {loading && !logs && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]/80 z-10">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    )}
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {logs}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Logs;
