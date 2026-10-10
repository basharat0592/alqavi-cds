"use client";

import TradeMasterWindow, { type MasterConfig } from '@/components/trade/TradeMasterWindow';

const CFG: MasterConfig = {
    window: 'New District', legend: 'New District', entity: 'District', codeLabel: 'District Code',
    fields: [{ key: 'name', label: 'District Name', required: true, max: 120 }],
    cols: [{ h: 'District Code', key: 'code', w: 25 }, { h: 'District Name', key: 'name', w: 45 }],
    url: 'v1/sales/trade-areas/', nextCodeUrl: 'v1/sales/trade-areas/next_code/', params: { level: 'district' },
    exportName: 'Districts', stage: { width: 900, height: 700 },
};

/** Trade 1.0 "New District" (Accounts › District) — opened as a pop-up from the dashboard. */
export default function DistrictPage() {
    return <TradeMasterWindow cfg={CFG} />;
}
