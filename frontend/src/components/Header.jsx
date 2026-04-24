import React from 'react';
import useAuth from '../hooks/useAuth';
import { User, Bell } from 'lucide-react';

const Header = () => {
    const { user } = useAuth();

    return (
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
            <div className="text-gray-400 font-medium">
                {/* Could add a breadcrumb here based on route */}
                Overview
            </div>
            
            <div className="flex items-center gap-4">
                <button className="text-gray-400 hover:text-white transition-colors">
                    <Bell className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 pl-4 border-l border-gray-800">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                        <User className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-300">
                        {user?.username || 'Admin'}
                    </span>
                </div>
            </div>
        </header>
    );
};

export default Header;
