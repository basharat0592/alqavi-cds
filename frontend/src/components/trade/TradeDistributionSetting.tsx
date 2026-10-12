"use client";

/*
 * Trade 1.0 — Distribution Setting (Setup › Distribution Setting).
 *
 * The "SOLE DISTRIBUTORS of …" line printed at the foot of every sale invoice.
 * ID / Distributions Detail; the grid shows the saved line — click it to bring
 * it into the box, change it, Update. Empty = the built-in text.
 */
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { ConfirmBox, FIELD, EDIT, ACTION_BTN, closeTradeWindow } from '@/components/trade/TradeSaleInvoice';
import { SOLE_DISTRIBUTORS } from '@/components/trade/TradeInvoicePrint';
import FitStage from '@/components/trade/FitStage';

export default function TradeDistributionSetting() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Distribution Setting)'; }, []);
    const [saved, setSaved] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [picked, setPicked] = useState(false);
    const [busy, setBusy] = useState(false);
    const box = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        api.get('v1/sales/orders/invoice_profile/').then(({ data }) => setSaved(data.distribution_detail || SOLE_DISTRIBUTORS))
            .catch(() => setSaved(SOLE_DISTRIBUTORS));
    }, []);
    const pick = () => { if (saved === null) return; setText(saved); setPicked(true); setTimeout(() => box.current?.focus(), 0); };
    const changed = picked && text.trim() !== (saved || '').trim();
    const update = () => {
        if (!changed || busy) return;
        if (!text.trim()) { toast.error('Enter the Distributions Detail.'); return; }
        setAsk({
            msg: 'Update the Distributions Detail printed on the invoice ?',
            yes: async () => {
                setBusy(true);
                try {
                    const { data } = await api.patch('v1/sales/orders/invoice_profile/', { distribution_detail: text.trim() });
                    setSaved(data.distribution_detail || SOLE_DISTRIBUTORS); setText(''); setPicked(false);
                    toast.success('Distributions Detail updated — new invoices print it.');
                } catch (err: any) {
                    const d = err?.response?.data;
                    toast.error(String(d?.error || d?.detail || 'Could not update.'), { duration: 6000 });
                } finally { setBusy(false); }
            },
        });
    };
    const closeWindow = () => setAsk({ msg: changed ? 'The changes are not saved. Do you want to Close the Form ?' : 'Do you want to Close the Form ?', yes: closeTradeWindow });
    const lbl = 'whitespace-nowrap text-[14px] text-[#1b1f4b]';

    return (
        <div className="h-screen overflow-hidden bg-[#c9c9f9] font-sans text-slate-900">
            <FitStage width={1100} height={480} className="flex flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                    <span className="flex h-5 w-5 items-center justify-center bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                    <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Distribution Setting)</span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                    <div className="grid shrink-0 grid-cols-[170px_minmax(0,1fr)] items-start gap-x-3 gap-y-2.5 border border-[#9da1d8] bg-white/30 px-5 py-4">
                        <span className={`${lbl} pt-1`}>ID</span>
                        <div className={`${FIELD} flex h-8 w-[180px] items-center justify-center border-slate-400 bg-[#e1e1e8] !text-[14px] !font-semibold text-[#1f2bd6]`}>{picked ? 1 : ''}</div>
                        <span className={`${lbl} pt-1`}>Distributions Detail</span>
                        <textarea ref={box} value={text} disabled={!picked} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={3}
                            placeholder={picked ? '' : 'Click the line below to change it'}
                            className={`${EDIT} h-auto w-full resize-none !py-1.5 !text-[13px] !font-normal ${picked ? '!bg-white' : ''}`} />
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto border border-slate-500 bg-[#8a8a8a]">
                        <table className="w-full table-fixed border-collapse bg-white text-[12.5px]">
                            <colgroup><col style={{ width: '6%' }} /><col style={{ width: '94%' }} /></colgroup>
                            <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                <tr><th className="border-b border-r border-slate-400 px-1.5 py-1 font-semibold">ID</th><th className="border-b border-r border-slate-400 px-1.5 py-1 font-semibold">Detail</th></tr>
                            </thead>
                            <tbody>
                                {saved !== null && (
                                    <tr onClick={pick} title="Click to change" className={`cursor-pointer align-top ${picked ? 'bg-[#7dfa7d]' : 'hover:bg-indigo-50'}`}>
                                        <td className="border-b border-r border-slate-300 px-1.5 py-1">1</td>
                                        <td className="whitespace-pre-wrap border-b border-r border-slate-300 px-1.5 py-1">{saved}</td>
                                    </tr>
                                )}
                                {saved === null && <tr><td colSpan={2} className="px-3 py-4 text-center text-slate-500">Loading…</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex shrink-0 justify-end gap-3">
                        <button type="button" onClick={update} disabled={!changed || busy} className={ACTION_BTN}>
                            {busy ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">U</span>pdate</>}
                        </button>
                        <button type="button" onClick={closeWindow} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                    </div>
                </div>
            </FitStage>
            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
