"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import TradeMasterWindow, { type MasterConfig } from '@/components/trade/TradeMasterWindow';

const cfgFor = (mains: { value: string; label: string }[]): MasterConfig => ({
    window: 'Chart of Accounts Second Level', legend: 'Chart of Accounts 2nd Level', entity: 'Account', codeLabel: 'Sub Account Code',
    fields: [
        { key: 'name', label: 'Sub Account Name', required: true, max: 150 },
        { key: 'main', label: 'Main Account', required: true, options: mains },
    ],
    cols: [
        { h: 'Main Acc. Name', key: 'main_name', w: 22 }, { h: 'Acc. 2nd Level Code', key: 'code', w: 18 },
        { h: 'Acc. 2nd Level Name', key: 'name', w: 40 },
    ],
    url: 'v1/sales/trade-account-groups/', nextCodeUrl: 'v1/sales/trade-account-groups/next_code/', params: { level: '2' },
    codeParent: 'main', exportName: 'Accounts 2nd Level', stage: { width: 900, height: 700 },
});

/** Trade 1.0 "Chart of Accounts 2nd Level" (Accounts › Accounts 2nd Level). */
export default function Accounts2ndLevelPage() {
    const [mains, setMains] = useState<{ value: string; label: string }[] | null>(null);
    useEffect(() => {
        api.get('v1/sales/trade-account-groups/mains/')
            .then(({ data }) => setMains(data.map((m: any) => ({ value: String(m.id), label: m.name }))))
            .catch(() => setMains([]));
    }, []);
    if (!mains) return <div className="h-screen bg-[#c9c9f9]" />;
    return <TradeMasterWindow cfg={cfgFor(mains)} />;
}
