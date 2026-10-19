"use client";

/*
 * Trade 1.0 — Add Credit Card (dashboard › Credit Card).
 *
 * The cards in the system, each held by a saleman (the card a customer's card
 * payment is received on), a customer (the card that pays) or the company:
 * bank, card number and the bank's tax %. The Sale Invoice offers them as its
 * Receiver Card; a customer's own card is put in the Credit Card Report as the
 * paying card. The tax is recorded there only — never charged to the customer.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { openPopup } from '@/lib/popup';
import {
    ConfirmBox, LABEL, EDIT, ACTION_BTN, COA_SELECT, ReadBox, guardWindowClose, closeTradeWindow,
} from '@/components/trade/TradeSaleInvoice';
import { FindAccountWindow, type Acc } from '@/components/trade/TradeReceiptVoucher';

import { sortByMatch } from '@/lib/searchRank';
export type Card = {
    id: number; holder_type: 'saleman' | 'customer' | 'company'; holder: string; label: string; staff: number | null;
    customer_acc: number | null; customer_code: string; customer_id: string | null; holder_name: string; bank: string;
    card_no: string; tax_pct: number; notes: string; status: string;
};
const HOLDER: Record<string, string> = { saleman: 'Saleman', customer: 'Customer', company: 'Company' };
const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };

/** One window for cards: Credit Cards | Credit Card Report (switched in the title bar). */
export function CardTabs({ on }: { on: 'cards' | 'report' }) {
    const go = (href: string) => window.location.replace(href);
    return (
        <div className="ml-6 flex gap-1">
            {([['cards', 'Credit Cards', '/admin/trade/credit-card'], ['report', 'Credit Card Report', '/admin/trade/credit-card-report']] as const).map(([k, label, href]) => (
                <button key={k} type="button" onClick={() => k !== on && go(href)}
                    className={`h-6 border px-3 text-[12px] font-bold ${k === on ? 'border-[#3b3f8f] bg-[#3b3f8f] text-white' : 'border-[#9da1d8] bg-[#ececfd] text-slate-800 hover:bg-white'}`}>{label}</button>
            ))}
        </div>
    );
}

