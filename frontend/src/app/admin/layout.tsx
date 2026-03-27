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
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { productService, orderService, userService, settingsService, inventoryService, paymentService } from '@/lib/api';

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
                <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#FF9900] dark:group-hover:text-[#FFA41C] truncate">{title}</p>
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
                <span className="text-[8px] font-black tracking-[0.2em] text-[#FF9900] dark:text-[#FFA41C] -mt-0.5 uppercase">Cosmetics Hub</span>
            </Link>
            <div className="flex items-center gap-2">
                <button onClick={onToggleNotifications} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition relative">
                    <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-800" />}
                </button>
                <button onClick={onToggleProfile}
                    className="w-10 h-10 bg-[#FF9900] rounded-xl flex items-center justify-center text-[#131921] font-black text-xs hover:bg-[#E68A00] transition-all shadow-lg shadow-orange-100 dark:shadow-none overflow-hidden">
                    {adminAvatar ? (
                        <img src={adminAvatar} alt="Profile" className="w-full h-full object-cover" />
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
    const [mobileOpen, setMobileOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

    // Theme state
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

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

    // Refs
    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

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

        refreshAdminState();

        // Load full profile from DB initially as well
        settingsService.getProfile().then(p => {
            setAdminId(String(p.id));
            setAdminName(p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : adminName);
            setAdminEmail(p.email || adminEmail);
            if (p.avatar) setAdminAvatar(p.avatar);
        }).catch(() => { });

        const onStorage = () => refreshAdminState();
        const onProfileUpdate = () => refreshAdminState();

        window.addEventListener('storage', onStorage);
        window.addEventListener('profileUpdated', onProfileUpdate);

        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('profileUpdated', onProfileUpdate);
        };
    }, []);

    /* ── Fetch activity (Mock only as requested) ── */
    const fetchActivity = async () => {
        setActLoading(true);
        try {
            // Simulated delay for premium feel
            await new Promise(r => setTimeout(r, 600));

            const items: ActivityItem[] = [
                {
                    id: 'm1', type: 'order', title: 'New Order #12093', desc: 'Saeed Khan — PKR 12,500',
                    time: '2 mins ago', timeRaw: Date.now() - 120000,
                    href: '/admin/sales', read: false, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50'
                },
                {
                    id: 'm2', type: 'alert', title: 'Low Stock Alert', desc: 'Face Wash — 5 units left',
                    time: '15 mins ago', timeRaw: Date.now() - 900000,
                    href: '/admin/inventory', read: false, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50'
                },
                {
                    id: 'm3', type: 'product', title: 'New Product Added', desc: '"Gold Serum" is now live',
                    time: '1 hour ago', timeRaw: Date.now() - 3600000,
                    href: '/admin/products', read: false, icon: Package, color: 'text-green-600', bg: 'bg-green-50'
                },
                {
                    id: 'm4', type: 'user', title: 'New User Registered', desc: 'Amna Ahmed joined',
                    time: '2 hours ago', timeRaw: Date.now() - 7200000,
                    href: '/admin/users', read: false, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50'
                },
                {
                    id: 'm5', type: 'order', title: 'New Order #12094', desc: 'Zia Ahmed — PKR 8,700',
                    time: '4 hours ago', timeRaw: Date.now() - 14400000,
                    href: '/admin/sales', read: false, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50'
                }
            ];

            setActivities(items);
        } catch (err) {
            console.error('Activity mock fail', err);
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
            <div className="h-screen bg-[#f8fafc] dark:bg-[#111213] flex flex-col font-sans overflow-hidden transition-colors duration-500 print:h-auto print:overflow-visible print:bg-white text-slate-900 dark:text-[#f8fafc]">

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

                        {/* ═══ DESKTOP NAVBAR ═══ */}
                        <div className="hidden md:flex bg-white dark:bg-[#1B1C1E] border-b border-slate-100 dark:border-white/5 px-8 py-3.5 items-center justify-between gap-6 flex-shrink-0 z-40 shadow-[0_2px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_20px_rgba(0,0,0,0.4)] relative print:hidden">

                            {/* Search Bar */}
                            <div className="relative flex-1 max-w-lg">
                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2.5 w-full focus-within:border-[#FF9900]/50 focus-within:ring-2 focus-within:ring-[#FF9900]/10 transition-all duration-300">
                                    <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                    <input type="text" placeholder="Search product, order, customer..."
                                        className="bg-transparent text-[12px] outline-none w-full text-slate-700 dark:text-slate-200 placeholder:text-slate-400 font-bold uppercase tracking-wide"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
                                        onBlur={closeSearch} />
                                    {isSearching && <div className="w-3.5 h-3.5 rounded-full border-2 border-[#FF9900] border-t-transparent animate-spin flex-shrink-0" />}
                                </div>

                                {/* Search Dropdown */}
                                {showSearchDropdown && (
                                    <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-[#0f1012] rounded-xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                        <div className="max-h-96 overflow-y-auto p-2 space-y-2">
                                            {noResults && !isSearching && (
                                                <p className="p-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">No results for &quot;{searchQuery}&quot;</p>
                                            )}
                                            {sp.length > 0 && (
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-1">Products</p>
                                                    {sp.map((p, i) => (
                                                        <SearchItem key={i} href="/admin/products" icon={Package}
                                                            iconBg="bg-orange-50" iconColor="text-orange-500"
                                                            title={p.name} subtitle={`PKR ${p.price}`}
                                                            onClick={closeDropdowns} />
                                                    ))}
                                                </div>
                                            )}
                                            {so.length > 0 && (
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-1">Orders</p>
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
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-1">Users</p>
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

                            {/* Right Actions */}
                            <div className="flex items-center gap-2 relative">
                                <Link href="/"
                                    className="text-[10px] font-black text-[#131921] dark:text-[#131921] bg-[#FF9900] px-4 py-2 rounded-lg border border-orange-600/20 shadow-lg shadow-orange-200/50 dark:shadow-[#FF9900]/10 transition-all hover:bg-[#E68A00] uppercase tracking-widest flex items-center gap-2">
                                    View Store <ExternalLink className="h-3 w-3" />
                                </Link>

                                <div className="border-l border-slate-200 dark:border-white/10 h-6 mx-2" />

                                {/* Notifications */}
                                <div className="relative" ref={notifRef}>
                                    <button onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
                                        className={`relative p-2.5 rounded-xl transition-all duration-200
                                            ${notifOpen ? 'bg-[#FF9900]/10 text-[#FF9900]' : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-white/10'}`}>
                                        <Bell className="h-4.5 w-4.5" strokeWidth={2} />
                                        {unreadCount > 0 && (
                                            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#FF9900] text-[#131921] text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-[#0f1012] shadow-sm">
                                                {unreadCount > 9 ? '9+' : unreadCount}
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

                                {/* Theme Toggle */}
                                <button onClick={toggleTheme}
                                    className="relative overflow-hidden p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all duration-200 border border-transparent hover:border-slate-200 dark:hover:border-white/10 flex items-center justify-center w-10 h-10">
                                    <div className={`absolute transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${theme === 'dark' ? 'opacity-0 scale-50 rotate-90' : 'opacity-100 scale-100 rotate-0'}`}>
                                        <Moon className="h-4.5 w-4.5" />
                                    </div>
                                    <div className={`absolute transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${theme === 'light' ? 'opacity-0 scale-50 -rotate-90' : 'opacity-100 scale-100 rotate-0'}`}>
                                        <Sun className="h-4.5 w-4.5 text-[#FF9900]" />
                                    </div>
                                </button>

                                {/* Profile */}
                                <div className="relative" ref={profileRef}>
                                    <button onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 border
                                            ${profileOpen ? 'bg-[#FF9900]/10 border-[#FF9900]/20' : 'hover:bg-slate-50 dark:hover:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/10'}`}>
                                        <div className="w-9 h-9 bg-[#FF9900] rounded-xl flex items-center justify-center flex-shrink-0 border border-orange-400/20 overflow-hidden">
                                            {adminAvatar ? (
                                                <img src={adminAvatar} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[11px] font-black text-[#131921]">
                                                    {adminName ? adminName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'A'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="hidden lg:block text-left min-w-0">
                                            <p className="text-slate-900 dark:text-white font-black text-[11px] leading-tight truncate max-w-[120px] uppercase tracking-tight">{adminName}</p>
                                            <p className="text-[9px] text-[#FF9900] font-black uppercase tracking-[0.15em] truncate max-w-[120px]">{adminEmail || 'Administrator'}</p>
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
                        <main className="flex-1 overflow-y-auto p-4 lg:p-6 print:overflow-visible print:p-0 print:h-auto transition-colors duration-500" onClick={closeDropdowns}>
                            {children}
                        </main>
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}
