/**
 * useAdminFilter - Hook for managing admin page filters and sorting
 */

import { useState, useCallback } from 'react';

export interface FilterState {
    [key: string]: string | number | boolean | string[];
}

export interface SortState {
    field: string;
    direction: 'asc' | 'desc';
}

export const useAdminFilter = (initialFilters: FilterState = {}, initialSort?: SortState) => {
    const [filters, setFilters] = useState<FilterState>(initialFilters);
    const [sort, setSort] = useState<SortState | null>(initialSort || null);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const updateFilter = useCallback((key: string, value: any) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
        }));
        setPage(1); // Reset to first page when filters change
    }, []);

    const clearFilters = useCallback(() => {
        setFilters(initialFilters);
        setPage(1);
    }, [initialFilters]);

    const updateSort = useCallback((field: string) => {
        setSort(prev => {
            if (prev?.field === field) {
                return {
                    field,
                    direction: prev.direction === 'asc' ? 'desc' : 'asc',
                };
            }
            return { field, direction: 'asc' };
        });
    }, []);

    const applyFilter = useCallback(<T extends object>(data: T[]): T[] => {
        let filtered = [...data];

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return;

            filtered = filtered.filter(item => {
                const itemValue = (item as any)[key];
                if (Array.isArray(value)) {
                    return value.includes(itemValue);
                }
                return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
            });
        });

        // Apply sorting
        if (sort) {
            filtered.sort((a: any, b: any) => {
                const aVal = a[sort.field];
                const bVal = b[sort.field];

                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
                }

                return sort.direction === 'asc'
                    ? String(aVal).localeCompare(String(bVal))
                    : String(bVal).localeCompare(String(aVal));
            });
        }

        return filtered;
    }, [filters, sort]);

    const getPaginatedData = useCallback(<T extends object>(data: T[]) => {
        const start = (page - 1) * limit;
        const end = start + limit;
        return data.slice(start, end);
    }, [page, limit]);

    return {
        filters,
        sort,
        page,
        limit,
        updateFilter,
        clearFilters,
        updateSort,
        applyFilter,
        getPaginatedData,
        setPage,
        setLimit,
    };
};
