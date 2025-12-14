import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';

const Login: React.FC = () => {
    const { signInWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            await signInWithGoogle();
            navigate('/');
        } catch (error) {
            console.error("Failed to login", error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="flex justify-center mb-6">
                    <div className="bg-primary/10 p-4 rounded-full">
                        <Camera className="w-12 h-12 text-primary" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold mb-2">Chirapo</h1>
                <p className="text-gray-500 mb-8">Earn points by uploading flyers!</p>

                <button
                    onClick={handleLogin}
                    className="w-full bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                    Sign in with Google
                </button>
            </div>
        </div>
    );
};

export default Login;
