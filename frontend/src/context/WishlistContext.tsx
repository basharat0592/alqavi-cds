'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/axios';
import { authService } from '@/lib/auth';

interface WishlistItem {
    id: string;
    name: string;
    price: number | string;
    image: string;
    category: string;
    type?: string;
    weight?: string;
    addedAt: string;
}

interface WishlistContextType {
    wishlist: WishlistItem[];
    addToWishlist: (item: WishlistItem) => void;
    removeFromWishlist: (id: string) => void;
    isInWishlist: (id: string) => boolean;
    wishlistCount: number;
    refreshWishlist: () => void;
    loading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
    const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(false);

    const refreshWishlist = async () => {
        if (!authService.isAuthenticated()) {
            const saved = localStorage.getItem('cosmetic_distro_wishlist');
            if (saved) {
                try {
                    setWishlist(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to load wishlist", e);
                }
            }
            return;
        }

        setLoading(true);
        try {
            const response = await api.get('/v1/products/wishlist/');
            console.log("Wishlist API Response:", response.data);
            const rawData = response.data.results || response.data || [];

            if (!Array.isArray(rawData)) {
                console.error("Wishlist API did not return an array", response.data);
                setWishlist([]);
                return;
            }

            const backendItems = rawData.map((item: any) => ({
                id: item.product_details?.id,
                name: (item.product_details?.product_name || 'Unknown Product').replace(/\s*\(.*?\)\s*$/, '').trim(),
                price: item.product_details?.selling_price || 0,
                image: item.product_details?.image,
                category: item.product_details?.category_name,
                type: item.product_details?.type,
                weight: item.product_details?.weight,
                addedAt: item.created_at || new Date().toISOString()
            }));
            console.log("Mapped Wishlist Items:", backendItems);
            setWishlist(backendItems);
        } catch (err) {
            console.error("Failed to fetch wishlist from DB", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshWishlist();
    }, []);

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            localStorage.setItem('cosmetic_distro_wishlist', JSON.stringify(wishlist));
        }
    }, [wishlist]);

    const addToWishlist = async (item: WishlistItem) => {
        if (wishlist.find(i => i.id === item.id)) return;

        if (authService.isAuthenticated()) {
            try {
                await api.post('/v1/products/wishlist/toggle/', { product_id: item.id });
                refreshWishlist();
            } catch (err) {
                console.error("Failed to add to database wishlist", err);
            }
        } else {
            setWishlist(prev => [...prev, { ...item, addedAt: new Date().toISOString() }]);
        }
    };

    const removeFromWishlist = async (id: string) => {
        if (authService.isAuthenticated()) {
            try {
                await api.post('/v1/products/wishlist/toggle/', { product_id: id });
                refreshWishlist();
            } catch (err) {
                console.error("Failed to remove from database wishlist", err);
            }
        } else {
            setWishlist(prev => prev.filter(i => i.id !== id));
        }
    };

    const isInWishlist = (id: string) => wishlist.some(i => i.id === id);

    return (
        <WishlistContext.Provider value={{
            wishlist,
            addToWishlist,
            removeFromWishlist,
            isInWishlist,
            wishlistCount: wishlist.length,
            refreshWishlist,
            loading
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
