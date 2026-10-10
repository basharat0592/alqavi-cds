"use client";

import TradeMasterWindow, { type MasterConfig } from '@/components/trade/TradeMasterWindow';

const CFG: MasterConfig = {
    window: 'New Company', legend: 'New Company', entity: 'Company', codeLabel: 'Company Code',
    fields: [{ key: 'name', label: 'Company Name', required: true, max: 150 }],
    cols: [{ h: 'Company Code', key: 'code', w: 25 }, { h: 'Company Name', key: 'name', w: 55 }],
    url: 'v1/company/companies/', nextCodeUrl: 'v1/company/companies/next_code/', exportName: 'Companies',
    stage: { width: 900, height: 700 },
};

/** Trade 1.0 "New Company" (Product › Companies) — opened as a pop-up from the dashboard. */
export default function CompaniesPage() {
    return <TradeMasterWindow cfg={CFG} />;
}
