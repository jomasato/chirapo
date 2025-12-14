import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import AdSense from '../components/AdSense';

const UploadSuccess: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Auto redirect after 5 seconds
        const timer = setTimeout(() => {
            navigate('/');
        }, 5000);
        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-primary/5 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white p-8 rounded-full shadow-lg mb-8 animate-bounce">
                <CheckCircle className="w-24 h-24 text-primary" />
            </div>

            <h1 className="text-3xl font-bold text-gray-800 mb-2">Upload Complete!</h1>
            <p className="text-xl text-primary font-bold mb-8">+10 Points Awarded</p>

            <p className="text-gray-500 mb-8 max-w-xs">
                Your flyer is being processed. Thank you for your contribution!
            </p>

            <button
                onClick={() => navigate('/')}
                className="bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white font-bold py-3 px-8 rounded-full transition-all flex items-center gap-2"
            >
                Back to Home
                <ArrowRight className="w-4 h-4" />
            </button>

            {/* AdSense Unit */}
            <div className="mt-12 w-full flex justify-center">
                <AdSense slot="1234567890" className="w-full max-w-[320px] h-[100px]" />
            </div>
        </div>
    );
};

export default UploadSuccess;
