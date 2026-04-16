'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
    Search, ShoppingCart, Menu, MapPin, User,
    ChevronDown, Heart, Package, LogOut, Settings,
    X, LayoutDashboard, Tag, Phone, Home
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { authService } from '@/lib/auth';

const NAV_LINKS = [
    { label: "All Products", href: '/shop' },
    { label: 'New Arrivals', href: '/shop?cat=New Arrivals' },
    { label: 'Best Sellers', href: '/shop?cat=Best Sellers' },
    { label: 'Skincare', href: '/shop?cat=Skincare' },
    { label: 'Makeup', href: '/shop?cat=Makeup' },
    { label: 'Fragrance', href: '/shop?cat=Fragrance' },
    { label: 'Haircare', href: '/shop?cat=Haircare' },
    { label: 'Gift Sets', href: '/shop?cat=Gift Sets' },
];

export default function Header() {
    const router = useRouter();
    const { cartCount } = useCart();
    const [query, setQuery] = useState('');
    const [user, setUser] = useState<any>(null);
    const [accountOpen, setAccountOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const accountRef = useRef<HTMLDivElement>(null);

    // Load user on mount + listen for storage changes
    useEffect(() => {
        setUser(authService.getUser());
        const handleStorage = () => setUser(authService.getUser());
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
                setAccountOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
            setMobileSearchOpen(false);
        }
    };

    const handleLogout = () => {
        authService.logout();
        setUser(null);
        setAccountOpen(false);
        router.push('/');
    };

    const getDashboardLink = () => {
        if (!user) return '/login';
        const role = (user.role || '').toString().toLowerCase();
        if (['admin', 'staff', 'superuser', 'manager'].some(r => role.includes(r)) || user.is_staff || user.is_superuser) {
            return '/admin/dashboard';
        } else if (role === 'supplier') {
            return '/supplier/dashboard';
        }
        return '/';
    };

    const isCustomer = () => {
        if (!user) return false;
        const role = (user.role || '').toString().toLowerCase();
        return !(['admin', 'staff', 'superuser', 'manager'].some(r => role.includes(r)) || user.is_staff || user.is_superuser || role === 'supplier');
    };

    return (
        <div className="flex flex-col sticky top-0 z-50 shadow-md">

            {/* ─── TOP ANNOUNCEMENT BAR ─── */}
            <div className="bg-[#0f1923] text-[#febd69] text-center text-[11px] py-1 font-medium tracking-wide">
                🚚 Free delivery on orders over Rs. 5,000 &nbsp;|&nbsp; 📞 Helpline: 0347-7001241 &nbsp;|&nbsp; 100% Authentic Products
            </div>

            {/* ─── MAIN HEADER ─── */}
            <header className="bg-white text-gray-900 px-4 py-3 flex items-center gap-4 border-b border-gray-100">

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Menu"
                >
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-lg transition flex-shrink-0">
                    <div className="flex flex-col leading-none">
                        <span className="font-black text-2xl text-[#4f46e5] tracking-tight">Al-Qavi</span>
                        <span className="text-[10px] font-bold tracking-[0.3em] text-gray-400 -mt-0.5">COSMETICS</span>
                    </div>
                </Link>

                {/* Location — Desktop only */}
                <div className="hidden lg:flex items-center gap-2 hover:bg-gray-50 p-2 rounded-lg cursor-pointer whitespace-nowrap flex-shrink-0 transition">
                    <MapPin className="h-5 w-5 text-[#4f46e5]" />
                    <div className="flex flex-col leading-tight text-xs">
                        <span className="text-gray-400 font-medium">Deliver to</span>
                        <span className="font-bold text-gray-900">Pakistan</span>
                    </div>
                </div>

                {/* Search Bar — Desktop */}
                <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden sm:flex h-11 rounded-full border-2 border-gray-100 focus-within:border-[#4f46e5]/30 overflow-hidden bg-gray-50 transition-all">
                    <select
                        className="bg-transparent text-gray-600 px-4 text-xs border-r border-gray-200 hover:bg-gray-100 transition outline-none cursor-pointer font-medium"
                        defaultValue="all"
                    >
                        <option value="all">All</option>
                        <option value="skincare">Skincare</option>
                        <option value="makeup">Makeup</option>
                        <option value="fragrance">Fragrance</option>
                        <option value="haircare">Haircare</option>
                    </select>
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="flex-1 bg-transparent px-4 text-gray-900 text-sm outline-none placeholder:text-gray-400"
                        placeholder="Search for products, brands and more..."
                    />
                    <button
                        type="submit"
                        className="bg-[#4f46e5] hover:bg-[#4338ca] px-6 text-white transition flex items-center justify-center group"
                        aria-label="Search"
                    >
                        <Search className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </button>
                </form>

                {/* Mobile Search Toggle */}
                <button
                    className="sm:hidden ml-auto p-2 hover:bg-gray-100 rounded-lg transition"
                    onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                    aria-label="Search"
                >
                    <Search className="h-5 w-5 text-gray-700" />
                </button>

                {/* Right nav */}
                <div className="hidden sm:flex items-center gap-2 ml-auto sm:ml-0">

                    {/* Account Dropdown */}
                    <div className="relative" ref={accountRef}>
                        <button
                            onClick={() => setAccountOpen(!accountOpen)}
                            className="flex items-center gap-2 hover:bg-gray-50 px-3 py-2 rounded-lg whitespace-nowrap text-left transition"
                        >
                            <div className="w-8 h-8 rounded-full bg-[#4f46e5]/10 flex items-center justify-center text-[#4f46e5]">
                                <User className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col leading-tight">
                                <span className="text-[10px] text-gray-500 font-medium">
                                    {user ? `Welcome` : 'Sign in'}
                                </span>
                                <span className="text-sm font-bold text-gray-900 flex items-center gap-0.5">
                                    {user ? user.name.split(' ')[0] : 'Account'} <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                                </span>
                            </div>
                        </button>

                        {accountOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-fade-in-up">
                                {user ? (
                                    <>
                                        <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100">
                                            <p className="font-bold text-sm text-gray-900">{user.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                            <span className="inline-block mt-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#4f46e5] text-white">
                                                {user.role || 'customer'}
                                            </span>
                                        </div>
                                        <div className="py-2">
                                            {isCustomer() ? (
                                                <>
                                                    <Link href="/dashboard/orders" onClick={() => setAccountOpen(false)}
                                                        className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 text-sm font-medium text-gray-700 transition">
                                                        <Package className="h-4 w-4 text-[#4f46e5]" /> My Orders
                                                    </Link>
                                                    <Link href="/shop" onClick={() => setAccountOpen(false)}
                                                        className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 text-sm font-medium text-gray-700 transition">
                                                        <Package className="h-4 w-4 text-gray-400" /> Browse Products
                                                    </Link>
                                                </>
                                            ) : (
                                                <>
                                                    <Link href={getDashboardLink()} onClick={() => setAccountOpen(false)}
                                                        className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 text-sm font-medium text-gray-700 transition">
                                                        <LayoutDashboard className="h-4 w-4 text-gray-400" /> Dashboard
                                                    </Link>
                                                    <Link href="/shop" onClick={() => setAccountOpen(false)}
                                                        className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 text-sm font-medium text-gray-700 transition">
                                                        <Package className="h-4 w-4 text-gray-400" /> All Products
                                                    </Link>
                                                </>
                                            )}
                                            <div className="px-4 my-2">
                                                <hr className="border-gray-100" />
                                            </div>
                                            <button onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-red-50 text-red-600 text-sm font-bold transition">
                                                <LogOut className="h-4 w-4" /> Sign Out
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-5">
                                        <Link href="/login" onClick={() => setAccountOpen(false)}
                                            className="block w-full text-center py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold rounded-full text-sm transition mb-4 shadow-md shadow-indigo-900/10">
                                            Sign In
                                        </Link>
                                        <p className="text-xs text-center text-gray-500 mb-4">
                                            New customer?{' '}
                                            <Link href="/register" onClick={() => setAccountOpen(false)}
                                                className="text-[#4f46e5] hover:underline font-bold">
                                                Create account
                                            </Link>
                                        </p>
                                        <hr className="mb-4 border-gray-100" />
                                        <div className="grid grid-cols-1 gap-2">
                                            {[
                                                { label: 'My Account', href: '/login', icon: User },
                                                { label: 'Orders', href: '/login', icon: Package },
                                                { label: 'Wishlist', href: '/login', icon: Heart },
                                            ].map(({ label, href, icon: Icon }) => (
                                                <Link key={label} href={href} onClick={() => setAccountOpen(false)}
                                                    className="flex items-center gap-2.5 text-xs text-gray-600 hover:text-[#4f46e5] font-medium transition">
                                                    <Icon className="h-4 w-4 text-gray-400" /> {label}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Support — Desktop only */}
                    <div className="hidden xl:flex flex-col leading-tight hover:bg-gray-50 px-3 py-2 rounded-lg whitespace-nowrap transition cursor-pointer">
                        <span className="text-[10px] text-gray-500 font-medium font-sans">Helpline</span>
                        <span className="text-sm font-bold text-gray-900 font-sans">0347-7001241</span>
                    </div>

                    {/* Wishlist */}
                    <Link href="/shop"
                        className="hidden md:flex items-center justify-center w-10 h-10 hover:bg-gray-50 rounded-full text-[#4f46e5] transition relative">
                        <Heart className="h-6 w-6" />
                    </Link>

                    {/* Cart */}
                    <Link href="/cart"
                        className="flex items-center gap-2 bg-[#4f46e5]/5 hover:bg-[#4f46e5]/10 px-4 py-2 rounded-full relative transition border border-[#4f46e5]/10">
                        <div className="relative">
                            <ShoppingCart className="h-6 w-6 text-[#4f46e5]" />
                            {cartCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                                    {cartCount > 99 ? '99+' : cartCount}
                                </span>
                            )}
                        </div>
                        <span className="font-bold text-sm text-[#4f46e5] hidden md:inline">Cart</span>
                    </Link>
                </div>

                {/* Mobile: Cart icon only */}
                <Link href="/cart" className="sm:hidden p-2 relative text-[#4f46e5]">
                    <ShoppingCart className="h-6 w-6" />
                    {cartCount > 0 && (
                        <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                            {cartCount > 9 ? '9+' : cartCount}
                        </span>
                    )}
                </Link>
            </header>

            {/* ─── MOBILE SEARCH BAR ─── */}
            {mobileSearchOpen && (
                <div className="sm:hidden bg-white px-4 pb-4 pt-2 border-b border-gray-100">
                    <form onSubmit={handleSearch} className="flex h-11 rounded-full border-2 border-[#4f46e5]/20 overflow-hidden bg-gray-50">
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            autoFocus
                            className="flex-1 bg-transparent px-4 text-gray-900 text-sm outline-none"
                            placeholder="Search Al-Qavi Cosmetics..."
                        />
                        <button type="submit" className="bg-[#4f46e5] px-5 text-white">
                            <Search className="h-5 w-5" />
                        </button>
                    </form>
                </div>
            )}

            {/* ─── MOBILE FULL MENU DRAWER ─── */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-[#232f3e] text-white text-sm px-4 py-3 space-y-1 border-t border-white/10">
                    <Link href="/" onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 py-2 hover:text-[#febd69] transition">
                        <Home className="h-4 w-4" /> Home
                    </Link>
                    <Link href="/shop" onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 py-2 hover:text-[#febd69] transition">
                        <Tag className="h-4 w-4" /> Shop All
                    </Link>
                    {NAV_LINKS.map(link => (
                        <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                            className="block py-2 pl-7 hover:text-[#febd69] border-t border-white/5 transition">
                            {link.label}
                        </Link>
                    ))}
                    <hr className="border-white/10 my-2" />
                    {user ? (
                        <>
                            {isCustomer() ? (
                                <Link href="/dashboard/orders" onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 py-2 hover:text-[#febd69] transition">
                                    <Package className="h-4 w-4" /> My Orders
                                </Link>
                            ) : (
                                <Link href={getDashboardLink()} onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 py-2 hover:text-[#febd69] transition">
                                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                                </Link>
                            )}
                            <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                                className="flex items-center gap-3 py-2 text-red-400 hover:text-red-300 transition w-full">
                                <LogOut className="h-4 w-4" /> Sign Out
                            </button>
                        </>
                    ) : (
                        <Link href="/login" onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 py-2 hover:text-[#febd69] transition">
                            <User className="h-4 w-4" /> Sign In / Register
                        </Link>
                    )}
                    <Link href="tel:+923000000000" onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 py-2 hover:text-[#febd69] transition">
                        <Phone className="h-4 w-4" /> 0300-0000000
                    </Link>
                </div>
            )}

            {/* ─── NAV BELT ─── */}
            <nav className="bg-gray-50 text-gray-700 px-4 py-1.5 hidden sm:flex items-center gap-1 border-b border-gray-100 overflow-x-auto scrollbar-none">
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="flex items-center gap-1.5 font-bold hover:bg-[#4f46e5]/5 text-gray-900 px-3 py-1.5 rounded-lg mr-1 whitespace-nowrap transition flex-shrink-0"
                >
                    <Menu className="h-4 w-4 text-[#4f46e5]" /> All categories
                </button>
                {NAV_LINKS.map(link => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="hover:bg-[#4f46e5]/5 hover:text-[#4f46e5] px-3 py-1.5 rounded-lg whitespace-nowrap transition flex-shrink-0 text-xs font-bold"
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>
        </div>
    );
}

