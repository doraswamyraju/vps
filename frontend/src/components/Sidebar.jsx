import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Server,
    Database,
    ScrollText,
    FolderOpen,
    Users,
    CreditCard,
    LogOut,
    Shield
} from 'lucide-react';
import useAuth from '../hooks/useAuth';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const isSuperAdmin = user?.role === 'superadmin';

    const baseNavItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/apps', label: 'Apps (PM2)', icon: Server },
        { path: '/files', label: 'File Manager', icon: FolderOpen },
        { path: '/db', label: 'MySQL', icon: Database },
        { path: '/mongodb', label: 'MongoDB', icon: Database },
        { path: '/logs', label: 'Logs', icon: ScrollText },
    ];

    const adminNavItems = [
        { path: '/users', label: 'Users & Tenants', icon: Users },
        { path: '/plans', label: 'Plans & Pricing', icon: CreditCard },
    ];

    return (
        <aside className="w-64 bg-gray-900 border-r border-gray-800 text-gray-300 flex flex-col h-full">
            <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800">
                <span className="font-bold text-xl text-white tracking-wider">VPS PANEL</span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    isSuperAdmin ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                    {isSuperAdmin ? 'Super Admin' : 'Client'}
                </span>
            </div>

            <nav className="flex-1 py-6 px-3 space-y-6 overflow-y-auto">
                <div className="space-y-1">
                    <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                        Resources
                    </p>
                    {baseNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                    isActive 
                                        ? 'bg-blue-600 text-white shadow-sm' 
                                        : 'hover:bg-gray-800 hover:text-white'
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </div>

                {isSuperAdmin && (
                    <div className="space-y-1 pt-2 border-t border-gray-800/80">
                        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-2 flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Platform Admin
                        </p>
                        {adminNavItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                        isActive 
                                            ? 'bg-purple-600 text-white shadow-sm' 
                                            : 'hover:bg-gray-800 hover:text-white'
                                    }`
                                }
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium">{item.label}</span>
                            </NavLink>
                        ))}
                    </div>
                )}
            </nav>

            <div className="p-4 border-t border-gray-800">
                <button
                    onClick={logout}
                    className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
