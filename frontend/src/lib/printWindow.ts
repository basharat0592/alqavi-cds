/*
 * Print what is on screen (a Trade window) or one element (a printable page).
 * Each page is captured as a picture, so nothing can shift or be cut off, and
 * printed fitted to whatever paper the printer has (A4, A5, Letter, Legal …):
 * the picture fills the page keeping its shape, and turns a quarter turn when
 * the paper lies the other way, so it always prints as large as it can.
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

/**
 * Print page pictures (JPEG data URLs), one per sheet, fitted to the printer's
 * paper. `@page { size: auto }` lets the print dialog's paper size and layout
 * decide the page; each picture is drawn upright and turned, and CSS shows the
 * one whose shape matches the page.
 */
export async function printImages(pages: string[], quality = 0.92) {
    if (!pages.length) throw new Error('Nothing to print.');
    const urls: string[] = [];
    const body: string[] = [];
    for (const src of pages) {
        const img = await loadImage(src);
        const wide = img.naturalWidth > img.naturalHeight;
        const up = await toBlobUrl(src), turned = await toBlobUrl(await rotateCw(src, quality));
        urls.push(up, turned);
        body.push(`<div class="pg ${wide ? 'wide' : 'tall'}"><img class="u" src="${up}"><img class="r" src="${turned}"></div>`);
    }
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: auto; margin: 3mm; }
html, body { margin: 0; padding: 0; background: #fff; }
.pg { width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; break-after: page; page-break-after: always; }
.pg:last-child { break-after: auto; page-break-after: auto; }
.pg img { max-width: 100%; max-height: 100%; display: block; }
.pg .r { display: none; }
@media (orientation: landscape) { .tall .u { display: none; } .tall .r { display: block; } }
@media (orientation: portrait) { .wide .u { display: none; } .wide .r { display: block; } }
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

/** Capture `el` (default: the whole window) onto one A4 page, fitted and centred. */
export async function makeWindowPdf(el?: HTMLElement, orientation?: 'portrait' | 'landscape') {
    const { img, w, h } = await captureWindow(el);
    const orient = orientation || (w >= h ? 'landscape' : 'portrait');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: orient, compress: true });
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), m = 6;
    const s = Math.min((pw - 2 * m) / w, (ph - 2 * m) / h);
    pdf.addImage(img, 'JPEG', (pw - w * s) / 2, (ph - h * s) / 2, w * s, h * s, undefined, 'FAST');
    return pdf;
}

/** Print what the window shows, fitted to the printer's paper. */
export async function printWindow(el?: HTMLElement) {
    await printImages([(await captureWindow(el)).img]);
}

/** Print several sheets, one per page, fitted to the printer's paper (or `save` them as an A4 PDF). */
export async function printSheets(sheets: HTMLElement[], save?: string, orientation: 'portrait' | 'landscape' = 'portrait', sharp = 3) {
    await (document as any).fonts?.ready;
    const quality = sharp >= 3 ? 0.95 : 0.85;
    const imgs: string[] = [];
    for (const el of sheets) {
        imgs.push(await toJpeg(el, { quality, pixelRatio: sharp, backgroundColor: '#ffffff', cacheBust: false, style: { margin: '0', boxShadow: 'none' } }));
    }
    if (!save) { await printImages(imgs, quality); return; }
    const [w, h] = orientation === 'portrait' ? [210, 297] : [297, 210];
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation, compress: true });
    imgs.forEach((img, i) => {
        if (i) pdf.addPage('a4', orientation);
        pdf.addImage(img, 'JPEG', 0, 0, w, h, undefined, 'FAST');
    });
    pdf.save(save);
}
