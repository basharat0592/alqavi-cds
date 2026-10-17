"use client";

/*
 * Trade 1.0 — Partnership (dashboard buttons Partnership / Partnership Report).
 *
 *   Partners       add / update a partner: name, father name, CNIC, phone,
 *                  address, joining (and leaving) date, the capital account,
 *                  capital brought in on joining, an agreed share % (optional).
 *                  The grid shows each partner's capital invested (value and %
 *                  of all capital), profit shared, drawings and balance.
 *   Capital In/Out money invested, capital withdrawn, drawings (vouchers).
 *   Profit Distribution  the period's net profit / loss (from the ledger, or a
 *                  figure entered) shared by capital invested × days or by the
 *                  agreed % × days, then posted to the partners' capital.
 *   Report         partnership summary and one partner's capital statement.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { printWindow } from '@/lib/printWindow';
import {
    ConfirmBox, ReadBox, LABEL, FIELD, EDIT, ACTION_BTN, COA_SELECT, guardWindowClose, closeTradeWindow,
} from '@/components/trade/TradeSaleInvoice';
import { isCashBank, type Acc } from '@/components/trade/TradeReceiptVoucher';

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const pct = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');
// Grid dates as dd-mm-yy so they fit their column.
const dmy2 = (iso: string | null | undefined) => { const s = dmy(iso); return s ? s.slice(0, 6) + s.slice(8) : ''; };

type Partner = {
    id: number; name: string; father_name: string; cnic: string; phone: string; address: string; joining_date: string;
    leaving_date: string | null; share_pct: number | null; notes: string; status: string; account: number; acc_id: string;
    account_name: string; invested: number; profit: number; drawings: number; balance: number; capital_pct: number;
};
type Tab = 'partners' | 'capital' | 'profit' | 'report';
const TABS: { v: Tab; label: string }[] = [
    { v: 'partners', label: 'Partners' }, { v: 'capital', label: 'Capital In / Out' },
    { v: 'profit', label: 'Profit Distribution' }, { v: 'report', label: 'Report' },
];
const TH = 'sticky top-0 z-10 overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-400 bg-gradient-to-b from-white to-[#e9e9f1] px-1 py-1.5 text-left font-semibold';
const TD = 'overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1 py-1';

export default function TradePartnership() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Partnership )'; }, []);
    useEffect(() => guardWindowClose(), []);
    const [tab, setTab] = useState<Tab>('partners');
    useEffect(() => { const t = new URLSearchParams(window.location.search).get('tab'); if (TABS.some((x) => x.v === t)) setTab(t as Tab); }, []);

    const [partners, setPartners] = useState<Partner[] | null>(null);
    const loadPartners = () => api.get('v1/sales/trade-partners/').then(({ data }) => setPartners(data)).catch(() => setPartners([]));
    const [accounts, setAccounts] = useState<Acc[]>([]);
    useEffect(() => {
        loadPartners();
        api.get('v1/company/ledger-accounts/').then(({ data }) => setAccounts(data)).catch(() => setAccounts([]));
    }, []);
    const banks = useMemo(() => accounts.filter(isCashBank), [accounts]);
    const capitalAccs = useMemo(() => accounts.filter((a) => a.group === 3101), [accounts]);

    return (
        <div className="flex h-screen flex-col bg-[#dcdcf7] font-sans text-slate-900">
            <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Partnership )</span>
            </div>
            <div className="flex shrink-0 items-center gap-2 px-3 pt-2">
                {TABS.map((t) => (
                    <button key={t.v} type="button" onClick={() => setTab(t.v)}
                        className={`h-9 border px-4 text-[14px] font-bold ${tab === t.v ? 'border-[#3b3f8f] bg-[#3b3f8f] text-white' : 'border-[#9da1d8] bg-[#ececfd] text-slate-800 hover:bg-white'}`}>{t.label}</button>
                ))}
                <span className="flex-1" />
                <button type="button" onClick={() => askClose(closeTradeWindow)} className={ACTION_BTN}><span className="underline">C</span>lose</button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col p-3">
                {tab === 'partners' && <PartnersTab partners={partners} capitalAccs={capitalAccs} banks={banks} reload={loadPartners} askClose={askClose} />}
                {tab === 'capital' && <CapitalTab partners={partners || []} banks={banks} reload={loadPartners} setAsk={setAsk} />}
                {tab === 'profit' && <ProfitTab partners={partners || []} reload={loadPartners} setAsk={setAsk} />}
                {tab === 'report' && <ReportTab partners={partners || []} />}
            </div>
            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}

const dateIn = `${EDIT} w-full`;
const legend = (t: string) => <legend className="px-1.5 text-[16px] font-black text-[#c0192f]">{t}</legend>;

/* ── Partners ── */
function PartnersTab({ partners, capitalAccs, banks, reload, askClose }: {
    partners: Partner[] | null; capitalAccs: Acc[]; banks: Acc[]; reload: () => void; askClose: (fn: () => void, msg?: string) => void;
}) {
    const blank = { id: 0, name: '', father_name: '', cnic: '', phone: '', address: '', joining_date: today(), leaving_on: false, leaving_date: today(),
        share_pct: '', account: 'new', investment: '', bank: '', notes: '', status: 'active' };
    const [f, setF] = useState<any>(blank);
    const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
    const [busy, setBusy] = useState(false);
    const edit = (p: Partner) => setF({
        id: p.id, name: p.name, father_name: p.father_name, cnic: p.cnic, phone: p.phone, address: p.address, joining_date: p.joining_date,
        leaving_on: !!p.leaving_date, leaving_date: p.leaving_date || today(), share_pct: p.share_pct === null ? '' : String(p.share_pct),
        account: String(p.account), investment: '', bank: '', notes: p.notes, status: p.status,
    });
    // Capital accounts not yet given to another partner.
    const used = new Set((partners || []).filter((p) => p.id !== f.id).map((p) => p.account));
    const freeAccs = capitalAccs.filter((a) => !used.has(a.id));
    const save = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const body: any = { ...f, leaving_date: f.leaving_on ? f.leaving_date : null, share_pct: f.share_pct === '' ? null : f.share_pct };
            delete body.leaving_on;
            if (f.id) { delete body.investment; delete body.bank; await api.patch(`v1/sales/trade-partners/${f.id}/`, body); }
            else await api.post('v1/sales/trade-partners/', body);
            toast.success(`${f.name} saved.`);
            setF(blank); reload();
        } catch (e: any) { toast.error(e?.response?.data?.detail || 'Could not save the partner.'); }
        finally { setBusy(false); }
    };
    const del = async () => {
        try { await api.delete(`v1/sales/trade-partners/${f.id}/`); toast.success('Partner deleted.'); setF(blank); reload(); }
        catch (e: any) { toast.error(e?.response?.data?.detail || 'Could not delete.'); }
    };
    const list = partners || [];
    const agreed = list.filter((p) => p.status === 'active').reduce((s, p) => s + num(p.share_pct), 0);
    const L = `${LABEL} text-[14px]`;
    return (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] gap-3">
            <fieldset className="min-h-0 overflow-y-auto rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-3 pt-1">
                {legend(f.id ? 'Update Partner' : 'Add Partner')}
                <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
                    <span className={L}>Partner Name</span><input value={f.name} onChange={(e) => set('name', e.target.value)} className={`${EDIT} w-full`} />
                    <span className={L}>Father Name</span><input value={f.father_name} onChange={(e) => set('father_name', e.target.value)} className={`${EDIT} w-full`} />
                    <span className={L}>CNIC</span><input value={f.cnic} onChange={(e) => set('cnic', e.target.value)} placeholder="00000-0000000-0" className={`${EDIT} w-full`} />
                    <span className={L}>Phone</span><input value={f.phone} onChange={(e) => set('phone', e.target.value)} className={`${EDIT} w-full`} />
                    <span className={L}>Address</span><input value={f.address} onChange={(e) => set('address', e.target.value)} className={`${EDIT} w-full`} />
                    <span className={L}>Joining Date</span><input type="date" value={f.joining_date} max={today()} onChange={(e) => e.target.value && set('joining_date', e.target.value)} className={dateIn} />
                    <label className={`${L} flex items-center gap-1.5`}><input type="checkbox" checked={f.leaving_on} onChange={(e) => set('leaving_on', e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" /> Leaving Date</label>
                    <input type="date" value={f.leaving_date} disabled={!f.leaving_on} onChange={(e) => e.target.value && set('leaving_date', e.target.value)}
                        className={`${FIELD} w-full ${f.leaving_on ? 'border-emerald-300 bg-[#e3fbe3]' : 'border-slate-300 bg-[#ececf3] text-slate-500'}`} />
                    <span className={L}>Capital Account</span>
                    <select value={f.account} onChange={(e) => set('account', e.target.value)} className={COA_SELECT}>
                        {!f.id && <option value="new">+ New account (Parters Capital 3101)</option>}
                        {freeAccs.map((a) => <option key={a.id} value={a.id}>{a.acc_id}  {a.name}</option>)}
                    </select>
                    {!f.id && (<>
                        <span className={L}>Investment</span>
                        <input value={f.investment} onChange={(e) => set('investment', e.target.value.replace(/[^\d.]/g, ''))} placeholder="Capital brought in on joining"
                            className={`${EDIT} w-full text-right`} />
                        <span className={L}>Received in</span>
                        <select value={f.bank} onChange={(e) => set('bank', e.target.value)} disabled={!num(f.investment)} className={COA_SELECT}>
                            <option value="">Cash / bank account</option>
                            {banks.map((a) => <option key={a.id} value={a.id}>{a.acc_id}  {a.name}</option>)}
                        </select>
                    </>)}
                    <span className={L}>Agreed Share %</span>
                    <input value={f.share_pct} onChange={(e) => set('share_pct', e.target.value.replace(/[^\d.]/g, ''))} placeholder="Empty = by capital invested"
                        className={`${EDIT} w-full text-right`} />
                    <span className={L}>Notes</span><input value={f.notes} onChange={(e) => set('notes', e.target.value)} className={`${EDIT} w-full`} />
                    <span className={L}>Status</span>
                    <select value={f.status} onChange={(e) => set('status', e.target.value)} className={COA_SELECT}>
                        <option value="active">Active</option><option value="inactive">Inactive</option>
                    </select>
                </div>
                <p className="mt-2 text-[12px] text-slate-500">An existing partner&apos;s capital account (e.g. 31010003) brings in the capital already in the books. More capital, withdrawals and drawings: Capital In / Out.</p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => setF(blank)} className={ACTION_BTN}><span>Add <span className="underline">N</span>ew</span></button>
                    <button type="button" onClick={save} disabled={busy || !f.name.trim()} className={ACTION_BTN}>{busy ? <Loader2 size={14} className="animate-spin" /> : f.id ? 'Update' : <><span className="underline">S</span>ave</>}</button>
                    <button type="button" onClick={() => askClose(del, `Delete the partner ${f.name} ?`)} disabled={!f.id} className={ACTION_BTN}><span className="underline">D</span>elete</button>
                </div>
            </fieldset>

            <div className="flex min-h-0 flex-col gap-2">
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded border border-slate-500 bg-white">
                    <table className="w-full table-fixed border-collapse text-[11.5px]">
                        <colgroup>{[19, 8.5, 12, 7.5, 7.5, 12, 9.5, 14, 8].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                        <thead><tr>{['Partner', 'Joining', 'Invested', 'Cap. %', 'Agreed', 'Profit / Loss', 'Drawings', 'Capital', 'Status'].map((h, k) =>
                            <th key={h} className={`${TH} ${k >= 2 && k <= 7 ? '!text-right' : ''}`}>{h}</th>)}</tr></thead>
                        <tbody>
                            {list.map((p) => (
                                <tr key={p.id} onClick={() => edit(p)} title="Click to update"
                                    className={`cursor-pointer tabular-nums ${f.id === p.id ? 'bg-[#2f5bd3] text-white' : p.status !== 'active' ? 'text-slate-400 hover:bg-indigo-50' : 'hover:bg-indigo-50'}`}>
                                    <td className={TD} title={`${p.acc_id} ${p.account_name}`}>{p.name}<span className="block text-[10px] opacity-70">{p.acc_id}{p.phone ? ` · ${p.phone}` : ''}</span></td>
                                    <td className={TD}>{dmy2(p.joining_date)}{p.leaving_date && <span className="block text-[10px]">left {dmy2(p.leaving_date)}</span>}</td>
                                    <td className={`${TD} text-right font-semibold`}>{fmt(num(p.invested))}</td>
                                    <td className={`${TD} text-right`}>{pct(num(p.capital_pct))}</td>
                                    <td className={`${TD} text-right`}>{p.share_pct === null ? '—' : pct(num(p.share_pct))}</td>
                                    <td className={`${TD} text-right ${num(p.profit) < 0 && f.id !== p.id ? 'text-red-600' : ''}`}>{fmt(num(p.profit))}</td>
                                    <td className={`${TD} text-right`}>{fmt(num(p.drawings))}</td>
                                    <td className={`${TD} text-right font-bold`}>{fmt(num(p.balance))}</td>
                                    <td className={TD}>{p.status === 'active' ? 'Active' : 'Inactive'}</td>
                                </tr>
                            ))}
                            {partners && !list.length && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">No partners yet — add one on the left.</td></tr>}
                            {!partners && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
                        </tbody>
                        {list.length > 0 && (
                            <tfoot className="sticky bottom-0 bg-[#e8e8f4] font-bold tabular-nums">
                                <tr>
                                    <td className={TD} colSpan={2}>Total ({list.length})</td>
                                    <td className={`${TD} text-right`}>{fmt(list.filter((p) => p.status === 'active').reduce((s, p) => s + num(p.invested), 0))}</td>
                                    <td className={`${TD} text-right`}>100%</td>
                                    <td className={`${TD} text-right ${agreed && Math.abs(agreed - 100) > 0.01 ? 'text-red-600' : ''}`} title="Agreed shares should add up to 100%">{agreed ? pct(agreed) : '—'}</td>
                                    <td className={`${TD} text-right`}>{fmt(list.reduce((s, p) => s + num(p.profit), 0))}</td>
                                    <td className={`${TD} text-right`}>{fmt(list.reduce((s, p) => s + num(p.drawings), 0))}</td>
                                    <td className={`${TD} text-right`}>{fmt(list.reduce((s, p) => s + num(p.balance), 0))}</td>
                                    <td className={TD} />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
                <p className="shrink-0 text-[12px] text-slate-600">Invested = money brought in less capital taken back. Capital = invested + profit kept in the business − drawings (undrawn profit is re-invested). Cap. % = capital as a part of all active partners&apos; capital. A partner with an Agreed % gets that % of the profit; the rest is shared by capital — counting only the days each was a partner.</p>
            </div>
        </div>
    );
}

/* ── Capital In / Out ── */
function CapitalTab({ partners, banks, reload, setAsk }: { partners: Partner[]; banks: Acc[]; reload: () => void; setAsk: (a: any) => void }) {
    const [f, setF] = useState({ partner: '', kind: 'invest', date: today(), amount: '', bank: '', note: '' });
    const set = (k: string, v: any) => setF((x) => ({ ...x, [k]: v }));
    const [rows, setRows] = useState<any[] | null>(null);
    const load = () => api.get('v1/sales/trade-partners/entries/').then(({ data }) => setRows(data)).catch(() => setRows([]));
    useEffect(() => { load(); }, []);
    const [busy, setBusy] = useState(false);
    const KIND: Record<string, string> = { invest: 'Investment', withdraw: 'Capital withdrawn', drawing: 'Drawings' };
    const p = partners.find((x) => String(x.id) === f.partner);
    const save = () => {
        if (!p || !num(f.amount) || !f.bank) { toast.error('Choose the partner, the amount and the cash / bank account.'); return; }
        setAsk({
            msg: `Save ${KIND[f.kind]} of ${fmt(num(f.amount))} for ${p.name} ?`,
            yes: async () => {
                setBusy(true);
                try {
                    const { data } = await api.post('v1/sales/trade-partners/entries/', { ...f, amount: num(f.amount) });
                    toast.success(`${data.voucher_no} saved.`);
                    setF((x) => ({ ...x, amount: '', note: '' })); load(); reload();
                } catch (e: any) { toast.error(e?.response?.data?.detail || 'Could not save.'); }
                finally { setBusy(false); }
            },
        });
    };
    const L = `${LABEL} text-[14px]`;
    return (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] gap-3">
            <fieldset className="rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-3 pt-1">
                {legend('Capital In / Out')}
                <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
                    <span className={L}>Partner</span>
                    <select value={f.partner} onChange={(e) => set('partner', e.target.value)} className={COA_SELECT}>
                        <option value="">Select any one</option>
                        {partners.filter((x) => x.status === 'active').map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                    <span className={L}>Entry</span>
                    <select value={f.kind} onChange={(e) => set('kind', e.target.value)} className={COA_SELECT}>
                        <option value="invest">Investment (capital in)</option>
                        <option value="withdraw">Capital withdrawn (capital out)</option>
                        <option value="drawing">Drawings (against profit)</option>
                    </select>
                    <span className={L}>Date</span><input type="date" value={f.date} max={today()} onChange={(e) => e.target.value && set('date', e.target.value)} className={dateIn} />
                    <span className={L}>Amount</span><input value={f.amount} onChange={(e) => set('amount', e.target.value.replace(/[^\d.]/g, ''))} className={`${EDIT} w-full text-right`} />
                    <span className={L}>{f.kind === 'invest' ? 'Received in' : 'Paid from'}</span>
                    <select value={f.bank} onChange={(e) => set('bank', e.target.value)} className={COA_SELECT}>
                        <option value="">Cash / bank account</option>
                        {banks.map((a) => <option key={a.id} value={a.id}>{a.acc_id}  {a.name}</option>)}
                    </select>
                    <span className={L}>Note</span><input value={f.note} onChange={(e) => set('note', e.target.value)} className={`${EDIT} w-full`} />
                </div>
                {p && <ReadBox value={<span>Invested {fmt(num(p.invested))} · Capital {fmt(num(p.balance))}</span>} className="mt-3" />}
                <div className="mt-3 flex justify-end">
                    <button type="button" onClick={save} disabled={busy} className={ACTION_BTN}>{busy ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}</button>
                </div>
            </fieldset>
            <div className="min-h-0 overflow-y-auto overflow-x-hidden rounded border border-slate-500 bg-white">
                <table className="w-full table-fixed border-collapse text-[11.5px]">
                    <colgroup>{[12, 9, 20, 15, 13, 15, 16].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                    <thead><tr>{['Voucher No', 'Date', 'Partner', 'Entry', 'Amount', 'Cash / Bank', 'Note'].map((h, k) => <th key={h} className={`${TH} ${k === 4 ? '!text-right' : ''}`}>{h}</th>)}</tr></thead>
                    <tbody>
                        {(rows || []).map((r) => (
                            <tr key={r.id} className={`tabular-nums ${r.kind === 'invest' ? '' : 'text-red-700'}`}>
                                {[r.voucher_no, dmy2(r.date), r.partner, KIND[r.kind], fmt(num(r.amount)), r.bank, r.note].map((v, k) => (
                                    <td key={k} title={String(v ?? '')} className={`${TD} ${k === 4 ? 'text-right font-semibold' : ''}`}>{v}</td>
                                ))}
                            </tr>
                        ))}
                        {rows && !rows.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">No capital entries yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ── Profit Distribution ── */
function ProfitTab({ partners, reload, setAsk }: { partners: Partner[]; reload: () => void; setAsk: (a: any) => void }) {
    const [years, setYears] = useState<any[]>([]);
    useEffect(() => { api.get('v1/sales/trade-financial-years/').then(({ data }) => setYears(data)).catch(() => setYears([])); }, []);
    const [from, setFrom] = useState(() => `${new Date().getFullYear()}-01-01`);
    const [to, setTo] = useState(today);
    const [basis, setBasis] = useState<'capital' | 'agreed'>(() => 'capital');
    useEffect(() => {
        const act = partners.filter((p) => p.status === 'active');
        if (act.length && act.every((p) => p.share_pct !== null)) setBasis('agreed');
    }, [partners]);
    const [own, setOwn] = useState(false);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [pv, setPv] = useState<any>(null);
    const [busy, setBusy] = useState(false);
    const [hist, setHist] = useState<any[]>([]);
    const loadHist = () => api.get('v1/sales/trade-partners/distributions/').then(({ data }) => setHist(data)).catch(() => setHist([]));
    useEffect(() => { loadHist(); }, []);
    const params = () => ({ date_from: from, date_to: to, basis, ...(own && amount !== '' ? { amount } : {}) });
    const preview = async () => {
        setBusy(true);
        try { const { data } = await api.get('v1/sales/trade-partners/preview/', { params: params() }); setPv(data); if (!own) setAmount(String(data.ledger_profit)); }
        catch (e: any) { setPv(null); toast.error(e?.response?.data?.detail || 'Could not work it out.'); }
        finally { setBusy(false); }
    };
    const post = (confirm_overlap = false) => {
        if (!pv) return;
        const np = num(pv.net_profit);
        setAsk({
            msg: confirm_overlap ? 'Part of this period is already distributed. Post this distribution as well ?'
                : `Post the ${np >= 0 ? 'profit' : 'loss'} of ${fmt(Math.abs(np))} (${dmy(pv.date_from)} to ${dmy(pv.date_to)}) to the partners' capital ?`,
            yes: async () => {
                setBusy(true);
                try {
                    const { data } = await api.post('v1/sales/trade-partners/distributions/', { ...params(), note, confirm_overlap });
                    toast.success(`${data.voucher_no} posted — ${fmt(num(data.net_profit))} shared.`);
                    setPv(null); loadHist(); reload();
                } catch (e: any) {
                    const d = e?.response?.data;
                    if (d?.overlap) { toast(d.detail, { icon: '⚠️', duration: 7000 }); setTimeout(() => post(true), 50); }
                    else toast.error(d?.detail || 'Could not post.');
                } finally { setBusy(false); }
            },
        });
    };
    const undo = (h: any) => setAsk({
        msg: `Remove distribution ${h.voucher_no} (${dmy(h.date_from)} to ${dmy(h.date_to)}) ? The partners' shares are taken back.`,
        yes: async () => {
            try { await api.delete(`v1/sales/trade-partners/distributions/${h.id}/`); toast.success(`${h.voucher_no} removed.`); loadHist(); reload(); }
            catch (e: any) { toast.error(e?.response?.data?.detail || 'Could not remove.'); }
        },
    });
    const L = `${LABEL} text-[14px]`;
    const np = num(pv?.net_profit);
    return (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] gap-3">
            <div className="flex min-h-0 flex-col gap-3">
                <fieldset className="rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-3 pt-1">
                    {legend('Profit / Loss of the Period')}
                    <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
                        <span className={L}>Financial Year</span>
                        <select value="" onChange={(e) => { const y = years.find((x) => String(x.id) === e.target.value); if (y) { setFrom(String(y.from_date).slice(0, 10)); setTo(String(y.to_date).slice(0, 10)); setPv(null); } }} className={COA_SELECT}>
                            <option value="">Choose to fill the dates</option>
                            {years.map((y) => <option key={y.id} value={y.id}>{y.title} ({dmy(y.from_date)} – {dmy(y.to_date)})</option>)}
                        </select>
                        <span className={L}>From Date</span><input type="date" value={from} onChange={(e) => { if (e.target.value) { setFrom(e.target.value); setPv(null); } }} className={dateIn} />
                        <span className={L}>To Date</span><input type="date" value={to} onChange={(e) => { if (e.target.value) { setTo(e.target.value); setPv(null); } }} className={dateIn} />
                        <span className={L}>Share by</span>
                        <div className="flex flex-col gap-1 text-[13px] font-semibold">
                            <label className="flex items-center gap-2" title="Partners with an agreed % get exactly that %; the rest is shared by capital × days"><input type="radio" checked={basis === 'capital'} onChange={() => { setBasis('capital'); setPv(null); }} className="accent-[#3b3f8f]" /> Capital × days (+ agreed %)</label>
                            <label className="flex items-center gap-2"><input type="radio" checked={basis === 'agreed'} onChange={() => { setBasis('agreed'); setPv(null); }} className="accent-[#3b3f8f]" /> Agreed share % × days</label>
                        </div>
                        <label className={`${L} flex items-center gap-1.5`}><input type="checkbox" checked={own} onChange={(e) => { setOwn(e.target.checked); setPv(null); }} className="h-4 w-4 accent-[#3b3f8f]" /> Amount</label>
                        <input value={amount} disabled={!own} onChange={(e) => { setAmount(e.target.value.replace(/[^\d.-]/g, '')); setPv(null); }} placeholder="Net profit from the ledger"
                            className={`${FIELD} w-full text-right ${own ? 'border-emerald-300 bg-[#e3fbe3]' : 'border-slate-300 bg-[#ececf3] text-slate-500'}`} />
                        <span className={L}>Note</span><input value={note} onChange={(e) => setNote(e.target.value)} className={`${EDIT} w-full`} />
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                        <button type="button" onClick={preview} disabled={busy} className={ACTION_BTN}>{busy ? <Loader2 size={14} className="animate-spin" /> : 'Work it out'}</button>
                        <button type="button" onClick={() => post()} disabled={busy || !pv || !np} className={ACTION_BTN}>Post</button>
                    </div>
                </fieldset>
                <div className="min-h-0 flex-1 overflow-y-auto rounded border border-slate-500 bg-white">
                    <div className="sticky top-0 bg-[#e8e8f4] px-2 py-1 text-[13px] font-bold">Distributions posted</div>
                    <table className="w-full table-fixed border-collapse text-[12px]">
                        <colgroup>{[26, 40, 22, 12].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                        <tbody>
                            {hist.map((h) => (
                                <tr key={h.id} className="tabular-nums">
                                    <td className={TD}>{h.voucher_no}</td>
                                    <td className={TD}>{dmy(h.date_from)} – {dmy(h.date_to)}</td>
                                    <td className={`${TD} text-right ${num(h.net_profit) < 0 ? 'text-red-600' : ''}`}>{fmt(num(h.net_profit))}</td>
                                    <td className="border-b border-slate-300 px-1 py-0.5"><button type="button" onClick={() => undo(h)} className="h-6 w-full border border-red-300 bg-[#ffe1e1] text-[11px] font-bold text-red-700">Undo</button></td>
                                </tr>
                            ))}
                            {!hist.length && <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-500">None yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="flex min-h-0 flex-col gap-2">
                {pv ? (<>
                    <div className="grid shrink-0 grid-cols-3 gap-2">
                        <ReadBox value={<span>Period <b>{dmy(pv.date_from)}</b> to <b>{dmy(pv.date_to)}</b></span>} />
                        <ReadBox value={<span>Ledger {num(pv.ledger_profit) >= 0 ? 'profit' : 'loss'}: <b>{fmt(num(pv.ledger_profit))}</b></span>} />
                        <div className={`${FIELD} flex h-8 items-center justify-between font-bold ${np >= 0 ? 'border-sky-300 bg-[#c9f6ff]' : 'border-red-300 bg-[#ffe1e1] text-red-700'}`}>
                            <span className="text-[12px] font-semibold">{np >= 0 ? 'Profit to share' : 'Loss to share'}</span>{fmt(np)}
                        </div>
                    </div>
                    {pv.notes?.map((n: string) => <div key={n} className="shrink-0 border border-sky-400 bg-[#e6f4ff] px-3 py-1 text-[12.5px] font-semibold text-sky-900">ℹ {n}</div>)}
                    {pv.overlaps?.length > 0 && <div className="shrink-0 border border-amber-400 bg-[#fff6d6] px-3 py-1 text-[13px] font-semibold text-amber-800">⚠ Already distributed for part of this period: {pv.overlaps.map((o: any) => `${o.voucher_no} (${dmy(o.from)}–${dmy(o.to)})`).join(', ')}</div>}
                    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] gap-2">
                    {/* The period's Profit and Loss: everything taken out before the partners share */}
                    <div className="min-h-0 overflow-y-auto overflow-x-hidden rounded border border-slate-500 bg-white">
                        <div className="sticky top-0 z-10 bg-[#e8e8f4] px-2 py-1 text-[13px] font-bold">Profit and Loss of the period</div>
                        <table className="w-full table-fixed border-collapse text-[12px]">
                            <colgroup><col /><col style={{ width: '38%' }} /></colgroup>
                            <tbody>
                                {(['income', 'expense'] as const).map((kind) => {
                                    const gs = (pv.statement || []).filter((g: any) => g.kind === kind);
                                    return [
                                        <tr key={kind}><td colSpan={2} className="bg-[#f2f2fa] px-2 py-1 font-bold text-[#1f2bd6]">{kind === 'income' ? 'Income (sales …)' : 'Less: all expenses'}</td></tr>,
                                        ...gs.map((g: any) => (
                                            <tr key={`${kind}${g.code}`} className="tabular-nums" title={g.accounts.map((a: any) => `${a.acc_id} ${a.name}: ${fmt(num(a.amount))}`).join(' · ')}>
                                                <td className={TD}>{g.name}<span className="ml-1 text-[10.5px] text-slate-500">{g.code}</span></td>
                                                <td className={`${TD} text-right ${kind === 'expense' ? 'text-red-700' : ''}`}>{kind === 'expense' ? `(${fmt(num(g.amount))})` : fmt(num(g.amount))}</td>
                                            </tr>
                                        )),
                                        <tr key={`${kind}t`} className="bg-[#fafafa] font-bold tabular-nums">
                                            <td className={TD}>{kind === 'income' ? 'Total Income' : 'Total Expenses'}</td>
                                            <td className={`${TD} text-right ${kind === 'expense' ? 'text-red-700' : ''}`}>{fmt(num(kind === 'income' ? pv.total_income : pv.total_expense))}</td>
                                        </tr>,
                                    ];
                                })}
                                <tr className={`font-black tabular-nums ${num(pv.ledger_profit) >= 0 ? 'bg-[#c9f6ff]' : 'bg-[#ffe1e1] text-red-700'}`}>
                                    <td className={TD}>{num(pv.ledger_profit) >= 0 ? 'Net Profit to share' : 'Net Loss to share'}</td>
                                    <td className={`${TD} text-right text-[14px]`}>{fmt(num(pv.ledger_profit))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="min-h-0 overflow-y-auto overflow-x-hidden rounded border border-slate-500 bg-white">
                        <table className="w-full table-fixed border-collapse text-[12px]">
                            <colgroup>{[27, 8, 19, 11, 12, 23].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                            <thead><tr>{['Partner', 'Days', 'Capital', 'Agreed %', 'Share %', np >= 0 ? 'Profit Share' : 'Loss Share'].map((h, k) => <th key={h} className={`${TH} ${k ? '!text-right' : ''}`}>{h}</th>)}</tr></thead>
                            <tbody>
                                {pv.rows.map((r: any) => (
                                    <tr key={r.partner} className="tabular-nums">
                                        <td className={TD}>{r.name}</td>
                                        <td className={`${TD} text-right`}>{r.days}</td>
                                        <td className={`${TD} text-right`}>{fmt(num(r.capital))}</td>
                                        <td className={`${TD} text-right`}>{r.share_pct === null ? '—' : pct(num(r.share_pct))}</td>
                                        <td className={`${TD} text-right font-semibold`}>{pct(num(r.weight_pct))}</td>
                                        <td className={`${TD} text-right font-bold ${num(r.amount) < 0 ? 'text-red-600' : 'text-[#1f2bd6]'}`}>{fmt(num(r.amount))}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-[#e8e8f4] font-bold tabular-nums">
                                <tr><td className={TD} colSpan={4}>Total</td><td className={`${TD} text-right`}>100%</td><td className={`${TD} text-right`}>{fmt(pv.rows.reduce((s: number, r: any) => s + num(r.amount), 0))}</td></tr>
                            </tfoot>
                        </table>
                    </div>
                    </div>
                    <p className="shrink-0 text-[12px] text-slate-600">Net profit = all income less every expense of the period (cost of goods, salaries, fares, rent, bank and card charges …); only that is shared. {basis === 'capital'
                        ? 'A partner with an agreed % gets that % of the profit (for their days); the rest goes to the others by capital (invested + profit kept) on each day they were a partner.'
                        : 'Each partner’s share = agreed % × days they were a partner, as a part of all partners’ total.'} Post credits each partner&apos;s capital account (a loss is taken off) against Retain Earning.</p>
                </>) : (
                    <div className="flex flex-1 items-center justify-center rounded border border-dashed border-slate-400 bg-white/60 text-[14px] text-slate-500">Choose the period and press “Work it out” to see each partner’s share.</div>
                )}
            </div>
        </div>
    );
}

/* ── Report ── */
function ReportTab({ partners }: { partners: Partner[] }) {
    const [pid, setPid] = useState('');
    const [fromOn, setFromOn] = useState(false);
    const [from, setFrom] = useState(() => `${new Date().getFullYear()}-01-01`);
    const [to, setTo] = useState(today);
    const [st, setSt] = useState<any>(null);
    const ref = useRef<HTMLDivElement>(null);
    // The dates take effect on Apply (summary and statement together).
    const [applied, setApplied] = useState<{ fromOn: boolean; from: string; to: string }>(() => ({ fromOn: false, from: `${new Date().getFullYear()}-01-01`, to: today() }));
    const dirty = applied.fromOn !== fromOn || (fromOn && applied.from !== from) || applied.to !== to;
    const apply = () => {
        if (fromOn && from > to) { toast.error('The From date is after the To date.'); return; }
        setApplied({ fromOn, from, to });
    };
    const params = { ...(applied.fromOn ? { date_from: applied.from } : {}), date_to: applied.to };
    const [rows, setRows] = useState<Partner[] | null>(null);
    useEffect(() => {
        setRows(null);
        api.get('v1/sales/trade-partners/', { params }).then(({ data }) => setRows(data)).catch(() => setRows([]));
    }, [applied, partners]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!pid) { setSt(null); return; }
        api.get('v1/sales/trade-partners/statement/', { params: { partner: pid, ...params } })
            .then(({ data }) => setSt(data)).catch(() => setSt(null));
    }, [pid, applied]); // eslint-disable-line react-hooks/exhaustive-deps
    const list = rows || [];
    const act = list.filter((p) => p.status === 'active');
    const sumOf = (k: keyof Partner) => list.reduce((s, p) => s + num(p[k]), 0);
    const [printing, setPrinting] = useState(false);
    const doPrint = async () => {
        if (!ref.current || printing) return;
        setPrinting(true);
        try { await printWindow(ref.current); } catch { toast.error('Could not prepare the print.'); } finally { setPrinting(false); }
    };
    return (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-lg border border-[#9da1d8] bg-[#ececfd] px-3 py-2">
                <span className={`${LABEL} text-[14px]`}>Partner Statement</span>
                <select value={pid} onChange={(e) => setPid(e.target.value)} className={`${COA_SELECT} !w-[240px]`}>
                    <option value="">Summary only</option>
                    {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <label className={`${LABEL} flex items-center gap-1.5 text-[14px]`}><input type="checkbox" checked={fromOn} onChange={(e) => setFromOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" /> From</label>
                <input type="date" value={from} disabled={!fromOn} onChange={(e) => e.target.value && setFrom(e.target.value)} className={`${FIELD} w-[160px] ${fromOn ? 'border-emerald-300 bg-[#e3fbe3]' : 'border-slate-300 bg-[#ececf3] text-slate-500'}`} />
                <span className={`${LABEL} text-[14px]`}>To</span>
                <input type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') apply(); }} className={`${EDIT} w-[160px]`} />
                <button type="button" onClick={apply} title="Show the summary and the statement for these dates"
                    className={`${ACTION_BTN} !min-w-[90px] ${dirty ? '!border-[#3b3f8f] !from-[#3b3f8f] !to-[#2b2f7f] !text-white animate-pulse' : ''}`}><span className="underline">A</span>pply</button>
                <span className="flex-1" />
                <button type="button" onClick={doPrint} disabled={printing} className={ACTION_BTN}>{printing ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">P</span>rint</>}</button>
            </div>
            <div ref={ref} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-white p-3">
                <div>
                    <div className="text-[16px] font-black">AL-QAVI TRADERS — Partnership Summary</div>
                    <div className="text-[12px] text-slate-600">
                        Capital as on {dmy(applied.to)} · Profit / Loss and Drawings {applied.fromOn ? `from ${dmy(applied.from)} to ${dmy(applied.to)}` : `up to ${dmy(applied.to)}`} · {act.length} active partner{act.length === 1 ? '' : 's'}
                    </div>
                </div>
                <table className="w-full table-fixed border-collapse text-[11.5px]">
                    <colgroup>{[21, 9, 13, 8, 8, 14, 11, 16].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                    <thead><tr>{['Partner', 'Joining', 'Invested', 'Cap. %', 'Agreed', 'Profit / Loss', 'Drawings', 'Capital'].map((h, k) => <th key={h} className={`border border-slate-400 bg-[#ececec] px-1.5 py-1 ${k >= 2 ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
                    <tbody>
                        {!rows && <tr><td colSpan={8} className="px-3 py-4 text-center text-slate-500">Loading…</td></tr>}
                        {list.map((p) => (
                            <tr key={p.id} className={`tabular-nums ${p.status !== 'active' ? 'text-slate-400' : ''}`}>
                                <td className="truncate border border-slate-300 px-1.5 py-1">{p.name}</td>
                                <td className="border border-slate-300 px-1.5 py-1">{dmy2(p.joining_date)}</td>
                                <td className="border border-slate-300 px-1.5 py-1 text-right">{fmt(num(p.invested))}</td>
                                <td className="border border-slate-300 px-1.5 py-1 text-right">{pct(num(p.capital_pct))}</td>
                                <td className="border border-slate-300 px-1.5 py-1 text-right">{p.share_pct === null ? '—' : pct(num(p.share_pct))}</td>
                                <td className={`border border-slate-300 px-1.5 py-1 text-right ${num(p.profit) < 0 ? 'text-red-600' : ''}`}>{fmt(num(p.profit))}</td>
                                <td className="border border-slate-300 px-1.5 py-1 text-right">{fmt(num(p.drawings))}</td>
                                <td className="border border-slate-300 px-1.5 py-1 text-right font-bold">{fmt(num(p.balance))}</td>
                            </tr>
                        ))}
                        <tr className="bg-[#e8e8f4] font-bold tabular-nums">
                            <td className="border border-slate-400 px-1.5 py-1" colSpan={2}>Total</td>
                            <td className="border border-slate-400 px-1.5 py-1 text-right">{fmt(act.reduce((s, p) => s + num(p.invested), 0))}</td>
                            <td className="border border-slate-400 px-1.5 py-1 text-right">100%</td>
                            <td className="border border-slate-400" />
                            <td className="border border-slate-400 px-1.5 py-1 text-right">{fmt(sumOf('profit'))}</td>
                            <td className="border border-slate-400 px-1.5 py-1 text-right">{fmt(sumOf('drawings'))}</td>
                            <td className="border border-slate-400 px-1.5 py-1 text-right">{fmt(sumOf('balance'))}</td>
                        </tr>
                    </tbody>
                </table>

                {st && (
                    <div>
                        <div className="text-[15px] font-black">Capital Statement — {st.partner.name} <span className="text-[12px] font-semibold text-slate-600">({st.partner.acc_id} {st.partner.account_name} · joined {dmy(st.partner.joining_date)})</span></div>
                        <table className="mt-1 w-full table-fixed border-collapse text-[11.5px]">
                            <colgroup>{[10, 11, 13, 36, 10, 10, 10].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                            <thead><tr>{['Date', 'Voucher', 'Entry', 'Detail', 'Debit', 'Credit', 'Balance'].map((h, k) => <th key={h} className={`border border-slate-400 bg-[#ececec] px-1.5 py-1 ${k >= 4 ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
                            <tbody>
                                <tr className="tabular-nums text-slate-600"><td className="border border-slate-300 px-1.5 py-1" colSpan={6}>Opening Balance</td><td className="border border-slate-300 px-1.5 py-1 text-right">{fmt(num(st.opening))}</td></tr>
                                {st.rows.map((r: any, i: number) => (
                                    <tr key={i} className={`tabular-nums ${r.kind.includes('Loss') || r.kind === 'Drawings' || r.kind === 'Capital out' ? 'text-red-700' : r.kind === 'Profit share' ? 'text-[#1f2bd6]' : ''}`}>
                                        <td className="border border-slate-300 px-1.5 py-1">{dmy2(r.date)}</td>
                                        <td className="border border-slate-300 px-1.5 py-1">{r.voucher_no}</td>
                                        <td className="border border-slate-300 px-1.5 py-1">{r.kind}</td>
                                        <td className="truncate border border-slate-300 px-1.5 py-1" title={r.detail}>{r.detail}</td>
                                        <td className="border border-slate-300 px-1.5 py-1 text-right">{num(r.debit) ? fmt(num(r.debit)) : ''}</td>
                                        <td className="border border-slate-300 px-1.5 py-1 text-right">{num(r.credit) ? fmt(num(r.credit)) : ''}</td>
                                        <td className="border border-slate-300 px-1.5 py-1 text-right font-semibold">{fmt(num(r.balance))}</td>
                                    </tr>
                                ))}
                                <tr className="bg-[#e8e8f4] font-bold tabular-nums"><td className="border border-slate-400 px-1.5 py-1" colSpan={6}>Closing Balance</td><td className="border border-slate-400 px-1.5 py-1 text-right">{fmt(num(st.closing))}</td></tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
