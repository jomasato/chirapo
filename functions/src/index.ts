import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as vision from '@google-cloud/vision';
import * as crypto from 'crypto';

admin.initializeApp();
const db = admin.firestore();
const client = new vision.ImageAnnotatorClient();

/**
 * Triggers when a file is uploaded to Storage.
 * - Checks for duplicates (hash-based)
 * - Performs OCR using Google Cloud Vision
 * - Classifies the flyer
 * - Saves metadata to Firestore (status: pending)
 * - Adds to User's "pendingPoints"
 */
export const onPhotoUpload = functions.storage.object().onFinalize(async (object) => {
    const filePath = object.name; // e.g., users/{userId}/photos/{timestamp}.jpg
    if (!filePath || !filePath.includes('photos/')) {
        console.log('Not a photo upload, skipping.');
        return;
    }

    const bucketName = object.bucket;
    const contentType = object.contentType;

    // Basic validation
    if (!contentType?.startsWith('image/')) {
        console.log('Not an image, skipping.');
        return;
    }

    const parts = filePath.split('/');
    const userId = parts[1];

    console.log(`Processing photo: ${filePath} for user: ${userId}`);

    try {
        const bucket = admin.storage().bucket(bucketName);
        const file = bucket.file(filePath);
        const [fileBuffer] = await file.download();

        // Calculate Hash
        const imageHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        // Duplicate Check
        const duplicatesSnapshot = await db.collection('photos')
            .where('imageHash', '==', imageHash)
            .limit(1)
            .get();

        let isDuplicate = false;
        if (!duplicatesSnapshot.empty) {
            console.log(`Duplicate detected: ${imageHash}`);
            isDuplicate = true;
        }

        // OCR
        const [result] = await client.textDetection(`gs://${bucketName}/${filePath}`);
        const detections = result.textAnnotations;
        const ocrText = detections && detections.length > 0 ? detections[0].description : '';

        // Categorization
        const category = categorizeFlyer(ocrText || '');

        // Save to Firestore
        const photoRef = db.collection('photos').doc();
        const photoData = {
            id: photoRef.id,
            userId,
            filePath,
            storageUrl: `gs://${bucketName}/${filePath}`,
            imageHash,
            ocrText,
            category,
            isDuplicate,
            status: isDuplicate ? 'rejected' : 'pending', // Duplicates automatically rejected
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            clientMetadata: object.metadata || {},
        };

        await photoRef.set(photoData);
        console.log('Photo processed and saved to Firestore.');

        // Add to Pending Points (if not duplicate)
        if (!isDuplicate) {
            await addPendingPoints(userId, 10);
        } else {
            console.log('Duplicate photo, no pending points added.');
        }

    } catch (error) {
        console.error('Error processing photo:', error);
    }
});

function categorizeFlyer(text: string): string {
    const t = text.toLowerCase();
    if (t.includes('supermarket') || t.includes('market') || t.includes('スーパー') || t.includes('特売')) return 'Supermarket';
    if (t.includes('real estate') || t.includes('mansion') || t.includes('不動産') || t.includes('住宅')) return 'Real Estate';
    if (t.includes('restaurant') || t.includes('cafe') || t.includes('lunch') || t.includes('飲食') || t.includes('ランチ')) return 'Restaurant';
    return 'Other';
}

/**
 * Increment User's pendingPoints
 */
