/*
 * Save sheets (report pages, a purchase invoice) as a PDF on the shop's paper,
 * HALF A4 UPRIGHT (148 × 210 mm). Each sheet is captured as a picture, so
 * nothing can shift or be cut off. There is no printing in the system — PDF
 * (and Excel) only.
 */
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';

/** The shop's paper: half A4 stood up. */
export const HALF_A4 = { w: 148, h: 210 };
export type Paper = { w: number; h: number };

function loadImage(src: string) {
    return new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

/* Pictures onto half A4 PDF pages: each fitted to the page width, at the top. */
async function picturesPdf(imgs: string[], paper: Paper = HALF_A4) {
    const pdf = new jsPDF({ unit: 'mm', format: [paper.w, paper.h], orientation: 'portrait', compress: true });
    for (let i = 0; i < imgs.length; i++) {
        const im = await loadImage(imgs[i]);
        if (i) pdf.addPage([paper.w, paper.h], 'portrait');
        const s = Math.min(paper.w / im.naturalWidth, paper.h / im.naturalHeight);
        pdf.addImage(imgs[i], 'JPEG', (paper.w - im.naturalWidth * s) / 2, 0, im.naturalWidth * s, im.naturalHeight * s, undefined, 'FAST');
    }
    return pdf;
}

/** Save several sheets (laid out as half A4 pages), one per page, as the PDF `file`. */
export async function saveSheetsPdf(sheets: HTMLElement[], file: string, sharp = 3) {
    if (!sheets.length) throw new Error('Nothing to save.');
    await (document as any).fonts?.ready;
    const quality = sharp >= 3 ? 0.95 : 0.85;
    const imgs: string[] = [];
    for (const el of sheets) {
        imgs.push(await toJpeg(el, { quality, pixelRatio: sharp, backgroundColor: '#ffffff', cacheBust: false, style: { margin: '0', boxShadow: 'none' } }));
    }
    (await picturesPdf(imgs)).save(file);
}
