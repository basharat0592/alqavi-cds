'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
    id: number | string;
    name: string;
    price: number | string;
    quantity: number;
    image: string;
    category: string;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (id: number | string) => void;
    updateQuantity: (id: number | string, quantity: number) => void;
    clearCart: () => void;
    cartCount: number;
    cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_KEY = 'qavi_cart';

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [hydrated, setHydrated] = useState(false);

    // Load cart from localStorage on first render
    useEffect(() => {
        try {
            const saved = localStorage.getItem(CART_KEY);
            if (saved) setItems(JSON.parse(saved));
        } catch { /* ignore */ }
        setHydrated(true);
    }, []);

    // Persist cart to localStorage whenever it changes
    useEffect(() => {
        if (!hydrated) return;
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(items));
        } catch { /* ignore */ }
    }, [items, hydrated]);

    const addToCart = (newItem: CartItem) => {
        setItems(prevItems => {
            const existing = prevItems.find(i => i.id === newItem.id);
            if (existing) {
                return prevItems.map(i =>
                    i.id === newItem.id ? { ...i, quantity: i.quantity + newItem.quantity } : i
                );
            }
            return [...prevItems, newItem];
        });
    };

    const removeFromCart = (id: number | string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const updateQuantity = (id: number | string, quantity: number) => {
        if (quantity < 1) { removeFromCart(id); return; }
        setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
    };

    const clearCart = () => {
        setItems([]);
        if (typeof window !== 'undefined') localStorage.removeItem(CART_KEY);
    };

    const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const cartTotal = items.reduce((sum, i) => {
        const price = typeof i.price === 'string' ? parseFloat(i.price) : i.price;
        return sum + price * i.quantity;
    }, 0);

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
}
