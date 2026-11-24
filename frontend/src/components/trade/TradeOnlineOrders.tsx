"use client";

/*
 * Trade 1.0 — Online Orders (the shop's orders).
 *
 * An order placed on the shop waits here: it is not a sale, holds its stock
 * and nothing is paid. Confirm makes it Trade sale invoice(s) — the S-number,
 * one invoice per company, stock from the batches by earliest expiry, at the
 * shop's retail price (and the delivery charge) — for the customer's account.
 * A guest's order gets a new account from its name / phone / address, unless
 * an existing customer account is chosen. Cancel gives the stock back. An
 * invoiced order's Shipped / Delivered is only for the customer's tracking.
 *
 * Shop Logins: give an existing Trade customer a login for the shop (their
 * e-mail and a password) — their orders then come in on their own account.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { openPopup } from '@/lib/popup';
import {
    ConfirmBox, ReadBox, LABEL, EDIT, ACTION_BTN, COA_SELECT, guardWindowClose, closeTradeWindow,
} from '@/components/trade/TradeSaleInvoice';
import { FindAccountWindow, type Acc } from '@/components/trade/TradeReceiptVoucher';

type Item = { product: string; pid: string; qty: number; price: string; net: string; stock: number };
type Row = {
    id: string; order_no: string; date: string; status: string; customer: string; phone: string; whatsapp: string; address: string;
    notes: string; payment_method: string; total: string; shipping: string; account: { id: number; acc_id: string; name: string } | null;
    invoices: string; items: Item[]; invoice_links: { id: string; no: string }[];
};
type Show = 'new' | 'done' | 'cancelled' | 'logins';

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const when = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? '' : `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`; };
const PAY: Record<string, string> = { COD: 'Cash on delivery', ONLINE: 'Online (card / Easypaisa) — check it came in', SHOP: 'Shop' };
const TH = 'sticky top-0 z-10 whitespace-nowrap border-b border-r border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-bold text-slate-700';
const TD = 'truncate whitespace-nowrap border-b border-r border-slate-200 px-2 py-[5px]';

export default function TradeOnlineOrders() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Online Orders )'; }, []);
    useEffect(() => guardWindowClose(), []);
    const [show, setShow] = useState<Show>('new');
    const [data, setData] = useState<{ waiting: number; rows: Row[] } | null>(null);
    const [selId, setSelId] = useState('');
    const load = (s: Show = show) => {
        if (s === 'logins') return;
        setData(null);
        api.get('v1/sales/trade-online-orders/', { params: { show: s } }).then(({ data }) => setData(data)).catch(() => setData({ waiting: 0, rows: [] }));
    };
    useEffect(() => { load(show); }, [show]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {   // new shop orders show up on their own
        const t = setInterval(() => { if (show === 'new') api.get('v1/sales/trade-online-orders/', { params: { show: 'new' } }).then(({ data }) => setData(data)).catch(() => {}); }, 60000);
        return () => clearInterval(t);
    }, [show]);
    const rows = data?.rows || [];
    const sel = rows.find((r) => r.id === selId) || null;

    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    const [accounts, setAccounts] = useState<Acc[] | null>(null);
    useEffect(() => {
        api.get('v1/sales/orders/staff_list/').then(({ data }) => setStaff((data || []).filter((x: any) => x.status === 'active').map((x: any) => ({ id: String(x.id), name: x.name })))).catch(() => {});
        api.get('v1/company/ledger-accounts/').then(({ data }) => setAccounts((data as Acc[]).filter((a) => a.group === 1202))).catch(() => setAccounts([]));
    }, []);

    // Confirm / cancel / status
    const [staffId, setStaffId] = useState('');
    const [guestAcc, setGuestAcc] = useState<Acc | null>(null);
    const [finder, setFinder] = useState<null | 'guest' | 'login'>(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => { setGuestAcc(null); }, [selId]);
    const confirmOrder = (r: Row) => setAsk({
        msg: `Make Trade sale invoice(s) for online order ${r.order_no} (${fmt(num(r.total))}) — for ${r.account ? `${r.account.acc_id} ${r.account.name}` : guestAcc ? `${guestAcc.acc_id} ${guestAcc.name}` : `a NEW customer account "${r.customer}"`} ?`,
        yes: async () => {
            setBusy(true);
            try {
                const { data } = await api.post(`v1/sales/trade-online-orders/${r.id}/confirm/`, { staff: staffId || null, account: !r.account && guestAcc ? guestAcc.id : null });
                toast.success(`Order ${r.order_no} → ${data.invoices.map((i: any) => i.tracking_id).join(', ')} (account ${data.account}).`, { duration: 7000 });
                setSelId(''); load();
            } catch (e: any) { toast.error(e?.response?.data?.detail || 'Could not make the invoice.', { duration: 7000 }); }
            finally { setBusy(false); }
        },
    });
    const cancelOrder = (r: Row) => setAsk({
        msg: `Cancel online order ${r.order_no} from ${r.customer}? Its stock is given back.`,
        yes: async () => {
            setBusy(true);
            try { await api.post(`v1/sales/trade-online-orders/${r.id}/cancel/`); toast.success(`Order ${r.order_no} cancelled.`); setSelId(''); load(); }
            catch (e: any) { toast.error(e?.response?.data?.detail || 'Could not cancel.'); }
            finally { setBusy(false); }
        },
    });
    const setStatus = async (r: Row, st: string) => {
        setBusy(true);
        try { await api.post(`v1/sales/trade-online-orders/${r.id}/set_status/`, { status: st }); toast.success(`Order ${r.order_no}: ${st.toLowerCase()}.`); load(); }
        catch (e: any) { toast.error(e?.response?.data?.detail || 'Could not save.'); }
        finally { setBusy(false); }
    };

    // Shop logins
    const [loginAcc, setLoginAcc] = useState<Acc | null>(null);
    const [loginInfo, setLoginInfo] = useState<any>(null);
    const [email, setEmail] = useState('');
    const [pw, setPw] = useState('');
    const pickLogin = async (a: Acc) => {
        setFinder(null); setLoginAcc(a); setLoginInfo(null); setPw('');
        try { const { data } = await api.get('v1/sales/trade-online-orders/shop_login/', { params: { account: a.id } }); setLoginInfo(data); setEmail(data.login || ''); }
        catch (e: any) { toast.error(e?.response?.data?.detail || 'Could not load.'); }
    };
    const saveLogin = async () => {
        if (!loginAcc) return;
        setBusy(true);
        try {
            const { data } = await api.post('v1/sales/trade-online-orders/shop_login/', { account: loginAcc.id, email, password: pw });
            toast.success(`${loginAcc.name} can now log into the shop with ${data.login}.`, { duration: 7000 });
            setLoginInfo({ ...loginInfo, login: data.login, has_login: true }); setPw('');
        } catch (e: any) { toast.error(e?.response?.data?.detail || 'Could not save.'); }
        finally { setBusy(false); }
    };

    const tabs: { v: Show; label: string }[] = useMemo(() => [
        { v: 'new', label: `New orders${data && show === 'new' ? ` (${data.waiting})` : ''}` }, { v: 'done', label: 'Invoiced' },
        { v: 'cancelled', label: 'Cancelled' }, { v: 'logins', label: 'Shop Logins' },
    ], [data, show]);
    const L = `${LABEL} text-[14px]`;

    return (
        <div className="flex h-screen flex-col bg-[#dcdcf7] font-sans text-slate-900">
            <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Online Orders )</span>
            </div>
            <div className="flex shrink-0 items-center gap-2 px-3 pt-2">
                {tabs.map((t) => (
                    <button key={t.v} type="button" onClick={() => { setShow(t.v); setSelId(''); }}
                        className={`h-9 border px-4 text-[14px] font-bold ${show === t.v ? 'border-[#3b3f8f] bg-[#3b3f8f] text-white' : 'border-[#9da1d8] bg-[#ececfd] text-slate-800 hover:bg-white'} ${t.v === 'new' && (data?.waiting || 0) > 0 && show !== 'new' ? 'animate-pulse' : ''}`}>{t.label}</button>
                ))}
                {show !== 'logins' && <button type="button" onClick={() => load()} title="Refresh" className={`${ACTION_BTN} !min-w-0 !px-3`}><RefreshCw size={14} /></button>}
                <span className="flex-1" />
                <button type="button" onClick={() => askClose(closeTradeWindow)} className={ACTION_BTN}><span className="underline">C</span>lose</button>
            </div>

            {show === 'logins' ? (
                <div className="m-3 flex flex-col gap-3 rounded-lg border border-[#9da1d8] bg-[#ececfd] p-4">
                    <p className="text-[13px] text-slate-700">Give an existing customer a login for the shop. Their shop orders then come in on their own account (with their balance and history).</p>
                    <div className="grid max-w-[760px] grid-cols-[140px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
                        <button type="button" onClick={() => setFinder('login')} className={ACTION_BTN}>Find Customer</button>
                        <ReadBox value={loginAcc ? `${loginAcc.acc_id}  ${loginAcc.name}` : 'Find the customer account'} />
                        {loginAcc && loginInfo && (<>
                            <span className={L}>Shop login</span>
                            <ReadBox value={loginInfo.has_login ? <span className="font-bold text-emerald-700">{loginInfo.login}</span> : <span className="text-slate-500">none yet{loginInfo.phone ? ` · phone ${loginInfo.phone}` : ''}</span>} />
                            <span className={L}>E-mail (login)</span>
                            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" className={`${EDIT} w-full`} />
                            <span className={L}>New password</span>
                            <input value={pw} onChange={(e) => setPw(e.target.value)} type="text" placeholder="at least 6 characters — tell it to the customer" className={`${EDIT} w-full`} />
                            <span />
                            <div className="flex gap-2">
                                <button type="button" onClick={saveLogin} disabled={busy || !email.trim() || pw.length < 6} className={ACTION_BTN}>{busy ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave login</>}</button>
                            </div>
                        </>)}
                    </div>
                </div>
            ) : (
                <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-3 p-3">
                    <section className="flex min-h-0 flex-col overflow-hidden border border-[#c9cdf0] bg-white">
                        <div className="min-h-0 flex-1 overflow-auto">
                            <table className="w-full table-fixed border-collapse text-[13px] leading-tight">
                                <colgroup>{[12, 16, 22, 15, 15, 20].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                                <thead><tr>{['Order', 'Date', 'Customer', 'Phone', 'Payment', show === 'done' ? 'Invoice(s) / Status' : 'Total'].map((h, k) =>
                                    <th key={k} className={`${TH} ${k === 5 && show !== 'done' ? '!text-right' : ''}`}>{h}</th>)}</tr></thead>
                                <tbody>
                                    {!data ? <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">Loading…</td></tr>
                                        : !rows.length ? <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">{show === 'new' ? 'No new shop orders.' : 'Nothing here.'}</td></tr>
                                            : rows.map((r) => (
                                                <tr key={r.id} onClick={() => setSelId(r.id)} className={`cursor-pointer ${selId === r.id ? 'bg-[#2f5bd3] text-white' : 'hover:bg-indigo-50'}`}>
                                                    <td className={`${TD} font-bold`}>{r.order_no}</td>
                                                    <td className={TD}>{when(r.date)}</td>
                                                    <td className={TD} title={r.customer}>{r.customer}{r.account ? '' : ' (guest)'}</td>
                                                    <td className={TD}>{r.phone}</td>
                                                    <td className={TD}>{r.payment_method === 'COD' ? 'Cash on delivery' : r.payment_method === 'ONLINE' ? 'Online' : r.payment_method}</td>
                                                    <td className={`${TD} ${show !== 'done' ? 'text-right font-semibold tabular-nums' : ''}`}>{show === 'done' ? `${r.invoices} · ${r.status}` : fmt(num(r.total))}</td>
                                                </tr>
                                            ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="flex min-h-0 flex-col overflow-hidden border border-[#c9cdf0] bg-white">
                        {!sel ? <div className="flex flex-1 items-center justify-center px-6 text-center text-[14px] text-slate-500">Click an order to see it{show === 'new' ? ', then confirm it (make the invoice) or cancel it' : ''}.</div> : (
                            <div className="flex min-h-0 flex-1 flex-col">
                                <div className="shrink-0 border-b border-slate-200 bg-[#f2f2fa] px-3 py-2 text-[13px] leading-snug">
                                    <div className="text-[15px] font-black text-[#1f2bd6]">Order {sel.order_no} <span className="text-[12px] font-semibold text-slate-500">· {when(sel.date)} · {sel.status}</span></div>
                                    <div><b>{sel.customer}</b> · {sel.phone}{sel.whatsapp && sel.whatsapp !== sel.phone ? ` · WhatsApp ${sel.whatsapp}` : ''}</div>
                                    <div className="text-slate-600">{sel.address}</div>
                                    <div>Account: {sel.account ? <b>{sel.account.acc_id} {sel.account.name}</b> : <span className="font-semibold text-amber-700">guest — no account yet</span>}</div>
                                    <div className={sel.payment_method === 'ONLINE' ? 'font-semibold text-red-700' : ''}>Payment: {PAY[sel.payment_method] || sel.payment_method}</div>
                                    {sel.notes && <div className="text-slate-600">Note: {sel.notes}</div>}
                                </div>
                                <div className="min-h-0 flex-1 overflow-auto">
                                    <table className="w-full table-fixed border-collapse text-[12.5px]">
                                        <colgroup>{[44, 10, 15, 16, 15].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                                        <thead><tr>{['Product', 'Qty', 'Retail', 'Amount', 'In stock'].map((h, k) => <th key={k} className={`${TH} ${k ? '!text-right' : ''}`}>{h}</th>)}</tr></thead>
                                        <tbody>
                                            {sel.items.map((it, i) => (
                                                <tr key={i} className={show === 'new' && it.stock < it.qty ? 'font-semibold text-red-600' : ''}>
                                                    <td className={TD} title={it.product}>{it.pid ? `${it.pid} · ` : ''}{it.product}</td>
                                                    <td className={`${TD} text-right tabular-nums`}>{it.qty}</td>
                                                    <td className={`${TD} text-right tabular-nums`}>{fmt(num(it.price))}</td>
                                                    <td className={`${TD} text-right tabular-nums`}>{fmt(num(it.net))}</td>
                                                    <td className={`${TD} text-right tabular-nums`}>{it.stock}</td>
                                                </tr>
                                            ))}
                                            {num(sel.shipping) > 0 && <tr><td className={TD} colSpan={3}>Delivery charge</td><td className={`${TD} text-right tabular-nums`}>{fmt(num(sel.shipping))}</td><td className={TD} /></tr>}
                                            <tr className="bg-[#e8e8f4] font-bold"><td className={TD} colSpan={3}>Total</td><td className={`${TD} text-right tabular-nums`}>{fmt(num(sel.total))}</td><td className={TD} /></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="shrink-0 border-t border-slate-200 bg-[#ececfd] p-3">
                                    {show === 'new' && (
                                        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-x-2 gap-y-2">
                                            <span className={L}>Saleman</span>
                                            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={COA_SELECT}>
                                                <option value="">(none)</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                            {!sel.account && (<>
                                                <span className={L}>Customer</span>
                                                <div className="flex gap-2">
                                                    <ReadBox value={guestAcc ? `${guestAcc.acc_id} ${guestAcc.name}` : `new account "${sel.customer}"`} className="flex-1" />
                                                    <button type="button" onClick={() => setFinder('guest')} className={`${ACTION_BTN} !min-w-0 !px-3`} title="An existing customer placed this order as a guest">Find</button>
                                                    {guestAcc && <button type="button" onClick={() => setGuestAcc(null)} className={`${ACTION_BTN} !min-w-0 !px-3`}>New</button>}
                                                </div>
                                            </>)}
                                            <span />
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => confirmOrder(sel)} disabled={busy} className={`${ACTION_BTN} !border-emerald-600 !from-emerald-500 !to-emerald-600 !text-white`}>
                                                    {busy ? <Loader2 size={14} className="animate-spin" /> : 'Confirm → Make Invoice'}
                                                </button>
                                                <button type="button" onClick={() => cancelOrder(sel)} disabled={busy} className={`${ACTION_BTN} !text-red-700`}>Cancel order</button>
                                            </div>
                                        </div>
                                    )}
                                    {show === 'done' && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={L}>Invoice(s)</span>
                                            {sel.invoice_links.map((l) => (
                                                <button key={l.id} type="button" onClick={() => openPopup(`/admin/trade/invoice/${l.id}`)} className={`${ACTION_BTN} !min-w-0 !px-3`}>{l.no}</button>
                                            ))}
                                            <span className="mx-1 h-6 w-px bg-slate-300" />
                                            <span className={L}>For the customer</span>
                                            {['SHIPPED', 'DELIVERED'].map((st) => (
                                                <button key={st} type="button" onClick={() => setStatus(sel, st)} disabled={busy || sel.status === st}
                                                    className={`${ACTION_BTN} !min-w-0 !px-3 ${sel.status === st ? '!border-[#3b3f8f] !from-[#3b3f8f] !to-[#2b2f7f] !text-white' : ''}`}>{st === 'SHIPPED' ? 'Shipped' : 'Delivered'}</button>
                                            ))}
                                        </div>
                                    )}
                                    {show === 'cancelled' && <div className="text-[13px] text-slate-600">This order was cancelled — its stock was given back.</div>}
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            )}

            {finder && (
                <FindAccountWindow accounts={accounts} cashOnly={false} initial="" askClose={askClose}
                    onPick={(a) => { if (finder === 'guest') { setGuestAcc(a); setFinder(null); } else pickLogin(a); }}
                    onClose={() => setFinder(null)} onAddNew={() => openPopup('/admin/trade/chart-of-account')} />
            )}
            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
