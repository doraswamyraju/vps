import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Server, Database, ScrollText, LogOut } from 'lucide-react';
import useAuth from '../hooks/useAuth';

const Sidebar = () => {
    const { logout } = useAuth();

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/apps', label: 'Apps (PM2)', icon: Server },
        { path: '/db', label: 'Databases', icon: Database },
        { path: '/logs', label: 'Logs', icon: ScrollText },
    ];

    return (
        <aside className="w-64 bg-gray-900 border-r border-gray-800 text-gray-300 flex flex-col h-full">
            <div className="h-16 flex items-center px-6 border-b border-gray-800 font-bold text-xl text-white tracking-wider">
                VPS PANEL
            </div>
            <nav className="flex-1 py-6 px-3 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                isActive 
                                    ? 'bg-blue-600 text-white' 
                                    : 'hover:bg-gray-800 hover:text-white'
                            }`
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}
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
