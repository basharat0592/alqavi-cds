"use client";

import TradeSaleInvoice from '@/components/trade/TradeSaleInvoice';

/** Trade 1.0 "Sale / Sale-Return Records" window — opened as a pop-up from the dashboard. */
export default function SaleRecordsPage() {
    return <TradeSaleInvoice mode="records" />;
}
