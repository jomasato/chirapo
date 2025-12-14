import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Upload, Camera, Award } from 'lucide-react';

const Home: React.FC = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <section className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold mb-4">Welcome, {currentUser?.displayName}!</h2>
                <div className="flex items-center justify-between bg-primary/5 p-4 rounded-lg border border-primary/10">
                    <div>
                        <p className="text-sm text-gray-500">Current Points</p>
                        <p className="text-3xl font-bold text-primary">0 pt</p>
                    </div>
                    <Award className="w-10 h-10 text-primary" />
                </div>
            </section>

            <button
                onClick={() => navigate('/upload')}
                className="w-full bg-primary hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl shadow-md flex items-center justify-center gap-3 transition-colors"
            >
                <Camera className="w-6 h-6" />
                <span>Scan Flyer</span>
            </button>

            <section>
                <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
                <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
                    <Upload className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No uploads yet.</p>
                    <p className="text-sm">Upload your first flyer to earn points!</p>
                </div>
            </section>
        </div>
    );
};

export default Home;
