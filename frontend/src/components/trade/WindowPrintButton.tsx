"use client";

/*
 * "Print" in the top-right corner of every Trade window (and reports opened as
 * a pop-up): prints exactly what the window shows, fitted on one A4 page.
 * Windows with their own print choices (Sale Invoice, Purchase: current page
 * or invoice) call useOwnPrint() and this button steps aside.
 */
import { useEffect, useRef, useState } from 'react';
import { Loader2, Printer } from 'lucide-react';
import { printWindow } from '@/lib/printWindow';

const EVT = 'trade-own-print';

/** A window that offers its own Print (current page / invoice) hides the corner button. */
export function useOwnPrint(enabled = true) {
    useEffect(() => {
        if (!enabled) return;
        document.body.dataset.ownPrint = '1';
        window.dispatchEvent(new Event(EVT));
        return () => { delete document.body.dataset.ownPrint; window.dispatchEvent(new Event(EVT)); };
    }, [enabled]);
}

/** Print with two choices (Sale Invoice, Purchase): the current page as shown, or the invoice. */
export function PrintChoiceButton({ onInvoice, invoiceDisabled, invoiceHint, className, label = 'Print' }: {
    onInvoice: () => void; invoiceDisabled?: boolean; invoiceHint?: string; className: string; label?: string;
}) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [open]);
    const page = async () => {
        setOpen(false); setBusy(true);
        try { await printWindow(); } catch { alert('Could not prepare the print.'); } finally { setBusy(false); }
    };
    const item = 'flex w-full items-center px-3 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent';
    return (
        <div ref={ref} className="relative" data-no-print>
            <button type="button" onClick={() => setOpen((o) => !o)} className={`${className} gap-1.5`} title="Print the current page or the invoice">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />} <span>{label} ▾</span>
            </button>
            {open && (
                <div className="absolute bottom-full right-0 z-50 mb-1 w-52 border border-slate-300 bg-white py-1 shadow-xl">
                    <button type="button" onClick={() => { setOpen(false); onInvoice(); }} disabled={invoiceDisabled} title={invoiceHint} className={item}>Invoice</button>
                    <button type="button" onClick={page} className={item}>Current page</button>
                </div>
            )}
        </div>
    );
}

export default function WindowPrintButton() {
    const [hidden, setHidden] = useState(false);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        const f = () => setHidden(document.body.dataset.ownPrint === '1');
        f();
        window.addEventListener(EVT, f);
        return () => window.removeEventListener(EVT, f);
    }, []);
    if (hidden) return null;
    const go = async () => {
        if (busy) return;
        setBusy(true);
        try { await printWindow(); } catch { alert('Could not prepare the print.'); } finally { setBusy(false); }
    };
    return (
        <button type="button" data-no-print onClick={go} title="Print this window"
            className="fixed right-2 top-[3px] z-[60] flex h-[22px] items-center gap-1 border border-slate-400 bg-white/90 px-2 text-[12px] font-semibold text-slate-700 shadow-sm hover:bg-white print:hidden">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Printer size={12} />} Print
        </button>
    );
}
