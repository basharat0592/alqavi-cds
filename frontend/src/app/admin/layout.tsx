'use client';

import { useState, useEffect, useRef } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import AdminSidebar from '@/components/layout/AdminSidebar';
import NotificationPanel, { type ActivityItem } from '@/components/admin/NotificationPanel';
import ProfileDropdown from '@/components/admin/ProfileDropdown';
import {
    Menu, X, Bell, Search, ExternalLink, Package, ShoppingCart,
    User, ShoppingBag, Users, AlertTriangle, Sun, Moon, CreditCard, RefreshCw, Shield
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
                setTheme((s.theme as 'light' | 'dark') || 'light');
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
        window.addEventListener('profileUpdated', handleUpdate);
        window.addEventListener('settingsUpdated', loadSettings);
        return () => {
            window.removeEventListener('profileUpdated', handleUpdate);
            window.removeEventListener('settingsUpdated', loadSettings);
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
                    <div className="hidden md:flex flex-col flex-shrink-0 z-[60]">
                        <AdminSidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
                    </div>

                    <div className="flex-1 flex flex-col min-w-0 min-h-0">
                        {/* ═══ PREMIUM COMMAND NAVBAR (Clean Light Theme) ═══ */}
                        <div className="hidden md:flex bg-[#F8F9FA] dark:bg-[#232F3E] border-b border-[#DDDDDD] dark:border-white/5 px-8 py-3 items-center justify-between gap-6 flex-shrink-0 z-[50] shadow-sm sticky top-0 transition-all duration-300">

                            {/* Search */}
                            <div className="relative flex-1 max-w-lg group">
                                <div className="flex items-center gap-3.5 bg-[#F3F3F3] dark:bg-white/5 rounded-2xl border border-transparent px-5 py-2 w-full focus-within:bg-white dark:focus-within:bg-[#232F3E] focus-within:border-[#F59E0B] focus-within:ring-4 focus-within:ring-[#F59E0B]/10 transition-all duration-500 shadow-inner group-hover:shadow-md">
                                    <Search className="h-4 w-4 text-[#565959] dark:text-zinc-500 group-focus-within:text-[#F59E0B]" />
                                    <input type="text" placeholder="Search components, products, orders..."
                                        className="bg-transparent text-[11px] outline-none w-full text-[#111] dark:text-white font-bold uppercase tracking-wider placeholder:text-zinc-500"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    />
                                    {isSearching && <RefreshCw className="h-4 w-4 animate-spin text-[#F59E0B]" />}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3">
                                <Link href="/" className="hidden lg:flex items-center gap-2 text-[10px] font-black text-white bg-[#F59E0B] px-5 py-2.5 rounded-xl shadow-md hover:scale-105 transition-all uppercase tracking-widest">
                                    Storefront <ExternalLink className="h-3.5 w-3.5" />
                                </Link>

                                <div className="h-8 w-[1px] bg-[#F3F3F3] mx-2" />

                                {/* Notifications */}
                                <div className="relative" ref={notifRef}>
                                    <button onClick={() => setNotifOpen(!notifOpen)}
                                        className={`p-2.5 rounded-2xl transition-all border ${notifOpen ? 'bg-[#F59E0B] text-white shadow-[0_0_15px_rgba(23EE,175,28,0.3)]' : 'bg-white dark:bg-white/5 hover:bg-[#F3F3F3] dark:hover:bg-white/10 text-[#565959] dark:text-zinc-400 border-[#DDDDDD] dark:border-white/5 shadow-sm'}`}>
                                        <Bell className="h-5 w-5" />
                                        {unreadCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">{unreadCount}</span>}
                                    </button>
                                    {notifOpen && <NotificationPanel activities={activities} loading={actLoading} onClose={() => setNotifOpen(false)} onMarkAllRead={() => { }} onMarkRead={() => { }} onRefresh={fetchActivity} />}
                                </div>
                                {/* Dynamic Theme Integration */}
                                <button onClick={toggleTheme}
                                    className="relative p-2.5 rounded-2xl bg-white dark:bg-white/5 border border-[#DDDDDD] dark:border-white/5 text-[#565959] dark:text-zinc-400 hover:text-[#F59E0B] transition-all duration-500 hover:-translate-y-1 w-10 h-10 flex items-center justify-center group overflow-hidden shadow-sm">
                                    <div className={`absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${theme === 'dark' ? 'opacity-0 translate-y-8 scale-50' : 'opacity-100 translate-y-0 scale-100'}`}>
                                        <Moon className="h-5 w-5" strokeWidth={2.5} />
                                    </div>
                                    <div className={`absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${theme === 'light' ? 'opacity-0 -translate-y-8 scale-50' : 'opacity-100 translate-y-0 scale-100 rotate-0'}`}>
                                        <Sun className="h-5 w-5 text-[#F59E0B]" strokeWidth={2.5} />
                                    </div>
                                </button>

                                <div className="h-8 w-[1px] bg-[#F3F3F3] mx-1" />

                                {/* Profile */}
                                <div className="relative" ref={profileRef}>
                                    <button onClick={() => setProfileOpen(!profileOpen)}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-2xl transition-all border ${profileOpen ? 'bg-[#FFF8E7] dark:bg-[#F59E0B]/10 border-[#F59E0B]/30' : 'bg-[#F8F9FA] dark:bg-transparent border-transparent hover:bg-[#F3F3F3] dark:hover:bg-white/5'}`}>
                                        <div className="relative">
                                            <div className="w-9 h-9 bg-[#F59E0B] rounded-2xl flex items-center justify-center overflow-hidden border-2 border-white dark:border-[#232F3E] shadow-sm">
                                                {adminAvatar ? <img src={getImageUrl(adminAvatar) || ''} alt="P" className="w-full h-full object-cover" /> : <span className="text-xs font-black text-white">{adminName[0]}</span>}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#232F3E] rounded-full" />
                                        </div>
                                        <div className="hidden xl:block text-left">
                                            <p className="text-[#111] dark:text-white font-black text-[12px] leading-tight uppercase truncate max-w-[120px]">{adminName}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                                                <p className="text-[9px] text-[#565959] dark:text-zinc-400 font-bold uppercase tracking-widest">{adminRole}</p>
                                            </div>
                                        </div>
                                    </button>
                                    {profileOpen && <ProfileDropdown user={{ name: adminName, email: adminEmail, role: adminRole, id: String(adminId), avatar: adminAvatar || undefined }} onClose={() => setProfileOpen(false)} onLogout={handleLogout} onUpdated={handleProfileUpdated} />}
                                </div>
                            </div>
                        </div>

                        <main className="flex-1 overflow-y-auto p-4 lg:p-10 relative bg-[#F8F9FA] dark:bg-[#232F3E]">
                            {isNavigating && <PageLoader />}
                            {children}
                        </main>
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}
