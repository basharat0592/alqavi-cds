"use client";

/*
 * Trade 1.0 — page-wise report viewer (as in the old Al-Qavi Traders program).
 *
 * A report is never one long scrolling list: it is cut into half A4 upright
 * pages (148 × 210 mm — the paper it prints on), each with the shop's header
 * and "Page n of N", and shown one page at a time, fitted to the window.
 * First / Previous / Next / Last (or PageUp / PageDown / Home / End, or the
 * mouse wheel) turn the pages; Zoom enlarges the page. PDF gives the very same
 * pages (there is no printing).
 *
 * The report is a list of sections — each a table (columns, rows, total) with
 * an optional title — so several tables (e.g. Partners, then Investors, then a
 * statement) run on from page to page. Rows are measured, so a page holds as
 * many as really fit; a table carried onto the next page repeats its headings.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, FileDown, Loader2, Sheet, ZoomIn, ZoomOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { saveSheetsPdf } from '@/lib/sheetsPdf';

export type PCol = { h: string; a?: 'l' | 'r'; w?: number };
// t: g group heading (one cell across), s sub-total, p red (cheque pending), t total line
export type PRow = { c: ReactNode[]; t?: null | 'g' | 's' | 'p' | 't'; cls?: string; tip?: string };
export type PSection = { title?: ReactNode; note?: ReactNode; columns: PCol[]; rows: PRow[]; total?: ReactNode[] | null; fs?: string; empty?: string };

const PAGE = { w: 148, h: 210, pad: 6 };   // mm — half A4 upright
const MM = 96 / 25.4;
const GAP_MM = 3;   // space between two sections

type Piece = { si: number; title: 'full' | 'cont' | null; rows: number[]; total: boolean };

const text = (v: ReactNode): string => (v === null || v === undefined || typeof v === 'boolean' ? '' : typeof v === 'object' ? '' : String(v));

/* Column widths and type size from the content, so every page of a table keeps the same
   columns and numbers are never cut: a figure column is as wide as its longest figure,
   a text column (names, details) at most TEXT_MAX characters (longer ones end in "…"),
   a heading wraps onto two lines rather than widening its column. A wide table gets a
   smaller type so it fits the page width. */
const TEXT_MAX = 24, PAD_MM = 2, CHAR_EM = 0.6, PT_MM = 0.3528;
function layout(sec: PSection): { ws: number[]; fs: string } {
    const n = sec.columns.length;
    const sample = sec.rows.length > 600 ? sec.rows.filter((_, i) => i % Math.ceil(sec.rows.length / 600) === 0) : sec.rows;
    const usable = PAGE.w - PAGE.pad * 2 - n * PAD_MM;
    const base = sec.fs ? parseFloat(sec.fs) : n > 7 ? 6 : n > 5 ? 6.5 : 7;
    const MIN_PT = 4.6;
    // Widest content of each column; text columns are allowed at most `cap` characters.
    const estFor = (cap: number) => sec.columns.map((c, k) => {
        const lim = c.a === 'r' ? 18 : cap;
        let m = Math.max(3, ...c.h.split(/\s+/).map((w) => Math.min(lim, w.length)));
        for (const r of sample) if (r.t !== 'g') m = Math.max(m, Math.min(lim, text(r.c[k]).length));
        if (sec.total) m = Math.max(m, Math.min(lim, text(sec.total[k]).length));
        return m + 1;
    });
    // A wide table: long text (names, details) gives way first, so dates, codes and
    // figures stay whole; only then does the type get smaller.
    let est = estFor(TEXT_MAX), fit = 0;
    for (const cap of [TEXT_MAX, 20, 17, 14, 12]) {
        est = estFor(cap);
        fit = usable / (est.reduce((a, b) => a + b, 0) * CHAR_EM * PT_MM);
        if (fit >= Math.min(base, 5.2)) break;
    }
    const pt = Math.max(MIN_PT, Math.min(base, fit));
    // Fixed widths (w) when the caller gives them; else from the content.
    const raw = sec.columns.every((c) => c.w) ? sec.columns.map((c) => c.w!) : est.map((e) => e * CHAR_EM * PT_MM * pt + PAD_MM);
    const sum = raw.reduce((a, b) => a + b, 0) || n;
    return { ws: raw.map((x) => (x / sum) * 100), fs: `${pt.toFixed(2)}pt` };
}

