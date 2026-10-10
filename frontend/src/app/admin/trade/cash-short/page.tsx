"use client";

import TradeCashShortExcess from '@/components/trade/TradeCashShortExcess';

/** Trade 1.0 "Cash Short" (Accounts › Short / Excess) — opened as a pop-up from the dashboard. */
export default function CashShortPage() {
    return <TradeCashShortExcess kind="short" />;
}
