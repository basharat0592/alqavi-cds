'use client';

import { useState, useEffect, useRef } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import AdminSidebar from '@/components/layout/AdminSidebar';
import NotificationPanel, { type ActivityItem } from '@/components/admin/NotificationPanel';
import ProfileDropdown from '@/components/admin/ProfileDropdown';
import {
    Menu, X, Bell, Search, ExternalLink, Package, ShoppingCart,
    User, ShoppingBag, Users, AlertTriangle, Sun, Moon, CreditCard, RefreshCw, Shield,
    ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/lib/auth';
import { productService, orderService, userService, settingsService } from '@/lib/api';
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
                    AL-QAVI <span className="bg-gradient-to-r from-amber-500 to-[#F59E0B] bg-clip-text text-transparent">TRADES</span>
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
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    // Sidebar & Profile States
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [notifOpen, setNotifOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any>({ products: [], orders: [], users: [] });
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

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
                setSidebarCollapsed(s.sidebar_collapsed ?? true);
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

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setShowSearchDropdown(true);
        try {
            const [pRes, oRes, uRes] = await Promise.all([
                productService.getAll(), orderService.getAll(), userService.getAll()
            ]);
            setSearchResults({
                products: (Array.isArray(pRes) ? pRes : []).filter((p: any) => p.name?.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3),
                orders: (Array.isArray(oRes) ? oRes : []).filter((o: any) => String(o.id).includes(searchQuery) || o.order_number?.includes(searchQuery)).slice(0, 3),
                users: (Array.isArray(uRes) ? uRes : []).filter((u: any) => (`${u.first_name} ${u.last_name} ${u.email}`).toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3),
            });
        } catch { } finally { setIsSearching(false); }
    };

    const handleLogout = () => { authService.logout(); router.push('/login'); };
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
                            <AdminSidebar isCollapsed={false} onToggle={() => setMobileOpen(false)} />
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
                                className="p-1.5 border border-[#ddd] rounded-[3px] bg-white hover:bg-[#f7f8fa] text-[#565959] hover:text-[#e77600] transition-all shadow-sm shrink-0"
                                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                            >
                                <Menu className="h-5 w-5" />
                            </button>

                            {/* Search Bar */}
                            <div className="relative flex-1 max-w-2xl">
                                <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                                    className="flex items-center bg-white rounded-[2px] border border-[#888c8e] overflow-hidden focus-within:ring-[2px] focus-within:ring-[#e77600] focus-within:border-[#e77600] transition-all">
                                    <button type="button" className="px-3 h-9 bg-[#f3f3f3] border-r border-[#bbb] text-[12px] text-[#565959] hover:bg-[#e7e7e7] font-medium flex items-center gap-1">
                                        All <ChevronDown size={14} />
                                    </button>
                                    <input type="text" placeholder="Search orders, products, or suppliers..."
                                        className="flex-1 h-9 px-3 bg-transparent text-[14px] text-[#111] outline-none placeholder:text-[#aaa] font-medium"
                                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                                    <button type="submit" className="w-12 h-9 bg-[#febd69] hover:bg-[#f3a847] flex items-center justify-center text-[#111] transition-colors">
                                        {isSearching ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5 stroke-[2.5]" />}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
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
                                        <span className="inline-block text-[9px] font-extrabold text-sky-500 bg-sky-500/10 dark:text-sky-400 dark:bg-sky-500/15 px-2 py-0.5 rounded-full border border-sky-500/20 dark:border-sky-500/10 mt-1 uppercase tracking-wider">
                                            {adminRole}
                                        </span>
                                    </div>
                                </button>
                                {profileOpen && <ProfileDropdown user={{ name: adminName, email: adminEmail, role: adminRole, id: String(adminId), avatar: adminAvatar || undefined }} onClose={() => setProfileOpen(false)} onLogout={handleLogout} onUpdated={handleProfileUpdated} />}
                            </div>
                        </div>
                    </div>

                    {/* ═══ MAIN CONTENT ═══ */}
                    <main className="flex-1 overflow-y-auto px-3 py-3 md:p-4 lg:p-8 relative bg-[#F8F9FA] dark:bg-[#111c31] print:p-0 print:m-0 print:bg-white">
                        {isNavigating && <PageLoader />}
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>

    );
}
