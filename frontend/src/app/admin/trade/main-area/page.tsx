"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import TradeMasterWindow, { type MasterConfig } from '@/components/trade/TradeMasterWindow';

const base = (districts: { value: string; label: string }[]): MasterConfig => ({
    window: 'New Main Area', legend: 'New Main Area', entity: 'Main Area', codeLabel: 'Main Area Code',
    fields: [
        { key: 'name', label: 'Main Area Name', required: true, max: 120 },
        { key: 'district', label: 'District', required: true, options: districts },
    ],
    cols: [{ h: 'Main Area Code', key: 'code', w: 18 }, { h: 'Main Area Name', key: 'name', w: 42 }, { h: 'District', key: 'district_name', w: 25 }],
    url: 'v1/sales/trade-areas/', nextCodeUrl: 'v1/sales/trade-areas/next_code/', params: { level: 'main' },
    exportName: 'Main Areas', stage: { width: 900, height: 700 },
});

/** Trade 1.0 "New Main Area" (Accounts › Main Area) — opened as a pop-up from the dashboard. */
export default function MainAreaPage() {
    const [districts, setDistricts] = useState<{ value: string; label: string }[] | null>(null);
    useEffect(() => {
        api.get('v1/sales/trade-areas/', { params: { level: 'district' } })
            .then(({ data }) => setDistricts(data.map((d: any) => ({ value: String(d.id), label: d.name }))))
            .catch(() => setDistricts([]));
    }, []);
    if (!districts) return <div className="h-screen bg-[#c9c9f9]" />;
    return <TradeMasterWindow cfg={base(districts)} />;
}
