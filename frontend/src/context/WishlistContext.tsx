'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/axios';
import { authService } from '@/lib/auth';

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
            const backendItems = response.data.map((item: any) => ({
                id: item.product_details.id,
                name: item.product_details.name,
                price: item.product_details.price,
                image: item.product_details.image,
                category: item.product_details.category_name,
                addedAt: item.created_at
            }));
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
                await api.post('/v1/products/wishlist/add/', { product_id: item.id });
                refreshWishlist();
            } catch (err) {
                console.error("Failed to add to database wishlist", err);
            }
        } else {
            setWishlist(prev => [...prev, { ...item, addedAt: new Date().toISOString() }]);
        }
    };

    const removeFromWishlist = async (id: number) => {
        if (authService.isAuthenticated()) {
            try {
                await api.delete(`/v1/products/wishlist/${id}/remove/`);
                refreshWishlist();
            } catch (err) {
                console.error("Failed to remove from database wishlist", err);
            }
        } else {
            setWishlist(prev => prev.filter(i => i.id !== id));
        }
    };

    const isInWishlist = (id: number) => wishlist.some(i => i.id === id);

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
