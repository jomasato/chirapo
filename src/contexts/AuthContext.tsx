import React, { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const signInWithGoogle = async () => {
        try {
            await signInWithRedirect(auth, googleProvider);
        } catch (error) {
            console.error("Error signing in with Google", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    useEffect(() => {
        // Handle Redirect Result
        const handleRedirect = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result?.user) {
                    const user = result.user;
                    const userRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userRef);

                    if (!userSnap.exists()) {
                        await setDoc(userRef, {
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL,
                            points: 0,
                            totalPhotos: 0,
                            weeklyPhotos: 0,
                            monthlyPhotos: 0,
                            createdAt: serverTimestamp(),
                            lastActiveAt: serverTimestamp(),
                        });
                    } else {
                        await setDoc(userRef, {
                            lastActiveAt: serverTimestamp()
                        }, { merge: true });
                    }
                }
            } catch (error) {
                console.error("Redirect login error", error);
            }
        };
        handleRedirect();

        // Auth State Listener
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        loading,
        signInWithGoogle,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
