"use client";

import { use } from 'react';
import TradePurchaseInvoicePrint from '@/components/trade/TradePurchaseInvoicePrint';

/** Printed Trade 1.0 purchase invoice — ?print to print on open. */
export default function TradePurchaseInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <TradePurchaseInvoicePrint id={id} />;
}