function SectionTable({ sec, si, rows, withTotal, measure }: { sec: PSection; si: number; rows: number[]; withTotal: boolean; measure?: boolean }) {
    const { ws, fs } = useMemo(() => layout(sec), [sec]);
    const cell = 'overflow-hidden text-ellipsis whitespace-nowrap border border-slate-300 px-[0.9mm] py-[0.45mm] tabular-nums';
    return (
        <table className="w-full table-fixed border-collapse" style={{ fontSize: fs, color: '#111' }}>
            <colgroup>{ws.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
            <thead data-m={measure ? `h${si}` : undefined}>
                <tr>{sec.columns.map((c, i) => <th key={i} className={`overflow-hidden border border-slate-500 bg-[#ececec] px-[0.9mm] py-[0.6mm] align-bottom font-bold leading-[1.15] ${c.a === 'r' ? 'text-right' : 'text-left'}`}>{c.h}</th>)}</tr>
            </thead>
            <tbody>
                {rows.map((ri) => {
                    const r = sec.rows[ri];
                    if (!r) return null;   // pages from the data before (measured again right after)
                    if (r.t === 'g') return (
                        <tr key={ri} data-m={measure ? `r${si}_${ri}` : undefined}>
                            <td colSpan={sec.columns.length} className={`${cell} bg-[#f2f2fa] font-bold text-[#1f2bd6] ${r.cls || ''}`}>{r.c[0]}</td>
                        </tr>
                    );
                    return (
                        <tr key={ri} data-m={measure ? `r${si}_${ri}` : undefined} title={r.tip}
                            className={`${r.t === 's' ? 'bg-[#fafafa] font-bold' : r.t === 't' ? 'bg-[#e8e8f4] font-bold' : r.t === 'p' ? 'font-semibold text-red-600' : ''} ${r.cls || ''}`}>
                            {sec.columns.map((c, k) => <td key={k} title={text(r.c[k]) || undefined} className={`${cell} ${c.a === 'r' ? 'text-right' : ''}`}>{r.c[k]}</td>)}
                        </tr>
                    );
                })}
                {withTotal && sec.total && (
                    <tr data-m={measure ? `x${si}` : undefined} className="bg-[#e8e8f4] font-bold">
                        {sec.columns.map((c, k) => <td key={k} className={`${cell} border-slate-500 ${c.a === 'r' ? 'text-right' : ''}`}>{sec.total![k]}</td>)}
                    </tr>
                )}
                {!sec.rows.length && !measure && (
                    <tr><td colSpan={sec.columns.length} className={`${cell} py-[2mm] text-center text-slate-500`}>{sec.empty || 'Nothing to show.'}</td></tr>
                )}
            </tbody>
        </table>
    );
}

function Head({ title, subtitle, page, pages }: { title: ReactNode; subtitle?: ReactNode; page: number; pages: number }) {
    return (
        <div className="flex items-end justify-between" style={{ borderBottom: '0.4mm solid #222', paddingBottom: '1.6mm', marginBottom: '2.2mm', color: '#111' }}>
            <div className="min-w-0">
                <div style={{ fontSize: '11pt', fontWeight: 800 }}>AL-QAVI TRADERS</div>
                <div style={{ fontSize: '9pt', fontWeight: 700, color: '#1f2bd6' }}>{title}</div>
                {subtitle && <div style={{ fontSize: '6.3pt', color: '#444' }}>{subtitle}</div>}
            </div>
            <div style={{ fontSize: '6.3pt', textAlign: 'right', color: '#444', flexShrink: 0, marginLeft: '3mm' }}>
                <div style={{ fontWeight: 700, color: '#111' }}>Page {page} of {pages}</div>
                <div>Printed {new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</div>
            </div>
        </div>
    );
}

const secTitle = (sec: PSection, cont: boolean) => (
    <div style={{ fontSize: '8pt', fontWeight: 800, margin: '0 0 1mm', color: '#111' }}>
        {sec.title}{cont ? <span style={{ fontWeight: 600, color: '#666' }}> (continued)</span> : null}
        {!cont && sec.note ? <div style={{ fontSize: '6.2pt', fontWeight: 500, color: '#555' }}>{sec.note}</div> : null}
    </div>
);

function Page({ title, subtitle, sections, pieces, page, pages, className }: {
    title: ReactNode; subtitle?: ReactNode; sections: PSection[]; pieces: Piece[]; page: number; pages: number; className?: string;
}) {
    return (
        <div className={`${className || ''} flex flex-col bg-white`} style={{ width: `${PAGE.w}mm`, height: `${PAGE.h}mm`, padding: `${PAGE.pad}mm`, boxSizing: 'border-box' }}>
            <Head title={title} subtitle={subtitle} page={page} pages={pages} />
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {pieces.map((p, i) => {
                    const sec = sections[p.si];
                    if (!sec) return null;
                    return (
                        <div key={i} style={{ marginBottom: `${GAP_MM}mm` }}>
                            {p.title && sec.title ? secTitle(sec, p.title === 'cont') : null}
                            <SectionTable sec={sec} si={p.si} rows={p.rows} withTotal={p.total} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function PagedReport({ title, subtitle, sections, version = '', file, onExport, extra, loading, className }: {
    title: ReactNode; subtitle?: ReactNode; sections: PSection[];
    /** Changes whenever the report's data changes (the pages are measured again). */
    version?: string;
    file?: string; onExport?: () => void; extra?: ReactNode; loading?: boolean; className?: string;
}) {
    // ── cut into pages: measure every heading / row once, then fill each page ──
    const mRef = useRef<HTMLDivElement>(null);
    const [pages, setPages] = useState<Piece[][]>([[]]);
    const sig = `${version}|${sections.map((s) => `${s.rows.length}:${s.columns.length}:${s.total ? 1 : 0}`).join(',')}`;
    const [tick, setTick] = useState(0);
    useEffect(() => { (document as any).fonts?.ready?.then(() => setTick((t) => t + 1)); }, []);
    useLayoutEffect(() => {
        const el = mRef.current;
        if (!el) return;
        // Every measured part's height, read in one pass (a long ledger has thousands of rows).
        const hs = new Map<string, number>();
        el.querySelectorAll<HTMLElement>('[data-m]').forEach((x) => hs.set(x.dataset.m!, x.getBoundingClientRect().height));
        const h = (k: string) => hs.get(k) || 0;
        // The page body: the page less its margins, the header and the space under it (2.2 mm), and 1 mm to spare.
        const avail = (PAGE.h - PAGE.pad * 2 - 2.2 - 1) * MM - h('head');
        const gap = GAP_MM * MM;
        const out: Piece[][] = [[]];
        let used = 0;
        const page = () => out[out.length - 1];
        const newPage = () => { out.push([]); used = 0; };
        sections.forEach((sec, si) => {
            if (used > 0) used += gap;
            const tH = sec.title ? h(`t${si}`) : 0;
            const hH = h(`h${si}`);
            const xH = sec.total ? h(`x${si}`) : 0;
            const rH = sec.rows.map((_, ri) => h(`r${si}_${ri}`));
            let piece: Piece = { si, title: null, rows: [], total: false };
            const start = (kind: 'full' | 'cont' | null, nextH: number) => {
                const need = (kind ? tH : 0) + hH;
                if (used > 0 && used + need + nextH > avail) newPage();
                piece = { si, title: kind, rows: [], total: false };
                page().push(piece);
                used += need;
            };
            start(sec.title ? 'full' : null, rH[0] ?? (xH || h(`e${si}`)));
            if (!sec.rows.length && !sec.total) used += h(`e${si}`);
            rH.forEach((rh, ri) => {
                if (used + rh > avail && piece.rows.length) start(sec.title ? 'cont' : null, rh);
                piece.rows.push(ri);
                used += rh;
            });
            if (sec.total) {
                if (used + xH > avail && (piece.rows.length || piece.total)) start(sec.title ? 'cont' : null, xH);
                piece.total = true;
                used += xH;
            }
        });
        const next = out.filter((p, i) => p.length || i === 0);
        setPages((cur) => (JSON.stringify(cur) === JSON.stringify(next) ? cur : next));
    }, [sig, tick]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── which page, zoom, fit to the window ──
    const [cur, setCur] = useState(0);
    useEffect(() => { setCur(0); }, [version]);
    const n = pages.length;
    const at = Math.min(cur, n - 1);
    const go = (i: number) => setCur(Math.max(0, Math.min(n - 1, i)));
    const [zoom, setZoom] = useState(1);   // 1 = the whole page fits
    const stageRef = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState({ w: 800, h: 600 });
    useLayoutEffect(() => {
        const el = stageRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
        ro.observe(el);
        setBox({ w: el.clientWidth, h: el.clientHeight });
        return () => ro.disconnect();
    }, []);
    const pw = PAGE.w * MM, ph = PAGE.h * MM;
    const fit = Math.max(0.2, Math.min((box.w - 24) / pw, (box.h - 24) / ph));
    const scale = fit * zoom;
    useEffect(() => {
        const k = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
            if (e.key === 'PageDown' || e.key === 'ArrowRight') { e.preventDefault(); setCur((c) => Math.min(n - 1, c + 1)); }
            else if (e.key === 'PageUp' || e.key === 'ArrowLeft') { e.preventDefault(); setCur((c) => Math.max(0, c - 1)); }
            else if (e.key === 'Home') { e.preventDefault(); setCur(0); }
            else if (e.key === 'End') { e.preventDefault(); setCur(n - 1); }
        };
        window.addEventListener('keydown', k);
        return () => window.removeEventListener('keydown', k);
    }, [n]);
    const lastWheel = useRef(0);
    const onWheel = (e: React.WheelEvent) => {
        if (zoom > 1) return;   // zoomed in: the wheel moves over the page
        const now = Date.now();
        if (now - lastWheel.current < 280 || Math.abs(e.deltaY) < 8) return;
        lastWheel.current = now;
        go(at + (e.deltaY > 0 ? 1 : -1));
    };

    // ── PDF: every page, exactly as shown (there is no printing) ──
    const sheetsRef = useRef<HTMLDivElement>(null);
    const [printing, setPrinting] = useState<false | 'pdf'>(false);
    const print = async (save: string) => {
        if (printing) return;
        setPrinting('pdf');
        try {
            await new Promise((r) => setTimeout(r, 350));   // let the pages render
            await saveSheetsPdf(Array.from(sheetsRef.current?.querySelectorAll<HTMLElement>('.pr-page') || []), save, 3);
        } catch { toast.error('Could not make the PDF.'); }
        finally { setPrinting(false); }
    };

    const btn = 'flex h-8 items-center gap-1 border border-slate-300 bg-white px-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40';
    return (
        <div className={`flex min-h-0 flex-1 flex-col ${className || ''}`}>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-slate-300 bg-white px-3 py-1.5">
                <button type="button" onClick={() => go(0)} disabled={at === 0} title="First page (Home)" className={btn}><ChevronFirst size={15} /></button>
                <button type="button" onClick={() => go(at - 1)} disabled={at === 0} title="Previous page (PageUp)" className={btn}><ChevronLeft size={15} /> Prev</button>
                <span className="flex items-center gap-1 px-1 text-[13px] font-bold text-slate-700">
                    Page
                    <input value={at + 1} onChange={(e) => { const v = parseInt(e.target.value, 10); if (v) go(v - 1); }} inputMode="numeric" aria-label="Page"
                        className="h-8 w-12 border border-slate-300 text-center tabular-nums" />
                    of {n}
                </span>
                <button type="button" onClick={() => go(at + 1)} disabled={at >= n - 1} title="Next page (PageDown)" className={btn}>Next <ChevronRight size={15} /></button>
                <button type="button" onClick={() => go(n - 1)} disabled={at >= n - 1} title="Last page (End)" className={btn}><ChevronLast size={15} /></button>
                <span className="mx-1 h-6 w-px bg-slate-200" />
                <button type="button" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} disabled={zoom <= 1} title="Zoom out" className={btn}><ZoomOut size={15} /></button>
                <button type="button" onClick={() => setZoom(1)} title="Whole page" className={`${btn} tabular-nums`}>{zoom === 1 ? 'Whole page' : `${Math.round(zoom * 100)}%`}</button>
                <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} title="Zoom in" className={btn}><ZoomIn size={15} /></button>
                <span className="flex-1" />
                {extra}
                <button type="button" onClick={() => print(file || 'report.pdf')} disabled={!!printing || loading} className={btn}>
                    {printing === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} PDF
                </button>
                {onExport && <button type="button" onClick={onExport} disabled={loading} className={btn}><Sheet size={14} /> Export</button>}
            </div>
            <div ref={stageRef} onWheel={onWheel}
                className={`relative min-h-0 flex-1 bg-slate-300 ${zoom > 1 ? 'overflow-auto' : 'overflow-hidden'}`}>
                {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-300/60 text-[14px] font-semibold text-slate-700"><Loader2 size={18} className="mr-2 animate-spin" /> Loading…</div>}
                <div style={{ width: Math.max(pw * scale + 24, box.w), height: Math.max(ph * scale + 24, box.h) }} className="flex items-start justify-center">
                    <div style={{ width: pw * scale, height: ph * scale, marginTop: 12 }} className="shadow-xl">
                        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: pw, height: ph }}>
                            <Page title={title} subtitle={subtitle} sections={sections} pieces={pages[at] || []} page={at + 1} pages={n} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Measuring copy (off screen): the height of every heading and row. */}
            <div ref={mRef} aria-hidden style={{ position: 'fixed', left: -30000, top: 0, width: `${PAGE.w - PAGE.pad * 2}mm`, visibility: 'hidden' }}>
                <div data-m="head"><Head title={title} subtitle={subtitle} page={1} pages={1} /></div>
                {sections.map((sec, si) => (
                    <div key={si}>
                        {sec.title && <div data-m={`t${si}`}>{secTitle(sec, false)}</div>}
                        <SectionTable sec={sec} si={si} rows={sec.rows.map((_, i) => i)} withTotal measure />
                        <table className="w-full"><tbody><tr data-m={`e${si}`}><td style={{ fontSize: '7pt', padding: '2mm 0' }}>{sec.empty || 'Nothing to show.'}</td></tr></tbody></table>
                    </div>
                ))}
            </div>
            {/* Every page, for the PDF */}
            {printing && (
                <div ref={sheetsRef} aria-hidden style={{ position: 'fixed', left: -60000, top: 0 }}>
                    {pages.map((ps, i) => <Page key={i} className="pr-page" title={title} subtitle={subtitle} sections={sections} pieces={ps} page={i + 1} pages={n} />)}
                </div>
            )}
        </div>
    );
}
