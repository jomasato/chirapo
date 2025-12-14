import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGeolocation } from '../hooks/useGeolocation';
import { compressImage } from '../utils/imageCompression';
import { uploadPhoto } from '../services/storage';
import { Upload as UploadIcon, X, MapPin } from 'lucide-react';

const Upload: React.FC = () => {
    const { currentUser } = useAuth();
    const { location, error: locationError, loading: locationLoading } = useGeolocation();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (selectedFile) {
            const url = URL.createObjectURL(selectedFile);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(null);
        }
    }, [selectedFile]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Basic validation
            if (!file.type.startsWith('image/')) {
                setError("Please select an image file.");
                return;
            }
            setError(null);
            setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !currentUser) return;

        if (locationError) {
            setError("Location is required to upload. Please enable location services.");
            return;
        }

        if (!location) {
            setError("Fetching location...");
            return;
        }

        setUploading(true);
        setError(null);

        try {
            // 1. Compress
            const compressedFile = await compressImage(selectedFile);

            // 2. Upload
            await uploadPhoto(
                compressedFile,
                currentUser.uid,
                { latitude: location.latitude, longitude: location.longitude },
                (p) => setProgress(p)
            );

            // 3. Success -> Navigate / Show Success
            alert("Upload Successful! (Points +10 pending)");
            navigate('/upload-success');

        } catch (err: any) {
            console.error(err);
            const msg = err.message || "Failed to upload. Please try again.";
            alert(`Error: ${msg}`);
            setError(msg);
            setUploading(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Upload Flyer</h2>
                <button onClick={() => navigate('/')} className="p-2 text-gray-500">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                {/* Location Status */}
                <div className={`text-sm flex items-center gap-2 ${locationError ? 'text-red-500' : 'text-green-600'}`}>
                    <MapPin className="w-4 h-4" />
                    {locationLoading ? "Acquiring location..." :
                        locationError ? "Location access denied" :
                            "Location acquired"}
                </div>

                {/* Image Preview / Selector */}
                <div
                    onClick={!uploading ? triggerFileInput : undefined}
                    className={`
            border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center p-4 cursor-pointer transition-colors
            ${previewUrl ? 'border-primary' : 'border-gray-300 hover:border-gray-400'}
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
                >
                    {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="h-full w-full object-contain" />
                    ) : (
                        <div className="text-center text-gray-500">
                            <UploadIcon className="w-12 h-12 mx-auto mb-2" />
                            <p>Tap to take photo</p>
                            <p className="text-xs mt-1">or select from gallery</p>
                        </div>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        capture="environment" // Prefer rear camera on mobile
                        className="hidden"
                    />
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {/* Upload Button */}
                <button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading || !!locationError}
                    className={`
            w-full font-bold py-4 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all
            ${!selectedFile || uploading || locationError
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-primary hover:bg-green-600 text-white'}
          `}
                >
                    {uploading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Uploading... {Math.round(progress)}%</span>
                        </>
                    ) : (
                        <span>Upload Flyer</span>
                    )}
                </button>
            </div>
        </div>
    );
};

export default Upload;
