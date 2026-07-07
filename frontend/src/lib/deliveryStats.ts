/**
 * Shared rider-console helpers: rating math, earnings, and status grouping.
 * One place so the Dashboard, Earnings, and Rating pages stay consistent.
 */

// Flat fee a rider earns per completed (delivered) order. Adjust to your payout
// model, or wire to a real backend field when available.
export const DELIVERY_FEE = 150;

// A perfect 5-star rating is reached at this many completed deliveries.
export const DELIVERIES_FOR_FULL = 50;
export const STAR_PER_DELIVERY = 5 / DELIVERIES_FOR_FULL;

export const upper = (s: any) => String(s || '').toUpperCase();
export const isDelivered = (s: any) => upper(s) === 'DELIVERED';
export const isReturned = (s: any) => upper(s) === 'RETURNED';
export const isCancelled = (s: any) => ['CANCELLED', 'REJECTED'].includes(upper(s));
export const isDone = (s: any) => isDelivered(s) || isCancelled(s) || isReturned(s);
export const isActive = (s: any) => !isDone(s);

export const ratingFor = (deliveredCount: number) =>
    Math.min(5, Math.max(0, deliveredCount) * STAR_PER_DELIVERY);

export const orderDate = (o: any): Date | null => {
    const d = o?.created_at || o?.order_date || o?.updated_at;
    if (!d) return null;
    const t = new Date(d);
    return isNaN(t.getTime()) ? null : t;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Earnings buckets (today / this week / this month / all-time) from delivered orders. */
export function computeEarnings(results: any[], now: Date) {
    const delivered = (results || []).filter((o) => isDelivered(o.status));
    const today0 = startOfDay(now).getTime();
    const week0 = today0 - ((now.getDay() + 6) % 7) * 86400000; // Monday start
    const month0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let today = 0, week = 0, month = 0, allTime = 0;
    delivered.forEach((o) => {
        const d = orderDate(o);
        const t = d ? d.getTime() : 0;
        const fee = Number(o.shipping_cost ?? 0) > 0 ? Number(o.shipping_cost) : DELIVERY_FEE;
        if (t >= today0) today += fee;
        if (t >= week0) week += fee;
        if (t >= month0) month += fee;
        allTime += fee;
    });
    return {
        today, week, month,
        allTime,
        count: delivered.length,
        deliveredOrders: delivered,
    };
}
