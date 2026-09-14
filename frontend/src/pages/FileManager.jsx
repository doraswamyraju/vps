import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    Folder,
    FileText,
    FileCode,
    FileSpreadsheet,
    FileArchive,
    FileImage,
    File,
    ChevronRight,
    HardDrive,
    ArrowLeft,
    RefreshCw,
    Search,
    Plus,
    FolderPlus,
    FilePlus,
    Download,
    Trash2,
    Edit3,
    Eye,
    Save,
    X,
    AlertTriangle,
    Loader2,
    BarChart2,
    List,
    Clock,
    Shield
} from 'lucide-react';

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (item) => {
    if (item.isDirectory) {
        return <Folder className="w-5 h-5 text-amber-400 fill-amber-400/20" />;
    }
    const ext = item.extension || '';
    if (['.js', '.jsx', '.ts', '.tsx', '.py', '.php', '.html', '.css', '.sh', '.bash'].includes(ext)) {
        return <FileCode className="w-5 h-5 text-blue-400" />;
    }
    if (['.json', '.yaml', '.yml', '.env', '.conf', '.config', '.ini', '.xml'].includes(ext)) {
        return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
    }
    if (['.log', '.txt', '.md'].includes(ext)) {
        return <FileText className="w-5 h-5 text-gray-300" />;
    }
    if (['.zip', '.tar', '.gz', '.rar', '.7z'].includes(ext)) {
        return <FileArchive className="w-5 h-5 text-purple-400" />;
    }
    if (['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', '.ico'].includes(ext)) {
        return <FileImage className="w-5 h-5 text-pink-400" />;
    }
    return <File className="w-5 h-5 text-gray-400" />;
};

