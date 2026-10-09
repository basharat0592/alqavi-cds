"use client";

import TradeSaleInvoice from '@/components/trade/TradeSaleInvoice';

/** Trade 1.0 "Chart of Account" window — opened as a pop-up from the dashboard. */
export default function ChartOfAccountPage() {
    return <TradeSaleInvoice mode="coa" />;
}
