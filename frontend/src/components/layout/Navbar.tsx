'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
    Search, ShoppingCart, Menu, X, MapPin, ChevronDown, ChevronRight,
    LogOut, LayoutDashboard, User, Heart, Package,
    Tag, Star, Gift, TrendingUp, Phone, Globe, Bell, Truck, Trash2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from "@/context/CartContext";
import { getImageUrl } from "@/lib/utils";
import { authService, User as AuthUser } from '@/lib/auth';
import { productService, sectionService } from '@/lib/api';
import Logo from "@/components/ui/Logo";

export default function Navbar({ settings }: { settings?: any }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCat, setSelectedCat] = useState('All');
    const [catOpen, setCatOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    const router = useRouter();
    const { cartCount, clearCart } = useCart();
    const searchRef = useRef<HTMLDivElement>(null);
    const userRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        setUser(authService.getUser());
        productService.getAll().then(data => {
            const apiArr = Array.isArray(data) ? data : (data as any).results || [];
            setAllProducts(apiArr);
        }).catch(() => { });

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const q = searchQuery.trim();
        if (!q) return;
        router.push(`/customer/shop?q=${encodeURIComponent(q)}`);
        setSearchOpen(false);
    };

    const handleQueryChange = (val: string) => {
        setSearchQuery(val);
        if (val.trim().length < 2) {
            setSearchResults([]);
            setSearchOpen(false);
            return;
        }
        const q = val.toLowerCase();
        const results = allProducts
            .filter((p: any) => {
                const name = (p.name || p.product_name || '').toLowerCase();
                const cat = (p.category_name || p.category?.name || '').toLowerCase();
                return name.includes(q) || cat.includes(q);
            })
            .slice(0, 8);
        setSearchResults(results);
        setSearchOpen(results.length > 0);
    };

    const handleLogout = () => {
        authService.logout();
        setUser(null);
        setUserMenuOpen(false);
        router.push('/');
    };

    const siteLogo = settings?.logo ? getImageUrl(settings.logo) : null;
    const siteName = settings?.site_name || "AL-QAVI";

    return (
        <header className={`z-50 sticky top-0 transition-all duration-500 ${scrolled ? 'py-1' : 'py-2'}`}>
            <div className="w-full px-4 md:px-8 lg:px-10">
                <div className={`rounded-2xl bg-white/95 dark:bg-[#232F3E]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] transition-all duration-500 ${scrolled ? 'py-1 px-5' : 'py-2 px-6'}`}>
                    <div className="flex items-center justify-between gap-6 h-14">

                        {/* BRAND / LOGO */}
                        <Link href="/" className="flex items-center gap-2 group shrink-0 transition-all hover:opacity-90">
                            {siteLogo ? (
                                <img src={siteLogo} alt={siteName} className="h-10 w-auto object-contain" />
                            ) : (
                                <Logo size="sm" className="scale-[1.3] py-2" />
                            )}
                        </Link>

                        {/* SEARCH SYSTEM */}
                        <div className="hidden lg:flex flex-1 max-w-xl relative" ref={searchRef}>
                            <form onSubmit={handleSearch} className="w-full flex h-11">
                                <div className="flex-1 relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#F59E0B] transition-colors" />
                                    <input
                                        type="text"
                                        className="w-full h-full bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-[#F59E0B]/30 rounded-l-xl pl-11 pr-4 text-sm text-[#1d252c] dark:text-white outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                        placeholder="Search products..."
                                        value={searchQuery}
                                        onChange={(e) => handleQueryChange(e.target.value)}
                                    />
                                </div>
                                <button className="px-6 bg-[#F59E0B] hover:bg-[#F59E0B] text-white rounded-r-xl transition-colors flex items-center justify-center shadow-lg shadow-[#F59E0B]/20">
                                    <Search className="h-4 w-4 stroke-[3]" />
                                </button>
                            </form>

                            {/* SEARCH RESULTS */}
                            {searchOpen && (
                                <div className="absolute top-[calc(100%+10px)] left-0 right-0 bg-white dark:bg-[#232F3E] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[60] p-2">
                                    {searchResults.map((p) => (
                                        <Link key={p.id} href={`/customer/product/${p.id}`} onClick={() => setSearchOpen(false)} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group/res">
                                            <div className="w-11 h-11 rounded-lg bg-white dark:bg-white/5 p-1 border border-slate-100 dark:border-white/5 shrink-0">
                                                <img src={getImageUrl(p.image_url || p.image) || ''} className="w-full h-full object-contain" alt="" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-bold text-[#1d252c] dark:text-white group-hover/res:text-[#F59E0B] transition-colors">
                                                    {(p.name || p.product_name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}
                                                </div>
                                                <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black">{p.category_name || (typeof p.category === 'object' ? p.category?.name : p.category) || 'Product'}</div>
                                            </div>
                                            <div className="text-sm font-black text-[#F59E0B]">Rs. {p.selling_price || p.price}</div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* NAV & ACCOUNT */}
                        <div className="flex items-center gap-2">
                            <nav className="hidden xl:flex items-center gap-1 mr-2 font-bold text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                <Link href="/customer" className="px-4 py-2 rounded-lg text-[#F59E0B] hover:bg-[#F59E0B]/5 transition-all">TOP PICK</Link>
                                <Link href="/customer#menu-section" className="px-4 py-2 rounded-lg hover:text-[#1d252c] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all">Best Seller</Link>
                                <Link href="/customer/tracking" className="px-4 py-2 rounded-lg hover:text-[#1d252c] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex items-center gap-2">
                                    <Globe className="h-3 w-3" /> Track Order
                                </Link>
                            </nav>

                            <div className="relative" ref={userRef}>
                                <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer group" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center font-bold text-[#1d252c] dark:text-white border border-slate-200 dark:border-white/10 overflow-hidden">
                                        {!user ? (
                                            <User size={18} />
                                        ) : user.avatar ? (
                                            <img
                                                src={getImageUrl(user.avatar)}
                                                alt={user.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            user.name[0]
                                        )}
                                    </div>
                                    <div className="hidden md:flex flex-col leading-none">
                                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase mb-0.5 tracking-tighter">
                                            {user ? 'Account' : 'Sign In'}
                                        </span>
                                        <span className="text-[11px] text-[#1d252c] dark:text-white font-black uppercase tracking-tight">
                                            {user ? user.name.split(' ')[0] : 'Profile'}
                                        </span>
                                    </div>
                                    <ChevronDown className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-[#F59E0B] transition-colors" />
                                </div>

                                {userMenuOpen && (
                                    <div className="absolute top-[calc(100%+12px)] right-0 w-64 bg-white dark:bg-[#232F3E] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {!user ? (
                                            <div className="p-2 space-y-1">
                                                <div className="px-4 py-3 border-b border-slate-50 dark:border-white/5 mb-1">
                                                    <div className="text-[#1d252c] dark:text-white font-bold">Welcome</div>
                                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black">Access your account</div>
                                                </div>
                                                <Link href="/login" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl bg-[#F59E0B] text-white text-[11px] font-black tracking-widest uppercase hover:bg-[#F59E0B] transition-all justify-center">
                                                    Sign In
                                                </Link>
                                                <Link href="/register" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 text-[#1d252c] dark:text-white text-[11px] font-black tracking-widest uppercase hover:bg-slate-50 dark:hover:bg-white/5 transition-all justify-center">
                                                    Create Account
                                                </Link>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="px-4 py-3 border-b border-slate-50 dark:border-white/5 mb-1">
                                                    <div className="text-[#1d252c] dark:text-white font-bold truncate">{user?.name}</div>
                                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black">{user?.role} status</div>
                                                </div>
                                                <Link href={user?.role === 'admin' ? '/admin/dashboard' : '/customer/dashboard'} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-[11px] font-black tracking-widest uppercase text-slate-600 dark:text-slate-400 hover:text-[#F59E0B] dark:hover:text-[#F59E0B] transition-colors">
                                                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                                                </Link>
                                                <Link href="/customer/dashboard/orders" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-[11px] font-black tracking-widest uppercase text-slate-600 dark:text-slate-400 hover:text-[#F59E0B] dark:hover:text-[#F59E0B] transition-colors">
                                                    <Package className="h-4 w-4" /> My Orders
                                                </Link>
                                                <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-[11px] font-black tracking-widest uppercase text-red-500 transition-colors">
                                                    <LogOut className="h-4 w-4" /> Sign Out
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                <Link href="/customer/cart" className="relative w-11 h-11 flex items-center justify-center bg-slate-100 dark:bg-white/5 hover:bg-[#F59E0B]/10 rounded-xl transition-all group/cart">
                                    <ShoppingCart className="h-5 w-5 text-[#1d252c] dark:text-white group-hover/cart:text-[#F59E0B] transition-colors" />
                                    {cartCount > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 bg-[#F59E0B] text-white text-[10px] font-black w-6 h-6 rounded-lg flex items-center justify-center ring-4 ring-white dark:ring-[#232F3E] shadow-md">
                                            {cartCount}
                                        </span>
                                    )}
                                </Link>
                                {cartCount > 0 && (
                                    <button
                                        onClick={clearCart}
                                        title="Clear Cart"
                                        className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            <button onClick={() => setMobileOpen(true)} className="xl:hidden w-11 h-11 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                                <Menu className="h-6 w-6 text-[#1d252c] dark:text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MOBILE LIGHT MENU */}
            {mobileOpen && (
                <div className="fixed inset-0 z-[100] animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setMobileOpen(false)} />
                    <div className="absolute right-4 top-4 bottom-4 w-[280px] bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-500">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {siteLogo ? (
                                    <img src={siteLogo} alt={siteName} className="h-10 w-auto" />
                                ) : (
                                    <div className="w-10 h-10 bg-[#F59E0B] rounded-lg flex items-center justify-center">
                                        <Star className="h-6 w-6 fill-white text-white" />
                                    </div>
                                )}
                                <span className="font-extrabold text-[#1d252c] text-lg tracking-tight uppercase">{siteName}</span>
                            </div>
                            <button onClick={() => setMobileOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-lg"><X className="h-6 w-6 text-slate-400" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Main Menu</p>
                                <div className="grid gap-2">
                                    <Link href="/customer/shop" onClick={() => setMobileOpen(false)} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 text-[11px] font-black uppercase text-[#1d252c] hover:bg-[#F59E0B] hover:text-white transition-all">
                                        Browse Products <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}


