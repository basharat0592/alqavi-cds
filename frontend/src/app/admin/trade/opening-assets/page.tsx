"use client";

import TradeOpeningVoucher from '@/components/trade/TradeOpeningVoucher';

/** Trade 1.0 "Opening Assets" (Accounts › Opening entries) — opened as a pop-up from the dashboard. */
export default function OpeningAssetsPage() {
    return <TradeOpeningVoucher kind="assets" />;
}
