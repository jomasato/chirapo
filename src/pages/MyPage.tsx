import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, LogOut, Camera, History, Gift } from 'lucide-react';

interface UserStats {
    points: number;
    totalPhotos: number;
    weeklyPhotos: number;
}

const MyPage: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<UserStats>({ points: 0, totalPhotos: 0, weeklyPhotos: 0 });

    useEffect(() => {
        if (!currentUser) return;

        const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setStats({
                    points: data.points || 0,
                    totalPhotos: data.totalPhotos || 0,
                    weeklyPhotos: data.weeklyPhotos || 0
                });
            }
        });

        return () => unsub();
    }, [currentUser]);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">My Page</h2>

            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
                {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="w-16 h-16 rounded-full" />
                ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-8 h-8 text-gray-400" />
                    </div>
                )}
                <div>
                    <h3 className="font-bold text-lg">{currentUser?.displayName}</h3>
                    <p className="text-sm text-gray-500">{currentUser?.email}</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <p className="text-sm text-gray-500 mb-1">Total Points</p>
                    <p className="text-2xl font-bold text-primary">{stats.points}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <p className="text-sm text-gray-500 mb-1">This Week</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.weeklyPhotos} <span className="text-sm font-normal">photos</span></p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 col-span-2">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <Camera className="w-4 h-4" />
                        <span className="text-sm">Lifetime Uploads</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalPhotos}</p>
                </div>
            </div>

            {/* Menu Actions */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <History className="w-5 h-5 text-gray-400" />
                        <span>Point History</span>
                    </div>
                    <span className="text-gray-300">›</span>
                </button>
                <button
                    onClick={() => navigate('/exchange')}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100"
                >
                    <div className="flex items-center gap-3">
                        <Gift className="w-5 h-5 text-secondary" />
                        <span className="text-gray-800">Exchange Points</span>
                    </div>
                    <span className="text-gray-300">›</span>
                </button>
                <button
                    onClick={() => logout()}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-red-500"
                >
                    <div className="flex items-center gap-3">
                        <LogOut className="w-5 h-5" />
                        <span>Sign Out</span>
                    </div>
                </button>
            </div>

        </div>
    );
};

export default MyPage;
