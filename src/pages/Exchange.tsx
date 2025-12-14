import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Gift, ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Exchange: React.FC = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [points, setPoints] = useState(0);
    const [name, setName] = useState(currentUser?.displayName || '');
    const [email, setEmail] = useState(currentUser?.email || '');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (currentUser) {
            getDoc(doc(db, 'users', currentUser.uid)).then(d => {
                if (d.exists()) setPoints(d.data().points || 0);
            });
        }
    }, [currentUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const functions = getFunctions();
            const requestExchange = httpsCallable(functions, 'requestExchange');
            await requestExchange({ name, email });
            setSuccess(true);
            setPoints(p => p - 1000); // Optimistic update
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to submit request.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="space-y-6 text-center p-8 bg-white rounded-xl shadow-sm">
                <Gift className="w-16 h-16 mx-auto text-primary" />
                <h2 className="text-2xl font-bold">Request Sent!</h2>
                <p className="text-gray-600">
                    We have received your request for an Amazon Gift Card.
                    It will be sent to <b>{email}</b> within 3 business days.
                </p>
                <button
                    onClick={() => navigate('/mypage')}
                    className="w-full bg-primary text-white font-bold py-3 rounded-xl"
                >
                    Back to My Page
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <button onClick={() => navigate('/mypage')} className="p-1">
                    <ArrowLeft className="w-6 h-6 text-gray-500" />
                </button>
                <h2 className="text-xl font-bold">Exchange Points</h2>
            </div>

            <div className="bg-gradient-to-r from-primary to-green-400 p-6 rounded-xl text-white shadow-md">
                <p className="text-sm opacity-90">Current Balance</p>
                <p className="text-3xl font-bold">{points} pt</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-secondary" />
                    Amazon Gift Card (1,000円)
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                    Redeem 1,000 points for a digital gift card.
                </p>

                {points < 1000 && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        You need at least 1,000 pts.
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3"
                            placeholder="Your Name"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3"
                            placeholder="delivery@example.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={points < 1000 || loading}
                        className={`w-full font-bold py-4 rounded-xl transition-all ${points < 1000 || loading
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-secondary hover:bg-orange-500 text-white shadow-md'
                            }`}
                    >
                        {loading ? 'Processing...' : 'Request Exchange (1,000 pts)'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Exchange;
