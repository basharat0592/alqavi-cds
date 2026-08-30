'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import { DesktopNavMenu, MobileNavMenu } from '@/components/layout/AdminNavMenu';
import AdminSidebar from '@/components/layout/AdminSidebar';
import NotificationPanel, { type ActivityItem } from '@/components/admin/NotificationPanel';
import ProfileDropdown from '@/components/admin/ProfileDropdown';
import ReadOnlyController from '@/components/admin/ReadOnlyController';
import {
    Menu, X, Bell, Search, Package, PackagePlus, ShoppingCart,
    User, ShoppingBag, Users, AlertTriangle, Sun, Moon, CreditCard, Shield,
    ChevronDown, ChevronRight, FileText, CornerDownLeft, Clock, ArrowLeft, Building2,
    Home, Globe, Settings, ScanLine, TrendingUp, Boxes, PanelLeft, Maximize, Minimize, MapPin
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/lib/auth';
import { userService, settingsService } from '@/lib/api';
import { ADMIN_PAGES, SUPER_ADMIN_HIDDEN_HREFS, SUPER_ONLY_HREFS } from '@/lib/adminPages';
import { getImageUrl, cn } from '@/lib/utils';
import { gradientFor, gradientCss } from '@/lib/tileTheme';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MOBILE TOP BAR (CLEAN LIGHT THEME)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function MobileTopBar({ onMenuToggle, showMenu = true, adminName, adminAvatar, unreadCount, onToggleNotifications, onToggleProfile, showBack, onBack }: {
    onMenuToggle: () => void; showMenu?: boolean; adminName: string; adminAvatar: string | null; unreadCount: number;
    onToggleNotifications: () => void; onToggleProfile: () => void;
    showBack: boolean; onBack: () => void;
}) {
    return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-800 dark:text-white px-4 py-3 flex items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 md:hidden z-[100] print:hidden sticky top-0 shadow-sm transition-colors duration-300">
            {showMenu ? (
                <button
                    onClick={onMenuToggle}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                    <Menu className="h-5 w-5" />
                </button>
            ) : (
                <span className="w-9 h-9 shrink-0" aria-hidden />
            )}
            <Link href="/admin/dashboard" className="flex flex-col leading-none items-center group">
                <span className="font-extrabold text-sm tracking-widest text-slate-800 dark:text-white group-hover:opacity-85 transition-opacity">
                    AL-QAVI <span className="bg-gradient-to-r from-[#F59E0B] to-[#F59E0B] bg-clip-text text-transparent">TRADES</span>
                </span>
            </Link>
            <div className="flex items-center gap-2">
                {showBack && (
                    <button
                        onClick={onBack}
                        aria-label="Go back"
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                )}
                <button
                    onClick={onToggleNotifications}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition relative text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
                    )}
                </button>
                <button 
                    onClick={onToggleProfile}
                    className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-700 dark:text-white font-extrabold text-xs hover:scale-105 active:scale-95 transition-all overflow-hidden border border-slate-200 dark:border-white/10"
                >
                    {adminAvatar ? (
                        <img src={getImageUrl(adminAvatar) || ''} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        adminName ? adminName[0].toUpperCase() : 'A'
                    )}
                </button>
            </div>
        </div>
    );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAIN ADMIN LAYOUT
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/* Live session timer â€” shown in the navbar (global across all admin pages) */
const SESSION_MAX_SECONDS = 24 * 60 * 60; // auto sign-out after 24 hours