export default function TradeCreditCard() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Add Credit Card )'; }, []);
    useEffect(() => guardWindowClose(), []);

    const [cards, setCards] = useState<Card[] | null>(null);
    const load = () => api.get('v1/sales/trade-cards/').then(({ data }) => setCards(data)).catch(() => setCards([]));
    useEffect(() => { load(); }, []);
    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    useEffect(() => {
        api.get('v1/sales/orders/staff_list/').then(({ data }) => setStaff((data || []).filter((x: any) => x.status === 'active')
            .map((x: any) => ({ id: String(x.id), name: x.name })))).catch(() => setStaff([]));
    }, []);
    const [accounts, setAccounts] = useState<Acc[] | null>(null);
    useEffect(() => { api.get('v1/company/ledger-accounts/', { params: { group: 1202 } }).then(({ data }) => setAccounts(data)).catch(() => setAccounts([])); }, []);

    const blank = { id: 0, holder_type: 'saleman', staff: '', customer: null as Acc | null, holder_name: '', bank: '', card_no: '', tax_pct: '1.5', notes: '', status: 'active' };
    const [f, setF] = useState<any>(blank);
    const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
    const [custCode, setCustCode] = useState('');
    const [finder, setFinder] = useState(false);
    const edit = (c: Card) => {
        const acc = (accounts || []).find((a) => a.id === c.customer_acc) || (c.customer_acc ? { id: c.customer_acc, acc_id: c.customer_code, name: c.holder } as Acc : null);
        setF({ id: c.id, holder_type: c.holder_type, staff: c.staff ? String(c.staff) : '', customer: acc, holder_name: c.holder_name, bank: c.bank,
            card_no: c.card_no, tax_pct: String(c.tax_pct), notes: c.notes, status: c.status });
        setCustCode(acc?.acc_id || '');
    };
    const reset = () => { setF(blank); setCustCode(''); };
    const [busy, setBusy] = useState(false);
    const save = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const body = { holder_type: f.holder_type, staff: f.staff || null, customer_acc: f.customer?.id || null, holder_name: f.holder_name,
                bank: f.bank, card_no: f.card_no, tax_pct: f.tax_pct, notes: f.notes, status: f.status };
            if (f.id) await api.patch(`v1/sales/trade-cards/${f.id}/`, body); else await api.post('v1/sales/trade-cards/', body);
            toast.success(f.id ? 'Card updated.' : 'Card added.');
            reset(); load();
        } catch (e: any) { toast.error(e?.response?.data?.detail || 'Could not save the card.'); }
        finally { setBusy(false); }
    };
    const del = async () => {
        try { await api.delete(`v1/sales/trade-cards/${f.id}/`); toast.success('Card deleted.'); reset(); load(); }
        catch (e: any) { toast.error(e?.response?.data?.detail || 'Could not delete the card.'); }
    };
    const resolveCust = () => {
        const hit = (accounts || []).find((a) => a.acc_id === custCode.trim());
        if (hit) { set('customer', hit); setCustCode(hit.acc_id); } else setFinder(true);
    };

    const [q, setQ] = useState('');
    const rows = useMemo(() => sortByMatch((cards || []).filter((c) => !q.trim() || `${c.label} ${HOLDER[c.holder_type]} ${c.notes}`.toLowerCase().includes(q.trim().toLowerCase())),
        q, (c) => [c.holder, c.bank, c.card_no, c.notes]), [cards, q]);
    const L = `${LABEL} text-[15px]`;
    const TH = 'sticky top-0 z-10 whitespace-nowrap border-b border-r border-slate-400 bg-gradient-to-b from-white to-[#e9e9f1] px-2 py-1.5 text-left font-semibold';
    const TD = 'border-b border-r border-slate-300 px-2 py-1 align-top';

    return (
        <div className="flex h-screen flex-col bg-[#dcdcf7] font-sans text-slate-900">
            <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Add Credit Card )</span>
                <CardTabs on="cards" />
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] gap-3 p-3">
                <fieldset className="min-h-0 overflow-y-auto rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-3 pt-1">
                    <legend className="px-1.5 text-[17px] font-black text-[#c0192f]">{f.id ? 'Update Credit Card' : 'Add Credit Card'}</legend>
                    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
                        <span className={L}>Card of</span>
                        <div className="flex gap-1.5">
                            {(['saleman', 'customer', 'company'] as const).map((k) => (
                                <label key={k} className={`flex h-9 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 border text-[13px] font-bold ${f.holder_type === k ? 'border-[#3b3f8f] bg-[#3b3f8f] text-white' : 'border-[#9da1d8] bg-white text-slate-700'}`}>
                                    <input type="radio" checked={f.holder_type === k} onChange={() => set('holder_type', k)} className="hidden" />{HOLDER[k]}
                                </label>
                            ))}
                        </div>
                        {f.holder_type === 'saleman' && (<>
                            <span className={L}>Saleman</span>
                            <select value={f.staff} onChange={(e) => set('staff', e.target.value)} className={COA_SELECT}>
                                <option value="">Select any one</option>
                                {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </>)}
                        {f.holder_type === 'customer' && (<>
                            <span className={L}>Customer</span>
                            <div className="grid grid-cols-[auto_110px_minmax(0,1fr)] gap-1.5">
                                <button type="button" onClick={() => setFinder(true)} className="h-8 border border-slate-400 bg-gradient-to-b from-white to-[#e6e6ee] px-2.5 text-[13px] font-bold"><span className="underline">F</span>ind</button>
                                <input value={custCode} onChange={(e) => { setCustCode(e.target.value); if (f.customer) set('customer', null); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolveCust(); } }} placeholder="Acc ID" className={`${EDIT} w-full`} />
                                <ReadBox value={f.customer?.name || ''} className="font-semibold" />
                            </div>
                        </>)}
                        {f.holder_type === 'company' && (<>
                            <span className={L}>Holder Name</span>
                            <input value={f.holder_name} onChange={(e) => set('holder_name', e.target.value)} placeholder="e.g. AL-QAVI TRADERS" className={`${EDIT} w-full`} />
                        </>)}
                        {f.holder_type !== 'company' && (<>
                            <span className={L}>Name on Card</span>
                            <input value={f.holder_name} onChange={(e) => set('holder_name', e.target.value)} placeholder="Optional" className={`${EDIT} w-full`} />
                        </>)}
                        <span className={L}>Bank</span>
                        <input value={f.bank} onChange={(e) => set('bank', e.target.value)} placeholder="e.g. HBL" className={`${EDIT} w-full`} />
                        <span className={L}>Card No</span>
                        <input value={f.card_no} onChange={(e) => set('card_no', e.target.value)} placeholder="e.g. 7219 or the full number" className={`${EDIT} w-full`} />
                        <span className={L}>Card Tax %</span>
                        <input value={f.tax_pct} onChange={(e) => set('tax_pct', e.target.value.replace(/[^\d.]/g, ''))} className={`${EDIT} w-full text-right`} />
                        <span className={L}>Notes</span>
                        <input value={f.notes} onChange={(e) => set('notes', e.target.value)} className={`${EDIT} w-full`} />
                        <span className={L}>Status</span>
                        <select value={f.status} onChange={(e) => set('status', e.target.value)} className={COA_SELECT}>
                            <option value="active">Active</option><option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <p className="mt-3 text-[12.5px] leading-snug text-slate-600">
                        A <b>saleman&apos;s</b> card receives a customer&apos;s card payment — choose it on the Sale Invoice under
                        <b> Receiver Card</b>. A <b>customer&apos;s</b> card, when added, is put in the Credit Card Report by itself as the
                        paying card. The card tax is kept in that report for later calculation — the customer is always credited the full amount.
                    </p>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <button type="button" onClick={reset} className={ACTION_BTN}><span>Add <span className="underline">N</span>ew</span></button>
                        <button type="button" onClick={save} disabled={busy} className={ACTION_BTN}>{busy ? <Loader2 size={14} className="animate-spin" /> : f.id ? 'Update' : <><span className="underline">S</span>ave</>}</button>
                        <button type="button" onClick={() => askClose(del, 'Delete this card ?')} disabled={!f.id} className={ACTION_BTN}><span className="underline">D</span>elete</button>
                    </div>
                </fieldset>

                <div className="flex min-h-0 flex-col gap-2">
                    <div className="flex shrink-0 items-center gap-3">
                        <span className={L}>Search</span>
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Holder, bank, card no" className={`${EDIT} h-9 flex-1`} />
                        <button type="button" onClick={() => openPopup('/admin/trade/credit-card-report')} className={ACTION_BTN}>Credit Card Report</button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded border border-slate-500 bg-white">
                        <table className="w-full table-fixed border-collapse text-[14px]">
                            <colgroup>{[11, 27, 15, 25, 9, 13].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                            <thead><tr>{['Card of', 'Holder', 'Bank', 'Card No', 'Tax %', 'Status'].map((h, k) => <th key={h} className={`${TH} ${k === 4 ? '!text-right' : ''}`}>{h}</th>)}</tr></thead>
                            <tbody>
                                {rows.map((c) => (
                                    <tr key={c.id} onClick={() => edit(c)} title="Click to update"
                                        className={`cursor-pointer tabular-nums ${f.id === c.id ? 'bg-[#2f5bd3] text-white' : c.status !== 'active' ? 'text-slate-400 hover:bg-indigo-50' : 'hover:bg-indigo-50'}`}>
                                        <td className={TD}>{HOLDER[c.holder_type]}</td>
                                        <td className={`${TD} break-words font-semibold`}>{c.holder}{c.customer_code && <span className="ml-1 text-[12px] font-normal opacity-70">{c.customer_code}</span>}
                                            {c.holder_name && c.holder_type !== 'company' && <span className="block text-[12px] font-normal opacity-70">{c.holder_name}</span>}</td>
                                        <td className={`${TD} break-words`}>{c.bank}</td>
                                        <td className={`${TD} break-words font-mono text-[13px]`}>{c.card_no}</td>
                                        <td className={`${TD} text-right`}>{num(c.tax_pct)}%</td>
                                        <td className={TD}>{c.status === 'active' ? 'Active' : 'Inactive'}</td>
                                    </tr>
                                ))}
                                {cards && !rows.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">{cards.length ? 'No card matches.' : 'No cards yet — add one on the left.'}</td></tr>}
                                {!cards && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex shrink-0 items-center justify-between">
                        <ReadBox value={<span className="text-[#1f2bd6]">{(cards || []).length} card(s) · {(cards || []).filter((c) => c.holder_type === 'saleman').length} saleman · {(cards || []).filter((c) => c.holder_type === 'customer').length} customer</span>} className="w-[360px]" />
                        <button type="button" onClick={() => askClose(closeTradeWindow)} className={ACTION_BTN}><span className="underline">C</span>lose</button>
                    </div>
                </div>
            </div>

            {finder && (
                <FindAccountWindow accounts={accounts} cashOnly={false} initial={/^\d+$/.test(custCode) ? '' : custCode} askClose={askClose}
                    onPick={(a) => { setFinder(false); set('customer', a); setCustCode(a.acc_id); }} onClose={() => setFinder(false)}
                    onAddNew={() => openPopup('/admin/trade/chart-of-account')} />
            )}
            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
