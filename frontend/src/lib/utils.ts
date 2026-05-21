import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes without conflicts. */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

/**
 * Format a numeric amount as a currency string.
 * @param amount  - Number or numeric string
 * @param currency - ISO currency code (default: 'PKR')
 */
export function formatCurrency(amount: number | string, currency = 'PKR'): string {
    const symbols: Record<string, string> = {
        USD: '$',
        EUR: '\u20ac',
        GBP: '\u00a3',
        PKR: 'Rs. ',
    };
    const symbol = symbols[currency] ?? currency;
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (Number.isNaN(value)) return `${symbol}0.00`;
    return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Safely parse a value to a float; returns 0 on failure.
 */
export function parseNumber(value: unknown): number {
    const n = parseFloat(String(value));
    return Number.isNaN(n) ? 0 : n;
}

/**
 * Format an ISO date string into a human-readable date.
 */
export function formatDate(
    dateStr: string | number | undefined | null,
    options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', options);
    } catch {
        return String(dateStr);
    }
}

/**
 * Format an ISO date string into a human-readable date and time.
 */
export function formatDateTime(
    dateStr: string | number | undefined | null,
    options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }
): string {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleString('en-US', options);
    } catch {
        return String(dateStr);
    }
}

/**
 * Return a human-readable "time ago" string for a timestamp.
 */
export function formatTimeAgo(timestamp: number | string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Derive a display stock status from a numeric stock quantity.
 */
export function getStockStatus(stock: number): 'In Stock' | 'Low Stock' | 'Critical' | 'Out of Stock' {
    if (stock === 0) return 'Out of Stock';
    if (stock < 5) return 'Critical';
    if (stock < 10) return 'Low Stock';
    return 'In Stock';
}

/**
 * Truncate a string to a maximum length, appending an ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return `${str.slice(0, maxLength)}\u2026`;
}

/**
 * Check if a media URL represents a video asset by normalizing and analyzing its path.
 */
export function checkIsVideo(url: string | null | undefined): boolean {
    if (!url || typeof url !== 'string') return false;
    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
    return cleanUrl.endsWith('.mp4') || 
           cleanUrl.endsWith('.webm') || 
           cleanUrl.endsWith('.ogg') || 
           cleanUrl.endsWith('.mov') || 
           cleanUrl.includes('/video');
}

// Module-level cache buster, evaluated once per page load/import
const CACHE_BUSTER = typeof window !== 'undefined' 
    ? ((window as any).__CACHE_BUSTER || ((window as any).__CACHE_BUSTER = Date.now())) 
    : Date.now();

/**
 * Handle media URLs, prepending the API base URL if relative.
 * Robust against varied path formats (leading slashes, full URLs, etc.)
 */
export function getImageUrl(url: string | null | undefined): string | undefined {
    if (!url || typeof url !== 'string') return undefined;

    // 1. If it's a data URL, return as is
    if (url.startsWith('data:')) return url;

    // 2. Resolve the API/Media Domain
    let apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    
    // Normalize localhost vs 127.0.0.1
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
            apiBase = apiBase.replace(/localhost|127\.0\.0\.1/, host);
        }
    }
    
    let domain = '';
    try {
        domain = new URL(apiBase).origin;
    } catch {
        domain = apiBase.split('/api')[0].replace(/\/$/, '');
    }

    // 3. Handle Absolute URLs
    if (url.startsWith('http')) {
        let finalUrl = url;
        // Normalize our own local domain if it mismatches the current host
        if (url.includes('localhost:8000') || url.includes('127.0.0.1:8000')) {
            const currentHost = (typeof window !== 'undefined') ? window.location.hostname : 'localhost';
            finalUrl = url.replace(/localhost|127\.0\.0\.1/, currentHost);
            
            // Add cache buster for our own local media
            return `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}v=${CACHE_BUSTER}`;
        }
        return finalUrl;
    }

    // 4. Handle Relative Paths
    // IF it starts with /images/ or /assets/ and we are on frontend, it's a local public asset
    if (url.startsWith('images/') || url.startsWith('assets/') || url.startsWith('/images/') || url.startsWith('/assets/') || url.startsWith('/next.svg')) {
        return url.startsWith('/') ? url : `/${url}`;
    }

    // Clean leading slashes for backend media
    let cleanPath = url.replace(/^\/+/, '');

    // Ensure it goes through /media/
    if (!cleanPath.startsWith('media/')) {
        cleanPath = `media/${cleanPath}`;
    }

    // Join and return
    return `${domain}/${cleanPath}?v=${CACHE_BUSTER}`;
}

/**
 * Export an array of objects to a CSV file.
 */
export function exportToCSV(data: any[], filename = 'export.csv') {
    if (!data || data.length === 0) return;

    // 1. Get unique headers from all objects
    const headers = Array.from(new Set(data.flatMap(obj => Object.keys(obj))));

    // 2. Build CSV rows
    const rows = data.map(obj =>
        headers.map(header => {
            const val = obj[header] === null || obj[header] === undefined ? '' : obj[header];
            // Escape double quotes and wrap in double quotes to handle commas
            const escaped = String(val).replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(',')
    );

    // 3. Assemble full content
    const csvContent = [headers.join(','), ...rows].join('\n');

    // 4. Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}



