"use client";

import TradeOpeningStock from '@/components/trade/TradeOpeningStock';

/** Trade 1.0 "Stock Short" (Accounts › Short / Excess) — opened as a pop-up from the dashboard. */
export default function StockShortPage() {
    return <TradeOpeningStock kind="ssho" />;
}
