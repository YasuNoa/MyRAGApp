"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "@/src/lib/firebase";

interface AuthContextType {
    user: User | null;
    dbUser: any | null; // Database User Object
    loading: boolean;
    token: string | null;
    googleAccessToken: string | null;
    setGoogleAccessToken: (token: string | null) => void;
    fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    dbUser: null,
    loading: true,
    token: null,
    googleAccessToken: null,
    setGoogleAccessToken: () => {},
    fetchWithAuth: async () => new Response("Auth Context not initialized", { status: 500 }),
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [dbUser, setDbUser] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const t = await currentUser.getIdToken();
                setToken(t);
                setUser(currentUser);
                
                // Fetch DB User
                try {
                    const res = await fetch("/api/auth/me", {
                        headers: { "Authorization": `Bearer ${t}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setDbUser(data.user);
                    }
                } catch (e) {
                    console.error("Failed to fetch DB user:", e);
                }
            } else {
                setUser(null);
                setDbUser(null);
                setToken(null);
                setGoogleAccessToken(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
        if (!auth.currentUser) {
            console.warn("fetchWithAuth called but user is not logged in");
            throw new Error("User not authenticated");
        }

        // Always get a fresh token (Firebase handles caching automatically)
        const freshToken = await auth.currentUser.getIdToken();

        const headers = new Headers(options.headers || {});
        headers.set("Authorization", `Bearer ${freshToken}`);

        return fetch(url, {
            ...options,
            headers: headers,
        });
    };

    return (
        <AuthContext.Provider value={{ user, dbUser, loading, token, googleAccessToken, setGoogleAccessToken, fetchWithAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
