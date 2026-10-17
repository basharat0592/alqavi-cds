"use client";

/*
 * Trade 1.0 — Donation (dashboard › Donation).
 *
 * Give Donation: the type (Zakat 2.5 %, Khums 5 %, Sadqa, Fitrana, Other … —
 * Types… to change the % or add a type), what it is worked out on — each
 * partner's profit From–To, their capital on a day, or an amount — the partners
 * it is given for (each from their own share), who it is paid to and from which
 * cash / bank. Saving takes it out of each ticked partner's capital, like
 * drawings (never the business's profit or the other partners').
 * Donations given: the list with filters, totals per type, Undo and Print.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { printWindow } from '@/lib/printWindow';
import {
    Modal, ConfirmBox, ReadBox, LABEL, FIELD, EDIT, ACTION_BTN, COA_SELECT, guardWindowClose, closeTradeWindow,
} from '@/components/trade/TradeSaleInvoice';
import { isCashBank, type Acc } from '@/components/trade/TradeReceiptVoucher';

type DType = { id: number; name: string; pct: number | null; status: string };
type Base = { partner: number; name: string; acc_id: string; status: string; profit: number; capital: number };
type Basis = 'profit' | 'capital' | 'amount';

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const round2 = (n: number) => Math.round(n * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');
const TH = 'sticky top-0 z-10 whitespace-nowrap border-b border-r border-slate-400 bg-gradient-to-b from-white to-[#e9e9f1] px-1.5 py-1.5 text-left font-semibold';
const TD = 'overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1';

export default function TradeDonation() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Donation )'; }, []);
    useEffect(() => guardWindowClose(), []);

    const [types, setTypes] = useState<DType[]>([]);
    const loadTypes = () => api.get('v1/sales/trade-donations/types/').then(({ data }) => setTypes(data)).catch(() => setTypes([]));
    useEffect(() => { loadTypes(); }, []);
    const [banks, setBanks] = useState<Acc[]>([]);
    useEffect(() => { api.get('v1/company/ledger-accounts/').then(({ data }) => setBanks((data as Acc[]).filter(isCashBank))).catch(() => setBanks([])); }, []);

    // Give Donation
    const [dtype, setDtype] = useState('');
    const type = types.find((x) => String(x.id) === dtype) || null;
    useEffect(() => { if (!dtype && types.length) setDtype(String(types.find((x) => x.status === 'active')?.id || '')); }, [types]); // eslint-disable-line react-hooks/exhaustive-deps
    const [basis, setBasis] = useState<Basis>('profit');
    const [pct, setPct] = useState('');
    useEffect(() => {
        if (!type) return;
        setPct(type.pct === null ? '' : String(type.pct));
        if (type.pct === null) setBasis('amount');
    }, [dtype]); // eslint-disable-line react-hooks/exhaustive-deps
    const [from, setFrom] = useState(() => `${new Date().getFullYear() - 1}-01-01`);
    const [to, setTo] = useState(() => `${new Date().getFullYear() - 1}-12-31`);
    const [on, setOn] = useState(today);
    const [date, setDate] = useState(today);
    const [bank, setBank] = useState('');
    const [paidTo, setPaidTo] = useState('');
    const [note, setNote] = useState('');

    const [base, setBase] = useState<Base[] | null>(null);
    useEffect(() => {
        setBase(null);
        api.get('v1/sales/trade-donations/base/', { params: { date_from: from, date_to: to, on } })
            .then(({ data }) => setBase(data)).catch(() => setBase([]));
    }, [from, to, on]);
    const [ticked, setTicked] = useState<Set<number>>(new Set());
    const [typed, setTyped] = useState<Record<number, string>>({});   // amounts changed by hand
    const baseOf = (b: Base) => (basis === 'profit' ? num(b.profit) : basis === 'capital' ? num(b.capital) : 0);
    const autoAmt = (b: Base) => (basis === 'amount' ? 0 : round2(Math.max(0, baseOf(b)) * num(pct) / 100));
    const amtOf = (b: Base) => (typed[b.partner] !== undefined ? num(typed[b.partner]) : autoAmt(b));
    useEffect(() => { setTyped({}); }, [basis, pct, from, to, on]);
    const rows = (base || []).filter((b) => b.status === 'active' || ticked.has(b.partner));
    const chosen = rows.filter((b) => ticked.has(b.partner));
    const total = chosen.reduce((s, b) => s + amtOf(b), 0);
    const allOn = rows.length > 0 && rows.every((b) => ticked.has(b.partner));
    const toggle = (id: number) => setTicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

    const [saving, setSaving] = useState(false);
    const save = () => {
        if (!type) { toast.error('Choose the donation type.'); return; }
        if (!chosen.length) { toast.error('Tick the partners it is given for.'); return; }
        if (chosen.some((b) => amtOf(b) <= 0)) { toast.error('Every ticked partner needs an amount more than 0.'); return; }
        if (!bank) { toast.error('Choose the cash / bank it is paid from.'); return; }
        if (basis === 'profit' && from > to) { toast.error('The From date is after the To date.'); return; }
        setAsk({
            msg: `Give ${type.name} of ${fmt(total)} for ${chosen.map((b) => `${b.name} (${fmt(amtOf(b))})`).join(', ')} ? It is taken from each partner's own share.`,
            yes: async () => {
                setSaving(true);
                try {
                    const { data } = await api.post('v1/sales/trade-donations/', {
                        dtype: type.id, basis, pct: basis === 'amount' ? null : pct, date_from: basis === 'profit' ? from : null, date_to: basis === 'profit' ? to : null,
                        date, bank, paid_to: paidTo, note,
                        items: chosen.map((b) => ({ partner: b.partner, amount: amtOf(b), base: basis === 'amount' ? 0 : baseOf(b) })),
                    });
                    toast.success(`${type.name} saved — ${data.made.map((m: any) => m.voucher_no).join(', ')} · ${fmt(num(data.total))}.`);
                    setTicked(new Set()); setTyped({}); setNote(''); loadList();
                    setOn((x) => x);   // capital changed: refresh the base
                    api.get('v1/sales/trade-donations/base/', { params: { date_from: from, date_to: to, on } }).then(({ data: b }) => setBase(b)).catch(() => {});
                } catch (e: any) { toast.error(e?.response?.data?.detail || 'Could not save the donation.'); }
                finally { setSaving(false); }
            },
        });
    };

    // Donations given
    const [fType, setFType] = useState('');
    const [fFrom, setFFrom] = useState('');
    const [fTo, setFTo] = useState('');
    const [list, setList] = useState<any[] | null>(null);
    const loadList = () => {
        const params: any = {};
        if (fType) params.dtype = fType;
        if (fFrom) params.date_from = fFrom;
        if (fTo) params.date_to = fTo;
        api.get('v1/sales/trade-donations/', { params }).then(({ data }) => setList(data)).catch(() => setList([]));
    };
    useEffect(() => { loadList(); }, [fType, fFrom, fTo]); // eslint-disable-line react-hooks/exhaustive-deps
    const byType = useMemo(() => {
        const m = new Map<string, number>();
        for (const r of list || []) m.set(r.type, (m.get(r.type) || 0) + num(r.amount));
        return Array.from(m.entries());
    }, [list]);
    const undo = (r: any) => setAsk({
        msg: `Remove ${r.type} ${r.voucher_no} of ${fmt(num(r.amount))} for ${r.partner} ? It goes back to the partner's capital.`,
        yes: async () => {
            try { await api.delete(`v1/sales/trade-donations/${r.id}/`); toast.success(`${r.voucher_no} removed.`); loadList(); }
            catch (e: any) { toast.error(e?.response?.data?.detail || 'Could not remove.'); }
        },
    });
    const listRef = useRef<HTMLDivElement>(null);
    const [printing, setPrinting] = useState(false);
    const doPrint = async () => {
        if (!listRef.current || printing) return;
        setPrinting(true);
        try { await printWindow(listRef.current); } catch { toast.error('Could not prepare the print.'); } finally { setPrinting(false); }
    };
    const [typesOpen, setTypesOpen] = useState(false);
    const L = `${LABEL} text-[14px]`;
    const basisLabel = (r: any) => (r.basis === 'profit' ? `${num(r.pct)}% of profit ${dmy(r.date_from)}–${dmy(r.date_to)}` : r.basis === 'capital' ? `${num(r.pct)}% of capital` : 'Amount');

    return (
        <div className="flex h-screen flex-col bg-[#dcdcf7] font-sans text-slate-900">
            <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Donation )</span>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-3 p-3">
                {/* Give Donation */}
                <fieldset className="flex min-h-0 flex-col rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-3 pt-1">
                    <legend className="px-1.5 text-[17px] font-black text-[#c0192f]">Give Donation</legend>
                    <div className="grid shrink-0 grid-cols-[118px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
                        <span className={L}>Donation Type</span>
                        <select value={dtype} onChange={(e) => setDtype(e.target.value)} className={COA_SELECT}>
                            {types.filter((x) => x.status === 'active').map((x) => <option key={x.id} value={x.id}>{x.name}{x.pct !== null ? ` — ${num(x.pct)}%` : ''}</option>)}
                        </select>
                        <button type="button" onClick={() => setTypesOpen(true)} className={`${ACTION_BTN} !min-w-0 !px-3`}>Types…</button>

                        <span className={L}>Worked out on</span>
                        <div className="col-span-2 flex gap-1.5">
                            {([['profit', 'Profit (From–To)'], ['capital', 'Capital (on date)'], ['amount', 'Amount']] as const).map(([k, label]) => (
                                <label key={k} className={`flex h-8 flex-1 cursor-pointer items-center justify-center border text-[13px] font-bold ${basis === k ? 'border-[#3b3f8f] bg-[#3b3f8f] text-white' : 'border-[#9da1d8] bg-white text-slate-700'}`}>
                                    <input type="radio" className="hidden" checked={basis === k} onChange={() => setBasis(k)} />{label}
                                </label>
                            ))}
                        </div>

                        {basis === 'profit' && (<>
                            <span className={L}>Profit of</span>
                            <div className="col-span-2 flex items-center gap-2">
                                <input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} className={`${EDIT} w-[150px]`} />
                                <span className={L}>to</span>
                                <input type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} className={`${EDIT} w-[150px]`} />
                            </div>
                        </>)}
                        {basis === 'capital' && (<>
                            <span className={L}>Capital on</span>
                            <input type="date" value={on} max={today()} onChange={(e) => e.target.value && setOn(e.target.value)} className={`${EDIT} col-span-2 w-[150px]`} />
                        </>)}
                        {basis !== 'amount' && (<>
                            <span className={L}>Rate %</span>
                            <input value={pct} onChange={(e) => setPct(e.target.value.replace(/[^\d.]/g, ''))} className={`${EDIT} col-span-2 w-[150px] text-right`} />
                        </>)}
                    </div>

                    <div className="mt-2 min-h-[120px] flex-1 overflow-y-auto overflow-x-hidden rounded border border-slate-500 bg-white">
                        <table className="w-full table-fixed border-collapse text-[12.5px]">
                            <colgroup><col style={{ width: '9%' }} /><col style={{ width: '37%' }} /><col style={{ width: '27%' }} /><col style={{ width: '27%' }} /></colgroup>
                            <thead><tr>
                                <th className={TH}><input type="checkbox" checked={allOn} onChange={(e) => setTicked(e.target.checked ? new Set(rows.map((b) => b.partner)) : new Set())} className="h-4 w-4 accent-[#3b3f8f]" title="All partners" /></th>
                                <th className={TH}>Partner</th>
                                <th className={`${TH} !text-right`}>{basis === 'profit' ? 'Profit shared' : basis === 'capital' ? 'Capital' : '—'}</th>
                                <th className={`${TH} !text-right`}>Donation</th>
                            </tr></thead>
                            <tbody>
                                {rows.map((b) => {
                                    const on_ = ticked.has(b.partner);
                                    return (
                                        <tr key={b.partner} className={`tabular-nums ${on_ ? 'bg-[#eaf2ff]' : ''}`}>
                                            <td className={`${TD} text-center`}><input type="checkbox" checked={on_} onChange={() => toggle(b.partner)} className="h-4 w-4 accent-[#3b3f8f]" /></td>
                                            <td className={TD} onClick={() => toggle(b.partner)}>{b.name}<span className="ml-1 text-[11px] text-slate-500">{b.acc_id}</span></td>
                                            <td className={`${TD} text-right`}>{basis === 'amount' ? '' : fmt(baseOf(b))}</td>
                                            <td className="border-b border-slate-300 px-1 py-0.5">
                                                <input value={on_ ? (typed[b.partner] ?? (autoAmt(b) ? String(autoAmt(b)) : '')) : ''} disabled={!on_}
                                                    onChange={(e) => setTyped((x) => ({ ...x, [b.partner]: e.target.value.replace(/[^\d.]/g, '') }))}
                                                    placeholder={on_ ? '0' : ''} className={`${FIELD} h-7 w-full text-right ${on_ ? 'border-emerald-300 bg-[#e3fbe3]' : 'border-slate-200 bg-slate-50'}`} />
                                            </td>
                                        </tr>
                                    );
                                })}
                                {base && !rows.length && <tr><td colSpan={4} className="px-3 py-5 text-center text-slate-500">No partners — add them in Partnership.</td></tr>}
                                {!base && <tr><td colSpan={4} className="px-3 py-5 text-center text-slate-500">Loading…</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-2 grid shrink-0 grid-cols-[118px_minmax(0,1fr)_92px_minmax(0,0.7fr)] items-center gap-x-3 gap-y-2">
                        <span className={L}>Paid to</span>
                        <input value={paidTo} onChange={(e) => setPaidTo(e.target.value)} placeholder="e.g. Madrasa / person" className={`${EDIT} w-full`} />
                        <span className={L}>Date</span>
                        <input type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} className={`${EDIT} w-full`} />
                        <span className={L}>Paid from</span>
                        <select value={bank} onChange={(e) => setBank(e.target.value)} className={COA_SELECT}>
                            <option value="">Cash / bank account</option>
                            {banks.map((a) => <option key={a.id} value={a.id}>{a.acc_id}  {a.name}</option>)}
                        </select>
                        <span className={L}>Note</span>
                        <input value={note} onChange={(e) => setNote(e.target.value)} className={`${EDIT} w-full`} />
                    </div>
                    <div className="mt-2.5 flex shrink-0 items-center gap-3">
                        <div className={`${FIELD} flex h-9 flex-1 items-center justify-between border-sky-300 bg-[#c9f6ff] font-bold`}>
                            <span className="text-[13px] font-semibold">{chosen.length} partner{chosen.length === 1 ? '' : 's'} · Total</span>{fmt(total)}
                        </div>
                        <button type="button" onClick={save} disabled={saving} className={ACTION_BTN}>{saving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}</button>
                    </div>
                    <p className="mt-1.5 shrink-0 text-[11.5px] leading-snug text-slate-600">Each donation is taken from that partner&apos;s own share (like drawings) — not from the business&apos;s profit or the other partners.</p>
                </fieldset>

                {/* Donations given */}
                <div className="flex min-h-0 flex-col gap-2">
                    <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-[#9da1d8] bg-[#ececfd] px-3 py-2">
                        <span className={L}>Type</span>
                        <select value={fType} onChange={(e) => setFType(e.target.value)} className={`${COA_SELECT} !w-[150px]`}>
                            <option value="">All</option>{types.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                        </select>
                        <span className={L}>From</span><input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className={`${EDIT} w-[140px]`} />
                        <span className={L}>To</span><input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className={`${EDIT} w-[140px]`} />
                        <span className="flex-1" />
                        <button type="button" onClick={doPrint} disabled={printing} className={`${ACTION_BTN} !min-w-[80px]`}><span className="underline">P</span>rint</button>
                    </div>
                    <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-white p-2">
                        <div className="text-[15px] font-black">AL-QAVI TRADERS — Donations given</div>
                        <table className="w-full table-fixed border-collapse text-[12px]">
                            <colgroup>{[10, 12, 16, 11, 21, 12, 12, 6].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                            <thead><tr>{['Date', 'Voucher', 'Partner', 'Type', 'Worked out on', 'Amount', 'Paid to', ''].map((h, k) => <th key={k} className={`${TH} ${k === 5 ? '!text-right' : ''}`}>{h}</th>)}</tr></thead>
                            <tbody>
                                {(list || []).map((r) => (
                                    <tr key={r.id} className="tabular-nums">
                                        <td className={TD}>{dmy(r.date)}</td>
                                        <td className={TD}>{r.voucher_no}</td>
                                        <td className={TD}>{r.partner}</td>
                                        <td className={`${TD} font-semibold`}>{r.type}</td>
                                        <td className={TD}>{basisLabel(r)}</td>
                                        <td className={`${TD} text-right font-semibold`}>{fmt(num(r.amount))}</td>
                                        <td className={TD}>{r.paid_to}</td>
                                        <td className="border-b border-slate-300 px-0.5 py-0.5"><button type="button" onClick={() => undo(r)} className="h-6 w-full border border-red-300 bg-[#ffe1e1] text-[11px] font-bold text-red-700">Undo</button></td>
                                    </tr>
                                ))}
                                {list && !list.length && <tr><td colSpan={8} className="px-3 py-5 text-center text-slate-500">No donations yet.</td></tr>}
                            </tbody>
                        </table>
                        {byType.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-2">
                                {byType.map(([k, v]) => <ReadBox key={k} value={<span>{k}: <b>{fmt(v)}</b></span>} className="w-auto" />)}
                                <ReadBox value={<span>Total: <b>{fmt((list || []).reduce((s, r) => s + num(r.amount), 0))}</b></span>} className="w-auto" />
                            </div>
                        )}
                    </div>
                    <div className="flex shrink-0 justify-end">
                        <button type="button" onClick={() => askClose(closeTradeWindow)} className={ACTION_BTN}><span className="underline">C</span>lose</button>
                    </div>
                </div>
            </div>

            {typesOpen && <TypesWindow types={types} onClose={() => setTypesOpen(false)} reload={loadTypes} />}
            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}

/* Donation types: name, usual % (empty = an amount each time), Active / Inactive. */
function TypesWindow({ types, onClose, reload }: { types: DType[]; onClose: () => void; reload: () => void }) {
    const [name, setName] = useState('');
    const [pct, setPct] = useState('');
    const [edit, setEdit] = useState<Record<number, string>>({});
    const add = async () => {
        try { await api.post('v1/sales/trade-donations/types/', { name, pct }); toast.success(`${name} added.`); setName(''); setPct(''); reload(); }
        catch (e: any) { toast.error(e?.response?.data?.detail || 'Could not add.'); }
    };
    const patch = async (t: DType, body: any) => {
        try { await api.patch(`v1/sales/trade-donations/types/${t.id}/`, body); reload(); }
        catch (e: any) { toast.error(e?.response?.data?.detail || 'Could not save.'); }
    };
    return (
        <Modal title="Donation Types" onClose={onClose} small>
            <div className="flex flex-col gap-3 bg-[#e4e4fb] p-4">
                <table className="w-full border-collapse bg-white text-[13px]">
                    <thead><tr>{['Type', 'Usual %', 'Status'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
                    <tbody>
                        {types.map((t) => (
                            <tr key={t.id}>
                                <td className={`${TD} font-semibold`}>{t.name}</td>
                                <td className="border-b border-r border-slate-300 px-1 py-0.5">
                                    <input value={edit[t.id] ?? (t.pct === null ? '' : String(t.pct))} placeholder="amount"
                                        onChange={(e) => setEdit((x) => ({ ...x, [t.id]: e.target.value.replace(/[^\d.]/g, '') }))}
                                        onBlur={() => { if (edit[t.id] !== undefined) patch(t, { pct: edit[t.id] }); }}
                                        className={`${EDIT} h-7 w-full text-right`} />
                                </td>
                                <td className="border-b border-slate-300 px-1 py-0.5">
                                    <select value={t.status} onChange={(e) => patch(t, { status: e.target.value })} className={`${COA_SELECT} h-7`}>
                                        <option value="active">Active</option><option value="inactive">Inactive</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex items-center gap-2">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New type, e.g. Fidya" className={`${EDIT} flex-1`} />
                    <input value={pct} onChange={(e) => setPct(e.target.value.replace(/[^\d.]/g, ''))} placeholder="%" className={`${EDIT} w-[70px] text-right`} />
                    <button type="button" onClick={add} disabled={!name.trim()} className={`${ACTION_BTN} !min-w-0 !px-3`}>Add</button>
                </div>
                <p className="text-[12px] text-slate-600">Leave the % empty for a type given as an amount (Sadqa, Fitrana …).</p>
                <div className="flex justify-end"><button type="button" onClick={onClose} className={ACTION_BTN}><span className="underline">C</span>lose</button></div>
            </div>
        </Modal>
    );
}
