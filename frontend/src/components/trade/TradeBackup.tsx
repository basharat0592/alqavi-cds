"use client";

/*
 * Trade 1.0 — Backup Data Base.
 *
 * Destination Drive: pick a drive / folder on this computer (Edge / Chrome ask
 * once; the choice is remembered for next time). Destination Directory: its
 * folders — click selects, Enter or double-click opens, ".." goes back up.
 * Destination Data Base file shows where the backup goes. Backup downloads the
 * whole database from the server (a .sql.gz file that restores with MySQL) and
 * writes it into the chosen folder; browsers without folder access save it to
 * Downloads instead. Cancel asks before closing.
 */

import { useEffect, useRef, useState } from 'react';
import { Folder, FolderOpen, HardDrive, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { ConfirmBox, FIELD, ACTION_BTN, closeTradeWindow } from '@/components/trade/TradeSaleInvoice';
import FitStage from '@/components/trade/FitStage';

type Dir = any; // FileSystemDirectoryHandle

const canPick = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;
const fileName = () => {
    const d = new Date(); const p = (n: number) => String(n).padStart(2, '0');
    return `AlqaviTraders-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.sql.gz`;
};
const mb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// The chosen drive / folder is kept in this browser (IndexedDB) for next time.
const DB = 'aqt-backup', STORE = 'dest';
const idb = (): Promise<IDBDatabase> => new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
const saveDest = async (h: Dir) => {
    try { const db = await idb(); db.transaction(STORE, 'readwrite').objectStore(STORE).put(h, 'root'); } catch { /* optional */ }
};
const loadDest = async (): Promise<Dir | null> => {
    try {
        const db = await idb();
        return await new Promise((res) => {
            const r = db.transaction(STORE).objectStore(STORE).get('root');
            r.onsuccess = () => res(r.result || null); r.onerror = () => res(null);
        });
    } catch { return null; }
};

export default function TradeBackup() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  (BackUp / Restore Data Base)'; }, []);

    const [supported, setSupported] = useState(true);
    const [stack, setStack] = useState<Dir[]>([]);          // root … current folder
    const [needsAllow, setNeedsAllow] = useState(false);     // remembered folder, permission not yet given again
    const [subs, setSubs] = useState<Dir[] | null>(null);
    const [sel, setSel] = useState(-1);                      // -1 = the current folder itself
    const [name] = useState(fileName);
    const listRef = useRef<HTMLDivElement>(null);
    const cur = stack[stack.length - 1] || null;

    const readDir = async (h: Dir) => {
        setSubs(null); setSel(-1);
        const out: Dir[] = [];
        try {
            for await (const e of h.values()) if (e.kind === 'directory' && !e.name.startsWith('$')) out.push(e);
        } catch { /* no access */ }
        setSubs(out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })));
    };
    useEffect(() => {
        if (!canPick()) { setSupported(false); return; }
        loadDest().then(async (h) => {
            if (!h) return;
            setStack([h]);
            const p = await h.queryPermission?.({ mode: 'readwrite' });
            if (p === 'granted') readDir(h); else { setNeedsAllow(true); setSubs([]); }
        });
    }, []);

    const pickDrive = async () => {
        try {
            const h = await (window as any).showDirectoryPicker({ id: 'aqt-backup', mode: 'readwrite', startIn: 'documents' });
            setStack([h]); setNeedsAllow(false); saveDest(h); readDir(h);
            setTimeout(() => listRef.current?.focus(), 0);
        } catch (err: any) {
            if (err?.name !== 'AbortError') toast.error('This folder cannot be used — choose another one.');
        }
    };
    const allow = async () => {
        if (!cur) return false;
        const p = await cur.requestPermission?.({ mode: 'readwrite' });
        if (p !== 'granted') { toast.error('Allow access to the folder to save the backup there.'); return false; }
        setNeedsAllow(false); readDir(stack[stack.length - 1]);
        return true;
    };
    const openSub = (h: Dir) => { setStack((s) => [...s, h]); readDir(h); };
    const goUp = () => { if (stack.length < 2) return; const s = stack.slice(0, -1); setStack(s); readDir(s[s.length - 1]); };

    // rows: [current folder, (..), sub folders…]
    const up = stack.length > 1;
    const rowCount = 1 + (up ? 1 : 0) + (subs?.length || 0);
    const activate = (i: number) => {
        if (i <= 0) return;
        if (up && i === 1) { goUp(); return; }
        const h = subs?.[i - 1 - (up ? 1 : 0)];
        if (h) openSub(h);
    };
    const listKeys = (ev: React.KeyboardEvent) => {
        if (ev.key === 'Enter') { ev.preventDefault(); activate(sel); return; }
        if (ev.key === 'Backspace') { ev.preventDefault(); goUp(); return; }
        if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
        ev.preventDefault();
        setSel((i) => Math.min(rowCount - 1, Math.max(0, (i < 0 ? 0 : i) + (ev.key === 'ArrowDown' ? 1 : -1))));
    };
    useEffect(() => {
        listRef.current?.querySelector(`[data-row="${sel < 0 ? 0 : sel}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [sel]);

    // The destination: the selected sub folder, else the open one.
    const selSub = sel > (up ? 1 : 0) ? subs?.[sel - 1 - (up ? 1 : 0)] : null;
    const destStack = selSub ? [...stack, selSub] : stack;
    const joinPath = (hs: Dir[]) => hs.map((h) => String(h.name).replace(/[\\/]+$/, '')).join('\\');
    const path = joinPath(destStack);
    const destText = supported ? (cur ? `${path}\\${name}` : '') : `Downloads\\${name}`;

    const [busy, setBusy] = useState<string | null>(null);
    const backup = async () => {
        if (busy) return;
        if (supported && !cur) { toast.error('Choose the Destination Drive first.'); pickDrive(); return; }
        if (needsAllow && !(await allow())) return;
        const target = destStack[destStack.length - 1];
        setBusy('Preparing backup…');
        try {
            const { data } = await api.get('v1/users/trade-backup/', {
                responseType: 'blob', timeout: 300000,
                onDownloadProgress: (e) => setBusy(`Downloading… ${mb(e.loaded)}${e.total ? ` of ${mb(e.total)}` : ''}`),
            });
            const blob: Blob = data;
            if (supported && target) {
                setBusy('Saving…');
                const fh = await target.getFileHandle(name, { create: true });
                const w = await fh.createWritable();
                await w.write(blob); await w.close();
            } else {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob); a.download = name; a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 2000);
            }
            setDone(`${supported ? path : 'Downloads'}\\${name}  (${mb(blob.size)})`);
            toast.success(`Backup completed — ${mb(blob.size)}.`, { duration: 6000 });
        } catch (err: any) {
            let msg = 'Backup failed.';
            const d = err?.response?.data;
            if (d instanceof Blob) { try { msg = JSON.parse(await d.text()).detail || msg; } catch { /* keep */ } }
            else if (err?.name === 'NotAllowedError') msg = 'The folder cannot be written — choose another one.';
            toast.error(msg, { duration: 7000 });
        } finally { setBusy(null); }
    };
    const [done, setDone] = useState('');

    const closeWindow = () => setAsk({ msg: 'Do you want to Close the Form ?', yes: closeTradeWindow });
    const lbl = 'text-[13px] text-[#1b1f4b]';
    const row = (i: number, active: boolean) => `flex cursor-pointer items-center gap-2 px-2 py-[3px] text-[13px] ${active ? 'bg-[#2f6fd6] text-white' : 'hover:bg-indigo-50'}`;

    return (
        <div className="h-screen overflow-hidden bg-[#c9c9f9] font-sans text-slate-900">
            <FitStage width={620} height={640} className="flex flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                    <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;(BackUp / Restore Data Base)</span>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                    <div className="shrink-0 rounded-md border border-slate-400 bg-gradient-to-b from-white to-[#e4e4ee] py-1.5 text-center text-[22px] font-bold tracking-wide text-[#1f2bd6] shadow-sm">
                        BACKUP DATA BASE
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-1.5 rounded-md border border-[#9da1d8] bg-[#d9d9fb] px-5 py-3">
                        <span className={lbl}>Destination Drive</span>
                        {supported ? (
                            <button type="button" onClick={pickDrive} disabled={!!busy} title="Choose a drive or folder on this computer"
                                className={`${FIELD} flex h-8 w-full items-center gap-2 border-slate-400 bg-white text-left !text-[13px] !font-normal hover:border-[#2f6fd6]`}>
                                <HardDrive size={15} className="shrink-0 text-slate-500" />
                                <span className="min-w-0 flex-1 truncate">{stack[0] ? stack[0].name : 'Choose drive / folder…'}</span>
                                <span className="text-[11px] text-slate-500">▼</span>
                            </button>
                        ) : (
                            <div className={`${FIELD} flex h-8 w-full items-center border-slate-300 bg-[#ececf3] !text-[12px] !font-normal text-slate-600`}>
                                This browser saves the backup to its Downloads folder.
                            </div>
                        )}

                        <span className={`${lbl} mt-1.5`}>Destination Directory</span>
                        <div ref={listRef} tabIndex={0} onKeyDown={listKeys}
                            className="min-h-0 flex-1 overflow-auto rounded border border-slate-400 bg-white outline-none focus:ring-2 focus:ring-inset focus:ring-[#2f6fd6]">
                            {cur && (
                                <>
                                    <div data-row={0} onClick={() => setSel(-1)} className={row(0, sel <= 0)}>
                                        <FolderOpen size={15} className="shrink-0 text-amber-500" fill={sel <= 0 ? '#fde68a' : '#fef3c7'} />
                                        <span className="truncate">{joinPath(stack) + '\\'}</span>
                                    </div>
                                    {up && (
                                        <div data-row={1} onClick={() => setSel(1)} onDoubleClick={goUp} className={`${row(1, sel === 1)} pl-6`}>
                                            <Folder size={15} className="shrink-0 text-amber-500" fill="#fef3c7" /><span>..</span>
                                        </div>
                                    )}
                                    {(subs || []).map((h, k) => {
                                        const i = k + 1 + (up ? 1 : 0);
                                        return (
                                            <div key={h.name} data-row={i} onClick={() => setSel(i)} onDoubleClick={() => openSub(h)}
                                                title="Click to select · Enter or double-click to open" className={`${row(i, sel === i)} pl-6`}>
                                                <Folder size={15} className="shrink-0 text-amber-500" fill="#fef3c7" /><span className="truncate">{h.name}</span>
                                            </div>
                                        );
                                    })}
                                    {needsAllow && (
                                        <div className="px-3 py-3 text-[12px] text-slate-600">
                                            Last used folder. <button type="button" onClick={allow} className="text-[#2f6fd6] underline">Allow access</button> to see its folders, or just press Backup.
                                        </div>
                                    )}
                                    {!subs && <div className="flex items-center gap-2 px-3 py-3 text-[12px] text-slate-500"><Loader2 size={13} className="animate-spin" /> Reading…</div>}
                                </>
                            )}
                            {!cur && supported && <div className="px-3 py-4 text-[12px] text-slate-500">Choose the Destination Drive above.</div>}
                        </div>

                        <span className={`${lbl} mt-1.5`}>Destination Data Base file</span>
                        <div className={`${FIELD} flex h-9 w-full items-center border-slate-300 bg-[#ececf3] !text-[12px] !font-normal text-slate-700`} title={destText}>
                            <span className="truncate">{destText}</span>
                        </div>
                        <div className="h-4 text-[12px] text-slate-600">
                            {busy ? <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> {busy}</span>
                                : done ? <span className="text-emerald-700">Backup saved: {done}</span> : ''}
                        </div>
                    </div>

                    <div className="flex shrink-0 justify-end gap-6 pr-2">
                        <button type="button" onClick={backup} disabled={!!busy} className={ACTION_BTN}>
                            {busy ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">B</span>ackup</>}
                        </button>
                        <button type="button" onClick={closeWindow} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                    </div>
                </div>
            </FitStage>

            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
