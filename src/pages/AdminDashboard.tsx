import React, { useEffect, useState } from 'react';
import { db, storage } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ref, getDownloadURL } from 'firebase/storage';
import type { Photo } from '../types';
import { Check, X, Loader2 } from 'lucide-react';

const SafeImage = ({ storagePath }: { storagePath: string }) => {
    const [url, setUrl] = useState<string>('');

    useEffect(() => {
        if (!storagePath) return;
        try {
            const r = ref(storage, storagePath);
            getDownloadURL(r).then(setUrl).catch(e => console.error("Img error", e));
        } catch (e) {
            console.error("Invalid ref", e);
        }
    }, [storagePath]);

    if (!url) return <div className="w-full h-full bg-gray-200 animate-pulse" />;
    return <img src={url} alt="Flyer" className="w-full h-full object-cover" />;
};

const AdminDashboard: React.FC = () => {
    const [pendingPhotos, setPendingPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const functions = getFunctions();
    const approvePhoto = httpsCallable(functions, 'approvePhoto');
    const rejectPhoto = httpsCallable(functions, 'rejectPhoto');

    const fetchPendingPhotos = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'photos'),
                where('status', '==', 'pending'),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const photos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Photo));
            setPendingPhotos(photos);
        } catch (err) {
            console.error("Failed to fetch photos", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingPhotos();
    }, []);

    const handleApprove = async (photoId: string) => {
        if (!photoId) return;
        setProcessingId(photoId);
        try {
            await approvePhoto({ photoId });
            setPendingPhotos(prev => prev.filter(p => p.id !== photoId));
        } catch (err) {
            alert("Failed to approve check console");
            console.error(err);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (photoId: string) => {
        if (!photoId) return;
        if (!confirm("Are you sure you want to REJECT this photo?")) return;
        setProcessingId(photoId);
        try {
            await rejectPhoto({ photoId });
            setPendingPhotos(prev => prev.filter(p => p.id !== photoId));
        } catch (err) {
            alert("Failed to reject");
            console.error(err);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

            <div className="bg-white rounded-xl shadow p-4">
                <h2 className="font-bold text-lg mb-4">Pending Approvals ({pendingPhotos.length})</h2>

                {pendingPhotos.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No pending photos.</p>
                ) : (
                    <div className="space-y-4">
                        {pendingPhotos.map(photo => (
                            <div key={photo.id} className="flex flex-col md:flex-row gap-4 border-b border-gray-100 pb-4 last:border-0">
                                <div className="w-full md:w-48 h-48 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                    <SafeImage storagePath={photo.storageUrl} />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="font-mono text-xs text-gray-500">{photo.id}</span>
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{photo.category}</span>
                                    </div>
                                    <p className="text-sm">User: {photo.userId}</p>
                                    <p className="text-sm text-gray-600">OCR: {photo.ocrText?.slice(0, 100)}...</p>

                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={() => handleApprove(photo.id!)}
                                            disabled={!!processingId}
                                            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                                        >
                                            {processingId === photo.id ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleReject(photo.id!)}
                                            disabled={!!processingId}
                                            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                                        >
                                            {processingId === photo.id ? <Loader2 className="animate-spin w-4 h-4" /> : <X className="w-4 h-4" />}
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
