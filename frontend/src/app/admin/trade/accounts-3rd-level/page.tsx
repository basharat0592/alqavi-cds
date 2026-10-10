"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import TradeMasterWindow, { type MasterConfig } from '@/components/trade/TradeMasterWindow';

type Opt = { value: string; label: string; main?: string };

const cfgFor = (mains: Opt[], subs: Opt[]): MasterConfig => ({
    window: 'Chart of Account Third Level', legend: 'Chart of Accounts 3rd Level', entity: 'Account', codeLabel: 'Third Level Account ID',
    fields: [
        { key: 'name', label: 'Third Level Account', required: true, max: 150 },
        { key: 'main', label: 'Main Account', half: true, options: mains, resets: ['sub'] },
        // Account 2nd Level lists the chosen main account's sub accounts.
        { key: 'sub', label: 'Account 2nd Level', half: true, required: true, optionsFn: (f) => subs.filter((s) => !f.main || s.main === f.main) },
    ],
    cols: [
        { h: 'Main Account', key: 'main_name', w: 16 }, { h: '2nd Level Acc', key: 'sub_name', w: 24 },
        { h: '3rd Level Acc.ID', key: 'code', w: 13 }, { h: '3rd Level Acc. Name', key: 'name', w: 35 },
    ],
    url: 'v1/sales/trade-account-groups/', nextCodeUrl: 'v1/sales/trade-account-groups/next_code/', params: { level: '3' },
    codeParent: 'sub', search: { label: 'Search Acc. 3rd Level', keys: ['name', 'code'] },
    exportName: 'Accounts 3rd Level', stage: { width: 1100, height: 700 },
});

/** Trade 1.0 "Chart of Accounts 3rd Level" (Accounts › Accounts 3rd Level). */
export default function Accounts3rdLevelPage() {
    const [opts, setOpts] = useState<{ m: Opt[]; s: Opt[] } | null>(null);
    useEffect(() => {
        Promise.all([
            api.get('v1/sales/trade-account-groups/mains/'),
            api.get('v1/sales/trade-account-groups/', { params: { level: '2' } }),
        ]).then(([m, s]) => setOpts({
            m: m.data.map((x: any) => ({ value: String(x.id), label: x.name })),
            s: s.data.map((x: any) => ({ value: String(x.id), label: `${x.code} ${x.name}`, main: x.main })),
        })).catch(() => setOpts({ m: [], s: [] }));
    }, []);
    if (!opts) return <div className="h-screen bg-[#c9c9f9]" />;
    return <TradeMasterWindow cfg={cfgFor(opts.m, opts.s)} />;
}
