'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import AdminSidebar from '@/components/layout/AdminSidebar';
import NotificationPanel, { type ActivityItem } from '@/components/admin/NotificationPanel';
import ProfileDropdown from '@/components/admin/ProfileDropdown';
import {
    Menu, X, Bell, Search, ExternalLink, Package, ShoppingCart,
    User, ShoppingBag, Users, AlertTriangle, Sun, Moon, CreditCard, Shield,
    ChevronDown, ChevronRight, FileText, CornerDownLeft, Clock
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/lib/auth';
import { userService, settingsService } from '@/lib/api';
import { ADMIN_PAGES } from '@/lib/adminPages';
import { getImageUrl, cn } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════
   MOBILE TOP BAR (CLEAN LIGHT THEME)
   ═══════════════════════════════════════════════ */
function MobileTopBar({ onMenuToggle, adminName, adminAvatar, unreadCount, onToggleNotifications, onToggleProfile }: {
    onMenuToggle: () => void; adminName: string; adminAvatar: string | null; unreadCount: number;
    onToggleNotifications: () => void; onToggleProfile: () => void;
}) {
    return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-800 dark:text-white px-4 py-3 flex items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 md:hidden z-[100] print:hidden sticky top-0 shadow-sm transition-colors duration-300">
            <button 
                onClick={onMenuToggle} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            >
                <Menu className="h-5 w-5" />
            </button>
            <Link href="/admin/dashboard" className="flex flex-col leading-none items-center group">
                <span className="font-extrabold text-sm tracking-widest text-slate-800 dark:text-white group-hover:opacity-85 transition-opacity">
                    AL-QAVI <span className="bg-gradient-to-r from-indigo-500 to-indigo-600 bg-clip-text text-transparent">TRADES</span>
                </span>
            </Link>
            <div className="flex items-center gap-3">
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

/* ═══════════════════════════════════════════════
   MAIN ADMIN LAYOUT
   ═══════════════════════════════════════════════ */
/* Live session timer — shown in the navbar (global across all admin pages) */
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    // Sidebar & Profile States
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    // Page results for the global navbar search (jump to any admin page)
    const pageResults = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return [];
        return ADMIN_PAGES
            .filter(p => p.name.toLowerCase().includes(q) || p.keywords?.some(k => k.includes(q)))
            .slice(0, 8);
    }, [searchQuery]);

    // Session Data
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
    const [adminRole, setAdminRole] = useState('');
    const [adminId, setAdminId] = useState<string | number>('');

    // Settings & Display
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [animationsEnabled, setAnimationsEnabled] = useState(true);
    const [compactMode, setCompactMode] = useState(false);

    // Notifications
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [actLoading, setActLoading] = useState(false);

    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const user = authService.getUser();
        if (user) {
            setAdminName(user.name || 'Administrator');
            setAdminEmail(user.email || 'admin@alqavi.com');
            setAdminAvatar(user.avatar || null);
            setAdminRole(user.role || 'Admin');
            setAdminId(user.id || '');
        }

        const loadSettings = async () => {
            try {
                const s = await settingsService.getSettings();
                setTheme('light');
                setAnimationsEnabled(s.animations ?? true);
                setSidebarCollapsed(s.sidebar_collapsed ?? false);
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
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearchDropdown(false);
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

    const toggleSidebar = async () => {
        const nextState = !sidebarCollapsed;
        setSidebarCollapsed(nextState);
        try {
            await settingsService.updateSettings({ sidebar_collapsed: nextState });
        } catch { }
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
                
                {/* ═══ MOBILE SIDEBAR OVERLAY ═══ */}
                {mobileOpen && (
                    <div className="fixed inset-0 z-[200] md:hidden print:hidden flex">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setMobileOpen(false)}
                        />
                        {/* Sidebar Panel */}
                        <div className="relative z-10 h-full overflow-y-auto shadow-2xl animate-in slide-in-from-left duration-200">
                            <AdminSidebar isCollapsed={false} onToggle={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
                        </div>
                    </div>
                )}

                {/* ═══ SIDEBAR (full height, desktop only) ═══ */}
                <div className="hidden md:flex flex-col flex-shrink-0 z-[60] print:hidden">
                    <div className="h-full overflow-hidden shadow-2xl transition-all duration-300">
                        <AdminSidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
                    </div>
                </div>

                {/* ═══ RIGHT CONTAINER (Navbar + Main Content) ═══ */}
                <div className="flex-1 flex flex-col min-w-0 min-h-0 print:m-0 print:p-0 print:overflow-visible">
                    <MobileTopBar
                        onMenuToggle={() => setMobileOpen(!mobileOpen)} adminName={adminName} adminAvatar={adminAvatar}
                        unreadCount={unreadCount} onToggleNotifications={() => setNotifOpen(!notifOpen)} onToggleProfile={() => setProfileOpen(!profileOpen)}
                    />

                    {/* ═══ MOBILE NOTIFICATIONS PANEL ═══ */}
                    {notifOpen && (
                        <div className="fixed inset-0 z-[150] md:hidden" onClick={() => setNotifOpen(false)}>
                            <div className="absolute top-[52px] right-2 w-[calc(100vw-16px)] max-w-sm" onClick={e => e.stopPropagation()}>
                                <NotificationPanel activities={activities} loading={actLoading} onClose={() => setNotifOpen(false)} onMarkAllRead={handleMarkAllRead} onMarkRead={handleMarkRead} onRefresh={fetchActivity} />
                            </div>
                        </div>
                    )}

                    {/* ═══ MOBILE PROFILE PANEL ═══ */}
                    {profileOpen && (
                        <div className="fixed inset-0 z-[150] md:hidden" onClick={() => setProfileOpen(false)}>
                            <div className="absolute top-[52px] right-2 w-64" onClick={e => e.stopPropagation()}>
                                <ProfileDropdown user={{ name: adminName, email: adminEmail, role: adminRole, id: String(adminId), avatar: adminAvatar || undefined }} onClose={() => setProfileOpen(false)} onLogout={handleLogout} onUpdated={handleProfileUpdated} />
                            </div>
                        </div>
                    )}

                    {/* ═══ NAVBAR (takes remaining width) ═══ */}
                    <div className="hidden md:flex h-[64px] w-full flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-white/5 px-6 items-center justify-between gap-6 z-[50] shadow-sm sticky top-0 transition-colors duration-300 print:hidden">
                        
                        <div className="flex items-center gap-4 flex-1">
                            <button
                                type="button"
                                onClick={toggleSidebar}
                                className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all shrink-0"
                                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                            >
                                <Menu className="h-5 w-5" />
                            </button>

                            {/* Search Bar */}
                            <div className="relative flex-1 max-w-2xl" ref={searchRef}>
                                <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                                    className="group flex items-center gap-2.5 h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl transition-all hover:bg-white focus-within:bg-white focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10">
                                    <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 shrink-0 transition-colors" />
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
                                                            <div className="w-7 h-7 rounded-md bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 flex items-center justify-center transition-colors shrink-0">
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
                                                            <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-600 transition-colors shrink-0" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="px-4 py-6 text-center text-[12.5px] text-slate-400">
                                                No pages found for “{searchQuery}”
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <SessionTimer className="hidden lg:flex" onTimeout={handleSessionTimeout} />
                            <div className="hidden lg:block h-8 w-[1px] bg-slate-200 dark:bg-white/10 mx-1" />
                            <Link href="/" className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all">
                                <ExternalLink className="h-3.5 w-3.5 opacity-80" /> View Store
                            </Link>
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
                                    className={`flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all border ${profileOpen ? 'bg-slate-150 dark:bg-white/10 border-slate-200 dark:border-white/20' : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                                    <div className="relative">
                                        <div className="w-8 h-8 bg-slate-100 dark:bg-white/10 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 dark:border-white/10">
                                            {adminAvatar ? <img src={getImageUrl(adminAvatar) || ''} alt="P" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-slate-650 dark:text-zinc-300">{adminName[0]}</span>}
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                                    </div>
                                    <div className="hidden xl:block text-left">
                                        <p className="text-slate-800 dark:text-white font-bold text-[13px] leading-tight flex items-center gap-1.5">
                                            {adminName} <ChevronDown size={12} className="text-slate-400 dark:text-zinc-500" />
                                        </p>
                                        <span className="inline-block text-[9px] font-extrabold text-indigo-600 bg-indigo-500/10 dark:text-indigo-400 dark:bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/20 dark:border-indigo-500/10 mt-1 uppercase tracking-wider">
                                            {adminRole}
                                        </span>
                                    </div>
                                </button>
                                {profileOpen && <ProfileDropdown user={{ name: adminName, email: adminEmail, role: adminRole, id: String(adminId), avatar: adminAvatar || undefined }} onClose={() => setProfileOpen(false)} onLogout={handleLogout} onUpdated={handleProfileUpdated} />}
                            </div>
                        </div>
                    </div>

                    {/* ═══ MAIN CONTENT ═══ */}
                    <main className="flex-1 overflow-y-auto p-0 md:p-4 lg:p-8 relative bg-[#F8F9FA] dark:bg-[#111c31] print:p-0 print:m-0 print:bg-white">
                        {isNavigating && <PageLoader />}
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>

    );
}
