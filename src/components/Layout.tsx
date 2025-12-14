import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Home, Trophy, User, LogOut } from 'lucide-react';

const Layout: React.FC = () => {
    const { logout, currentUser } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
                    <span className="font-bold text-xl text-primary">Chirapo</span>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{currentUser?.displayName}</span>
                        <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-gray-700">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-md mx-auto p-4">
                <Outlet />
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
                <div className="max-w-md mx-auto flex justify-around">
                    <Link to="/" className="p-4 flex flex-col items-center text-primary">
                        <Home className="w-6 h-6" />
                        <span className="text-xs mt-1">Home</span>
                    </Link>
                    <Link to="/ranking" className="p-4 flex flex-col items-center text-gray-400 hover:text-gray-600">
                        <Trophy className="w-6 h-6" />
                        <span className="text-xs mt-1">Ranking</span>
                    </Link>
                    <Link to="/mypage" className="p-4 flex flex-col items-center text-gray-400 hover:text-gray-600">
                        <User className="w-6 h-6" />
                        <span className="text-xs mt-1">My Page</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
};

export default Layout;
