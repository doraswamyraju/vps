import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { ScrollText, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

const Logs = () => {
    const [apps, setApps] = useState([]);
    const [selectedApp, setSelectedApp] = useState('system'); // default or PM2 app id
    const [logs, setLogs] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const logsEndRef = useRef(null);

    useEffect(() => {
        // Fetch apps to populate dropdown
        const fetchApps = async () => {
            try {
                const res = await api.get('/apps');
                setApps(res.data);
            } catch (err) {
                console.error("Failed to fetch apps for logs");
            }
        };
        fetchApps();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = selectedApp === 'system' ? '/logs/system' : `/logs/app/${selectedApp}`;
            const res = await api.get(endpoint);
            setLogs(res.data.logs || 'No logs available.');
            // Scroll to bottom
            setTimeout(() => {
                logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (err) {
            setError('Failed to fetch logs. Backend might not support this app or system logs.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [selectedApp]);

    return (
        <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">System Logs</h1>
                    <p className="text-sm text-gray-400 mt-1">View real-time logs for system and PM2 apps</p>
                </div>
                <div className="flex items-center gap-4">
                    <select
                        value={selectedApp}
                        onChange={(e) => setSelectedApp(e.target.value)}
                        className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 transition-colors"
                    >
                        <option value="system">System Logs (Syslog)</option>
                        {apps.map(app => (
                            <option key={app.id} value={app.id}>
                                {app.name} (PM2)
                            </option>
                        ))}
                    </select>
                    <button 
                        onClick={fetchLogs}
                        disabled={loading}
                        className="p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors border border-gray-700 disabled:opacity-50"
                        title="Refresh Logs"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-blue-500' : ''}`} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl flex items-center gap-3 shrink-0">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <div className="flex-1 bg-[#0d1117] border border-gray-800 rounded-xl p-4 overflow-hidden flex flex-col relative font-mono text-sm shadow-inner">
                {loading && !logs && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]/80 z-10">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                )}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar text-gray-300 whitespace-pre-wrap">
                    {logs}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
};

export default Logs;
