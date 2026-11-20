"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/axios';

export type CompanyOpt = { id: number; code: number | null; name: string };

/** Every company (Companies list, all pages), sorted by name — for the Company dropdowns. */
export function useCompanies(): CompanyOpt[] {
    const [companies, setCompanies] = useState<CompanyOpt[]>([]);
    useEffect(() => {
        let live = true;
        (async () => {
            const all: any[] = [];
            try {
                for (let page = 1; page <= 20; page++) {
                    const { data } = await api.get('v1/company/companies/', { params: { page, page_size: 100 } });
                    if (Array.isArray(data)) { all.push(...data); break; }
                    all.push(...(data.results || []));
                    if (!data.next) break;
                }
            } catch { /* the dropdown stays empty */ }
            if (live) setCompanies(all.filter((c) => c.is_active !== false)
                .map((c) => ({ id: c.id, code: c.code ?? null, name: String(c.name) }))
                .sort((a, b) => a.name.localeCompare(b.name)));
        })();
        return () => { live = false; };
    }, []);
    return companies;
}
