import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Database, AlertCircle, Loader2, Activity, Globe, ChevronRight, Table, Layers, ArrowLeft } from 'lucide-react';

const MongoDB = () => {
    const [dbInfo, setDbInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDb, setSelectedDb] = useState(null);
    const [collections, setCollections] = useState([]);
    const [loadingCollections, setLoadingCollections] = useState(false);

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

    const exploreDatabase = async (dbName) => {
        setSelectedDb(dbName);
        setLoadingCollections(true);
        try {
            const res = await api.get(`/mongodb/collections/${dbName}`);
            setCollections(res.data);
        } catch (err) {
            console.error('Failed to fetch collections');
        } finally {
            setLoadingCollections(false);
        }
    };

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
                    <h1 className="text-2xl font-bold text-white tracking-tight">MongoDB Explorer</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        {selectedDb ? (
                            <button 
                                onClick={() => setSelectedDb(null)}
                                className="flex items-center gap-1 text-green-500 hover:underline"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to Databases
                            </button>
                        ) : (
                            'Monitor and explore document-based storage'
                        )}
                    </p>
                </div>
            </div>

            {error ? (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sidebar Stats */}
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
                                    <span className="text-white font-mono">{dbInfo?.version || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Total DBs</span>
                                    <span className="text-white font-mono">{dbInfo?.databases?.length || 0}</span>
                                </div>
                            </div>
                        </div>

                        {selectedDb && (
                            <div className="bg-green-600/10 border border-green-500/30 rounded-xl p-6">
                                <div className="flex items-center gap-3 mb-2 text-green-500">
                                    <Layers className="w-5 h-5" />
                                    <span className="font-bold">Exploring DB</span>
                                </div>
                                <div className="text-2xl font-bold text-white mb-4">{selectedDb}</div>
                                <div className="text-sm text-gray-400">
                                    {collections.length} collections found
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Main Explorer */}
                    <div className="lg:col-span-2">
                        {!selectedDb ? (
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                                <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
                                    <Database className="w-6 h-6 text-green-500" />
                                    <h2 className="text-lg font-bold text-white">Select a Database</h2>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-3">
                                    {dbInfo?.databases?.map((db, idx) => (
                                        <button 
                                            key={idx} 
                                            onClick={() => exploreDatabase(db.name)}
                                            className="group p-4 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-between hover:border-green-500/50 hover:bg-gray-800/80 transition-all text-left"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                                                    <Globe className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="text-white font-bold group-hover:text-green-500 transition-colors">{db.name}</div>
                                                    <div className="text-xs text-gray-500">{(db.sizeOnDisk / (1024 * 1024)).toFixed(2)} MB</div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 min-h-[400px]">
                                <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                                    <div className="flex items-center gap-3">
                                        <Table className="w-6 h-6 text-green-500" />
                                        <h2 className="text-lg font-bold text-white">Collections</h2>
                                    </div>
                                    <button 
                                        onClick={() => exploreDatabase(selectedDb)}
                                        className="text-xs text-green-500 hover:underline"
                                    >
                                        Refresh
                                    </button>
                                </div>

                                {loadingCollections ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
                                        <span className="text-gray-500 animate-pulse">Reading collections...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {collections.map((col, idx) => (
                                            <div 
                                                key={idx}
                                                className="p-4 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-between hover:bg-gray-800 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                                    <span className="text-white font-mono">{col.name}</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs">
                                                    <span className="text-gray-500"><span className="text-gray-300">{col.count}</span> docs</span>
                                                    <span className="text-gray-500"><span className="text-gray-300">{(col.size / 1024).toFixed(1)}</span> KB</span>
                                                </div>
                                            </div>
                                        ))}
                                        {collections.length === 0 && (
                                            <div className="text-center py-10 text-gray-500">
                                                No collections found in this database.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MongoDB;
