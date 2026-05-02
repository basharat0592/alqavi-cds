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

/* ═══════════════════════════════════════════════
   MOBILE TOP BAR (CLEAN LIGHT THEME)
   ═══════════════════════════════════════════════ */
function MobileTopBar({ onMenuToggle, adminName, adminAvatar, unreadCount, onToggleNotifications, onToggleProfile }: {
    onMenuToggle: () => void; adminName: string; adminAvatar: string | null; unreadCount: number;
    onToggleNotifications: () => void; onToggleProfile: () => void;
}) {
    return (
        <div className="bg-[#F8F9FA] dark:bg-[#2d3a4b] text-[#111] dark:text-white px-4 py-2.5 flex items-center justify-between gap-4 border-b border-[#DDDDDD] dark:border-white/5 md:hidden z-[100] print:hidden sticky top-0 shadow-sm">
            <button onClick={onMenuToggle} className="p-1.5 hover:bg-[#F3F3F3] dark:hover:bg-white/5 rounded-lg transition text-[#565959] dark:text-zinc-400">
                <Menu className="h-5 w-5" />
            </button>
            <Link href="/admin/dashboard" className="flex flex-col leading-none items-center">
                <span className="font-black text-sm text-[#111] tracking-tight uppercase">AL-QAVI <span className="text-[#F59E0B]">TRADES</span></span>
            </Link>
            <div className="flex items-center gap-2">
                <button onClick={onToggleNotifications} className="p-1.5 hover:bg-[#F3F3F3] dark:hover:bg-white/5 rounded-lg transition relative text-[#565959] dark:text-zinc-400">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />}
                </button>
                <button onClick={onToggleProfile}
                    className="w-10 h-10 bg-[#F59E0B] rounded-xl flex items-center justify-center text-white font-black text-xs hover:scale-105 transition-all shadow-md overflow-hidden">
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
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
        };

        window.addEventListener('profileUpdated', handleUpdate);
        window.addEventListener('settingsUpdated', loadSettings);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('profileUpdated', handleUpdate);
            window.removeEventListener('settingsUpdated', loadSettings);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchActivity = async () => {
        setActLoading(true);
        try {
            const res = await userService.getAllActivityLogs(10);
            setActivities(res.map((log: any) => {
                const isOrder = log.action_type?.includes('ORDER') || log.description?.toLowerCase().includes('order');
                const isUser = log.action_type?.includes('USER') || log.description?.toLowerCase().includes('user');
                const isSecurity = log.action_type?.includes('LOGIN') || log.action_type?.includes('PASSWORD');

                return {
                    id: String(log.id),
                    type: isOrder ? 'order' : isUser ? 'user' : isSecurity ? 'alert' : 'alert', // Changed to 'alert' to match type definition
                    title: log.action_type || 'System Event',
                    desc: log.description || 'No details provided.',
                    time: log.created_at ? new Date(log.created_at).toLocaleTimeString() : 'Recently',
                    timeRaw: log.created_at ? new Date(log.created_at).getTime() : Date.now(),
                    href: isOrder ? '/admin/sales' : isUser ? '/admin/users' : '/admin/dashboard',
                    read: false,
                    icon: isOrder ? ShoppingBag : isUser ? Users : isSecurity ? Shield : Bell,
                    color: isOrder ? 'text-blue-600' : isUser ? 'text-green-600' : isSecurity ? 'text-orange-600' : 'text-slate-600',
                    bg: isOrder ? 'bg-blue-50' : isUser ? 'bg-green-50' : isSecurity ? 'bg-orange-50' : 'bg-slate-50'
                };
            }));
        } catch { } finally { setActLoading(false); }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        settingsService.updateSettings({ theme: newTheme });
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
            <div className={cn("h-screen bg-[#F8F9FA] dark:bg-[#232F3E] flex flex-col font-sans overflow-hidden text-slate-900 dark:text-slate-100", theme)}>
                <MobileTopBar
                    onMenuToggle={() => setMobileOpen(!mobileOpen)} adminName={adminName} adminAvatar={adminAvatar}
                    unreadCount={unreadCount} onToggleNotifications={() => setNotifOpen(!notifOpen)} onToggleProfile={() => setProfileOpen(!profileOpen)}
                />

                <div className="flex flex-1 min-h-0 print:block">
                    <div className="hidden md:flex flex-col flex-shrink-0 z-[60] print:hidden">
                        <AdminSidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
                    </div>

                    <div className="flex-1 flex flex-col min-w-0 min-h-0 print:m-0 print:p-0">
                        {/* ═══ PURE AMAZON RETAIL COMMAND NAVBAR ═══ */}
                        <div className="hidden md:flex bg-[#F8F9FA] dark:bg-[#232F3E] border-b border-[#DDDDDD] dark:border-white/5 px-8 py-2.5 items-center justify-between gap-6 flex-shrink-0 z-[50] shadow-sm sticky top-0 transition-all duration-300 print:hidden">

                            {/* Amazon Style Search Bar */}
                            <div className="relative flex-1 max-w-2xl group">
                                <form 
                                    onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                                    className="flex items-center bg-white dark:bg-white/5 rounded-[4px] border border-[#888c8e] overflow-hidden focus-within:ring-[2px] focus-within:ring-[#e77600] focus-within:border-[#e77600] transition-all"
                                >
                                    <button type="button" className="px-3 h-9 bg-[#f3f3f3] dark:bg-zinc-800 border-r border-[#bbb] text-[12px] text-[#565959] hover:bg-[#e7e7e7] dark:hover:bg-zinc-700 font-medium flex items-center gap-1">
                                        All <ChevronDown size={14} />
                                    </button>
                                    <input 
                                        type="text" 
                                        placeholder="Search orders, products, or suppliers..."
                                        className="flex-1 h-9 px-3 bg-transparent text-[14px] text-[#111] dark:text-white outline-none placeholder:text-[#aaa] font-medium"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                    <button type="submit" className="w-12 h-9 bg-[#febd69] hover:bg-[#f3a847] flex items-center justify-center text-[#111] transition-colors">
                                        {isSearching ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5 stroke-[2.5]" />}
                                    </button>
                                </form>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3">
                                <Link href="/" className="hidden lg:flex items-center gap-2 text-[11px] font-bold text-[#0f1111] bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border border-[#adb1b8] px-4 py-[7px] rounded-[3px] shadow-sm hover:from-[#eef1f3] hover:to-[#dce0e4] transition-all uppercase tracking-wide">
                                    <ExternalLink className="h-3.5 w-3.5" /> View Store
                                </Link>

                                <div className="h-8 w-[1px] bg-[#DDDDDD] mx-1" />

                                {/* Notifications */}
                                <div className="relative" ref={notifRef}>
                                    <button onClick={() => setNotifOpen(!notifOpen)}
                                        className={`p-2 rounded-[3px] transition-all border ${notifOpen ? 'bg-[#f7dfa5] border-[#c45500] text-[#c45500]' : 'bg-white dark:bg-white/5 hover:bg-[#F3F3F3] dark:hover:bg-white/10 text-[#565959] dark:text-zinc-400 border-[#DDDDDD] dark:border-white/5'}`}>
                                        <Bell className="h-5 w-5" />
                                        {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#c45500] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">{unreadCount}</span>}
                                    </button>
                                    {notifOpen && <NotificationPanel activities={activities} loading={actLoading} onClose={() => setNotifOpen(false)} onMarkAllRead={() => { }} onMarkRead={() => { }} onRefresh={fetchActivity} />}
                                </div>

                                <div className="h-8 w-[1px] bg-[#DDDDDD] mx-1" />

                                <div className="h-8 w-[1px] bg-[#DDDDDD] mx-1" />

                                {/* Profile */}
                                <div className="relative" ref={profileRef}>
                                    <button onClick={() => setProfileOpen(!profileOpen)}
                                        className={`flex items-center gap-3 px-3 py-1.5 rounded-[3px] transition-all border ${profileOpen ? 'bg-amber-50 border-amber-300' : 'border-transparent hover:bg-zinc-100'}`}>
                                        <div className="relative">
                                            <div className="w-8 h-8 bg-zinc-200 rounded-[2px] flex items-center justify-center overflow-hidden border border-zinc-300">
                                                {adminAvatar ? <img src={getImageUrl(adminAvatar) || ''} alt="P" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-zinc-600">{adminName[0]}</span>}
                                            </div>
                                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                                        </div>
                                        <div className="hidden xl:block text-left">
                                            <p className="text-[#111] dark:text-white font-bold text-[13px] leading-tight flex items-center gap-1.5">
                                                {adminName} <ChevronDown size={12} className="text-[#565959]" />
                                            </p>
                                            <p className="text-[10px] text-[#c45500] font-bold uppercase tracking-widest mt-0.5">{adminRole}</p>
                                        </div>
                                    </button>
                                    {profileOpen && <ProfileDropdown user={{ name: adminName, email: adminEmail, role: adminRole, id: String(adminId), avatar: adminAvatar || undefined }} onClose={() => setProfileOpen(false)} onLogout={handleLogout} onUpdated={handleProfileUpdated} />}
                                </div>
                            </div>
                        </div>

                        <main className="flex-1 overflow-y-auto p-4 lg:p-10 relative bg-[#F8F9FA] dark:bg-[#232F3E] print:p-0 print:m-0 print:bg-white">
                            {isNavigating && <PageLoader />}
                            {children}
                        </main>
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}
