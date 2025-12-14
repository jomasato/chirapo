"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLeaderboard = exports.onPhotoUpload = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const vision = require("@google-cloud/vision");
const crypto = require("crypto");
admin.initializeApp();
const db = admin.firestore();
const client = new vision.ImageAnnotatorClient();
/**
 * Triggers when a file is uploaded to Storage.
 * - Checks for duplicates (hash-based)
 * - Performs OCR using Google Cloud Vision
 * - Classifies the flyer
 * - Saves metadata to Firestore
 */
exports.onPhotoUpload = functions.storage.object().onFinalize(async (object) => {
    const filePath = object.name; // e.g., users/{userId}/photos/{timestamp}.jpg
    if (!filePath || !filePath.includes('photos/')) {
        console.log('Not a photo upload, skipping.');
        return;
    }
    const bucketName = object.bucket;
    const contentType = object.contentType;
    // Basic validation
    if (!(contentType === null || contentType === void 0 ? void 0 : contentType.startsWith('image/'))) {
        console.log('Not an image, skipping.');
        return;
    }
    // Extract userId
    // path: users/{userId}/photos/{photoId}
    const parts = filePath.split('/');
    const userId = parts[1];
    console.log(`Processing photo: ${filePath} for user: ${userId}`);
    try {
        // 1. Download file to memory to calculate hash
        // Note: For very large files, streaming is better, but we limit to 5MB/1MB client-side.
        const bucket = admin.storage().bucket(bucketName);
        const file = bucket.file(filePath);
        const [fileBuffer] = await file.download();
        // 2. Calculate Hash
        const imageHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        // 3. Duplicate Check
        const duplicatesSnapshot = await db.collection('photos')
            .where('imageHash', '==', imageHash)
            .limit(1)
            .get();
        let isDuplicate = false;
        if (!duplicatesSnapshot.empty) {
            console.log(`Duplicate detected: ${imageHash}`);
            isDuplicate = true;
            // We still process it but flag it
        }
        // 4. OCR
        const [result] = await client.textDetection(`gs://${bucketName}/${filePath}`);
        const detections = result.textAnnotations;
        const ocrText = detections && detections.length > 0 ? detections[0].description : '';
        // 5. Categorization
        const category = categorizeFlyer(ocrText || '');
        // 6. Save to Firestore
        const photoData = {
            userId,
            filePath,
            storageUrl: `gs://${bucketName}/${filePath}`,
            imageHash,
            ocrText,
            category,
            isDuplicate,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            // Metadata from client (customMetadata)
            clientMetadata: object.metadata || {},
            status: 'processed'
        };
        await db.collection('photos').add(photoData);
        console.log('Photo processed and saved to Firestore.');
        // 7. Award Points (if valid and not duplicate)
        if (!isDuplicate) {
            await awardPoints(userId, 10, imageHash);
        }
    }
    catch (error) {
        console.error('Error processing photo:', error);
    }
});
function categorizeFlyer(text) {
    const t = text.toLowerCase();
    if (t.includes('supermarket') || t.includes('market') || t.includes('スーパー') || t.includes('特売'))
        return 'Supermarket';
    if (t.includes('real estate') || t.includes('mansion') || t.includes('不動産') || t.includes('住宅'))
        return 'Real Estate';
    if (t.includes('restaurant') || t.includes('cafe') || t.includes('lunch') || t.includes('飲食') || t.includes('ランチ'))
        return 'Restaurant';
    return 'Other';
}
/**
 * atomic transaction to award points and update stats
 */
async function awardPoints(userId, amount, photoId) {
    const userRef = db.collection('users').doc(userId);
    const transactionRef = db.collection('pointTransactions').doc();
    try {
        await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) {
                throw new Error('User does not exist!');
            }
            const userData = userDoc.data() || {};
            const currentPoints = userData.points || 0;
            const currentTotal = userData.totalPhotos || 0;
            const currentWeekly = userData.weeklyPhotos || 0;
            const currentMonthly = userData.monthlyPhotos || 0;
            // Update User
            t.update(userRef, {
                points: currentPoints + amount,
                totalPhotos: currentTotal + 1,
                weeklyPhotos: currentWeekly + 1,
                monthlyPhotos: currentMonthly + 1,
                lastActiveAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Create Transaction Record
            t.set(transactionRef, {
                userId,
                type: 'earn',
                amount,
                reason: 'photo_upload',
                relatedPhotoId: photoId,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        console.log(`Awarded ${amount} points to ${userId}`);
    }
    catch (e) {
        console.error('Transaction failure:', e);
    }
}
/**
 * Scheduled function to update leaderboard every Monday at 00:00 JST
 * - Snapshots top 100 users for the previous week
 * - Resets weeklyPhotos for ALL users
 */
exports.updateLeaderboard = functions.pubsub.schedule('0 0 * * 1')
    .timeZone('Asia/Tokyo')
    .onRun(async (context) => {
    const now = new Date();
    // Previous week ID e.g. "2024-W40"
    // Simply using ISO string for simplicity in MVP, ideally use a library like date-fns
    const weekId = now.toISOString().split('T')[0];
    try {
        // 1. Get Top 100 Users
        const usersSnapshot = await db.collection('users')
            .orderBy('weeklyPhotos', 'desc')
            .limit(100)
            .get();
        const rankings = usersSnapshot.docs.map((doc, index) => ({
            userId: doc.id,
            displayName: doc.data().displayName || 'Anonymous',
            photoURL: doc.data().photoURL || '',
            count: doc.data().weeklyPhotos || 0,
            rank: index + 1,
        }));
        // 2. Save Leaderboard
        await db.collection('leaderboard').doc(weekId).set({
            weekId,
            rankings,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Leaderboard saved for ${weekId}`);
        // 3. Reset weeklyPhotos for ALL users (Batching required for >500 users)
        // For MVP (Phase 0), we assume < 500 users or accept simple batching
        const allUsersSnapshot = await db.collection('users').where('weeklyPhotos', '>', 0).get();
        if (allUsersSnapshot.empty) {
            console.log('No users active this week.');
            return;
        }
        const batch = db.batch();
        allUsersSnapshot.docs.forEach((doc) => {
            batch.update(doc.ref, { weeklyPhotos: 0 });
        });
        await batch.commit();
        console.log(`Reset weekly stats for ${allUsersSnapshot.size} users.`);
    }
    catch (error) {
        console.error('Error updating leaderboard:', error);
    }
});
//# sourceMappingURL=index.js.map