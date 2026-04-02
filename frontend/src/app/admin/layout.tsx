'use client';

import { useState, useEffect, useRef } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import AdminSidebar from '@/components/layout/AdminSidebar';
import NotificationPanel, { type ActivityItem } from '@/components/admin/NotificationPanel';
import ProfileDropdown from '@/components/admin/ProfileDropdown';
import {
    Menu, X, Bell, Search, ExternalLink, Package, ShoppingCart,
    User, ShoppingBag, Users, AlertTriangle, Sun, Moon, CreditCard
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/lib/auth';
import { productService, orderService, userService, settingsService, inventoryService, paymentService } from '@/lib/api';
import { getImageUrl, cn } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
function timeAgo(ts: number | string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

/* ═══════════════════════════════════════════════
   SEARCH RESULT ITEM
═══════════════════════════════════════════════ */
function SearchItem({ href, icon: Icon, iconBg, iconColor, title, subtitle, onClick }: {
    href: string; icon: any; iconBg: string; iconColor: string;
    title: string; subtitle: string; onClick: () => void;
}) {
    return (
        <Link href={href} onClick={onClick} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg group transition-colors">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg} dark:bg-opacity-20`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#F7CA00] dark:group-hover:text-[#FFA41C] truncate">{title}</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">{subtitle}</p>
            </div>
        </Link>
    );
}

/* ═══════════════════════════════════════════════
   MOBILE TOP BAR
═══════════════════════════════════════════════ */
function MobileTopBar({ onMenuToggle, adminName, adminAvatar, unreadCount, onToggleNotifications, onToggleProfile }: {
    onMenuToggle: () => void; adminName: string; adminAvatar: string | null; unreadCount: number;
    onToggleNotifications: () => void; onToggleProfile: () => void;
}) {
    return (
        <div className="glass-effect text-slate-800 dark:text-white px-4 py-3 flex items-center justify-between gap-4 border-b border-white/40 dark:border-slate-800/40 md:hidden shadow-[0_4px_12px_rgba(0,0,0,0.02)] z-20 print:hidden sticky top-0">
            <button onClick={onMenuToggle} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition">
                <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <Link href="/admin/dashboard" className="flex flex-col leading-none items-center">
                <span className="font-black text-sm text-slate-900 dark:text-white tracking-tight">AL-QAVI</span>
                <span className="text-[8px] font-black tracking-[0.2em] text-[#F7CA00] dark:text-[#F7CA00] -mt-0.5 uppercase">Cosmetics Hub</span>
            </Link>
            <div className="flex items-center gap-2">
                <button onClick={onToggleNotifications} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition relative">
                    <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-800" />}
                </button>
                <button onClick={onToggleProfile}
                    className="w-10 h-10 bg-[#F7CA00] rounded-xl flex items-center justify-center text-[#131921] font-black text-xs hover:bg-[#1E40AF] transition-all shadow-lg shadow-blue-100 dark:shadow-none overflow-hidden">
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

    // Trigger loader on navigation
    useEffect(() => {
        setIsNavigating(true);
        const t = setTimeout(() => setIsNavigating(false), 500);
        return () => clearTimeout(t);
    }, [pathname]);

    // User state
    const [adminName, setAdminName] = useState('Admin');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminRole, setAdminRole] = useState('admin');
    const [adminId, setAdminId] = useState<string | undefined>(undefined);
    const [adminAvatar, setAdminAvatar] = useState<string | null>(null);

    // Dropdowns
    const [notifOpen, setNotifOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    // Activity
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [actLoading, setActLoading] = useState(false);

    // Workspace Visual Parameters (Real-time Mesh)
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [compactMode, setCompactMode] = useState(false);
    const [animationsEnabled, setAnimationsEnabled] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Load theme
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) {
            setTheme(savedTheme);
            if (savedTheme === 'dark') {
                document.documentElement.classList.add('dark');
            }
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = () => {
        document.documentElement.classList.add('transition-theme');
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        setTimeout(() => {
            document.documentElement.classList.remove('transition-theme');
        }, 500); // Wait for transition to finish
    };

    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<{ products: any[]; orders: any[]; users: any[] }>({
        products: [], orders: [], users: []
    });
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    const [isScrolled, setIsScrolled] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Refs
    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    // Settings state
    const [notifSettings, setNotifSettings] = useState<any>(null);

    /* ── Load user ── */
    useEffect(() => {
        const refreshAdminState = () => {
            const u = authService.getUser();
            if (u) {
                setAdminId(u.id);
                setAdminName(u.name || 'Administrator');
                setAdminEmail(u.email || '');
                setAdminRole((u as any).role || 'admin');
                setAdminAvatar((u as any).avatar || null);
            }
        };

        const refreshSettings = () => {
            settingsService.getSettings().then(s => {
                setNotifSettings(s);
                setTheme((s.theme as 'light' | 'dark') || 'light');
                setCompactMode(s.compact_mode ?? false);
                setAnimationsEnabled(s.animations ?? true);
                setSidebarCollapsed(s.sidebar_collapsed ?? false);
            }).catch(() => {});
        };

        refreshAdminState();
        refreshSettings();

        // Load full profile from DB
        settingsService.getProfile().then(p => {
            setAdminId(String(p.id));
            setAdminName(p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : adminName);
            setAdminEmail(p.email || adminEmail);
            if (p.avatar) setAdminAvatar(p.avatar);
        }).catch(() => { });

        const onStorage = () => refreshAdminState();
        const onProfileUpdate = () => refreshAdminState();
        const onSettingsUpdate = () => refreshSettings();

        window.addEventListener('storage', onStorage);
        window.addEventListener('profileUpdated', onProfileUpdate);
        window.addEventListener('settingsUpdated', onSettingsUpdate);

        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('profileUpdated', onProfileUpdate);
            window.removeEventListener('settingsUpdated', onSettingsUpdate);
        };
    }, []);

    /* ── Fetch Real Activity ── */
    const fetchActivity = async () => {
        if (actLoading) return;
        setActLoading(true);
        try {
            // Respect settings: if settings not loaded yet, assume True
            const showOrders = notifSettings?.notif_new_order ?? true;
            const showAlerts = notifSettings?.notif_low_stock ?? true;
            const showUsers = notifSettings?.notif_new_user ?? true;

            const [oRes, aRes, lRes] = await Promise.allSettled([
                showOrders ? orderService.getAll({ limit: 5 }) : Promise.resolve([]),
                showAlerts ? inventoryService.getAlerts({ limit: 5 }) : Promise.resolve([]),
                showUsers ? userService.getAllActivityLogs(10) : Promise.resolve([]),
            ]);

            const liveItems: ActivityItem[] = [];

            // 1) Process Real Orders
            if (oRes.status === 'fulfilled' && Array.isArray(oRes.value)) {
                oRes.value.forEach((o: any) => {
                    liveItems.push({
                        id: `order-${o.id}`, type: 'order',
                        title: `Order #${o.order_number || o.id}`,
                        desc: `${o.customer_name || 'Guest'} — PKR ${o.total_amount || o.total}`,
                        time: timeAgo(o.created_at || Date.now()),
                        timeRaw: new Date(o.created_at || Date.now()).getTime(),
                        href: `/admin/sales`, read: false,
                        icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50'
                    });
                });
            }

            // 2) Process Real Inventory Alerts
            if (aRes.status === 'fulfilled' && Array.isArray(aRes.value)) {
                aRes.value.forEach((a: any) => {
                    liveItems.push({
                        id: `alert-${a.id}`, type: 'alert',
                        title: 'Low Stock Alert',
                        desc: `${a.inventory_name || a.product_name} — ${a.stock_quantity || a.quantity} left`,
                        time: timeAgo(a.created_at || Date.now()),
                        timeRaw: new Date(a.created_at || Date.now()).getTime(),
                        href: '/admin/inventory', read: false,
                        icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50'
                    });
                });
            }

            // 3) Process Real Security Logs
            if (lRes.status === 'fulfilled' && Array.isArray(lRes.value)) {
                lRes.value.filter(l => l.action === 'create' || l.action === 'login').forEach((l: any) => {
                    liveItems.push({
                        id: `log-${l.id}`, type: 'user',
                        title: l.action === 'login' ? 'User Identity Login' : 'New Mesh Genesis',
                        desc: l.description || `${l.user_name} initialized`,
                        time: timeAgo(l.timestamp || Date.now()),
                        timeRaw: new Date(l.timestamp || Date.now()).getTime(),
                        href: '/admin/users', read: false,
                        icon: Users, color: 'text-violet-600', bg: 'bg-violet-50'
                    });
                });
            }

            // Sort by time descending
            setActivities(liveItems.sort((a, b) => b.timeRaw - a.timeRaw).slice(0, 15));
        } catch (err) {
            console.error('Activity fetch failure:', err);
        } finally {
            setActLoading(false);
        }
    };

    useEffect(() => {
        fetchActivity();
        const interval = setInterval(fetchActivity, 60000); // Auto-refresh every minute
        return () => clearInterval(interval);
    }, []);

    /* ── Search ── */
    useEffect(() => {
        if (!searchQuery.trim()) { setShowSearchDropdown(false); return; }
        setIsSearching(true);
        setShowSearchDropdown(true);
        const delay = setTimeout(async () => {
            const q = searchQuery.toLowerCase();
            try {
                const [pRes, oRes, uRes] = await Promise.all([
                    productService.getAll(), orderService.getAll(), userService.getAll(),
                ]);
                setSearchResults({
                    products: (Array.isArray(pRes) ? pRes : []).filter((p: any) => p.name?.toLowerCase().includes(q)).slice(0, 3),
                    orders: (Array.isArray(oRes) ? oRes : []).filter((o: any) => String(o.id).includes(q) || o.order_number?.includes(q)).slice(0, 3),
                    users: (Array.isArray(uRes) ? uRes : []).filter((u: any) => (`${u.first_name} ${u.last_name} ${u.email}`).toLowerCase().includes(q)).slice(0, 3),
                });
            } catch { setSearchResults({ products: [], orders: [], users: [] }); }
            finally { setIsSearching(false); }
        }, 300);
        return () => clearTimeout(delay);
    }, [searchQuery]);

    const unreadCount = activities.filter(a => !a.read).length;

    const handleMarkRead = (id: string) => setActivities(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    const handleMarkAllRead = () => setActivities(prev => prev.map(a => ({ ...a, read: true })));

    const handleLogout = () => { authService.logout(); router.push('/login'); };
    const handleProfileUpdated = (name: string, email: string, avatar?: string) => {
        setAdminName(name);
        setAdminEmail(email);
        if (avatar) setAdminAvatar(avatar);
        setProfileOpen(false);
    };

    const closeDropdowns = () => { setNotifOpen(false); setProfileOpen(false); };
    const closeSearch = () => setTimeout(() => setShowSearchDropdown(false), 200);

    const { products: sp, orders: so, users: su } = searchResults;
    const noResults = sp.length === 0 && so.length === 0 && su.length === 0;

    return (
        <AuthGuard allowedRoles={['admin']}>
            <div className={cn(
                "h-screen bg-[#f8fafc] dark:bg-[#111213] flex flex-col font-sans overflow-hidden print:h-auto print:overflow-visible print:bg-white text-slate-900 dark:text-[#f8fafc]",
                animationsEnabled ? "transition-colors duration-500" : "transition-none",
                theme,
                compactMode ? "text-[12px]" : "text-sm",
                !animationsEnabled && "[&_*]:transition-none"
            )}>

                {/* Mobile top bar */}
                <MobileTopBar
                    onMenuToggle={() => setMobileOpen(!mobileOpen)}
                    adminName={adminName}
                    adminAvatar={adminAvatar}
                    unreadCount={unreadCount}
                    onToggleNotifications={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
                    onToggleProfile={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
                />

                <div className="flex flex-1 min-h-0 print:block print:overflow-visible">
                    {/* Desktop Sidebar */}
                    <div className="hidden md:flex flex-col flex-shrink-0 z-30 print:hidden relative">
                        <AdminSidebar
                            isCollapsed={sidebarCollapsed}
                            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                        />
                    </div>

                    {/* Mobile Drawer */}
                    {mobileOpen && (
                        <div className="fixed inset-0 z-[100] md:hidden flex print:hidden">
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                            <div className="relative w-64 bg-white dark:bg-[#1e293b] shadow-2xl h-full border-r border-gray-100 dark:border-slate-800 z-[110]">
                                <AdminSidebar
                                    isCollapsed={false}
                                    onToggle={() => setMobileOpen(false)}
                                />
                                <button onClick={() => setMobileOpen(false)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100/50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition z-50">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 min-h-0 print:block print:overflow-visible print:min-h-auto">

                        {/* ═══ PREMIUM COMMAND NAVBAR ═══ */}
                        <div className="hidden md:flex bg-[#F9FAFB]/90 dark:bg-[#1B1C1E]/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 px-8 py-3.5 items-center justify-between gap-6 flex-shrink-0 z-40 shadow-xl print:hidden sticky top-0 transition-all duration-300">

                            {/* Refined Search Area */}
                            <div className="relative flex-1 max-w-lg group">
                                <div className="flex items-center gap-3.5 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 px-5 py-2.5 w-full focus-within:border-[#F7CA00] focus-within:ring-4 focus-within:ring-[#F7CA00]/10 transition-all duration-500 shadow-sm group-hover:shadow-md">
                                    <Search className="h-4 w-4 text-slate-400 group-focus-within:text-[#F7CA00] transition-colors duration-300" />
                                    <input type="text" placeholder="Command Search: products, orders, customers..."
                                        className="bg-transparent text-[11px] outline-none w-full text-slate-700 dark:text-slate-100 placeholder:text-slate-400/70 font-black uppercase tracking-wider"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
                                        onBlur={closeSearch} />
                                    {isSearching && <div className="w-4 h-4 rounded-full border-2 border-[#F7CA00] border-t-transparent animate-spin flex-shrink-0" />}
                                    <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200/50 dark:border-white/5 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                        <span>CMD</span>
                                        <span className="opacity-40">/</span>
                                        <span>K</span>
                                    </div>
                                </div>

                                {/* Intelligent Search Dropdown */}
                                {showSearchDropdown && (
                                    <div className="absolute top-full mt-3 left-0 right-0 bg-white/95 dark:bg-[#0f1012]/95 backdrop-blur-2xl rounded-2xl border border-slate-200 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <div className="max-h-[32rem] overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                            {noResults && !isSearching && (
                                                <div className="p-8 text-center space-y-2">
                                                    <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                                                        <Search className="w-5 h-5 text-slate-300" />
                                                    </div>
                                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">No results found for &quot;{searchQuery}&quot;</p>
                                                </div>
                                            )}
                                            {sp.length > 0 && (
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.25em] px-3 mb-2 underline decoration-[#F7CA00]/30 decoration-2 underline-offset-4">Logistics: Products</p>
                                                    {sp.map((p, i) => (
                                                        <SearchItem key={i} href="/admin/products" icon={Package}
                                                            iconBg="bg-blue-50" iconColor="text-blue-500"
                                                            title={p.name} subtitle={`PKR ${p.price}`}
                                                            onClick={closeDropdowns} />
                                                    ))}
                                                </div>
                                            )}
                                            {so.length > 0 && (
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.25em] px-3 mb-2 underline decoration-[#F7CA00]/30 decoration-2 underline-offset-4">Operations: Orders</p>
                                                    {so.map((o, i) => (
                                                        <SearchItem key={i} href="/admin/sales" icon={ShoppingCart}
                                                            iconBg="bg-blue-50" iconColor="text-blue-500"
                                                            title={`Order #${o.order_number || o.id}`}
                                                            subtitle={`PKR ${o.total_amount || o.total}`}
                                                            onClick={closeDropdowns} />
                                                    ))}
                                                </div>
                                            )}
                                            {su.length > 0 && (
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.25em] px-3 mb-2 underline decoration-[#F7CA00]/30 decoration-2 underline-offset-4">Security: Personnel</p>
                                                    {su.map((u, i) => (
                                                        <SearchItem key={i} href="/admin/users" icon={User}
                                                            iconBg="bg-purple-50" iconColor="text-purple-500"
                                                            title={u.first_name || u.full_name || u.username}
                                                            subtitle={u.email}
                                                            onClick={closeDropdowns} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Tactical Actions */}
                            <div className="flex items-center gap-3 relative">
                                <Link href="/"
                                    className="hidden lg:flex items-center gap-2.5 text-[10px] font-black text-white bg-[#F7CA00] px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-300 uppercase tracking-[0.1em] border border-white/10 active:scale-95">
                                    Live Store Front <ExternalLink className="h-3.5 w-3.5" />
                                </Link>

                                <div className="h-8 w-[1px] bg-slate-200 dark:bg-white/10 mx-1 hidden lg:block" />

                                {/* Interactive Notification Center */}
                                <div className="relative" ref={notifRef}>
                                    <button onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
                                        className={`relative p-3 rounded-2xl transition-all duration-300 border backdrop-blur-md
                                            ${notifOpen
                                                ? 'bg-[#F7CA00] text-white border-[#F7CA00] shadow-[0_0_20px_rgba(29,78,216,0.4)]'
                                                : 'bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-[#F7CA00]/30 hover:-translate-y-1'}`}>
                                        <Bell className="h-5 w-5" strokeWidth={2.5} />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-lg flex items-center justify-center border-2 border-white dark:border-[#0f1012] shadow-xl animate-bounce">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </button>
                                    {notifOpen && (
                                        <NotificationPanel
                                            activities={activities} loading={actLoading}
                                            onClose={() => setNotifOpen(false)}
                                            onMarkAllRead={handleMarkAllRead}
                                            onMarkRead={handleMarkRead}
                                            onRefresh={fetchActivity} />
                                    )}
                                </div>

                                {/* Dynamic Theme Integration */}
                                <button onClick={toggleTheme}
                                    className="relative p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-[#F7CA00] transition-all duration-500 hover:-translate-y-1 w-11 h-11 flex items-center justify-center group overflow-hidden">
                                    <div className={`absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${theme === 'dark' ? 'opacity-0 translate-y-8 scale-50' : 'opacity-100 translate-y-0 scale-100'}`}>
                                        <Moon className="h-5 w-5" />
                                    </div>
                                    <div className={`absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${theme === 'light' ? 'opacity-0 -translate-y-8 scale-50' : 'opacity-100 translate-y-0 scale-100 rotate-0'}`}>
                                        <Sun className="h-5 w-5 text-[#F7CA00]" />
                                    </div>
                                    <div className="absolute inset-0 bg-[#F7CA00]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>

                                {/* Command Personnel Identity */}
                                <div className="relative pl-1" ref={profileRef}>
                                    <button onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
                                        className={`flex items-center gap-3.5 px-3.5 py-2 rounded-2xl transition-all duration-500 border border-transparent group
                                            ${profileOpen ? 'bg-[#F7CA00]/5 border-[#F7CA00]/20 ring-4 ring-[#F7CA00]/5' : 'hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-white/10'}`}>
                                        <div className="relative">
                                            <div className="w-10 h-10 bg-[#F7CA00] rounded-2xl flex items-center justify-center flex-shrink-0 border-2 border-white dark:border-white/10 overflow-hidden shadow-lg group-hover:rotate-6 transition-transform">
                                                {adminAvatar ? (
                                                    <img src={getImageUrl(adminAvatar) || ''} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-[12px] font-black text-white">
                                                        {adminName ? adminName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'A'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-[#0f1012] rounded-full" />
                                        </div>
                                        <div className="hidden xl:block text-left min-w-0">
                                            <p className="text-slate-900 dark:text-white font-black text-[12px] leading-tight truncate max-w-[140px] uppercase tracking-wider">{adminName}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <div className="w-1 h-1 rounded-full bg-[#F7CA00]" />
                                                <p className="text-[9px] text-[#F7CA00] font-black uppercase tracking-[0.2em] truncate max-w-[140px] opacity-80">{adminEmail || 'Admin Node'}</p>
                                            </div>
                                        </div>
                                    </button>

                                    {profileOpen && (
                                        <ProfileDropdown
                                            user={{ name: adminName, email: adminEmail, role: adminRole, id: adminId, avatar: adminAvatar || undefined }}
                                            onClose={() => setProfileOpen(false)}
                                            onLogout={handleLogout}
                                            onUpdated={handleProfileUpdated} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Page Content */}
                        <main className="flex-1 overflow-y-auto p-4 lg:p-6 print:overflow-visible print:p-0 print:h-auto transition-colors duration-500 relative" onClick={closeDropdowns}>
                            {isNavigating && <PageLoader />}
                            {children}
                        </main>
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}
