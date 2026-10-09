"use client";

/*
 * Trade 1.0 — Change Password.
 *
 * User ID (the shop's logins), Old Password, New Password, Confirm password.
 * OK stays disabled until all four are filled; Enter moves to the next box and
 * on Confirm password presses OK. The old password must be right and the two
 * new ones must match. Close asks before closing.
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { ConfirmBox, EDIT, ACTION_BTN, closeTradeWindow } from '@/components/trade/TradeSaleInvoice';
import FitStage from '@/components/trade/FitStage';

type U = { id: number; username: string; name: string };

const IN = `${EDIT} h-8 w-full !text-[13px] !font-normal`;

export default function TradeChangePassword() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Change Password )'; }, []);

    const [users, setUsers] = useState<U[] | null>(null);
    useEffect(() => {
        api.get('v1/users/trade-password/users/').then(({ data }) => setUsers(data)).catch(() => setUsers([]));
    }, []);

    const [userId, setUserId] = useState('');
    const [oldPw, setOldPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirm, setConfirm] = useState('');
    const oldRef = useRef<HTMLInputElement>(null);
    const newRef = useRef<HTMLInputElement>(null);
    const confRef = useRef<HTMLInputElement>(null);
    const userRef = useRef<HTMLSelectElement>(null);
    const ready = !!(userId && oldPw && newPw && confirm);

    const [saving, setSaving] = useState(false);
    const ok = () => {
        if (!ready || saving) return;
        if (newPw !== confirm) { toast.error('New Password and Confirm password do not match.'); confRef.current?.select(); return; }
        const u = users?.find((x) => String(x.id) === userId);
        setAsk({
            msg: `Do you want to change the password of ${u?.username || 'this user'} ?`,
            yes: async () => {
                setSaving(true);
                try {
                    await api.post('v1/users/trade-password/change/', {
                        user: userId, old_password: oldPw, new_password: newPw, confirm_password: confirm,
                    });
                    toast.success(`Password of ${u?.username || 'the user'} changed.`);
                    setUserId(''); setOldPw(''); setNewPw(''); setConfirm('');
                    setTimeout(() => userRef.current?.focus(), 0);
                } catch (err: any) {
                    const d = err?.response?.data;
                    const msg = String(d?.detail || d?.error || (d && Object.values(d)[0]) || 'Could not change the password.');
                    toast.error(msg, { duration: 6000 });
                    if (/old/i.test(msg)) { setOldPw(''); setTimeout(() => oldRef.current?.focus(), 0); }
                    else if (/match|least|same/i.test(msg)) { setTimeout(() => newRef.current?.select(), 0); }
                } finally { setSaving(false); }
            },
        });
    };
    const next = (ref: React.RefObject<HTMLInputElement | null> | null) => (ev: React.KeyboardEvent) => {
        if (ev.key !== 'Enter') return;
        ev.preventDefault();
        if (ref) ref.current?.focus(); else ok();
    };

    const closeWindow = () => setAsk({ msg: 'Do you want to Close the Form ?', yes: closeTradeWindow });
    const lbl = 'whitespace-nowrap text-[14px] text-[#1b1f4b]';

    return (
        <div className="h-screen overflow-hidden bg-[#c9c9f9] font-sans text-slate-900">
            <FitStage width={640} height={370} className="flex flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                    <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Change Password )</span>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
                    <fieldset className="flex-1 rounded-md border border-[#9da1d8] bg-[#d9d9fb] px-5 pb-4 pt-0">
                        <legend className="px-1 text-[22px] font-semibold text-[#1f2bd6]">Change Password</legend>
                        <div className="mt-3 grid grid-cols-[150px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 pr-10">
                            <span className={lbl}>User ID</span>
                            <select ref={userRef} autoFocus value={userId} onChange={(ev) => setUserId(ev.target.value)}
                                onKeyDown={(ev) => { if (ev.key === 'Enter' && userId) { ev.preventDefault(); oldRef.current?.focus(); } }}
                                className={`${IN} !px-1.5`}>
                                <option value="">{users ? 'Select any one' : 'Loading…'}</option>
                                {(users || []).map((u) => <option key={u.id} value={u.id}>{u.username}{u.name ? `  (${u.name})` : ''}</option>)}
                            </select>
                            <span className={lbl}>Old Password</span>
                            <input ref={oldRef} type="password" autoComplete="current-password" value={oldPw} onChange={(ev) => setOldPw(ev.target.value)} onKeyDown={next(newRef)} className={IN} />
                            <span className={lbl}>New Password</span>
                            <input ref={newRef} type="password" autoComplete="new-password" value={newPw} onChange={(ev) => setNewPw(ev.target.value)} onKeyDown={next(confRef)} className={IN} />
                            <span className={lbl}>Confirm password</span>
                            <input ref={confRef} type="password" autoComplete="new-password" value={confirm} onChange={(ev) => setConfirm(ev.target.value)} onKeyDown={next(null)}
                                className={`${IN} ${confirm && newPw && confirm !== newPw ? '!border-red-400 !bg-[#fde8e8]' : ''}`} />
                        </div>
                        {confirm && newPw && confirm !== newPw && <div className="mt-2 pl-[166px] text-[12px] text-red-600">Passwords do not match.</div>}
                    </fieldset>

                    <div className="flex shrink-0 justify-end gap-4 pr-2">
                        <button type="button" onClick={ok} disabled={!ready || saving} className={ACTION_BTN}>
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">O</span>K</>}
                        </button>
                        <button type="button" onClick={closeWindow} className={ACTION_BTN}><span className="underline">C</span>lose</button>
                    </div>
                </div>
            </FitStage>

            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
