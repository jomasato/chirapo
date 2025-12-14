import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";

export interface UploadMetadata {
    latitude: number;
    longitude: number;
}

export const uploadPhoto = async (
    file: File,
    userId: string,
    metadata: UploadMetadata,
    onProgress: (progress: number) => void
): Promise<{ url: string, path: string }> => {

    const timestamp = Date.now();
    // File path: users/{userId}/photos/{timestamp}.jpg
    const path = `users/${userId}/photos/${timestamp}.jpg`;
    const storageRef = ref(storage, path);

    const customMetadata = {
        latitude: metadata.latitude.toString(),
        longitude: metadata.longitude.toString(),
        uploadedAt: new Date().toISOString(),
    };

    const uploadTask = uploadBytesResumable(storageRef, file, { customMetadata });

    return new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                onProgress(progress);
            },
            (error) => {
                console.error("Upload failed:", error);
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve({ url: downloadURL, path });
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
};
