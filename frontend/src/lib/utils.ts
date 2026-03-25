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
        PKR: 'PKR ',
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
 * @param dateStr - ISO date string or timestamp
 * @param options - Intl.DateTimeFormatOptions
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
 * Handle media URLs, prepending the API base URL if relative.
 * Robust against varied path formats (leading slashes, full URLs, etc.)
 */
export function getImageUrl(url: string | null | undefined): string | null {
    if (!url || typeof url !== 'string') return null;

    // If it's already a full URL or base64, return as is
    if (url.startsWith('http') || url.startsWith('data:')) return url;

    // Fallback to local API if no env provided
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');
    const domain = apiBase.replace('/api', '').replace(/\/$/, '');

    // Ensure the path starts with a single slash
    const path = url.startsWith('/') ? url : `/${url}`;

    // Join domain and path
    const fullUrl = `${domain}${path}`;

    // DEBUG LOG - to help identify why images might fail
    // console.log(`[getImageUrl] input: ${url} -> output: ${fullUrl}`);

    return fullUrl;
}



