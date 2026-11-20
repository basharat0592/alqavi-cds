"use client";

/*
 * Trade 1.0 — User Permissions (Setup › User-Role Permissions).
 *
 * User Name → that login's rights as check boxes, laid out like the legacy
 * window: masters (Save / View / Update / Delete / Export), setup (New User,
 * User Permissions, Change Password Own / All, Database Backup / Restore,
 * Distributions Titles), the entry windows (Save / View) and the reports
 * (Print). Select all ticks everything. Save stores the set; from then on the
 * login sees only what is ticked. A login never given a set — and the main
 * admin, always — has full access.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { ConfirmBox, ACTION_BTN, COA_SELECT, closeTradeWindow } from '@/components/trade/TradeSaleInvoice';
import { loadMyPerms, type PermRow, type PermSection } from '@/lib/tradePerms';
import FitStage from '@/components/trade/FitStage';

type UserRow = { id: number; name: string; owner: boolean; restricted: boolean; perms: string[] };

const ACT_LABEL: Record<string, string> = {
    save: 'Save', view: 'View', update: 'Update', delete: 'Delete', export: 'Export', print: 'Print',
    own: 'Own', all: 'All', backup: 'Backup', restore: 'Restore',
};
const ACT_COLOR: Record<string, string> = {
    save: 'text-[#1f2bd6]', own: 'text-[#1f2bd6]', backup: 'text-[#1f2bd6]', print: 'text-[#1f2bd6]',
    update: 'text-[#0a8a2a]', all: 'text-[#0a8a2a]', restore: 'text-[#0a8a2a]', delete: 'text-[#d32020]',
    view: 'text-slate-800', export: 'text-slate-800',
};
// Column each action sits in, so the boxes line up down a section.
const SLOT: Record<string, number> = { save: 0, own: 0, backup: 0, print: 0, view: 1, update: 2, all: 2, restore: 2, delete: 3, export: 4 };

export default function TradeUserPermissions() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( User Permissions )'; }, []);
    const [catalog, setCatalog] = useState<PermSection[]>([]);
    const [users, setUsers] = useState<UserRow[] | null>(null);
    const [meId, setMeId] = useState<number | null>(null);
    const loadUsers = () => api.get('v1/sales/trade-permissions/users/').then(({ data }) => setUsers(data))
        .catch((e) => { setUsers([]); toast.error(e?.response?.data?.detail || 'Could not load the logins.'); });
    useEffect(() => {
        loadMyPerms().then((p) => setCatalog(p.catalog));
        loadUsers();
        api.get('v1/users/profile/').then(({ data }) => setMeId(Number(data?.id ?? data?.user?.id) || null)).catch(() => {});
    }, []);
    const all = useMemo(() => catalog.flatMap((s) => s.rows.flatMap((r) => r.actions.map((a) => `${r.key}.${a}`))), [catalog]);

    const [userId, setUserId] = useState('');
    const user = users?.find((u) => String(u.id) === userId) || null;
    const [perms, setPerms] = useState<Set<string>>(new Set());
    useEffect(() => { setPerms(new Set(user?.perms || [])); }, [userId, users]); // eslint-disable-line react-hooks/exhaustive-deps
    const locked = !user || user.owner || user.id === meId;
    const allOn = all.length > 0 && all.every((p) => perms.has(p));
    const changed = !!user && (perms.size !== user.perms.length || user.perms.some((p) => !perms.has(p)));

    const toggle = (p: string) => {
        if (locked) return;
        setPerms((s) => { const n = new Set(s); if (n.has(p)) n.delete(p); else n.add(p); return n; });
    };
    const toggleAll = () => { if (!locked) setPerms(allOn ? new Set() : new Set(all)); };

    const [saving, setSaving] = useState(false);
    const save = () => {
        if (!user || locked || saving) return;
        setAsk({
            msg: `Save the permissions of ${user.name} (${perms.size} of ${all.length} ticked) ?`,
            yes: async () => {
                setSaving(true);
                try {
                    await api.put(`v1/sales/trade-permissions/users/${user.id}/`, { perms: Array.from(perms) });
                    toast.success(`Permissions of ${user.name} saved.`);
                    await loadUsers();
                } catch (err: any) {
                    toast.error(String(err?.response?.data?.detail || 'Could not save the permissions.'), { duration: 6000 });
                } finally { setSaving(false); }
            },
        });
    };
    const closeWindow = () => setAsk({ msg: changed ? 'The permissions are not saved. Do you want to Close the Form ?' : 'Do you want to Close the Form ?', yes: closeTradeWindow });

    const sec = (id: string) => catalog.find((s) => s.id === id);
    const box = (row: PermRow, slots: number) => {
        const cells: (string | null)[] = Array(slots).fill(null);
        row.actions.forEach((a) => { cells[row.actions.length === 1 ? 0 : Math.min(slots - 1, SLOT[a] ?? 0)] = a; });
        return cells.map((a, i) => (a ? (
            <label key={i} className={`flex cursor-pointer select-none items-center gap-1 whitespace-nowrap ${locked ? 'cursor-default opacity-80' : ''}`}>
                <input type="checkbox" checked={perms.has(`${row.key}.${a}`)} disabled={locked} onChange={() => toggle(`${row.key}.${a}`)} className="h-3.5 w-3.5 accent-[#3b3f8f]" />
                <span className={`font-semibold ${ACT_COLOR[a] || ''}`}>{ACT_LABEL[a] || a}</span>
            </label>
        ) : <span key={i} />));
    };
    const block = (id: string, slots: number, labelW: string, extra = '') => {
        const s = sec(id);
        if (!s) return null;
        return (
            <div className={`border border-slate-500 bg-white ${extra}`}>
                {s.rows.map((r) => (
                    <div key={r.key} className="grid items-center gap-x-2 border-b border-slate-300 px-2 py-[3px] text-[13px] last:border-b-0"
                        style={{ gridTemplateColumns: `${labelW} repeat(${slots}, auto)` }} title={r.hrefs.length ? undefined : 'Saved for later — this window is not built yet'}>
                        <span className={`truncate font-bold ${r.hrefs.length || r.key.startsWith('rpt_') ? 'text-slate-900' : 'text-slate-500'}`}>{r.label}</span>
                        {box(r, slots)}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="h-screen overflow-hidden bg-[#c9c9f9] font-sans text-slate-900">
            <FitStage width={1820} height={900} className="flex flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                    <span className="flex h-5 w-5 items-center justify-center bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                    <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( User Permissions )</span>
                </div>
                <div className="grid min-h-0 flex-1 grid-cols-[690px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-2 gap-y-2 p-2">
                    {/* Column 1 */}
                    <div className="flex min-h-0 flex-col gap-2">
                        <fieldset className="shrink-0 border border-[#9da1d8] px-2 pb-2 pt-0">
                            <legend className="px-1 text-[20px] font-semibold text-[#1f2bd6]">Permissions</legend>
                            <div className="flex items-center gap-3">
                                <span className="text-[15px] text-[#1b1f4b]">User Name</span>
                                <select value={userId} onChange={(e) => setUserId(e.target.value)} className={`${COA_SELECT} h-8 w-[300px] !text-[14px] !font-normal`}>
                                    <option value="">{users ? 'Select any one' : 'Loading…'}</option>
                                    {(users || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                                <label className="flex items-center gap-2 text-[15px]">
                                    <input type="checkbox" checked={allOn} disabled={locked} onChange={toggleAll} className="h-4 w-4 accent-[#3b3f8f]" />Select all
                                </label>
                            </div>
                            <div className="mt-1 h-4 text-[12px] text-slate-600">
                                {!user ? 'Choose the login to set its permissions.'
                                    : user.owner ? `${user.name} is the main admin — always full access.`
                                    : user.id === meId ? 'This is your own login — another admin must change it.'
                                    : user.restricted ? `${user.perms.length} rights saved.` : 'Not set yet — full access until you save.'}
                            </div>
                        </fieldset>
                        {block('masters', 5, '190px')}
                        {block('setup', 5, '190px')}
                    </div>
                    {/* Columns 2–4: entry windows, then reports */}
                    {[['stock', 'reports1'], ['money', 'reports2'], ['adjust', 'reports3']].map(([top, bottom], i) => (
                        <div key={top} className="flex min-h-0 flex-col gap-2">
                            {block(top, 2, i === 1 ? '230px' : '190px')}
                            {block(bottom, 1, '250px')}
                        </div>
                    ))}
                </div>
                <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[#9da1d8] px-3 py-2">
                    <span className="mr-auto text-[12px] text-slate-600">Grey names: windows not built yet — their ticks are kept for later. Reports: kept until the reports are built.</span>
                    <button type="button" onClick={save} disabled={locked || saving || !changed && !!user?.restricted} className={ACTION_BTN}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                    </button>
                    <button type="button" onClick={closeWindow} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                </div>
            </FitStage>
            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
