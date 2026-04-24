import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Database, AlertCircle, Loader2, Activity, Globe } from 'lucide-react';

const MongoDB = () => {
    const [dbInfo, setDbInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDbInfo = async () => {
            try {
                const res = await api.get('/mongodb/status');
                setDbInfo(res.data);
                setError(null);
            } catch (err) {
                setError('Failed to connect to MongoDB. Check credentials or server status.');
            } finally {
                setLoading(false);
            }
        };

        fetchDbInfo();
        const interval = setInterval(fetchDbInfo, 30000); // 30s
        return () => clearInterval(interval);
    }, []);

    if (loading && !dbInfo) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">MongoDB Databases</h1>
                    <p className="text-sm text-gray-400 mt-1">Monitor document-based storage</p>
                </div>
            </div>

            {error ? (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
                                <Activity className="w-6 h-6 text-green-500" />
                                <h2 className="text-lg font-bold text-white">Instance Status</h2>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Status</span>
                                    <span className="text-green-500 font-medium">Online</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Version</span>
                                    <span className="text-white font-mono">{dbInfo?.version || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Connections</span>
                                    <span className="text-white font-mono">{dbInfo?.connections || '0'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Uptime</span>
                                    <span className="text-white font-mono">{(dbInfo?.uptime / 3600).toFixed(1)}h</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
                                <Database className="w-6 h-6 text-green-500" />
                                <h2 className="text-lg font-bold text-white">Active Databases</h2>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {dbInfo?.databases?.map((db, idx) => (
                                    <div key={idx} className="p-4 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-between hover:border-green-500/50 transition-colors cursor-default">
                                        <div className="flex items-center gap-3">
                                            <Globe className="w-5 h-5 text-gray-400" />
                                            <span className="text-white font-medium">{db.name}</span>
                                        </div>
                                        <span className="text-xs text-gray-500">{(db.sizeOnDisk / (1024 * 1024)).toFixed(2)} MB</span>
                                    </div>
                                ))}
                                {dbInfo?.databases?.length === 0 && (
                                    <p className="text-gray-500 col-span-2 text-center py-4">No databases found.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MongoDB;
