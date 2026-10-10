"use client";

import TradeMasterWindow, { type MasterConfig } from '@/components/trade/TradeMasterWindow';

const dmy = (v: any) => (v ? String(v).slice(0, 10).split('-').reverse().join('-') : '');
const STATUS = [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }];

const CFG: MasterConfig = {
    window: 'Financial Year', legend: 'New Financial Year', entity: 'Financial Year', codeLabel: 'S.No',
    fields: [
        { key: 'from_date', label: 'From Date', half: true, required: true, type: 'date' },
        { key: 'to_date', label: 'To Date', half: true, required: true, type: 'date' },
        { key: 'title', label: 'Year Title', half: true, required: true, max: 40 },
        { key: 'status', label: 'Status', half: true, required: true, options: STATUS },
    ],
    cols: [
        { h: 'S.No', key: 'code', w: 10 }, { h: 'Financial Year', key: 'title', w: 18 },
        { h: 'From Date', key: 'from_date', w: 16, fmt: dmy }, { h: 'To Date', key: 'to_date', w: 16, fmt: dmy },
        { h: 'Status', key: 'status', w: 14, fmt: (v) => (v === 'active' ? 'Active' : 'Inactive') },
    ],
    url: 'v1/sales/trade-financial-years/', nextCodeUrl: 'v1/sales/trade-financial-years/next_code/',
    exportName: 'Financial Years', stage: { width: 960, height: 700 },
};

/** Trade 1.0 "Financial Year" (Accounts › Financial Year) — opened as a pop-up from the dashboard. */
export default function FinancialYearPage() {
    return <TradeMasterWindow cfg={CFG} />;
}
