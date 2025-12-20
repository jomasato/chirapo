export interface User {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    points: number;
    pendingPoints?: number; // Points waiting for approval
    totalPhotos: number;
    weeklyPhotos: number;
    isAdmin?: boolean; // Simple admin flag
    createdAt?: any;
    lastActiveAt?: any;
}

export interface Photo {
    id?: string;
    userId: string;
    filePath: string;
    storageUrl: string;
    imageHash: string;
    ocrText: string;
    category: 'Supermarket' | 'Real Estate' | 'Restaurant' | 'Other';
    status: 'pending' | 'approved' | 'rejected'; // key new field
    isDuplicate: boolean;
    createdAt: any;
    // clientMetadata
    latitude?: number;
    longitude?: number;
}

export interface PointTransaction {
    id?: string;
    userId: string;
    type: 'earn' | 'redeem';
    amount: number;
    reason: string;
    relatedPhotoId?: string;
    status?: 'pending' | 'completed'; // for redemptions
    createdAt: any;
}

export interface LeaderboardEntry {
    userId: string;
    displayName: string;
    photoURL: string;
    count: number;
    rank: number;
}