async function addPendingPoints(userId: string, amount: number) {
    const userRef = db.collection('users').doc(userId);
    try {
        await userRef.update({
            pendingPoints: admin.firestore.FieldValue.increment(amount),
            lastActiveAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Added ${amount} pending points to ${userId}`);
    } catch (e) {
        console.error('Failed to add pending points:', e);
    }
}

/**
 * Admin: Approve a pending photo
 */
export const approvePhoto = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');

    // Check Admin (In real app, use Custom Claims. For MVP, checking user doc is okay-ish but slower)
    const adminUser = await db.collection('users').doc(context.auth.uid).get();
    if (!adminUser.data()?.isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin only.');
    }

    const { photoId } = data;
    const photoRef = db.collection('photos').doc(photoId);

    await db.runTransaction(async (t) => {
        const photoDoc = await t.get(photoRef);
        if (!photoDoc.exists) throw new functions.https.HttpsError('not-found', 'Photo not found.');

        const photo = photoDoc.data();
        if (photo?.status !== 'pending') throw new functions.https.HttpsError('failed-precondition', 'Photo is not pending.');

        const userId = photo.userId;
        const rewardAmount = 10; // Fixed for now

        // Update Photo
        t.update(photoRef, { status: 'approved' });

        // Update User (Move Pending -> Actual)
        const userRef = db.collection('users').doc(userId);
        t.update(userRef, {
            pendingPoints: admin.firestore.FieldValue.increment(-rewardAmount),
            points: admin.firestore.FieldValue.increment(rewardAmount),
            totalPhotos: admin.firestore.FieldValue.increment(1),
            weeklyPhotos: admin.firestore.FieldValue.increment(1) // Assuming weekly counts APPROVED photos
        });

        // Create Earn Transaction
        const transactionRef = db.collection('pointTransactions').doc();
        t.set(transactionRef, {
            userId,
            type: 'earn',
            amount: rewardAmount,
            reason: 'photo_approval',
            relatedPhotoId: photoId,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });

    return { success: true };
});

/**
 * Admin: Reject a pending photo
 */
export const rejectPhoto = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');

    const adminUser = await db.collection('users').doc(context.auth.uid).get();
    if (!adminUser.data()?.isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin only.');
    }

    const { photoId } = data;
    const photoRef = db.collection('photos').doc(photoId);

    await db.runTransaction(async (t) => {
        const photoDoc = await t.get(photoRef);
        if (!photoDoc.exists) throw new functions.https.HttpsError('not-found', 'Photo not found.');
        const photo = photoDoc.data();
        if (photo?.status !== 'pending') throw new functions.https.HttpsError('failed-precondition', 'Photo is not pending.');

        const userId = photo.userId;
        const rewardAmount = 10;

        // Update Photo
        t.update(photoRef, { status: 'rejected' });

        // Update User (Remove Pending)
        const userRef = db.collection('users').doc(userId);
        t.update(userRef, {
            pendingPoints: admin.firestore.FieldValue.increment(-rewardAmount)
        });
    });

    return { success: true };
});


export const updateLeaderboard = functions.pubsub.schedule('0 0 * * 1')
    .timeZone('Asia/Tokyo')
    .onRun(async (context) => {
        // ... (Same logic, can be optimized later)
        const now = new Date();
        const weekId = now.toISOString().split('T')[0];

        try {
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

            await db.collection('leaderboard').doc(weekId).set({
                weekId,
                rankings,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            const allUsersSnapshot = await db.collection('users').where('weeklyPhotos', '>', 0).get();
            if (!allUsersSnapshot.empty) {
                const batch = db.batch();
                allUsersSnapshot.docs.forEach((doc) => {
                    batch.update(doc.ref, { weeklyPhotos: 0 });
                });
                await batch.commit();
            }
        } catch (error) {
            console.error('Error updating leaderboard:', error);
        }
    });

export const requestExchange = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');

    const userId = context.auth.uid;
    const { name, email } = data;
    if (!name || !email) throw new functions.https.HttpsError('invalid-argument', 'Missing info.');

    const REDEMPTION_AMOUNT = 1000;
    const userRef = db.collection('users').doc(userId);
    const transactionRef = db.collection('pointTransactions').doc();

    try {
        await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) throw new functions.https.HttpsError('not-found', 'User not found.');

            const currentPoints = userDoc.data()?.points || 0;
            if (currentPoints < REDEMPTION_AMOUNT) {
                throw new functions.https.HttpsError('failed-precondition', 'Insufficient points.');
            }

            t.update(userRef, {
                points: currentPoints - REDEMPTION_AMOUNT,
                lastActiveAt: admin.firestore.FieldValue.serverTimestamp()
            });

            t.set(transactionRef, {
                userId,
                type: 'redeem',
                amount: -REDEMPTION_AMOUNT,
                reason: 'amazon_gift',
                status: 'pending',
                redemptionDetails: { name, email },
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        return { success: true };
    } catch (error) {
        console.error('Exchange failed:', error);
        throw error;
    }
});
