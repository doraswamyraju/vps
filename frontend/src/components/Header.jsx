import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { User, Bell, Shield, Sparkles } from 'lucide-react';

const Header = () => {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'superadmin';

    return (
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
            <div className="text-gray-400 font-medium text-sm flex items-center gap-2">
                <span>VPS Control Center</span>
            </div>
            
            <div className="flex items-center gap-4">
                <Link
                    to="/profile"
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-gray-800 transition-all border border-transparent hover:border-gray-700 group"
                    title="Account & Subscription Profile"
                >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm ${
                        isSuperAdmin ? 'bg-purple-600' : 'bg-blue-600'
                    }`}>
                        {isSuperAdmin ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className="text-left">
                        <div className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {user?.name || user?.username || 'Account'}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                            {isSuperAdmin ? 'Super Admin' : (typeof user?.plan === 'object' ? user.plan?.name : (user?.plan || 'Client Admin'))}
                        </div>
                    </div>
                </Link>
            </div>
        </header>
    );
};

export default Header;
