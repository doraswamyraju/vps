import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Database, AlertCircle, Loader2, Activity, Server, Clock, RefreshCw, Layers, HardDrive, ShieldCheck, Terminal } from 'lucide-react';

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatUptime = (seconds) => {
    if (!seconds) return '0m';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

const Databases = () => {
    const [dbInfo, setDbInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorData, setErrorData] = useState(null);

    const fetchDbInfo = async () => {
        setLoading(true);
        try {
            const res = await api.get('/db/status');
            setDbInfo(res.data);
            setErrorData(null);
        } catch (err) {
            setErrorData(err.response?.data || { message: 'Failed to connect to MySQL database.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDbInfo();
        const interval = setInterval(fetchDbInfo, 30000); // 30s
        return () => clearInterval(interval);
    }, []);

    const totalStorage = dbInfo?.databases?.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0) || 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                        <Database className="w-7 h-7 text-blue-500" />
                        MySQL Databases
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Live database service health and storage usage</p>
                </div>

                <button
                    onClick={fetchDbInfo}
                    className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {errorData ? (
                <div className="space-y-4">
                    <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-5 rounded-xl space-y-3">
                        <div className="flex items-center gap-3 font-semibold text-base text-red-300">
                            <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-400" />
                            {errorData.message || 'MySQL Connection Failed'}
                        </div>
                        {errorData.error && (
                            <p className="text-xs font-mono bg-black/40 text-red-300 p-3 rounded-lg border border-red-500/20">
                                {errorData.error}
                            </p>
                        )}
                        {errorData.tip && (
                            <div className="text-xs text-gray-300 bg-gray-900/60 p-3 rounded-lg border border-gray-800">
                                <span className="text-amber-400 font-semibold">💡 Diagnostic Suggestion: </span>
                                {errorData.tip}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {/* Health Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs font-medium uppercase">Service Status</p>
                                <h3 className="text-xl font-bold text-emerald-400 mt-0.5">Online</h3>
                                <p className="text-xs text-gray-500 font-mono mt-0.5">MySQL {dbInfo?.version}</p>
                            </div>
                        </div>

                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs font-medium uppercase">Uptime</p>
                                <h3 className="text-xl font-bold text-white mt-0.5">{formatUptime(dbInfo?.uptime)}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{dbInfo?.totalQueries?.toLocaleString()} Queries</p>
                            </div>
                        </div>

                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
                            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs font-medium uppercase">Active Threads</p>
                                <h3 className="text-xl font-bold text-white mt-0.5">{dbInfo?.activeConnections || 0}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Client connections</p>
                            </div>
                        </div>

                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
                                <HardDrive className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs font-medium uppercase">Total DB Size</p>
                                <h3 className="text-xl font-bold text-white mt-0.5">{formatBytes(totalStorage)}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{dbInfo?.databases?.length || 0} Databases</p>
                            </div>
                        </div>
                    </div>

                    {/* Databases List */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Layers className="w-5 h-5 text-blue-400" />
                                Available Databases ({dbInfo?.databases?.length || 0})
                            </h2>
                        </div>

                        {dbInfo?.databases?.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No user databases found.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {dbInfo?.databases?.map((db, idx) => (
                                    <div
                                        key={idx}
                                        className="p-4 rounded-xl bg-gray-950/60 border border-gray-800 hover:border-blue-500/40 transition-colors flex flex-col justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                                <Database className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-semibold text-white truncate text-sm">
                                                    {db.name}
                                                </h3>
                                                <p className="text-xs text-gray-500">
                                                    {db.tableCount} tables
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs">
                                            <span className="text-gray-500">Storage Used</span>
                                            <span className="font-mono font-medium text-gray-300">
                                                {formatBytes(db.sizeBytes)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Databases;
