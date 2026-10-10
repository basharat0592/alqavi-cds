"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import TradeMasterWindow, { type MasterConfig } from '@/components/trade/TradeMasterWindow';

type Opt = { value: string; label: string; district?: string };

const cfgFor = (districts: Opt[], mains: Opt[]): MasterConfig => ({
    window: 'Sub Area', legend: 'Sub Area', entity: 'Sub Area', codeLabel: 'Sub Area ID',
    fields: [
        { key: 'name', label: 'Sub Area Name', required: true, max: 120 },
        { key: 'district', label: 'District', half: true, options: districts, resets: ['main'] },
        // Main Area lists the chosen district's main areas.
        { key: 'main', label: 'Main Area', half: true, required: true, optionsFn: (f) => mains.filter((m) => !f.district || m.district === f.district) },
    ],
    cols: [
        { h: 'District', key: 'district_name', w: 20 }, { h: 'Main Area', key: 'main_name', w: 28 },
        { h: 'Area ID', key: 'code', w: 10 }, { h: 'Area Name', key: 'name', w: 30 },
    ],
    url: 'v1/sales/trade-areas/', nextCodeUrl: 'v1/sales/trade-areas/next_code/', params: { level: 'sub' },
    search: { label: 'Sub Area', keys: ['name'] },
    exportName: 'Sub Areas', stage: { width: 1100, height: 700 },
});

/** Trade 1.0 "Sub Area" (Accounts › Sub Area) — opened as a pop-up from the dashboard. */
export default function SubAreaPage() {
    const [opts, setOpts] = useState<{ d: Opt[]; m: Opt[] } | null>(null);
    useEffect(() => {
        Promise.all([
            api.get('v1/sales/trade-areas/', { params: { level: 'district' } }),
            api.get('v1/sales/trade-areas/', { params: { level: 'main' } }),
        ]).then(([d, m]) => setOpts({
            d: d.data.map((x: any) => ({ value: String(x.id), label: x.name })),
            m: m.data.map((x: any) => ({ value: String(x.id), label: x.name, district: x.district })),
        })).catch(() => setOpts({ d: [], m: [] }));
    }, []);
    if (!opts) return <div className="h-screen bg-[#c9c9f9]" />;
    return <TradeMasterWindow cfg={cfgFor(opts.d, opts.m)} />;
}
