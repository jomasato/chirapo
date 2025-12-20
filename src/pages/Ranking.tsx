import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Trophy, Medal, User, Crown } from 'lucide-react';

interface RankingUser {
    rank: number;
    userId: string;
    displayName: string;
    photoURL: string;
    count: number;
}

const Ranking: React.FC = () => {
    const [rankings, setRankings] = useState<RankingUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRanking = async () => {
            try {
                // Live Query for "Current Week" activities
                const q = query(
                    collection(db, 'users'),
                    orderBy('weeklyPhotos', 'desc'),
                    limit(10)
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map((doc, index) => ({
                    rank: index + 1,
                    userId: doc.id,
                    displayName: doc.data().displayName || 'Anonymous',
                    photoURL: doc.data().photoURL,
                    count: doc.data().weeklyPhotos || 0
                }));
                setRankings(data);
            } catch (err) {
                console.error("Failed to fetch ranking", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRanking();
    }, []);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1: return <Trophy className="w-6 h-6 text-yellow-500" />;
            case 2: return <Medal className="w-6 h-6 text-gray-400" />;
            case 3: return <Medal className="w-6 h-6 text-orange-500" />;
            default: return <span className="font-bold text-gray-500 w-6 text-center">{rank}</span>;
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <Crown className="w-6 h-6 text-yellow-500" />
                Weekly Ranking
            </h2>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading ranking...</div>
                ) : rankings.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <p>No participants yet this week.</p>
                        <p className="text-sm mt-2">Be the first to upload!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {rankings.map((user) => (
                            <div key={user.userId} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-center w-8">
                                    {getRankIcon(user.rank)}
                                </div>

                                {user.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full bg-gray-200" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                        <User className="w-5 h-5 text-gray-400" />
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-800 truncate">{user.displayName}</p>
                                    <p className="text-xs text-gray-500">Rank {user.rank}</p>
                                </div>

                                <div className="text-right">
                                    <p className="font-bold text-primary text-lg">{user.count}</p>
                                    <p className="text-xs text-gray-500">photos</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <p className="text-center text-xs text-gray-400">
                Rankings reset every Monday at 00:00.
            </p>
        </div>
    );
};

export default Ranking;
