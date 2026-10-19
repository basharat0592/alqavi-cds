/*
 * Print what is on screen (a Trade window) or one element (a printable page).
 * Each page is captured as a picture, so nothing can shift or be cut off.
 * Every print in the system goes on the shop's paper: HALF A4 UPRIGHT
 * (an A4 sheet cut across, stood up — 148 × 210 mm), read top to bottom.
 * The picture fills the page width; a long one runs onto more pages. Only an
 * invoice where another paper is chosen on purpose prints on that paper.
 * Saving a PDF still makes A4 pages. Elements marked `data-no-print` (the
 * print button itself) are left out.
 */
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';

/* Turn a picture a quarter turn clockwise (its top ends up on the right). */
async function rotateCw(src: string, quality: number): Promise<string> {
    const img = await loadImage(src);
    const c = document.createElement('canvas');
    c.width = img.naturalHeight; c.height = img.naturalWidth;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.translate(c.width, 0); ctx.rotate(Math.PI / 2); ctx.drawImage(img, 0, 0);
    return c.toDataURL('image/jpeg', quality);
}
function loadImage(src: string) {
    return new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
const toBlobUrl = async (src: string) => URL.createObjectURL(await (await fetch(src)).blob());

/** The paper of every print: half A4 stood up. */
export const HALF_A4 = { w: 148, h: 210 };
export type Paper = { w: number; h: number };

/**
 * Print page pictures (JPEG data URLs), one per sheet, fitted to the printer's
 * paper. `@page { size: auto }` lets the print dialog's paper size and layout
 * decide the page; each picture is drawn upright and turned, and CSS shows the
 * one whose shape matches the page.
 */
export async function printImages(pages: string[], quality = 0.92, paper: Paper = HALF_A4, turn = false) {
    if (!pages.length) throw new Error('Nothing to print.');
    const urls: string[] = [];
    const body: string[] = [];
    for (const src of pages) {
        const img = await loadImage(src);
        const wide = img.naturalWidth > img.naturalHeight;
        // Always upright, top to bottom — turned only for an invoice on sideways paper.
        const up = await toBlobUrl(src), turned = turn ? await toBlobUrl(await rotateCw(src, quality)) : up;
        urls.push(up, turned);
        body.push(`<div class="pg ${wide ? 'wide' : 'tall'}"><img class="u" src="${up}"><img class="r" src="${turned}"></div>`);
    }
    // The paper is sent to the printer as that exact size (148 × 210 mm).
    const page = `@page { size: ${paper.w}mm ${paper.h}mm; margin: 0; }`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${page}
html, body { margin: 0; padding: 0; background: #fff; }
.pg { width: 100%; height: ${paper.h}mm; display: flex; align-items: center; justify-content: center; overflow: hidden; break-after: page; page-break-after: always; }
.pg:last-child { break-after: auto; page-break-after: auto; }
.pg img { max-width: 100%; max-height: 100%; display: block; }
.pg .r { display: none; }
${turn ? '' : '.pg { align-items: flex-start; padding: 4mm; box-sizing: border-box; }'}
${turn ? `@media (orientation: landscape) { .tall .u { display: none; } .tall .r { display: block; } }
@media (orientation: portrait) { .wide .u { display: none; } .wide .r { display: block; } }` : ''}
</style></head><body>${body.join('')}</body></html>`;
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0';
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    doc.open(); doc.write(html); doc.close();
    const imgs = Array.from(doc.images);
    await Promise.all(imgs.map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = () => r(null); }))));
    await new Promise((r) => setTimeout(r, 200));
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => { frame.remove(); urls.forEach((u) => URL.revokeObjectURL(u)); }, 10 * 60 * 1000);
}

const skip = (n: HTMLElement) => !(n instanceof HTMLElement && n.dataset && n.dataset.noPrint !== undefined);

async function captureWindow(el?: HTMLElement) {
    const target = el || document.body;
    await (document as any).fonts?.ready;
    const w = target.scrollWidth || target.offsetWidth, h = target.scrollHeight || target.offsetHeight;
    const img = await toJpeg(target, { quality: 0.92, pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: false, filter: skip as any });
    return { img, w, h };
}

/* A picture cut into half-A4 pages: full page width (less a margin), as many pages as it is long. */
async function slicePages(src: string, quality: number, paper: Paper = HALF_A4, marginMm = 5) {
    const img = await loadImage(src);
    const ratio = (paper.h - 2 * marginMm) / (paper.w - 2 * marginMm);   // page height per unit of width
    const sliceH = Math.max(1, Math.floor(img.naturalWidth * ratio));
    if (img.naturalHeight <= sliceH * 1.02) return [src];
    const out: string[] = [];
    for (let y = 0; y < img.naturalHeight; y += sliceH) {
        const h = Math.min(sliceH, img.naturalHeight - y);
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = h;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, y, img.naturalWidth, h, 0, 0, img.naturalWidth, h);
        out.push(c.toDataURL('image/jpeg', quality));
    }
    return out;
}

/** Capture `el` (default: the whole window) onto half A4 pages. */
export async function makeWindowPdf(el?: HTMLElement) {
    const { img } = await captureWindow(el);
    return picturesPdf(await slicePages(img, 0.92));
}

/* Pictures onto half A4 PDF pages: each fitted to the page width, at the top. */
async function picturesPdf(imgs: string[], paper: Paper = HALF_A4, marginMm = 0) {
    const pdf = new jsPDF({ unit: 'mm', format: [paper.w, paper.h], orientation: 'portrait', compress: true });
    for (let i = 0; i < imgs.length; i++) {
        const im = await loadImage(imgs[i]);
        if (i) pdf.addPage([paper.w, paper.h], 'portrait');
        const s = Math.min((paper.w - 2 * marginMm) / im.naturalWidth, (paper.h - 2 * marginMm) / im.naturalHeight);
        pdf.addImage(imgs[i], 'JPEG', (paper.w - im.naturalWidth * s) / 2, marginMm, im.naturalWidth * s, im.naturalHeight * s, undefined, 'FAST');
    }
    return pdf;
}

/** Print what the window shows on half A4, upright — onto more pages when it is long.
 *  `width` (px): lay a report out that narrow first, so its text prints larger. */
export async function printWindow(el?: HTMLElement, width?: number) {
    const keep = el && width ? el.style.cssText : null;
    if (el && width) {
        el.style.width = `${width}px`; el.style.maxWidth = `${width}px`; el.style.flex = 'none';
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 80)));
    }
    try {
        const { img } = await captureWindow(el);
        await printImages(await slicePages(img, 0.92), 0.92, HALF_A4);
    } finally {
        if (el && keep !== null) el.style.cssText = keep;
    }
}

/** Print several sheets (laid out as half A4 pages), one per page — or `save` them as a half A4 PDF. */
export async function printSheets(sheets: HTMLElement[], save?: string, sharp = 3) {
    await (document as any).fonts?.ready;
    const quality = sharp >= 3 ? 0.95 : 0.85;
    const imgs: string[] = [];
    for (const el of sheets) {
        imgs.push(await toJpeg(el, { quality, pixelRatio: sharp, backgroundColor: '#ffffff', cacheBust: false, style: { margin: '0', boxShadow: 'none' } }));
    }
    if (!save) { await printImages(imgs, quality); return; }
    (await picturesPdf(imgs)).save(save);
}
