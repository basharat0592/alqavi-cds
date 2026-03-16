'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
    Search, ShoppingCart, Menu, X, MapPin, ChevronDown,
    LogOut, LayoutDashboard, User, Heart, Package,
    Tag, Star, Gift, Truck, Settings, TrendingUp, Phone,
    Sun, Moon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from "@/context/CartContext";
import { getImageUrl } from "@/lib/utils";
import { authService, User as AuthUser } from '@/lib/auth';
import { productService } from '@/lib/api';

// ─── Data ───────────────────────────────────────────────────────────────────



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
    { href: '/shop', label: "All Products", icon: Tag },
    { href: '/shop?cat=New Arrivals', label: 'New Arrivals', icon: Star },
    { href: '/shop?cat=Best Sellers', label: 'Best Sellers', icon: TrendingUp },
    { href: '/shop?cat=Skincare', label: 'Skincare', icon: null },
    { href: '/shop?cat=Makeup', label: 'Makeup', icon: null },
    { href: '/shop?cat=Fragrance', label: 'Fragrance', icon: null },
    { href: '/shop?cat=Haircare', label: 'Haircare', icon: null },
    { href: '/shop?cat=Gift Sets', label: 'Gift Sets', icon: Gift },
];

// ─── Component ──────────────────────────────────────────────────────────────
export default function Navbar() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCat, setSelectedCat] = useState('All Departments');
    const [catOpen, setCatOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const [user, setUser] = useState<AuthUser | null>(null);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const searchRef = useRef<HTMLDivElement>(null);

    const router = useRouter();
    const { cartCount } = useCart();
    const catRef = useRef<HTMLDivElement>(null);
    const userRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        setUser(authService.getUser());

        // Initialize theme
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
        setTheme(savedTheme);
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        const onStorage = () => setUser(authService.getUser());
        window.addEventListener('storage', onStorage);

        const loadProducts = async () => {
            try {
                const apiData = await productService.getAll();
                const apiArr = (Array.isArray(apiData) ? apiData : (apiData as any).results || []).filter((p: any) => p.status === 'active');
                setAllProducts(apiArr);
            } catch {
                setAllProducts([]);
            }
        };
        loadProducts();

        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
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
        const catParam = selectedCat !== 'All Departments' ? `&cat=${encodeURIComponent(selectedCat)}` : '';
        router.push(`/shop?q=${encodeURIComponent(q)}${catParam}`);
        setSearchQuery('');
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
        const catFilter = selectedCat !== 'All Departments' ? selectedCat.toLowerCase() : null;
        const results = allProducts
            .filter((p: any) => {
                const nameMatch = p.name?.toLowerCase().includes(q);
                const catMatch = !catFilter || (p.category_name || p.category || '').toLowerCase().includes(catFilter);
                return nameMatch && catMatch;
            })
            .slice(0, 6);
        setSearchResults(results);
        setSearchOpen(results.length > 0);
    };
    const handleLogout = () => {
        authService.logout();
        setUser(null);
        setUserMenuOpen(false);
        router.push('/');
    };

    const getDashboardLink = () => {
        if (!user) return '/login';
        return '/admin/dashboard';
    };



    return (
        <>
            {/* ── Top Utility Bar ── */}
            <div className="bg-gray-50 text-gray-500 text-[11px] px-4 hidden md:flex items-center justify-between py-1.5 border-b border-gray-100 font-medium">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-[#FF9900]" /> 0347-7001241</span>
                    <span className="text-gray-200">|</span>
                    <span>📦 Free delivery on orders over Rs. 5,000</span>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="hover:text-[#FF9900] transition font-bold">Sign In</Link>

                </div>
            </div>

            {/* ── Main Header ── */}
            <header className="bg-white text-gray-900 sticky top-0 z-50 border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 lg:gap-4 px-3 lg:px-5 py-3">

                    {/* Logo */}
                    <Link href="/"
                        className="flex-shrink-0 flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition group">
                        <div className="flex flex-col leading-none">
                            <span className="font-black text-2xl tracking-tight text-[#FF9900] group-hover:scale-105 transition-transform">Al-Qavi</span>
                            <span className="text-[10px] font-bold tracking-[0.3em] text-gray-400 -mt-0.5">COSMETICS</span>
                        </div>
                    </Link>

                    {/* Deliver To — Desktop */}
                    <div className="hidden xl:flex items-center gap-2 hover:bg-gray-50 rounded-lg px-3 py-1.5 cursor-pointer transition whitespace-nowrap">
                        <MapPin className="h-4 w-4 text-[#FF9900]" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-[10px] text-gray-500 font-medium">Deliver to</span>
                            <span className="text-sm font-bold text-gray-900">Pakistan 🇵🇰</span>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 min-w-0 relative" ref={searchRef}>
                        <form onSubmit={handleSearch} className="flex h-11 rounded-full border-2 border-gray-100 focus-within:border-[#FF9900]/30 overflow-hidden bg-gray-50 transition-all">
                            {/* Category Dropdown */}
                            <div className="relative hidden sm:block flex-shrink-0" ref={catRef}>
                                <button type="button" onClick={() => setCatOpen(!catOpen)}
                                    className="h-full px-4 text-xs text-gray-600 hover:bg-gray-100 border-r border-gray-200 flex items-center gap-1 whitespace-nowrap transition font-bold">
                                    <span className="max-w-[80px] truncate">{selectedCat === 'All Departments' ? 'All' : selectedCat}</span>
                                    <ChevronDown className={`h-3 w-3 flex-shrink-0 transition-transform ${catOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {catOpen && (
                                    <div className="absolute top-full left-0 w-60 bg-white border border-gray-100 shadow-2xl rounded-xl z-50 py-2 mt-2 max-h-80 overflow-y-auto animate-fade-in-up">
                                        {CATEGORIES.map(c => (
                                            <button key={c.name} type="button"
                                                onClick={() => { setSelectedCat(c.name); setCatOpen(false); }}
                                                className={`w-full text-left px-5 py-2.5 text-sm hover:bg-gray-50 hover:text-[#FF9900] transition font-medium ${selectedCat === c.name ? 'font-bold text-[#FF9900] bg-gray-50' : 'text-gray-700'}`}>
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <input type="text" value={searchQuery}
                                onChange={e => handleQueryChange(e.target.value)}
                                onFocus={() => searchQuery.trim().length >= 2 && searchResults.length > 0 && setSearchOpen(true)}
                                placeholder="Search products, categories, brands..."
                                className="flex-1 px-4 text-sm text-gray-900 outline-none bg-transparent placeholder:text-gray-400 min-w-0" />

                            <button type="submit"
                                className="bg-[#FF9900] hover:bg-[#e68a00] px-6 text-white flex items-center justify-center transition flex-shrink-0 group">
                                <Search className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            </button>
                        </form>

                        {/* ── Live Search Dropdown ── */}
                        {searchOpen && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 shadow-2xl rounded-xl z-[60] overflow-hidden mt-2 animate-fade-in-up">
                                {searchResults.map((p: any, i: number) => (
                                    <Link
                                        key={p.id || i}
                                        href={`/product/${p.id || p.slug || '#'}`}
                                        onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                                        className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition group border-b border-gray-50 last:border-0">
                                        {p.image_url || p.image ? (
                                            <img src={getImageUrl(p.image_url || p.image) || ""} alt={p.name}
                                                className="w-12 h-12 object-cover rounded-lg border border-gray-100 flex-shrink-0 shadow-sm" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                                                <Package className="h-5 w-5 text-gray-400" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate group-hover:text-[#FF9900]">{p.name}</p>
                                            <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                                                <Tag className="h-3 w-3" /> {p.category_name || p.category || 'Product'}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-black text-[#FF9900]">Rs. {parseFloat(p.price || 0).toLocaleString()}</p>
                                        </div>
                                    </Link>
                                ))}
                                <Link
                                    href={`/shop?q=${encodeURIComponent(searchQuery)}`}
                                    onClick={() => { setSearchOpen(false); }}
                                    className="flex items-center justify-center gap-2 py-3 text-sm font-bold text-[#FF9900] hover:bg-gray-50 transition border-t border-gray-100 bg-gray-50/30">
                                    <Search className="h-4 w-4" />
                                    See all results for &quot;{searchQuery}&quot;
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">



                        {/* Account */}
                        <div className="relative hidden sm:block" ref={userRef}>
                            <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-2 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-left transition whitespace-nowrap">
                                <div className="w-8 h-8 rounded-full bg-[#FF9900]/10 flex items-center justify-center text-[#FF9900]">
                                    <User className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col leading-tight">
                                    <span className="text-[10px] text-gray-500 font-medium">
                                        {user ? `Welcome` : 'Sign in'}
                                    </span>
                                    <span className="text-sm font-bold text-gray-900 flex items-center gap-0.5">
                                        {user ? user.name.split(' ')[0] : 'Account'} <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                                    </span>
                                </div>
                            </button>

                            {userMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-64 bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-fade-in-up">
                                    {user ? (
                                        <>
                                            <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-[#FF9900] flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-sm">
                                                        {(user.name?.[0] || 'U').toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-sm text-gray-900 truncate">{user.name}</p>
                                                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                                    </div>
                                                </div>
                                                <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-widest bg-[#FF9900] text-white px-2.5 py-1 rounded-full">
                                                    {user.role}
                                                </span>
                                            </div>
                                            <div className="py-2">
                                                {[
                                                    { label: 'Dashboard', href: getDashboardLink(), icon: LayoutDashboard },
                                                    { label: 'All Products', href: '/shop', icon: Package },
                                                ].map(({ label, href, icon: Icon }) => (
                                                    <Link key={href} href={href} onClick={() => setUserMenuOpen(false)}
                                                        className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#FF9900] transition">
                                                        <Icon className="h-4 w-4 text-gray-400" /> {label}
                                                    </Link>
                                                ))}
                                                <div className="px-4 my-2">
                                                    <hr className="border-gray-100" />
                                                </div>
                                                <button onClick={handleLogout}
                                                    className="w-full flex items-center gap-3 px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition">
                                                    <LogOut className="h-4 w-4" /> Sign Out
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="p-5">
                                            <Link href="/login" onClick={() => setUserMenuOpen(false)}
                                                className="block w-full text-center py-2.5 mb-2 bg-[#FF9900] hover:bg-[#e68a00] text-white font-bold rounded-full text-sm transition shadow-md shadow-[#FF9900]/10">
                                                Sign In
                                            </Link>

                                            <hr className="border-gray-100 mb-4" />
                                            <div className="space-y-1">
                                                {[
                                                    { label: 'My Account', href: '/login', icon: User },
                                                    { label: 'Orders', href: '/login', icon: Package },
                                                    { label: 'Wishlist', href: '/login', icon: Heart },
                                                ].map(({ label, href, icon: Icon }) => (
                                                    <Link key={label} href={href} onClick={() => setUserMenuOpen(false)}
                                                        className="flex items-center gap-3 py-2 text-xs font-medium text-gray-600 hover:text-[#FF9900] transition">
                                                        <Icon className="h-4 w-4 text-gray-400" /> {label}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Returns & Orders */}
                        {/* Theme Toggle */}
                        <button onClick={toggleTheme}
                            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-500 dark:text-gray-400">
                            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-[#FF9900]" />}
                        </button>

                        <Link href="/shop"
                            className="hidden lg:flex items-center justify-center w-10 h-10 hover:bg-gray-50 rounded-full text-[#FF9900] transition">
                            <Heart className="h-6 w-6" />
                        </Link>

                        {/* Cart */}
                        <Link href="/cart"
                            className="flex items-center gap-2 bg-[#FF9900]/5 hover:bg-[#FF9900]/10 px-4 py-2 rounded-full relative transition border border-[#FF9900]/10 ml-2">
                            <div className="relative">
                                <ShoppingCart className="h-6 w-6 text-[#FF9900]" />
                                <span className={`absolute -top-2 -right-2 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center leading-none border-2 border-white ${cartCount > 0 ? 'bg-red-600 text-white' : 'bg-gray-400 text-white'}`}>
                                    {cartCount > 99 ? '99+' : cartCount}
                                </span>
                            </div>
                            <span className="font-bold text-sm text-[#FF9900] hidden sm:inline">Cart</span>
                        </Link>

                        {/* Mobile Menu Toggle */}
                        <button onClick={() => setMobileOpen(!mobileOpen)}
                            className="lg:hidden p-2 border border-transparent hover:border-white rounded transition ml-1">
                            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {/* ── Mobile Search ── */}
                <form onSubmit={handleSearch} className="sm:hidden flex h-11 mx-4 mb-3 rounded-full border-2 border-[#FF9900]/20 overflow-hidden bg-gray-50">
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search cosmetics..." className="flex-1 bg-transparent px-4 text-sm text-gray-900 outline-none" />
                    <button type="submit" className="bg-[#FF9900] px-5 text-white">
                        <Search className="h-4 w-4" />
                    </button>
                </form>

                {/* ── Nav Belt ── */}
                <nav className="hidden lg:flex bg-gray-50 text-gray-700 px-4 items-center gap-1 border-t border-gray-100 overflow-x-auto scrollbar-none py-1">
                    <button className="flex items-center gap-2 font-bold px-4 py-2 hover:bg-[#FF9900]/5 text-gray-900 rounded-lg transition whitespace-nowrap flex-shrink-0">
                        <Menu className="h-5 w-5 text-[#FF9900]" /> All Categories
                    </button>
                    {NAV_LINKS.map(l => (
                        <Link key={l.href} href={l.href}
                            className="px-4 py-2 hover:bg-[#FF9900]/5 hover:text-[#FF9900] rounded-lg transition whitespace-nowrap flex-shrink-0 font-bold text-xs uppercase tracking-wider">
                            {l.label}
                        </Link>
                    ))}
                </nav>
            </header>

            {/* ── Mobile Drawer ── */}
            {mobileOpen && (
                <div className="fixed inset-0 z-[100] lg:hidden">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                    <div className="absolute top-0 left-0 w-80 h-full bg-white text-gray-800 shadow-2xl overflow-y-auto flex flex-col animate-fade-in-up">

                        {/* User header */}
                        <div className="p-6 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
                            <div className="w-12 h-12 rounded-full bg-[#FF9900] flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-sm">
                                {user ? user.name[0].toUpperCase() : <User className="h-6 w-6" />}
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-gray-900 truncate">{user ? `Hello, ${user.name.split(' ')[0]}` : 'Welcome, Guest'}</p>
                                {!user ? (
                                    <div className="flex gap-4 mt-1">
                                        <Link href="/login" className="text-sm text-[#FF9900] font-bold" onClick={() => setMobileOpen(false)}>Sign In</Link>

                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                )}
                            </div>
                        </div>

                        {/* Nav links */}
                        <div className="flex-1 p-4 space-y-1">
                            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 px-4 py-2">Explore</p>
                            {NAV_LINKS.map(l => (
                                <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition text-sm font-medium text-gray-700">
                                    {l.icon && <l.icon className="h-5 w-5 text-gray-400" />}
                                    {l.label}
                                </Link>
                            ))}

                            {user && (
                                <>
                                    <div className="px-4 my-4">
                                        <hr className="border-gray-100" />
                                    </div>
                                    <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 px-4 py-2">My Account</p>
                                    <Link href={getDashboardLink()} onClick={() => setMobileOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition text-sm font-medium text-gray-700">
                                        <LayoutDashboard className="h-5 w-5 text-gray-400" /> Dashboard
                                    </Link>
                                    <Link href="/shop" onClick={() => setMobileOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition text-sm font-medium text-gray-700">
                                        <Package className="h-5 w-5 text-gray-400" /> All Products
                                    </Link>
                                    <button onClick={() => { handleLogout(); setMobileOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 transition text-sm font-bold mt-4">
                                        <LogOut className="h-5 w-5" /> Sign Out
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

