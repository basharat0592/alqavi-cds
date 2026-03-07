'use client';

import { useState, useEffect, useRef } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import AdminSidebar from '@/components/layout/AdminSidebar';
import NotificationPanel, { type ActivityItem } from '@/components/admin/NotificationPanel';
import ProfileDropdown from '@/components/admin/ProfileDropdown';
import {
    Menu, X, Bell, Search, ExternalLink, Package, ShoppingCart,
    User, ShoppingBag, Users, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { productService, orderService, userService, settingsService } from '@/lib/api';

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
        <Link href={href} onClick={onClick} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg group transition-colors">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 group-hover:text-[#FF9900] truncate">{title}</p>
                <p className="text-xs text-gray-500 truncate">{subtitle}</p>
            </div>
        </Link>
    );
}

/* ═══════════════════════════════════════════════
   MOBILE TOP BAR
═══════════════════════════════════════════════ */
function MobileTopBar({ onMenuToggle, adminName, unreadCount, onToggleNotifications, onToggleProfile }: {
    onMenuToggle: () => void; adminName: string; unreadCount: number;
    onToggleNotifications: () => void; onToggleProfile: () => void;
}) {
    return (
        <div className="bg-white text-gray-800 px-4 py-3 flex items-center justify-between gap-4 border-b border-gray-200 md:hidden shadow-sm z-20 print:hidden">
            <button onClick={onMenuToggle} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <Menu className="h-5 w-5 text-gray-600" />
            </button>
            <Link href="/admin/dashboard" className="flex flex-col leading-none items-center">
                <span className="font-black text-sm text-gray-900 tracking-tight">Al-Qavi</span>
                <span className="text-[8px] font-bold tracking-[0.15em] text-[#FF9900] -mt-0.5">COSMETICS</span>
            </Link>
            <div className="flex items-center gap-2">
                <button onClick={onToggleNotifications} className="p-1.5 hover:bg-gray-100 rounded-lg transition relative">
                    <Bell className="h-5 w-5 text-gray-500" />
                    {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />}
                </button>
                <button onClick={onToggleProfile}
                    className="w-8 h-8 bg-[#FF9900] rounded-lg flex items-center justify-center text-[#131921] font-black text-xs hover:bg-[#e68a00] transition-colors">
                    {adminName ? adminName[0].toUpperCase() : 'A'}
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

    // User state
    const [adminName, setAdminName] = useState('Admin');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminRole, setAdminRole] = useState('admin');
    const [adminId, setAdminId] = useState<string | undefined>(undefined);

    // Dropdowns
    const [notifOpen, setNotifOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    // Activity
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [actLoading, setActLoading] = useState(false);

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
        const u = authService.getUser();
        if (u) {
            setAdminName(u.name);
            setAdminEmail(u.email || '');
            setAdminRole((u as any).role || 'admin');
            setAdminId(u.id);
        }
        settingsService.getProfile().then(p => {
            setAdminId(String(p.id));
            setAdminName(p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : adminName);
            setAdminEmail(p.email || adminEmail);
        }).catch(() => { });
    }, []);

    /* ── Fetch activity ── */
    const fetchActivity = async () => {
        setActLoading(true);
        try {
            const [ordersRes, usersRes, productsRes] = await Promise.allSettled([
                orderService.getAll(), userService.getAll(), productService.getAll(),
            ]);

            const items: ActivityItem[] = [];

            const orders = ordersRes.status === 'fulfilled'
                ? (Array.isArray(ordersRes.value) ? ordersRes.value : [])
                    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                : [];

            orders.slice(0, 4).forEach((o: any) => {
                const ts = o.created_at || o.date || Date.now();
                const c = o.customer as any;
                const customerName = o.customer_name || (c?.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c?.username || c?.email || (typeof o.customer === 'string' ? o.customer : 'Guest'));

                items.push({
                    id: `order-${o.id}`, type: 'order',
                    title: `New Order #${o.order_number || o.orderNumber || o.id}`,
                    desc: `${customerName} — PKR ${parseFloat(o.total_amount || o.total || 0).toFixed(0)}`,
                    time: timeAgo(ts), timeRaw: new Date(ts).getTime(),
                    href: '/admin/sales', read: false,
                    icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50',
                });
            });

            const users = usersRes.status === 'fulfilled'
                ? (Array.isArray(usersRes.value) ? usersRes.value : [])
                    .sort((a: any, b: any) => new Date(b.date_joined || 0).getTime() - new Date(a.date_joined || 0).getTime())
                : [];

            users.slice(0, 3).forEach((u: any) => {
                const ts = u.date_joined || u.created_at || Date.now();
                const userName = u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.name || u.email || u.username;
                items.push({
                    id: `user-${u.id}`, type: 'user',
                    title: 'New User Registered',
                    desc: `${userName} joined`,
                    time: timeAgo(ts), timeRaw: new Date(ts).getTime(),
                    href: '/admin/users', read: false,
                    icon: Users, color: 'text-violet-600', bg: 'bg-violet-50',
                });
            });

            const products = productsRes.status === 'fulfilled'
                ? (Array.isArray(productsRes.value) ? productsRes.value : []) : [];

            products.filter((p: any) => {
                const s = p.quantity_in_stock ?? p.stock ?? p.stock_quantity ?? 0;
                return s < 10 && s > 0;
            }).slice(0, 2).forEach((p: any) => {
                const stock = p.quantity_in_stock ?? p.stock ?? p.stock_quantity;
                items.push({
                    id: `low-${p.id}`, type: 'alert',
                    title: 'Low Stock Alert',
                    desc: `"${p.name}" — ${stock} units left`,
                    time: 'Now', timeRaw: Date.now(),
                    href: '/admin/products', read: false,
                    icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50',
                });
            });

            items.sort((a, b) => b.timeRaw - a.timeRaw);
            setActivities(items);
        } catch (err) {
            console.error('Activity fetch failed', err);
        } finally { setActLoading(false); }
    };

    useEffect(() => { fetchActivity(); }, []);

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
    const handleProfileUpdated = (name: string, email: string) => {
        setAdminName(name); setAdminEmail(email); setProfileOpen(false);
    };

    const closeDropdowns = () => { setNotifOpen(false); setProfileOpen(false); };
    const closeSearch = () => setTimeout(() => setShowSearchDropdown(false), 200);

    const { products: sp, orders: so, users: su } = searchResults;
    const noResults = sp.length === 0 && so.length === 0 && su.length === 0;

    return (
        <AuthGuard allowedRoles={['admin']}>
            <div className="h-screen bg-[#EAEDED] flex flex-col font-sans overflow-hidden print:h-auto print:overflow-visible print:bg-white">

                {/* Mobile top bar */}
                <MobileTopBar
                    onMenuToggle={() => setMobileOpen(!mobileOpen)}
                    adminName={adminName}
                    unreadCount={unreadCount}
                    onToggleNotifications={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
                    onToggleProfile={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
                />

                <div className="flex flex-1 min-h-0 print:block print:overflow-visible">
                    {/* Desktop Sidebar */}
                    <div className="hidden md:flex flex-col flex-shrink-0 overflow-y-auto print:hidden">
                        <AdminSidebar />
                    </div>

                    {/* Mobile Drawer */}
                    {mobileOpen && (
                        <div className="fixed inset-0 z-50 md:hidden flex print:hidden">
                            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
                            <div className="relative overflow-y-auto w-64 bg-white shadow-2xl h-full border-r border-gray-100">
                                <AdminSidebar />
                                <button onClick={() => setMobileOpen(false)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 bg-gray-100/50 hover:bg-gray-100 p-1.5 rounded-lg transition z-50">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 min-h-0 print:block print:overflow-visible print:min-h-auto">

                        {/* ═══ DESKTOP NAVBAR ═══ */}
                        <div className="hidden md:flex bg-[#131921] border-b border-[#232F3E] px-6 py-3 items-center justify-between gap-4 flex-shrink-0 z-10 shadow-md relative print:hidden">

                            {/* Search Bar */}
                            <div className="relative flex-1 max-w-md">
                                <div className="flex items-center gap-2 bg-[#232F3E] rounded-xl border border-[#3d4f5c] px-3 py-2 w-full focus-within:ring-2 focus-within:ring-[#FF9900]/40 focus-within:border-[#FF9900] transition-all">
                                    <Search className="h-4 w-4 text-gray-300 flex-shrink-0" />
                                    <input type="text" placeholder="Search products, orders, users..."
                                        className="bg-transparent text-sm outline-none w-full text-gray-100 placeholder:text-gray-400 font-medium"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
                                        onBlur={closeSearch} />
                                    {isSearching && <div className="w-4 h-4 rounded-full border-2 border-[#FF9900] border-t-transparent animate-spin flex-shrink-0" />}
                                </div>

                                {/* Search Dropdown */}
                                {showSearchDropdown && (
                                    <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                        <div className="max-h-96 overflow-y-auto p-2 space-y-2">
                                            {noResults && !isSearching && (
                                                <p className="p-4 text-center text-sm text-gray-500">No results for &quot;{searchQuery}&quot;</p>
                                            )}
                                            {sp.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-1">Products</p>
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
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-1">Orders</p>
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
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-1">Users</p>
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
                                    className="text-xs font-bold text-[#131921] bg-[#FF9900] px-3 py-1.5 rounded-lg transition flex items-center gap-1 hover:bg-[#e68a00]">
                                    View Store <ExternalLink className="h-3 w-3" />
                                </Link>

                                <div className="border-l border-gray-600 h-6 mx-1" />

                                {/* Notifications */}
                                <div className="relative" ref={notifRef}>
                                    <button onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
                                        className={`relative p-2.5 rounded-lg transition-all duration-200
                                            ${notifOpen ? 'bg-[#FF9900]/20 text-[#FF9900]' : 'hover:bg-white/10 text-gray-300'}`}>
                                        <Bell className="h-5 w-5" strokeWidth={2} />
                                        {unreadCount > 0 && (
                                            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm">
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

                                {/* Profile */}
                                <div className="relative" ref={profileRef}>
                                    <button onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200
                                            ${profileOpen ? 'bg-[#FF9900]/20' : 'hover:bg-white/10'}`}>
                                        <div className="w-8 h-8 bg-[#FF9900] rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-black text-[#131921]">
                                                {adminName ? adminName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'A'}
                                            </span>
                                        </div>
                                        <div className="hidden lg:block text-left min-w-0">
                                            <p className="text-white font-bold text-sm leading-tight truncate max-w-[120px]">{adminName}</p>
                                            <p className="text-[10px] text-[#FF9900] font-medium truncate max-w-[120px]">{adminEmail || 'Administrator'}</p>
                                        </div>
                                    </button>

                                    {profileOpen && (
                                        <ProfileDropdown
                                            user={{ name: adminName, email: adminEmail, role: adminRole, id: adminId }}
                                            onClose={() => setProfileOpen(false)}
                                            onLogout={handleLogout}
                                            onUpdated={handleProfileUpdated} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Page Content */}
                        <main className="flex-1 overflow-y-auto p-4 lg:p-6 print:overflow-visible print:p-0 print:h-auto" onClick={closeDropdowns}>
                            {children}
                        </main>
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}
