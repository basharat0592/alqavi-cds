/**
 * dataService — lightweight localStorage helpers for local/offline data access.
 * These complement the API services in api.ts for offline and demo scenarios.
 */

const STORAGE_KEYS = {
    orders: 'qavi_orders',
    sellerOrders: 'qavi_seller_orders',
} as const;

function readStorage<T>(key: string): T[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(key);
        return raw && raw !== 'undefined' ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function writeStorage(key: string, value: unknown): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch { /* ignore storage errors */ }
}

export const dataService = {
    /** Return all orders belonging to a specific user. */
    getOrders: (userId: string) => {
        return readStorage<any>(STORAGE_KEYS.orders).filter(
            (o: any) => o.userId === userId
        );
    },

    /** Return aggregated stats for a seller. */
    getSellerStats: (sellerId: string) => {
        const sellerOrders = readStorage<any>(STORAGE_KEYS.sellerOrders).filter(
            (o: any) => o.sellerId === sellerId
        );
        const totalRevenue = sellerOrders.reduce((sum: number, o: any) => sum + (o.amount ?? 0), 0);
        return {
            revenue: totalRevenue,
            revenueTrend: 0,
            orders: sellerOrders,
            products: [] as any[],
            totalCustomers: new Set(sellerOrders.map((o: any) => o.customerId)).size,
        };
    },

    /** Create a new order and persist it to localStorage. */
    createOrder: (userId: string, order: any) => {
        const orders = readStorage<any>(STORAGE_KEYS.orders);
        const newOrder = {
            ...order,
            id: `ORD-${Date.now()}`,
            userId,
            date: new Date().toISOString().split('T')[0],
            status: 'Processing',
        };
        writeStorage(STORAGE_KEYS.orders, [newOrder, ...orders]);
        return newOrder;
    },
};