const FileManager = () => {
    const [currentPath, setCurrentPath] = useState('/');
    const [parentPath, setParentPath] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('explorer'); // 'explorer' | 'storage'

    // Storage breakdown state
    const [breakdownItems, setBreakdownItems] = useState([]);
    const [totalAnalyzedBytes, setTotalAnalyzedBytes] = useState(0);
    const [breakdownLoading, setBreakdownLoading] = useState(false);

    // Editor Modal state
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingFile, setEditingFile] = useState(null);
    const [fileContent, setFileContent] = useState('');
    const [savingFile, setSavingFile] = useState(false);
    const [editorError, setEditorError] = useState(null);

    // New File/Folder Modal
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createType, setCreateType] = useState('folder'); // 'folder' | 'file'
    const [newItemName, setNewItemName] = useState('');

    // Rename Modal
    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [itemToRename, setItemToRename] = useState(null);
    const [newName, setNewName] = useState('');

    // Delete Modal
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // Notification toast
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchDirectory = async (targetPath) => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/files/list?path=${encodeURIComponent(targetPath || '/')}`);
            setCurrentPath(res.data.currentPath);
            setParentPath(res.data.parentPath);
            setItems(res.data.items);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load directory');
        } finally {
            setLoading(false);
        }
    };

    const fetchBreakdown = async (targetPath) => {
        setBreakdownLoading(true);
        try {
            const res = await api.get(`/files/storage-breakdown?path=${encodeURIComponent(targetPath || '/')}`);
            setBreakdownItems(res.data.items || []);
            setTotalAnalyzedBytes(res.data.totalAnalyzedBytes || 0);
        } catch (err) {
            console.error('Failed to fetch storage breakdown:', err);
        } finally {
            setBreakdownLoading(false);
        }
    };

    useEffect(() => {
        fetchDirectory(currentPath);
        if (activeTab === 'storage') {
            fetchBreakdown(currentPath);
        }
    }, [currentPath]);

    useEffect(() => {
        if (activeTab === 'storage') {
            fetchBreakdown(currentPath);
        }
    }, [activeTab]);

    const handleNavigate = (path) => {
        setSearchQuery('');
        setCurrentPath(path);
    };

    const handleOpenFile = async (item) => {
        if (item.isDirectory) {
            handleNavigate(item.path);
            return;
        }

        setEditorError(null);
        try {
            const res = await api.get(`/files/content?path=${encodeURIComponent(item.path)}`);
            if (res.data.isBinary) {
                showToast('Binary file cannot be edited in browser', 'error');
                return;
            }
            setEditingFile(res.data);
            setFileContent(res.data.content || '');
            setEditorOpen(true);
        } catch (err) {
            showToast(err.response?.data?.message || 'Error opening file', 'error');
        }
    };

    const handleSaveFile = async () => {
        if (!editingFile) return;
        setSavingFile(true);
        try {
            await api.post('/files/save', {
                path: editingFile.path,
                content: fileContent
            });
            showToast('File saved successfully');
            setEditorOpen(false);
            fetchDirectory(currentPath);
        } catch (err) {
            setEditorError(err.response?.data?.message || 'Failed to save file');
        } finally {
            setSavingFile(false);
        }
    };

    const handleCreateItem = async (e) => {
        e.preventDefault();
        if (!newItemName.trim()) return;

        try {
            await api.post('/files/create', {
                currentPath,
                name: newItemName.trim(),
                type: createType
            });
            showToast(`${createType === 'folder' ? 'Folder' : 'File'} created successfully`);
            setCreateModalOpen(false);
            setNewItemName('');
            fetchDirectory(currentPath);
            if (activeTab === 'storage') fetchBreakdown(currentPath);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to create item', 'error');
        }
    };

    const handleRenameItem = async (e) => {
        e.preventDefault();
        if (!newName.trim() || !itemToRename) return;

        try {
            await api.post('/files/rename', {
                oldPath: itemToRename.path,
                newName: newName.trim()
            });
            showToast('Item renamed successfully');
            setRenameModalOpen(false);
            setItemToRename(null);
            setNewName('');
            fetchDirectory(currentPath);
            if (activeTab === 'storage') fetchBreakdown(currentPath);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to rename item', 'error');
        }
    };

    const handleDeleteItem = async () => {
        if (!itemToDelete) return;

        try {
            await api.delete(`/files/delete?path=${encodeURIComponent(itemToDelete.path)}`);
            showToast('Item deleted successfully');
            setDeleteModalOpen(false);
            setItemToDelete(null);
            fetchDirectory(currentPath);
            if (activeTab === 'storage') fetchBreakdown(currentPath);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to delete item', 'error');
        }
    };

    const handleDownload = (item) => {
        const token = localStorage.getItem('token');
        const downloadUrl = `/api/files/download?path=${encodeURIComponent(item.path)}`;
        
        // Use anchor with authorization if using direct download or create fetch blob
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.target = '_blank';
        // Download using axios blob for auth header support
        api.get(downloadUrl, { responseType: 'blob' })
            .then((response) => {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', item.name);
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
            })
            .catch((err) => {
                showToast('Failed to download file', 'error');
            });
    };

    // Breadcrumbs parsing
    const renderBreadcrumbs = () => {
        const isWindows = currentPath.includes('\\') || /^[A-Za-z]:/.test(currentPath);
        const separator = isWindows ? '\\' : '/';
        const parts = currentPath.split(/[/\\]/).filter(Boolean);

        return (
            <div className="flex items-center flex-wrap gap-1 text-sm bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
                <button
                    onClick={() => handleNavigate(isWindows ? 'C:\\' : '/')}
                    className="flex items-center gap-1 text-gray-400 hover:text-white px-1.5 py-0.5 rounded transition-colors font-medium"
                >
                    <HardDrive className="w-4 h-4 text-blue-400" />
                    <span>{isWindows ? 'Root' : '/'}</span>
                </button>
                {parts.map((part, idx) => {
                    const pathSoFar = isWindows
                        ? parts.slice(0, idx + 1).join('\\') + (idx === 0 && part.endsWith(':') ? '\\' : '')
                        : '/' + parts.slice(0, idx + 1).join('/');
                    const isLast = idx === parts.length - 1;

                    return (
                        <React.Fragment key={idx}>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                            <button
                                onClick={() => handleNavigate(pathSoFar)}
                                className={`px-1.5 py-0.5 rounded transition-colors font-medium ${
                                    isLast ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {part}
                            </button>
                        </React.Fragment>
                    );
                })}
            </div>
        );
    };

    const filteredItems = items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const quickShortcuts = [
        { label: 'Root (/)', path: '/' },
        { label: '/var/www', path: '/var/www' },
        { label: '/var/log', path: '/var/log' },
        { label: '/etc', path: '/etc' },
        { label: '/home', path: '/home' }
    ];

    return (
        <div className="space-y-6">
            {/* Toast Alert */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border flex items-center gap-2 transition-all ${
                    toast.type === 'error' 
                        ? 'bg-red-950/90 border-red-800 text-red-200' 
                        : 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
                }`}>
                    {toast.type === 'error' ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <Shield className="w-5 h-5 text-emerald-400" />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                        <HardDrive className="w-7 h-7 text-blue-500" />
                        File Manager & Disk Explorer
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Inspect disk space distribution, explore directory trees, and edit server configs.
                    </p>
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('explorer')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'explorer'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <List className="w-4 h-4" />
                        File Explorer
                    </button>
                    <button
                        onClick={() => setActiveTab('storage')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'storage'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <BarChart2 className="w-4 h-4" />
                        Disk Storage Breakdown
                    </button>
                </div>
            </div>

            {/* Quick Shortcuts Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-gray-500 font-medium">Quick Jump:</span>
                {quickShortcuts.map((sc, i) => (
                    <button
                        key={i}
                        onClick={() => handleNavigate(sc.path)}
                        className="bg-gray-900 hover:bg-gray-800 text-gray-300 px-2.5 py-1 rounded-md border border-gray-800 transition-colors whitespace-nowrap"
                    >
                        {sc.label}
                    </button>
                ))}
            </div>

            {/* Breadcrumb Navigation & Action Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex-1 flex items-center gap-2 min-w-0">
                    {parentPath && (
                        <button
                            onClick={() => handleNavigate(parentPath)}
                            className="p-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors"
                            title="Go to parent directory"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}
                    <div className="flex-1 min-w-0">
                        {renderBreadcrumbs()}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {activeTab === 'explorer' && (
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-44 md:w-56"
                            />
                        </div>
                    )}

                    <button
                        onClick={() => {
                            setCreateType('folder');
                            setCreateModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        <FolderPlus className="w-4 h-4 text-amber-400" />
                        <span className="hidden sm:inline">New Folder</span>
                    </button>

                    <button
                        onClick={() => {
                            setCreateType('file');
                            setCreateModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        <FilePlus className="w-4 h-4 text-blue-400" />
                        <span className="hidden sm:inline">New File</span>
                    </button>

                    <button
                        onClick={() => {
                            fetchDirectory(currentPath);
                            if (activeTab === 'storage') fetchBreakdown(currentPath);
                        }}
                        className="p-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading || breakdownLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            {activeTab === 'storage' ? (
                /* STORAGE BREAKDOWN VIEW */
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-800">
                        <div>
                            <h2 className="text-lg font-bold text-white">Disk Space Consumers in Current Folder</h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Top largest subdirectories & files sorted by space consumed. Click any folder to drill down.
                            </p>
                        </div>
                        <div className="text-sm font-medium bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-1 rounded-full self-start">
                            Analyzed Total: <span className="font-bold">{formatBytes(totalAnalyzedBytes)}</span>
                        </div>
                    </div>

                    {breakdownLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            <p className="text-sm">Calculating directory disk consumption...</p>
                        </div>
                    ) : breakdownItems.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No files or subdirectories found in this path.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {breakdownItems.map((item, idx) => {
                                const percentNum = parseFloat(item.percent) || 0;
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => item.isDirectory && handleNavigate(item.path)}
                                        className={`p-3.5 rounded-xl border border-gray-800/80 transition-all ${
                                            item.isDirectory
                                                ? 'bg-gray-950/60 hover:bg-gray-800/60 cursor-pointer border-blue-500/10 hover:border-blue-500/40'
                                                : 'bg-gray-950/40'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-4 mb-2">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {item.isDirectory ? (
                                                    <Folder className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                                ) : (
                                                    <File className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                )}
                                                <span className="font-medium text-white truncate text-sm">
                                                    {item.name}
                                                </span>
                                                {item.isDirectory && (
                                                    <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                        DIR
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 flex-shrink-0 text-sm">
                                                <span className="font-bold text-gray-200">{formatBytes(item.sizeBytes)}</span>
                                                <span className="text-gray-500 font-mono text-xs w-12 text-right">{item.percent}%</span>
                                            </div>
                                        </div>

                                        {/* Colored Progress Bar */}
                                        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    percentNum > 50
                                                        ? 'bg-gradient-to-r from-red-500 to-rose-400'
                                                        : percentNum > 20
                                                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                                        : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                                                }`}
                                                style={{ width: `${Math.max(percentNum, 1)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                /* FILE EXPLORER VIEW */
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            <p className="text-sm">Loading folder contents...</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            {searchQuery ? 'No items match your search.' : 'This directory is empty.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-800 bg-gray-950/50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        <th className="py-3.5 px-4">Name</th>
                                        <th className="py-3.5 px-4 w-28">Size</th>
                                        <th className="py-3.5 px-4 w-32 hidden md:table-cell">Permissions</th>
                                        <th className="py-3.5 px-4 w-44 hidden sm:table-cell">Modified</th>
                                        <th className="py-3.5 px-4 w-36 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/60 text-sm">
                                    {filteredItems.map((item, idx) => (
                                        <tr
                                            key={idx}
                                            onDoubleClick={() => handleOpenFile(item)}
                                            className="hover:bg-gray-800/50 transition-colors group cursor-pointer"
                                        >
                                            <td className="py-3 px-4">
                                                <div 
                                                    onClick={() => handleOpenFile(item)}
                                                    className="flex items-center gap-3 min-w-0"
                                                >
                                                    {getFileIcon(item)}
                                                    <span className={`font-medium truncate ${
                                                        item.isDirectory ? 'text-blue-300 hover:text-blue-400 hover:underline' : 'text-gray-200'
                                                    }`}>
                                                        {item.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-gray-400 font-mono text-xs">
                                                {item.isDirectory ? '-' : formatBytes(item.size)}
                                            </td>
                                            <td className="py-3 px-4 text-gray-500 font-mono text-xs hidden md:table-cell">
                                                {item.permissions || '-'}
                                            </td>
                                            <td className="py-3 px-4 text-gray-400 text-xs hidden sm:table-cell">
                                                {item.modified ? new Date(item.modified).toLocaleString() : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    {!item.isDirectory && (
                                                        <button
                                                            onClick={() => handleOpenFile(item)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors"
                                                            title="View / Edit"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {!item.isDirectory && (
                                                        <button
                                                            onClick={() => handleDownload(item)}
                                                            className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-gray-800 rounded transition-colors"
                                                            title="Download"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setItemToRename(item);
                                                            setNewName(item.name);
                                                            setRenameModalOpen(true);
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-gray-800 rounded transition-colors"
                                                        title="Rename"
                                                    >
                                                        <Edit3 className="w-4 h-4 opacity-50" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setItemToDelete(item);
                                                            setDeleteModalOpen(true);
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL: FILE EDITOR / VIEWER */}
            {editorOpen && editingFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Editor Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/80">
                            <div className="flex items-center gap-3 min-w-0">
                                <FileCode className="w-5 h-5 text-blue-400" />
                                <div className="truncate">
                                    <h3 className="font-bold text-white text-base truncate">{editingFile.name}</h3>
                                    <p className="text-xs text-gray-500 font-mono truncate">{editingFile.path}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400 font-mono bg-gray-800 px-2.5 py-1 rounded">
                                    {formatBytes(editingFile.size)}
                                </span>
                                <button
                                    onClick={handleSaveFile}
                                    disabled={savingFile}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow"
                                >
                                    {savingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save
                                </button>
                                <button
                                    onClick={() => setEditorOpen(false)}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Editor Error */}
                        {editorError && (
                            <div className="bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs px-6 py-2">
                                {editorError}
                            </div>
                        )}

                        {/* Editor Body */}
                        <div className="flex-1 p-4 bg-black/90">
                            <textarea
                                value={fileContent}
                                onChange={(e) => setFileContent(e.target.value)}
                                spellCheck="false"
                                className="w-full h-full bg-transparent font-mono text-sm text-gray-200 focus:outline-none resize-none leading-relaxed selection:bg-blue-500/30"
                                placeholder="File is empty"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: CREATE FILE OR FOLDER */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <form
                        onSubmit={handleCreateItem}
                        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                {createType === 'folder' ? <FolderPlus className="w-5 h-5 text-amber-400" /> : <FilePlus className="w-5 h-5 text-blue-400" />}
                                Create New {createType === 'folder' ? 'Folder' : 'File'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                {createType === 'folder' ? 'Folder Name' : 'File Name (e.g. app.config.js)'}
                            </label>
                            <input
                                type="text"
                                autoFocus
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                placeholder={createType === 'folder' ? 'my-folder' : 'new-file.txt'}
                                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(false)}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!newItemName.trim()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                                Create
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL: RENAME ITEM */}
            {renameModalOpen && itemToRename && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <form
                        onSubmit={handleRenameItem}
                        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                <Edit3 className="w-5 h-5 text-amber-400" />
                                Rename Item
                            </h3>
                            <button
                                type="button"
                                onClick={() => setRenameModalOpen(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                New Name
                            </label>
                            <input
                                type="text"
                                autoFocus
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setRenameModalOpen(false)}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!newName.trim() || newName === itemToRename.name}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                                Rename
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL: DELETE CONFIRMATION */}
            {deleteModalOpen && itemToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-red-400">
                            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                            <h3 className="font-bold text-white text-lg">Confirm Deletion</h3>
                        </div>

                        <p className="text-gray-300 text-sm">
                            Are you sure you want to permanently delete{' '}
                            <span className="font-semibold text-white font-mono bg-gray-800 px-1.5 py-0.5 rounded">
                                {itemToDelete.name}
                            </span>
                            {itemToDelete.isDirectory && ' and all of its contents'}?
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setDeleteModalOpen(false)}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteItem}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors shadow"
                            >
                                Delete Permanently
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileManager;
