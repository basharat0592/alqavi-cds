"use client";

import TradeSaleInvoice from '@/components/trade/TradeSaleInvoice';

/** Trade 1.0 "Sale Return (Random)" window — opened as a pop-up from the dashboard. */
export default function SaleReturnPage() {
    return <TradeSaleInvoice mode="return" />;
}
