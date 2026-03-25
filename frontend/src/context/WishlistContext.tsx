'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface WishlistItem {
    id: number;
    name: string;
    price: number | string;
    image: string;
    category: string;
    addedAt: string;
}

interface WishlistContextType {
    wishlist: WishlistItem[];
    addToWishlist: (item: WishlistItem) => void;
    removeFromWishlist: (id: number) => void;
    isInWishlist: (id: number) => boolean;
    wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
    const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('cosmetic_distro_wishlist');
        if (saved) {
            try {
                setWishlist(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load wishlist", e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('cosmetic_distro_wishlist', JSON.stringify(wishlist));
    }, [wishlist]);

    const addToWishlist = (item: WishlistItem) => {
        setWishlist(prev => {
            if (prev.find(i => i.id === item.id)) return prev;
            return [...prev, { ...item, addedAt: new Date().toISOString() }];
        });
    };

    const removeFromWishlist = (id: number) => {
        setWishlist(prev => prev.filter(i => i.id !== id));
    };

    const isInWishlist = (id: number) => wishlist.some(i => i.id === id);

    return (
        <WishlistContext.Provider value={{ 
            wishlist, 
            addToWishlist, 
            removeFromWishlist, 
            isInWishlist,
            wishlistCount: wishlist.length 
        }}>
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (context === undefined) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
}
