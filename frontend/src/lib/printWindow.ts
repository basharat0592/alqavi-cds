/*
 * Print what is on screen (a Trade window) or one element (a printable page)
 * through a PDF, the same way the sale invoice prints: the page is captured as
 * a picture and placed on A4, so every printer prints it the same, nothing cut
 * off. Elements marked `data-no-print` (the print button itself) are left out.
 */
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';

function printPdfBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0';
    frame.src = url;
    frame.onload = () => {
        setTimeout(() => {
            try { frame.contentWindow?.focus(); frame.contentWindow?.print(); }
            catch { window.open(url, '_blank'); }
        }, 300);
    };
    document.body.appendChild(frame);
    setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 10 * 60 * 1000);
}

const skip = (n: HTMLElement) => !(n instanceof HTMLElement && n.dataset && n.dataset.noPrint !== undefined);

/** Capture `el` (default: the whole window) onto one A4 page, fitted and centred. */
export async function makeWindowPdf(el?: HTMLElement, orientation?: 'portrait' | 'landscape') {
    const target = el || document.body;
    await (document as any).fonts?.ready;
    const w = target.scrollWidth || target.offsetWidth, h = target.scrollHeight || target.offsetHeight;
    const img = await toJpeg(target, { quality: 0.92, pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: false, filter: skip as any });
    const orient = orientation || (w >= h ? 'landscape' : 'portrait');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: orient, compress: true });
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), m = 6;
    const s = Math.min((pw - 2 * m) / w, (ph - 2 * m) / h);
    pdf.addImage(img, 'JPEG', (pw - w * s) / 2, (ph - h * s) / 2, w * s, h * s, undefined, 'FAST');
    return pdf;
}

export async function printWindow(el?: HTMLElement, orientation?: 'portrait' | 'landscape') {
    printPdfBlob((await makeWindowPdf(el, orientation)).output('blob'));
}

/** Print several A4 sheets (elements of exactly A4 size, portrait or landscape), one per page. */
export async function printSheets(sheets: HTMLElement[], save?: string, orientation: 'portrait' | 'landscape' = 'portrait', sharp = 3) {
    await (document as any).fonts?.ready;
    const [w, h] = orientation === 'portrait' ? [210, 297] : [297, 210];
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation, compress: true });
    for (let i = 0; i < sheets.length; i++) {
        const img = await toJpeg(sheets[i], { quality: sharp >= 3 ? 0.95 : 0.85, pixelRatio: sharp, backgroundColor: '#ffffff', cacheBust: false, style: { margin: '0', boxShadow: 'none' } });
        if (i) pdf.addPage('a4', orientation);
        pdf.addImage(img, 'JPEG', 0, 0, w, h, undefined, 'FAST');
    }
    if (save) pdf.save(save); else printPdfBlob(pdf.output('blob'));
}
