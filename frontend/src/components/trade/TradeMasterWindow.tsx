"use client";

/*
 * Trade 1.0 setup windows that share one layout — Staff Detail (File › Sale
 * Man), New Company (Product › Companies) and New Product Category (Product ›
 * Product Category).
 *
 * Code (next number, read only) + the record's fields. Save stays disabled
 * until the required fields are filled; Enter moves to the next box and on the
 * last one saves. View lists every record under the form (Total Records,
 * Export, Add New, Update, Delete): click a row (or ↑ / ↓) to bring it into
 * the form, change it, Update. Cancel asks before closing.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import {
    ConfirmBox, ReadBox, FIELD, EDIT, ACTION_BTN, closeTradeWindow, downloadXlsx,
} from '@/components/trade/TradeSaleInvoice';
import FitStage from '@/components/trade/FitStage';

export type MasterField = {
    key: string; label: string; required?: boolean; max?: number; half?: boolean;
    options?: { value: string; label: string }[]; placeholder?: string; digits?: boolean;
};
export type MasterCol = { h: string; key: string; w: number; fmt?: (v: any) => string };

export type MasterConfig = {
    window: string;                 // title bar: ( Staff Detail )
    legend?: string;                // blue group title: New Company
    entity: string;                 // messages: Salesman / Company / Product Type
    codeLabel: string;
    fields: MasterField[];
    cols: MasterCol[];
    url: string;                    // list / create; `${url}${id}/` patch / delete
    nextCodeUrl: string;
    params?: Record<string, string>;   // sent with every request (e.g. ?level=main)
    exportName: string;
    stage: { width: number; height: number };
};

const errMsg = (err: any, fallback: string) => {
    const d = err?.response?.data;
    if (!d) return fallback;
    if (typeof d === 'string') return d;
    return String(d.detail || d.error || d.name || Object.values(d)[0] || fallback);
};

async function loadAll(url: string, extra?: Record<string, string>) {
    const out: any[] = [];
    for (let page = 1; page <= 50; page++) {
        const { data } = await api.get(url, { params: { ...extra, page, page_size: 100 } });
        if (Array.isArray(data)) return data;
        out.push(...(data.results || []));
        if (!data.next) break;
    }
    return out;
}

export default function TradeMasterWindow({ cfg }: { cfg: MasterConfig }) {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    useEffect(() => { document.title = `AL-QAVI TRADERS  Trade 1.0  ( ${cfg.window} )`; }, [cfg.window]);

    const empty = useMemo(() => Object.fromEntries(cfg.fields.map((f) => [f.key, ''])), [cfg.fields]);
    const [form, setForm] = useState<Record<string, string>>(empty);
    const [nextCode, setNextCode] = useState('');
    const [rows, setRows] = useState<any[] | null>(null);   // null = not viewing
    const [sel, setSel] = useState<any | null>(null);
    const [busy, setBusy] = useState(false);
    const refs = useRef<(HTMLInputElement | HTMLSelectElement | null)[]>([]);
    const gridRef = useRef<HTMLDivElement>(null);

    const loadCode = () => api.get(cfg.nextCodeUrl, { params: cfg.params }).then(({ data }) => setNextCode(String(data.code ?? ''))).catch(() => setNextCode(''));
    useEffect(() => { loadCode(); setTimeout(() => refs.current[0]?.focus(), 50); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const sorted = useMemo(() => (rows ? [...rows].sort((a, b) => (Number(a.code) || 1e9) - (Number(b.code) || 1e9)) : []), [rows]);
    const reload = async () => {
        try { setRows(await loadAll(cfg.url, cfg.params)); } catch { toast.error('Could not load the list.'); setRows((r) => r || []); }
    };
    const valueOf = (r: any, k: string) => String(r?.[k] ?? '');
    const pick = (r: any) => { setSel(r); setForm(Object.fromEntries(cfg.fields.map((f) => [f.key, valueOf(r, f.key)]))); };
    const addNew = () => {
        setSel(null); setForm(empty); setRows(null); loadCode();
        setTimeout(() => refs.current[0]?.focus(), 0);
    };
    const view = async () => { setSel(null); setForm(empty); await reload(); setTimeout(() => gridRef.current?.focus(), 0); };

    const set = (k: string, digits?: boolean) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const v = digits ? e.target.value.replace(/[^\d\- +]/g, '') : e.target.value;
        setForm((f) => ({ ...f, [k]: v }));
    };
    const complete = cfg.fields.every((f) => !f.required || form[f.key].trim());
    const changed = !!sel && cfg.fields.some((f) => form[f.key].trim() !== valueOf(sel, f.key).trim());
    const body = () => Object.fromEntries(cfg.fields.map((f) => [f.key, form[f.key].trim()]));

    const save = async () => {
        if (busy || sel || !complete) return;
        setBusy(true);
        try {
            const { data } = await api.post(cfg.url, body(), { params: cfg.params });
            toast.success(`${cfg.entity} ${data.code ?? ''} — ${data.name} saved.`);
            setForm(empty); loadCode();
            if (rows) await reload();
            setTimeout(() => refs.current[0]?.focus(), 0);
        } catch (err) { toast.error(errMsg(err, `Could not save the ${cfg.entity.toLowerCase()}.`), { duration: 6000 }); }
        finally { setBusy(false); }
    };
    const update = async () => {
        if (busy || !sel || !complete || !changed) return;
        setBusy(true);
        try {
            const { data } = await api.patch(`${cfg.url}${sel.id}/`, body(), { params: cfg.params });
            toast.success(`${cfg.entity} ${data.code ?? ''} — ${data.name} updated.`);
            await reload(); pick(data);
        } catch (err) { toast.error(errMsg(err, `Could not update the ${cfg.entity.toLowerCase()}.`), { duration: 6000 }); }
        finally { setBusy(false); }
    };
    const remove = () => {
        if (!sel || busy) return;
        setAsk({
            msg: `Do you want to Delete ${sel.name} ?`,
            yes: async () => {
                setBusy(true);
                try {
                    await api.delete(`${cfg.url}${sel.id}/`, { params: cfg.params });
                    toast.success(`${cfg.entity} ${sel.code ?? ''} — ${sel.name} deleted.`);
                    setSel(null); setForm(empty); await reload();
                } catch (err) { toast.error(errMsg(err, `Could not delete the ${cfg.entity.toLowerCase()}.`), { duration: 7000 }); }
                finally { setBusy(false); }
            },
        });
    };
    const exportRows = () => downloadXlsx(cfg.exportName, cfg.exportName, [cfg.codeLabel, ...cfg.cols.filter((c) => c.key !== 'code').map((c) => c.h)],
        sorted.map((r) => [r.code ?? '', ...cfg.cols.filter((c) => c.key !== 'code').map((c) => (c.fmt ? c.fmt(r[c.key]) : r[c.key] ?? ''))]));

    const enter = (i: number) => (e: React.KeyboardEvent) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const next = refs.current[i + 1];
        if (next) next.focus();
        else if (sel) update();
        else save();
    };
    const gridKeys = (e: React.KeyboardEvent) => {
        if (!sorted.length) return;
        const i = sel ? sorted.findIndex((r) => r.id === sel.id) : -1;
        if (e.key === 'Enter') { e.preventDefault(); if (i < 0) pick(sorted[0]); setTimeout(() => refs.current[0]?.focus(), 0); return; }
        if (e.key === 'Delete') { e.preventDefault(); remove(); return; }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        pick(sorted[Math.min(sorted.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))]);
    };
    useEffect(() => {
        if (sel) gridRef.current?.querySelector(`[data-id="${sel.id}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [sel]);

    const closeWindow = () => setAsk({
        msg: (sel ? changed : cfg.fields.some((f) => form[f.key].trim())) ? 'The changes are not saved. Do you want to Close the Form ?' : 'Do you want to Close the Form ?',
        yes: closeTradeWindow,
    });

    const lbl = 'whitespace-nowrap text-[13px] text-[#1b1f4b]';
    const IN = `${EDIT} h-8 w-full !text-[13px] !font-normal`;
    const anyHalf = cfg.fields.some((f) => f.half);
    let idx = -1;
    const fieldEl = (f: MasterField) => {
        const i = ++idx;
        const ref = (el: HTMLInputElement | HTMLSelectElement | null) => { refs.current[i] = el; };
        return f.options ? (
            <select ref={ref} value={form[f.key]} onChange={set(f.key)} onKeyDown={enter(i)} className={`${IN} !px-1.5`}>
                <option value="">Select any One</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        ) : (
            <input ref={ref} value={form[f.key]} onChange={set(f.key, f.digits)} onKeyDown={enter(i)} maxLength={f.max} placeholder={f.placeholder}
                className={IN} />
        );
    };

    return (
        <div className="h-screen overflow-hidden bg-[#c9c9f9] font-sans text-slate-900">
            <FitStage width={cfg.stage.width} height={cfg.stage.height} className="flex flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                    <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( {cfg.window} ){sel ? `  —  ${sel.name}` : ''}</span>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
                    <fieldset className={`shrink-0 rounded-md border border-[#9da1d8] bg-[#d9d9fb] px-5 pb-3 ${cfg.legend ? 'pt-0' : 'pt-3'}`}>
                        {cfg.legend && <legend className="px-1 text-[20px] font-semibold text-[#1f2bd6]">{cfg.legend}</legend>}
                        <div className={`grid items-center gap-x-4 gap-y-2.5 ${anyHalf ? 'grid-cols-[150px_minmax(0,1fr)_150px_minmax(0,1fr)]' : 'grid-cols-[170px_minmax(0,520px)_1fr]'}`}>
                            <span className={lbl}>{cfg.codeLabel}</span>
                            <div className={`${FIELD} flex h-8 w-[180px] items-center justify-center border-slate-400 bg-[#e1e1e8] !text-[14px] !font-semibold text-[#1f2bd6]`}>
                                {sel ? sel.code ?? '' : nextCode}
                            </div>
                            <span className={anyHalf ? 'col-span-2' : ''} />
                            {(() => {
                                let run = 0;   // two consecutive `half` fields share one row
                                return cfg.fields.map((f) => {
                                    run = f.half ? run + 1 : 0;
                                    return (
                                        <FieldCell key={f.key} f={f} anyHalf={anyHalf} second={!!f.half && run % 2 === 0} lbl={lbl}>
                                            {fieldEl(f)}
                                        </FieldCell>
                                    );
                                });
                            })()}
                        </div>
                    </fieldset>

                    {/* List (View) */}
                    <div ref={gridRef} tabIndex={0} onKeyDown={gridKeys}
                        className="min-h-0 flex-1 overflow-auto rounded border border-slate-500 bg-[#8a8a8a] outline-none focus:ring-2 focus:ring-inset focus:ring-[#2f5bd3]">
                        {rows && (
                            <table className="table-fixed border-collapse bg-white text-[12.5px]" style={{ width: `${cfg.cols.reduce((s, c) => s + c.w, 0)}%` }}>
                                <colgroup>{cfg.cols.map((c) => <col key={c.key} style={{ width: `${(c.w / cfg.cols.reduce((s, x) => s + x.w, 0)) * 100}%` }} />)}</colgroup>
                                <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                    <tr>{cfg.cols.map((c) => <th key={c.key} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1 font-semibold">{c.h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {sorted.map((r) => (
                                        <tr key={r.id} data-id={r.id} onClick={() => pick(r)} onDoubleClick={() => { pick(r); setTimeout(() => refs.current[0]?.focus(), 0); }}
                                            title="Click to select · Enter or double-click to edit"
                                            className={`cursor-pointer tabular-nums ${sel?.id === r.id ? 'bg-[#7dfa7d]' : 'hover:bg-indigo-50'}`}>
                                            {cfg.cols.map((c) => {
                                                const v = c.fmt ? c.fmt(r[c.key]) : String(r[c.key] ?? '');
                                                return <td key={c.key} title={v} className="overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-[3px]">{v}</td>;
                                            })}
                                        </tr>
                                    ))}
                                    {!sorted.length && <tr><td colSpan={cfg.cols.length} className="px-3 py-4 text-center text-slate-500">No records.</td></tr>}
                                </tbody>
                            </table>
                        )}
                        {!rows && <div className="flex h-full items-center justify-center text-[12.5px] text-white/80">Press View to see every {cfg.entity.toLowerCase()}.</div>}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-3">
                        {rows && (
                            <>
                                <ReadBox value={<span className="text-[#1f2bd6]">Total Records = {rows.length}</span>} className="h-8 w-[190px] !text-[12.5px] !font-normal" />
                                <button type="button" onClick={exportRows} disabled={!rows.length} className={`${ACTION_BTN} !h-8 !text-[13px]`}>Export</button>
                            </>
                        )}
                        <span className="flex-1" />
                        {rows ? (
                            <>
                                <button type="button" onClick={addNew} disabled={busy} className={`${ACTION_BTN} !h-8 !text-[13px]`}><span><span className="underline">A</span>dd New</span></button>
                                <button type="button" onClick={update} disabled={busy || !sel || !complete || !changed} className={`${ACTION_BTN} !h-8 !text-[13px]`}>
                                    {busy && sel ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">U</span>pdate</>}
                                </button>
                                <button type="button" onClick={remove} disabled={busy || !sel} className={`${ACTION_BTN} !h-8 !text-[13px]`}><span className="underline">D</span>elete</button>
                            </>
                        ) : (
                            <>
                                <button type="button" onClick={save} disabled={busy || !complete} className={`${ACTION_BTN} !h-8 !text-[13px]`}>
                                    {busy ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                                </button>
                                <button type="button" onClick={view} disabled={busy} className={`${ACTION_BTN} !h-8 !text-[13px]`}><span className="underline">V</span>iew</button>
                            </>
                        )}
                        <button type="button" onClick={closeWindow} disabled={busy} className={`${ACTION_BTN} !h-8 !text-[13px]`}><span className="underline">C</span>ancel</button>
                    </div>
                </div>
            </FitStage>

            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}

function FieldCell({ f, anyHalf, second, lbl, children }: {
    f: MasterField; anyHalf: boolean; second: boolean; lbl: string; children: React.ReactNode;
}) {
    if (!anyHalf) return <><span className={lbl}>{f.label}</span>{children}<span /></>;
    if (f.half) return <><span className={`${lbl} ${second ? 'text-right' : ''}`}>{f.label}</span>{children}</>;
    // Full-width field (name) or a lone short one (status).
    return f.options
        ? <><span className={lbl}>{f.label}</span>{children}<span className="col-span-2" /></>
        : <><span className={lbl}>{f.label}</span><div className="col-span-3">{children}</div></>;
}
