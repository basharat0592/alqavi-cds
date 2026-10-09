"use client";

import { use } from 'react';
import TradeInvoicePrint from '@/components/trade/TradeInvoicePrint';

/** Public, read-only sale invoice opened from the link shared on WhatsApp. */
export default function SharedInvoicePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    return <TradeInvoicePrint token={token} />;
}
