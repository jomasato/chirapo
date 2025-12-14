import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Crown, User as UserIcon } from 'lucide-react';

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
                // For Phase 0 MVP, simplified: Query users directly locally 
                // instead of waiting for the weekly function if data is sparse.
                // However, strictly following plan: Read from 'leaderboard' or fallback to a live query.
                // Let's implement a Live Query for "Current Week" for better UX in Phase 0.

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

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <Crown className="w-6 h-6 text-yellow-500" />
                Weekly Ranking
            </h2>

            {loading ? (
                <p className="text-center text-gray-500">Loading...</p>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {rankings.map((user) => (
                        <div key={user.userId} className="flex items-center p-4 border-b border-gray-100 last:border-none">
                            <div className="w-8 font-bold text-gray-500 text-center">
                                {user.rank <= 3 ? (
                                    <span className={`
                                        ${user.rank === 1 ? 'text-yellow-500' : ''}
                                        ${user.rank === 2 ? 'text-gray-400' : ''}
                                        ${user.rank === 3 ? 'text-orange-400' : ''}
                                        text-xl
                                    `}>#{user.rank}</span>
                                ) : (
                                    `#${user.rank}`
                                )}
                            </div>
                            <div className="mx-4">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                        <UserIcon className="w-6 h-6 text-gray-400" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-gray-800 line-clamp-1">{user.displayName}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-primary">{user.count}</p>
                                <p className="text-xs text-gray-400">photos</p>
                            </div>
                        </div>
                    ))}

                    {rankings.length === 0 && (
                        <div className="p-8 text-center text-gray-400">
                            No active users this week. Be the first!
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Ranking;
