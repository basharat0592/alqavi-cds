'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
    Search, ShoppingCart, Menu, X, MapPin, ChevronDown,
    LogOut, LayoutDashboard, User, Heart, Package,
    Tag, Star, Gift, TrendingUp, Phone, Globe, Bell, Truck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from "@/context/CartContext";
import { getImageUrl } from "@/lib/utils";
import { authService, User as AuthUser } from '@/lib/auth';
import { productService, mainCategoryService } from '@/lib/api';

const CATEGORIES = [
    { name: 'All Departments', href: '/shop' },
    { name: 'New Arrivals', href: '/shop?cat=New Arrivals' },
    { name: 'Best Sellers', href: '/shop?cat=Best Sellers' },
    { name: 'Skincare', href: '/shop?cat=Skincare' },
    { name: 'Makeup', href: '/shop?cat=Makeup' },
    { name: 'Fragrance', href: '/shop?cat=Fragrance' },
    { name: 'Haircare', href: '/shop?cat=Haircare' },
    { name: 'Gift Sets', href: '/shop?cat=Gift Sets' },
];

const NAV_LINKS = [
    { href: '/shop', label: "All Products" },
    { href: '/shop?cat=New Arrivals', label: 'New Arrivals' },
    { href: '/shop?cat=Best Sellers', label: 'Best Sellers' },
    { href: '/shop?cat=Skincare', label: 'Skincare' },
    { href: '/shop?cat=Makeup', label: 'Makeup' },
];