function SessionTimer({ className = '', onTimeout }: { className?: string; onTimeout?: () => void }) {
    const [sessionTime, setSessionTime] = useState('00:00:00');
    const onTimeoutRef = useRef(onTimeout);
    onTimeoutRef.current = onTimeout;
    useEffect(() => {
        const KEY = 'admin_session_start';
        let start = Number(sessionStorage.getItem(KEY));
        if (!start || Number.isNaN(start)) {
            start = Date.now();
            sessionStorage.setItem(KEY, String(start));
        }
        let fired = false;
        const tick = () => {
            const elapsed = Math.max(0, Math.floor((Date.now() - start) / 1000));
            if (elapsed >= SESSION_MAX_SECONDS) {
                setSessionTime('24:00:00');
                if (!fired) { fired = true; onTimeoutRef.current?.(); }
                return;
            }
            const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
            const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
            const s = String(elapsed % 60).padStart(2, '0');
            setSessionTime(`${h}:${m}:${s}`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);
    return (
        <div
            title="Current session duration"
            className={cn("inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[12.5px] font-semibold text-slate-600 dark:text-slate-300 select-none", className)}
        >
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <span className="text-slate-500 dark:text-slate-400">Session Time</span>
            <span className="h-3.5 w-px bg-slate-200 dark:bg-white/10" />
            <span className="tabular-nums tracking-wide font-bold text-slate-700 dark:text-slate-200">{sessionTime}</span>
        </div>
    );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SUPER-ADMIN MOBILE BOTTOM NAV (app-style tab bar)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/* A bottom-tab that echoes the gradient pill buttons: the active tab is a mini
   gradient circle with a white icon; inactive tabs show a colour-inked icon. */
function BottomTab({ href, label, icon: Icon, active }: { href: string; label: string; icon: any; active: boolean }) {
    const g = gradientFor(href);
    return (
        <Link href={href} className="flex flex-col items-center justify-center gap-1 h-16 active:scale-95 transition-transform">
            <span
                className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-all", active && "shadow-[0_3px_9px_rgba(15,23,42,0.28)]")}
                style={active ? { backgroundImage: gradientCss(g), border: `1.5px solid ${g.ink}` } : {}}
            >
                <Icon size={19} strokeWidth={active ? 2.6 : 2.1} style={{ color: active ? '#0f172a' : g.ink }} />
            </span>
            <span className={cn("text-[9.5px] font-bold tracking-tight", active ? "text-slate-900" : "text-slate-400")}>{label}</span>
        </Link>
    );
}

const HOME_GRADIENT = 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)';

function SuperAdminBottomNav({ pathname }: { pathname: string }) {
    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
    return (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[80] print:hidden">
            <div className="relative bg-white border-t border-slate-200 shadow-[0_-2px_14px_rgba(0,0,0,0.07)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="grid grid-cols-5">
                    <BottomTab href="/admin/branches" label="Organizations" icon={Building2} active={isActive('/admin/branches')} />
                    <BottomTab href="/admin/company/areas" label="Region" icon={MapPin} active={isActive('/admin/company/areas')} />
                    <div aria-hidden />{/* center slot for the raised Home button */}
                    <BottomTab href="/admin/website-settings" label="CMS" icon={Globe} active={isActive('/admin/website-settings')} />
                    <BottomTab href="/admin/settings" label="Settings" icon={Settings} active={isActive('/admin/settings')} />
                </div>
                {/* Raised center Home â€” gradient fill to match the pill buttons */}
                <Link
                    href="/admin/dashboard"
                    aria-label="Dashboard"
                    className="absolute left-1/2 -translate-x-1/2 -top-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-white text-white transition-transform active:scale-95"
                    style={{ backgroundImage: HOME_GRADIENT }}
                >
                    <Home size={22} />
                </Link>
            </div>
        </nav>
    );
}

/* App-style bottom tab bar for BRANCH ADMINS (mobile only) â€” same design as the
   super-admin bar, but with the branch's day-to-day quick actions. */
function BranchAdminBottomNav({ pathname }: { pathname: string }) {
    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
    return (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[80] print:hidden">
            <div className="relative bg-white border-t border-slate-200 shadow-[0_-2px_14px_rgba(0,0,0,0.07)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="grid grid-cols-5">
                    <BottomTab href="/admin/sale" label="POS" icon={ScanLine} active={isActive('/admin/sale')} />
                    <BottomTab href="/admin/sales" label="Sales" icon={TrendingUp} active={isActive('/admin/sales')} />
                    <div aria-hidden />{/* center slot for the raised Home button */}
                    <BottomTab href="/admin/inventory/list" label="Stock" icon={Boxes} active={isActive('/admin/inventory/list')} />
                    <BottomTab href="/admin/purchases/add" label="Purchase" icon={ShoppingCart} active={isActive('/admin/purchases/add')} />
                </div>
                {/* Raised center Home â€” gradient fill to match the pill buttons */}
                <Link
                    href="/admin/dashboard"
                    aria-label="Dashboard"
                    className="absolute left-1/2 -translate-x-1/2 -top-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-white text-white transition-transform active:scale-95"
                    style={{ backgroundImage: HOME_GRADIENT }}
                >
                    <Home size={22} />
                </Link>
            </div>
        </nav>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isNavigating, setIsNavigating] = useState(false);
    // Desktop sidebar collapse, remembered across visits. Mobile keeps using the
    // bottom tab bar, so the sidebar is desktop-only.
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

    // Profile & panel states
    const [notifOpen, setNotifOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    // Page results for the global navbar search (jump to any admin page)
    const pageResults = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return [];
        const isSuperAdmin = authService.isSuperAdmin();
        return ADMIN_PAGES
            // Honour the same visibility split the sidebar/dashboard use: hide a
            // super admin's operational "floor" pages, and hide super-only pages
            // from branch admins.
            .filter(p => isSuperAdmin
                ? !SUPER_ADMIN_HIDDEN_HREFS.includes(p.href)
                : !SUPER_ONLY_HREFS.includes(p.href))
            .filter(p => p.name.toLowerCase().includes(q) || p.keywords?.some(k => k.includes(q)))
            .slice(0, 8);
    }, [searchQuery]);

    // Session Data
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
    const [adminRole, setAdminRole] = useState('');
    const [adminId, setAdminId] = useState<string | number>('');
    const [branchLabel, setBranchLabel] = useState('');
    const [isSuperAdminUser, setIsSuperAdminUser] = useState<boolean | null>(null);

    // Settings & Display
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [animationsEnabled, setAnimationsEnabled] = useState(true);
    const [compactMode, setCompactMode] = useState(false);

    // Notifications
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [actLoading, setActLoading] = useState(false);

    // Restore the collapse preference on mount only â€” reading it in useState would
    // run on the server and mismatch the first client render.
    // The sidebar starts COLLAPSED: nothing stored means collapsed, and only an
    // explicit '0' (the user having opened it) expands it. Checking for '0'
    // rather than '1' is what makes closed the default without discarding the
    // preference of anyone who has already opened it.
    useEffect(() => {
        try {
            setSidebarCollapsed(window.localStorage.getItem('admin.sidebarCollapsed') !== '0');
        } catch { /* private mode / storage disabled */ }
    }, []);

    /* Fullscreen â€” hands the whole viewport to the admin, which matters on the
       wide data grids. Vendor-prefixed calls are kept for older Safari/WebKit. */
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const sync = () => setIsFullscreen(Boolean(
            document.fullscreenElement || (document as any).webkitFullscreenElement
        ));
        sync();
        document.addEventListener('fullscreenchange', sync);
        document.addEventListener('webkitfullscreenchange', sync);
        return () => {
            document.removeEventListener('fullscreenchange', sync);
            document.removeEventListener('webkitfullscreenchange', sync);
        };
    }, []);

    const toggleFullscreen = async () => {
        try {
            const el = document.documentElement as any;
            const doc = document as any;
            if (document.fullscreenElement || doc.webkitFullscreenElement) {
                await (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
            } else {
                await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
            }
        } catch {
            // Browsers reject this unless it comes from a user gesture, and some
            // block it outright â€” leave the UI as-is rather than surfacing noise.
        }
    };

    const toggleSidebar = () => {
        setSidebarCollapsed(prev => {
            const next = !prev;
            try { window.localStorage.setItem('admin.sidebarCollapsed', next ? '1' : '0'); } catch { /* ignore */ }
            return next;
        });
    };

    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const mobileProfileRef = useRef<HTMLDivElement>(null);
    const mobileNotifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const user = authService.getUser();
        setIsSuperAdminUser(authService.isSuperAdmin());
        if (user) {
            setAdminName(user.name || 'Administrator');
            setAdminEmail(user.email || 'admin@alqavi.com');
            setAdminAvatar(user.avatar || null);
            setAdminRole(user.role || 'Admin');
            setAdminId(user.id || '');
            const wh = (user as any).warehouses;
            setBranchLabel(authService.isSuperAdmin()
                ? 'All Organizations'
                : (Array.isArray(wh) && wh.length ? wh.map((w: any) => w.name).join(', ') : 'No organization'));
        }

        const loadSettings = async () => {
            try {
                const s = await settingsService.getSettings();
                setTheme('light');
                setAnimationsEnabled(s.animations ?? true);
            } catch { }
        };

        const loadProfile = async () => {
            try {
                const p = await settingsService.getProfile();
                if (p) {
                    setAdminName(p.name || `${p.first_name} ${p.last_name}`.trim() || 'User');
                    setAdminEmail(p.email);
                    setAdminAvatar(p.image || p.avatar || null);
                    setAdminRole(p.role_name || (p.role && typeof p.role === 'object' ? p.role.name : p.role) || 'Admin');
                    setAdminId(p.id);
                    const wh = (p as any).warehouses;
                    setBranchLabel((p as any).is_super_admin
                        ? 'All Organizations'
                        : (Array.isArray(wh) && wh.length ? wh.map((w: any) => w.name).join(', ') : 'No organization'));
                }
            } catch { }
        };

        loadSettings();
        loadProfile();
        fetchActivity();

        const handleUpdate = () => {
            loadProfile();
        };

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (notifRef.current && !notifRef.current.contains(target) && (!mobileNotifRef.current || !mobileNotifRef.current.contains(target))) setNotifOpen(false);
            if (profileRef.current && !profileRef.current.contains(target) && (!mobileProfileRef.current || !mobileProfileRef.current.contains(target))) setProfileOpen(false);
            if (searchRef.current && !searchRef.current.contains(target)) setShowSearchDropdown(false);
        };

        window.addEventListener('profileUpdated', handleUpdate);
        window.addEventListener('settingsUpdated', loadSettings);
        document.addEventListener('mousedown', handleClickOutside);

        const pollInterval = setInterval(fetchActivity, 5000); // Poll every 5 seconds

        return () => {
            clearInterval(pollInterval);
            window.removeEventListener('profileUpdated', handleUpdate);
            window.removeEventListener('settingsUpdated', loadSettings);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchActivity = async () => {
        setActLoading(true);
        try {
            const res = await userService.getAllActivityLogs(10, false); // Fetch only unread
            setActivities(res.map((log: any) => {
                const isOrder = log.action_type?.includes('ORDER') || log.description?.toLowerCase().includes('order');
                const isUser = log.action_type?.includes('USER') || log.description?.toLowerCase().includes('user');
                const isSecurity = log.action_type?.includes('LOGIN') || log.action_type?.includes('PASSWORD');

                return {
                    id: String(log.id),
                    type: isOrder ? 'order' : isUser ? 'user' : isSecurity ? 'alert' : 'alert',
                    title: log.action_type || 'System Event',
                    desc: log.description || 'No details provided.',
                    time: new Date(log.timestamp || Date.now()).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }),
                    timeRaw: log.timestamp ? new Date(log.timestamp).getTime() : Date.now(),
                    href: isOrder ? '/admin/sales' : isUser ? '/admin/users' : '/admin/notifications',
                    read: log.is_read || false,
                    icon: isOrder ? ShoppingBag : isUser ? Users : isSecurity ? Shield : Bell,
                    color: isOrder ? 'text-blue-600' : isUser ? 'text-green-600' : isSecurity ? 'text-orange-600' : 'text-slate-600',
                    bg: isOrder ? 'bg-blue-50' : isUser ? 'bg-green-50' : isSecurity ? 'bg-orange-50' : 'bg-slate-50'
                };
            }));
        } catch { } finally { setActLoading(false); }
    };

    const handleMarkRead = async (id: string) => {
        try {
            await userService.markActivityRead(id);
            fetchActivity();
        } catch { toast.error("Failed to mark as read"); }
    };

    const handleMarkAllRead = async () => {
        try {
            await userService.markAllActivitiesRead();
            fetchActivity();
        } catch { toast.error("Failed to mark all as read"); }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        settingsService.updateSettings({ theme: newTheme });
    };

    const goToPage = (href: string) => {
        router.push(href);
        setSearchQuery('');
        setShowSearchDropdown(false);
    };

    const handleSearch = () => {
        // Enter / submit jumps to the top matching page
        if (pageResults.length > 0) {
            goToPage(pageResults[0].href);
        }
    };

    const handleLogout = () => { authService.logout(); router.push('/login'); };
    const handleSessionTimeout = () => {
        toast.error('Session timed out after 24 hours. Please sign in again.', { duration: 5000 });
        // brief delay so the message is visible before the redirect
        setTimeout(() => { authService.logout(); router.replace('/login'); }, 1200);
    };
    const handleProfileUpdated = (name: string, email: string, avatar?: string) => {
        setAdminName(name); setAdminEmail(email); if (avatar) setAdminAvatar(avatar);
        setProfileOpen(false);
    };

    const unreadCount = activities.filter(a => !a.read).length;

    return (
        <AuthGuard allowedRoles={['admin', 'staff']}>
            <div className={cn("h-screen print:h-auto bg-[#F8F9FA] dark:bg-[#232F3E] flex flex-row font-sans overflow-hidden print:overflow-visible text-slate-900 dark:text-slate-100", theme)}>

                {/* â•â•â• SIDEBAR â€” desktop only; mobile navigates via the bottom tab bar â•â•â• */}
                <div className="hidden md:block h-full shrink-0 print:hidden">
                    <AdminSidebar isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} />
                </div>

                {/* â•â•â• RIGHT CONTAINER (Navbar + Main Content) â•â•â• */}
                <div className="flex-1 flex flex-col min-w-0 min-h-0 print:m-0 print:p-0 print:overflow-visible">
                    {/* Mobile top bar is hidden for everyone â€” nav is via the dashboard
                        pills/tiles + the fixed bottom tab bar on all mobile pages. */}

                    {/* â•â•â• MOBILE NOTIFICATIONS PANEL â•â•â• */}
                    {notifOpen && (
                        <div className="fixed inset-0 z-[150] md:hidden" onClick={() => setNotifOpen(false)}>
                            <div ref={mobileNotifRef} className="absolute top-[52px] right-2 w-[calc(100vw-16px)] max-w-sm" onClick={e => e.stopPropagation()}>
                                <NotificationPanel activities={activities} loading={actLoading} onClose={() => setNotifOpen(false)} onMarkAllRead={handleMarkAllRead} onMarkRead={handleMarkRead} onRefresh={fetchActivity} />
                            </div>
                        </div>
                    )}

                    {/* â•â•â• MOBILE PROFILE PANEL â•â•â• */}
                    {profileOpen && (
                        <>
                            <div className="fixed inset-0 z-[200] md:hidden" onClick={() => setProfileOpen(false)} />
                            <div ref={mobileProfileRef} className="fixed top-[56px] right-2 z-[210] w-72 max-w-[calc(100vw-16px)] md:hidden">
                                <ProfileDropdown positionClassName="relative w-full" user={{ name: adminName, email: adminEmail, role: adminRole, id: String(adminId), avatar: adminAvatar || undefined }} onClose={() => setProfileOpen(false)} onLogout={handleLogout} onUpdated={handleProfileUpdated} />
                            </div>
                        </>
                    )}

                    {/* â•â•â• NAVBAR (takes remaining width) â•â•â• */}
                    <div className="hidden md:flex h-[66px] w-full flex-shrink-0 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/70 dark:border-white/5 px-6 items-center justify-between gap-6 z-[50] shadow-[0_1px_0_rgba(15,23,42,0.03),0_6px_20px_-12px_rgba(15,23,42,0.15)] sticky top-0 transition-colors duration-300 print:hidden">

                        <div className="flex items-center gap-4 flex-1">
                            {/* The sidebar carries the brand lockup now, so the navbar just
                                gets the collapse control in its place. */}
                            <button
                                onClick={toggleSidebar}
                                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                className="w-9 h-9 shrink-0 rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 flex items-center justify-center transition-colors"
                            >
                                <PanelLeft size={17} className={cn('transition-transform duration-300', sidebarCollapsed && 'rotate-180')} />
                            </button>

                            <span className="hidden lg:block h-7 w-px bg-slate-200/80 shrink-0" />

                            {/* Search Bar */}
                            <div className="relative flex-1 max-w-2xl" ref={searchRef}>
                                <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                                    className="group flex items-center gap-2.5 h-10 px-4 bg-slate-100/70 border border-slate-200/80 rounded-xl transition-all hover:bg-white hover:border-slate-300 focus-within:bg-white focus-within:border-[#F59E0B] focus-within:ring-4 focus-within:ring-[#F59E0B]/10 focus-within:shadow-sm">
                                    <Search className="h-4 w-4 text-slate-400 group-focus-within:text-[#92600A] shrink-0 transition-colors" />
                                    <input type="text" placeholder="Search pages, products, orders..."
                                        className="flex-1 h-full bg-transparent text-[13.5px] text-slate-800 outline-none placeholder:text-slate-400 font-medium"
                                        value={searchQuery}
                                        onChange={e => { setSearchQuery(e.target.value); setShowSearchDropdown(true); }}
                                        onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)} />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }}
                                            className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
                                            aria-label="Clear search"
                                        >
                                            <X size={15} />
                                        </button>
                                    )}
                                </form>

                                {/* Page search dropdown */}
                                {showSearchDropdown && searchQuery.trim() && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)] z-[70] overflow-hidden">
                                        <div className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 border-b border-slate-100 flex items-center justify-between">
                                            <span>Pages</span>
                                            <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full text-[9px]">{pageResults.length}</span>
                                        </div>
                                        {pageResults.length > 0 ? (
                                            <div className="max-h-[60vh] overflow-y-auto py-1.5">
                                                {pageResults.map((p, i) => (
                                                    <button
                                                        key={p.href}
                                                        type="button"
                                                        onClick={() => goToPage(p.href)}
                                                        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-slate-50 text-left transition-colors group"
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="w-7 h-7 rounded-md bg-slate-50 text-slate-400 group-hover:bg-[#F59E0B]/10 group-hover:text-[#92600A] flex items-center justify-center transition-colors shrink-0">
                                                                <FileText size={13} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[13px] font-semibold text-slate-700 group-hover:text-slate-900 truncate">{p.name}</p>
                                                                <p className="text-[10.5px] text-slate-400 truncate">{p.href}</p>
                                                            </div>
                                                        </div>
                                                        {i === 0 ? (
                                                            <span className="hidden lg:flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-1 rounded shrink-0">
                                                                <CornerDownLeft size={10} /> Enter
                                                            </span>
                                                        ) : (
                                                            <ChevronRight size={14} className="text-slate-300 group-hover:text-[#92600A] transition-colors shrink-0" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="px-4 py-6 text-center text-[12.5px] text-slate-400">
                                                No pages found for â€œ{searchQuery}â€
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            {/* Hide the branch badge entirely for users with no branch (e.g. staff). */}
                            {branchLabel && branchLabel !== 'No organization' && (
                                <div
                                    title={branchLabel === 'All Organizations' ? 'You can see every organization' : `Your organization: ${branchLabel}`}
                                    className={cn(
                                        "hidden lg:inline-flex items-center gap-2 h-9 px-3 rounded-xl border text-[12.5px] font-semibold select-none",
                                        branchLabel === 'All Organizations'
                                            ? "bg-[#F59E0B]/10 border-[#F59E0B]/25 text-[#B4780B]"
                                            : branchLabel === 'No organization'
                                                ? "bg-rose-50 border-rose-200 text-rose-600"
                                                : "bg-slate-50 border-slate-200 text-slate-600"
                                    )}
                                >
                                    <Building2 className="h-3.5 w-3.5 opacity-80" />
                                    <span className="truncate max-w-[160px]">{branchLabel}</span>
                                </div>
                            )}
                            <SessionTimer className="hidden lg:flex" onTimeout={handleSessionTimeout} />
                            {/* Dues pill removed from the navbar for all admins â€” it lives on System Alerts. */}
                            <button
                                onClick={toggleFullscreen}
                                title={isFullscreen ? 'Exit full screen (Esc)' : 'Full screen'}
                                aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
                                aria-pressed={isFullscreen}
                                className={`hidden md:flex p-2.5 rounded-xl transition-all border ${isFullscreen
                                    ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#B4780B]'
                                    : 'bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white border-transparent'}`}
                            >
                                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                            </button>
                            <div className="h-8 w-[1px] bg-slate-200 dark:bg-white/10 mx-1" />
                            <div className="relative" ref={notifRef}>
                                <button onClick={() => setNotifOpen(!notifOpen)}
                                    className={`p-2.5 rounded-xl transition-all border ${notifOpen ? 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/20 text-slate-800 dark:text-white' : 'bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white border-transparent'}`}>
                                    <Bell className="h-5 w-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                                {notifOpen && <NotificationPanel activities={activities} loading={actLoading} onClose={() => setNotifOpen(false)} onMarkAllRead={handleMarkAllRead} onMarkRead={handleMarkRead} onRefresh={fetchActivity} />}
                            </div>
                            <div className="h-8 w-[1px] bg-slate-200 dark:bg-white/10 mx-1" />
                            <div className="relative" ref={profileRef}>
                                <button onClick={() => setProfileOpen(!profileOpen)}
                                    className={`flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all border ${profileOpen ? 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/20' : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                                    <div className="relative">
                                        <div className="w-8 h-8 bg-slate-100 dark:bg-white/10 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 dark:border-white/10">
                                            {adminAvatar ? <img src={getImageUrl(adminAvatar) || ''} alt="P" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">{adminName[0]}</span>}
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                                    </div>
                                    <div className="hidden xl:block text-left">
                                        <p className="text-slate-800 dark:text-white font-bold text-[13px] leading-tight flex items-center gap-1.5">
                                            {adminName} <ChevronDown size={12} className="text-slate-400 dark:text-zinc-500" />
                                        </p>
                                        <span className="inline-block text-[9px] font-extrabold text-[#B4780B] bg-[#F59E0B]/10 dark:text-[#FBBF24] dark:bg-[#F59E0B]/15 px-2 py-0.5 rounded-full border border-[#F59E0B]/20 dark:border-[#F59E0B]/10 mt-1 uppercase tracking-wider">
                                            {adminRole}
                                        </span>
                                    </div>
                                </button>
                                {profileOpen && <ProfileDropdown user={{ name: adminName, email: adminEmail, role: adminRole, id: String(adminId), avatar: adminAvatar || undefined }} onClose={() => setProfileOpen(false)} onLogout={handleLogout} onUpdated={handleProfileUpdated} />}
                            </div>
                        </div>
                    </div>

                    {/* â•â•â• TOP MENU BAR (5 groups) â€” branch admin dashboard only; the super
                        admin navigates from the sidebar instead â•â•â• */}
                    {pathname === '/admin/dashboard' && isSuperAdminUser === false && <DesktopNavMenu />}

                    {/* â•â•â• MAIN CONTENT â•â•â• */}
                    <main className={cn(
                        "flex-1 overflow-y-auto px-3 py-3 md:p-4 lg:p-8 relative bg-[#F8F9FA] dark:bg-[#111c31] print:p-0 print:m-0 print:bg-white",
                        isSuperAdminUser && "pb-24 lg:pb-8"
                    )}>
                        {isNavigating && <PageLoader />}
                        <ReadOnlyController />
                        {children}
                    </main>
                </div>

                {/* App-style bottom tab bar â€” mobile only (per role) */}
                {isSuperAdminUser
                    ? <SuperAdminBottomNav pathname={pathname} />
                    : <BranchAdminBottomNav pathname={pathname} />}
            </div>
        </AuthGuard>

    );
}
