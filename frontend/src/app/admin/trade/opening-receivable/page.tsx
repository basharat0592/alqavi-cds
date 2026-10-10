"use client";

import TradeOpeningVoucher from '@/components/trade/TradeOpeningVoucher';

/** Trade 1.0 "Opening Receivable" (Accounts › Opening entries) — opened as a pop-up from the dashboard. */
export default function OpeningReceivablePage() {
    return <TradeOpeningVoucher kind="receivables" />;
}
