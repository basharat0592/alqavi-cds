/**
 * useAdminSearch - Hook for global admin search functionality
 * Searches across products, orders, and users
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { productService, orderService, userService } from '@/lib/api';

export interface SearchResult {
    type: 'product' | 'order' | 'user';
    id: string;
    title: string;
    subtitle?: string;
    icon?: string;
    url: string;
    highlight?: string;
}

export const useAdminSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const debounceRef = useRef<NodeJS.Timeout>();

    const search = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const q = searchQuery.toLowerCase();

            const [productsRes, ordersRes, usersRes] = await Promise.all([
                productService.getAll?.() ?? Promise.resolve([]),
                orderService.getAll?.() ?? Promise.resolve([]),
                userService.getAll?.() ?? Promise.resolve([]),
            ]);

            const products = Array.isArray(productsRes) ? productsRes : (productsRes as any)?.results || [];
            const orders = Array.isArray(ordersRes) ? ordersRes : (ordersRes as any)?.results || [];
            const users = Array.isArray(usersRes) ? usersRes : (usersRes as any)?.results || [];

            const searchResults: SearchResult[] = [];

            // Search products
            products
                .filter((p: any) => p.name?.toLowerCase().includes(q) || p.sku?.includes(q))
                .slice(0, 3)
                .forEach((p: any) => {
                    searchResults.push({
                        type: 'product',
                        id: p.id,
                        title: p.name,
                        subtitle: `SKU: ${p.sku}`,
                        url: `/admin/products`,
                        highlight: p.price ? `PKR ${p.price}` : undefined,
                    });
                });

            // Search orders
            orders
                .filter((o: any) =>
                    String(o.orderNumber || o.id).includes(q) ||
                    o.customerName?.toLowerCase().includes(q)
                )
                .slice(0, 3)
                .forEach((o: any) => {
                    searchResults.push({
                        type: 'order',
                        id: o.id,
                        title: `Order #${o.orderNumber || o.id}`,
                        subtitle: o.customerName,
                        url: `/admin/sales`,
                        highlight: o.status,
                    });
                });

            // Search users
            users
                .filter((u: any) =>
                    u.name?.toLowerCase().includes(q) ||
                    u.email?.toLowerCase().includes(q)
                )
                .slice(0, 3)
                .forEach((u: any) => {
                    searchResults.push({
                        type: 'user',
                        id: u.id,
                        title: u.name || u.email,
                        subtitle: u.email,
                        url: `/admin/users`,
                    });
                });

            setResults(searchResults);
        } catch (error) {
            console.error('Search failed:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSearch = useCallback((value: string) => {
        setQuery(value);
        setIsOpen(true);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            search(value);
        }, 300);
    }, [search]);

    const clearSearch = useCallback(() => {
        setQuery('');
        setResults([]);
        setIsOpen(false);
    }, []);

    return {
        query,
        results,
        loading,
        isOpen,
        setIsOpen,
        handleSearch,
        clearSearch,
    };
};
