'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
    id: number | string;
    name: string;
    price: number | string;
    quantity: number;
    image: string;
    category: string;
    stock?: number;
    weight?: string;
    size?: string;
    batch?: string;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (id: number | string) => void;
    updateQuantity: (id: number | string, quantity: number) => void;
    clearCart: () => void;
    cartCount: number;
    cartTotal: number;
    // Drawer state
    isCartOpen: boolean;
    setIsCartOpen: (open: boolean) => void;
    openCart: () => void;
    closeCart: () => void;
    refreshStock: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_KEY = 'qavi_cart';

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);

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
        setIsCartOpen(true); // Automatically open cart when adding items
    };

    const removeFromCart = (id: number | string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const updateQuantity = (id: number | string, quantity: number) => {
        if (quantity < 1) { removeFromCart(id); return; }
        setItems(prev => prev.map(i => {
            if (i.id === id) {
                // Strictly enforce stock limit if provided
                const finalQty = i.stock !== undefined ? Math.min(quantity, i.stock) : quantity;
                return { ...i, quantity: finalQty };
            }
            return i;
        }));
    };

    const refreshStock = async () => {
        try {
            const { productService } = await import('@/services/product.service');
            const updatedItems = await Promise.all(items.map(async (item) => {
                try {
                    const latest = await productService.getById(item.id);
                    if (latest) {
                        const newStock = latest.total_quantity || 0;
                        return { 
                            ...item, 
                            stock: newStock,
                            // Adjust quantity if current selection exceeds new stock
                            quantity: Math.min(item.quantity, newStock)
                        };
                    }
                } catch { /* skip if specific product fails */ }
                return item;
            }));
            setItems(updatedItems);
        } catch (err) {
            console.error("Cart stock refresh failed", err);
        }
    };

    const clearCart = () => {
        setItems([]);
        if (typeof window !== 'undefined') localStorage.removeItem(CART_KEY);
    };

    const openCart = () => {
        setIsCartOpen(true);
        refreshStock(); // Refresh stock whenever the cart opens
    };
    
    const closeCart = () => setIsCartOpen(false);

    const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const cartTotal = items.reduce((sum, i) => {
        const p = typeof i.price === 'string' ? parseFloat(i.price) : i.price;
        const price = isNaN(p as number) ? 0 : (p as number);
        return sum + price * i.quantity;
    }, 0);

    return (
        <CartContext.Provider value={{ 
            items, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal,
            isCartOpen, setIsCartOpen, openCart, closeCart, refreshStock
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
}
