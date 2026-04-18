"use client"

import {
    User as FirebaseUser,
    onAuthStateChanged,
    signInWithPopup,
    signOut as firebaseSignOut,
} from "firebase/auth"
import {
    doc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    setDoc,
} from "firebase/firestore"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { auth, db, googleProvider } from "./firebase"

export type Role = "teacher" | "student" | null

export interface UserProfile {
    uid: string
    email: string | null
    displayName: string | null
    photoURL: string | null
    role: Role
}

interface AuthContextValue {
    user: FirebaseUser | null
    profile: UserProfile | null
    loading: boolean
    signInGoogle: () => Promise<void>
    signOut: () => Promise<void>
    setRole: (role: Exclude<Role, null>) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<FirebaseUser | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)

    // Track auth state
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (fbUser) => {
            setUser(fbUser)
            if (!fbUser) {
                setProfile(null)
                setLoading(false)
                return
            }

            const ref = doc(db, "users", fbUser.uid)
            const snap = await getDoc(ref)
            if (!snap.exists()) {
                await setDoc(ref, {
                    email: fbUser.email,
                    displayName: fbUser.displayName,
                    photoURL: fbUser.photoURL,
                    role: null,
                    createdAt: serverTimestamp(),
                    lastLoginAt: serverTimestamp(),
                })
            } else {
                // Always refresh Google profile fields + last login
                await setDoc(
                    ref,
                    {
                        email: fbUser.email,
                        displayName: fbUser.displayName,
                        photoURL: fbUser.photoURL,
                        lastLoginAt: serverTimestamp(),
                    },
                    { merge: true }
                )
            }
        })
        return () => unsub()
    }, [])

    // Subscribe to own profile doc for real-time role updates
    useEffect(() => {
        if (!user) return
        const ref = doc(db, "users", user.uid)
        const unsub = onSnapshot(ref, (snap) => {
            const data = snap.data()
            // Prefer live Google profile fields from auth, fall back to Firestore cache
            setProfile({
                uid: user.uid,
                email: user.email ?? data?.email ?? null,
                displayName: user.displayName ?? data?.displayName ?? null,
                photoURL: user.photoURL ?? data?.photoURL ?? null,
                role: (data?.role ?? null) as Role,
            })
            setLoading(false)
        })
        return () => unsub()
    }, [user])

    const signInGoogle = useCallback(async () => {
        await signInWithPopup(auth, googleProvider)
    }, [])

    const signOut = useCallback(async () => {
        await firebaseSignOut(auth)
    }, [])

    const setRole = useCallback(
        async (role: Exclude<Role, null>) => {
            if (!user) throw new Error("Not signed in")
            await setDoc(
                doc(db, "users", user.uid),
                { role },
                { merge: true }
            )
        },
        [user]
    )

    const value = useMemo<AuthContextValue>(
        () => ({ user, profile, loading, signInGoogle, signOut, setRole }),
        [user, profile, loading, signInGoogle, signOut, setRole]
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>")
    return ctx
}
