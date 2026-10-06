/**
 * Open an admin screen in its own pop-up window, like the legacy Trade desktop
 * app opened each form in a separate window.
 *
 * Each screen gets a stable window name (`trade:<path>`), so clicking the same
 * button again focuses the existing window instead of stacking duplicates. The
 * admin layout reads that name to render the screen without the sidebar/navbar.
 */
export function openPopup(href: string) {
    if (typeof window === 'undefined') return;
    const w = Math.min(1440, window.screen.availWidth - 40);
    const h = Math.min(900, window.screen.availHeight - 60);
    const left = Math.max(0, Math.round((window.screen.availWidth - w) / 2));
    const top = Math.max(0, Math.round((window.screen.availHeight - h) / 2));
    const name = 'trade:' + href.replace(/[^a-z0-9]+/gi, '_');
    const win = window.open(href, name, `popup=yes,width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
    // Pop-up blocked: fall back to a normal tab rather than doing nothing.
    if (!win) { window.open(href, '_blank'); return; }
    win.focus();
}

/** True when this window was opened by `openPopup` (or with ?popup=1). */
export function isPopupWindow() {
    if (typeof window === 'undefined') return false;
    return window.name.startsWith('trade:') || new URLSearchParams(window.location.search).has('popup');
}
