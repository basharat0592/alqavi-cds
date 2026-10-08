"use client";

import { use } from 'react';
import TradeInvoicePrint from '@/components/trade/TradeInvoicePrint';

/** Printed Trade 1.0 sale invoice — ?size=a5|80|58, ?print to print on open. */
export default function TradeInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <TradeInvoicePrint id={id} />;
}
