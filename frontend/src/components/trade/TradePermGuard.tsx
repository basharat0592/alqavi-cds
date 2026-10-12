"use client";

/* Stops a restricted login opening a Trade window it has no right on. */
import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { canOpen, loadMyPerms, rowForHref, type MyPerms } from '@/lib/tradePerms';
import { closeTradeWindow } from '@/components/trade/TradeSaleInvoice';

export default function TradePermGuard({ path, children }: { path: string; children: React.ReactNode }) {
    const [p, setP] = useState<MyPerms | null>(null);
    useEffect(() => { loadMyPerms().then(setP); }, []);
    if (!p) return null;
    if (canOpen(p, path)) return <>{children}</>;
    const row = rowForHref(p, path);
    return (
        <div className="flex h-screen items-center justify-center bg-[#c9c9f9] p-6 font-sans">
            <div className="w-full max-w-md border border-slate-300 bg-white p-6 text-center shadow-xl">
                <ShieldAlert size={36} className="mx-auto text-[#b3261e]" />
                <div className="mt-3 text-[16px] font-bold text-slate-800">No permission</div>
                <p className="mt-1 text-[13.5px] text-slate-600">
                    Your login is not allowed to open <b>{row?.label || 'this window'}</b>. Ask the admin to give you the right in Setup › User-Role Permissions.
                </p>
                <button type="button" onClick={closeTradeWindow} className="mt-4 h-9 border border-[#3b3f8f] bg-[#3b3f8f] px-6 text-[14px] font-bold text-white">Close</button>
            </div>
        </div>
    );
}