export default function Navbar() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCat, setSelectedCat] = useState('All');
    const [catOpen, setCatOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const [mainCategories, setMainCategories] = useState<any[]>([]);
    const [scrolled, setScrolled] = useState(false);

    const router = useRouter();
    const { cartCount } = useCart();
    const searchRef = useRef<HTMLDivElement>(null);
    const userRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        setUser(authService.getUser());
        productService.getAll().then(data => {
            const apiArr = (Array.isArray(data) ? data : (data as any).results || []).filter((p: any) => p.status === 'active');
            setAllProducts(apiArr);
        }).catch(() => { });

        mainCategoryService.getAll().then(data => {
            setMainCategories(data.filter(c => c.status === 'active').slice(0, 8));
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
        router.push(`/shop?q=${encodeURIComponent(q)}`);
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
            .filter((p: any) => p.name?.toLowerCase().includes(q))
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

    return (
        <header className={`z-50 sticky top-0 transition-all duration-500 ${scrolled ? 'py-2' : 'py-4'}`}>
            <div className={`container mx-auto px-4 lg:px-6`}>
                <div className={`glass rounded-2xl p-2 px-4 flex items-center gap-6 shadow-2xl transition-all duration-500 ${scrolled ? 'bg-white/80 dark:bg-[#0f111a]/80 scale-[0.99]' : 'bg-white/95 dark:bg-[#0f111a]/95'}`}>

                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group shrink-0">
                        <div className="w-10 h-10 bg-slate-900 dark:bg-accent rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105">
                            <Star className="h-6 w-6 fill-white" />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="font-bold text-xl tracking-tight dark:text-white">Al-Qavi</span>
                            <span className="text-[10px] font-bold tracking-widest text-accent uppercase">Premium</span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden xl:flex items-center gap-1 font-medium text-sm">
                        <Link href="/shop" className="px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors nav-link font-bold text-accent">
                            All Products
                        </Link>
                        {mainCategories.map(l => (
                            <Link key={l.id} href={`/shop?mcat=${l.slug || l.name}`} className="px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors nav-link">
                                {l.name}
                            </Link>
                        ))}
                    </nav>

                    {/* Search Bar */}
                    <div className="hidden lg:flex flex-1 max-w-xl relative" ref={searchRef}>
                        <form onSubmit={handleSearch} className="w-full relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-accent transition-colors" />
                            <input
                                type="text"
                                className="w-full bg-slate-100 dark:bg-white/5 border-none focus:ring-2 focus:ring-accent/20 rounded-xl py-2.5 pl-11 pr-4 text-sm transition-all outline-none"
                                placeholder="Search products, brands and more..."
                                value={searchQuery}
                                onChange={(e) => handleQueryChange(e.target.value)}
                            />
                        </form>

                        {/* Search Results Dropdown */}
                        {searchOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 glass rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                {searchResults.map((p) => (
                                    <Link key={p.id} href={`/product/${p.id}`} onClick={() => setSearchOpen(false)} className="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex-shrink-0 border">
                                            <img src={getImageUrl(p.image_url || p.image) || ''} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold dark:text-white">{p.name}</div>
                                            <div className="text-xs text-slate-500 capitalize">{p.category_name || p.category}</div>
                                        </div>
                                        <div className="ml-auto text-sm font-bold text-accent">PKR {parseFloat(p.price).toLocaleString()}</div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-auto">

                        <div className="relative" ref={userRef}>
                            {!user ? (
                                <div className="flex items-center gap-2">
                                    <Link href="/login" className="px-5 py-2 text-sm font-bold text-slate-700 hover:text-black transition-colors">
                                        Login
                                    </Link>
                                    <Link href="/register" className="px-5 py-2 text-sm font-black text-[#131921] bg-[#FF9900] rounded-xl hover:bg-[#e68a00] transition-all shadow-sm shadow-[#FF9900]/20 active:scale-[0.98]">
                                        Sign Up
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden border border-white/20">
                                            <span className="text-xs font-bold">{user.name[0]}</span>
                                        </div>
                                        <span className="hidden md:block text-sm font-bold dark:text-white">{user.name.split(' ')[0]}</span>
                                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {userMenuOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-64 glass rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                                            <div className="p-1">
                                                <div className="px-4 py-3 border-b dark:border-white/5 mb-1">
                                                    <div className="font-bold dark:text-white truncate">{user.name}</div>
                                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{user.role} Account</div>
                                                </div>
                                                {user.role === 'admin' ? (
                                                    <Link href="/admin/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors dark:text-slate-300">
                                                        <LayoutDashboard className="h-4 w-4" /> Admin Dashboard
                                                    </Link>
                                                ) : (
                                                    <Link href="/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors dark:text-slate-300">
                                                        <LayoutDashboard className="h-4 w-4" /> My Dashboard
                                                    </Link>
                                                )}
                                                <Link href="/dashboard/orders" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors dark:text-slate-300">
                                                    <Package className="h-4 w-4" /> My Orders
                                                </Link>
                                                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 transition-colors mt-1">
                                                    <LogOut className="h-4 w-4" /> Sign Out
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <Link href="/cart" className="relative p-2.5 rounded-xl bg-slate-900 text-white shadow-lg hover:bg-slate-800 transition-all">
                            <ShoppingCart className="h-5 w-5" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#0f111a]">
                                    {cartCount}
                                </span>
                            )}
                        </Link>

                        <button onClick={() => setMobileOpen(true)} className="xl:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                            <Menu className="h-6 w-6 dark:text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar */}
            {mobileOpen && (
                <div className="fixed inset-0 z-[100] animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                    <div className="absolute right-0 top-0 h-full w-[300px] bg-white dark:bg-[#0f111a] shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
                        <div className="p-6 flex items-center justify-between border-b dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <Star className="h-5 w-5 text-accent fill-accent" />
                                <span className="font-bold dark:text-white">Al-Qavi</span>
                            </div>
                            <button onClick={() => setMobileOpen(false)}><X className="h-6 w-6 dark:text-slate-400" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            <div>
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Shop Categories</h3>
                                <div className="grid gap-2">
                                    <Link href="/shop" onClick={() => setMobileOpen(false)} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-sm font-semibold dark:text-white group transition-all hover:bg-accent hover:text-white uppercase tracking-tighter">
                                        All Products
                                        <TrendingUp className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                    {mainCategories.map(l => (
                                        <Link key={l.id} href={`/shop?mcat=${l.slug || l.name}`} onClick={() => setMobileOpen(false)} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-sm font-semibold dark:text-white group transition-all hover:bg-accent hover:text-white uppercase tracking-tighter">
                                            {l.name}
                                            <TrendingUp className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}

