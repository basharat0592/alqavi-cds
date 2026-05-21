'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
    Search, ShoppingCart, Menu, X, MapPin, ChevronDown, User,
    LogOut, Package, LayoutDashboard, ChevronRight
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { getImageUrl } from "@/lib/utils";
import { authService, User as AuthUser } from '@/lib/auth';
import { productService } from '@/lib/api';
import Logo from "@/components/ui/Logo";
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar({ settings }: { settings?: any }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [user, setUser] = useState<AuthUser | null>(null);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [siteSettings, setSiteSettings] = useState<any>(settings);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [announcementVisible, setAnnouncementVisible] = useState(true);

    const router = useRouter();
    const pathname = usePathname();
    const { cartCount, openCart } = useCart();
    const searchRef = useRef<HTMLDivElement>(null);
    const userRef = useRef<HTMLDivElement>(null);

    // Official Amazon & Brand Colors
    const AMAZON_NAVY = "#131921";
    const AMAZON_LIGHT_NAVY = "#232f3e";
    const AMAZON_ORANGE = "#febd69";
    const BRAND_ORANGE = siteSettings?.primary_color || "#f58220";

    useEffect(() => {
        setUser(authService.getUser());
        productService.getAll().then(data => {
            const apiArr = Array.isArray(data) ? data : (data as any).results || [];
            setAllProducts(apiArr);
        }).catch(() => { });

        // Fetch settings if not provided
        if (settings) {
            setSiteSettings(settings);
        } else {
            import('@/services/cms.service').then(m => m.default.getFullState()).then(state => {
                setSiteSettings(state.settings);
            });
        }
    }, [settings]);

    useEffect(() => {
        if (siteSettings?.show_announcement) {
            setAnnouncementVisible(true);
            if (siteSettings.announcement_duration > 0) {
                const timer = setTimeout(() => {
                    setAnnouncementVisible(false);
                }, siteSettings.announcement_duration * 1000);
                return () => clearTimeout(timer);
            }
        } else {
            setAnnouncementVisible(false);
        }
    }, [siteSettings]);

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

    return (
        <header className="z-[9999] relative w-full font-sans">
            {/* ── ANNOUNCEMENT BAR ── */}
            {siteSettings?.show_announcement && announcementVisible && (
                <div
                    className="w-full transition-all duration-500 ease-in-out overflow-hidden"
                    style={{
                        backgroundColor: siteSettings.announcement_bg_color || siteSettings.primary_color || '#c45500',
                        color: siteSettings.announcement_text_color || '#ffffff',
                        maxHeight: announcementVisible ? '40px' : '0px',
                        opacity: announcementVisible ? 1 : 0
                    }}
                >
                    {siteSettings.announcement_scroll ? (
                        <div className="relative w-full overflow-hidden flex items-center h-8">
                            <style>{`
                                @keyframes marquee {
                                    0% { transform: translate3d(0, 0, 0); }
                                    100% { transform: translate3d(-50%, 0, 0); }
                                }
                                .marquee-content {
                                    display: inline-flex;
                                    white-space: nowrap;
                                    animation: marquee ${siteSettings.announcement_scroll_speed === 'slow' ? 30 : siteSettings.announcement_scroll_speed === 'fast' ? 10 : 18}s linear infinite;
                                }
                                .marquee-content:hover {
                                    animation-play-state: paused;
                                }
                            `}</style>
                            <div className="marquee-content font-black uppercase text-[12px] tracking-[0.2em] w-full justify-around">
                                <Link href={siteSettings.announcement_link || "#"} className="hover:underline flex items-center gap-12 text-center" style={{ color: siteSettings.announcement_text_color || '#ffffff' }}>
                                    <span>{siteSettings.announcement_text || 'Free Delivery on all orders over Rs. 5000! 🚚'}</span>
                                    <span>•</span>
                                    <span>{siteSettings.announcement_text || 'Free Delivery on all orders over Rs. 5000! 🚚'}</span>
                                    <span>•</span>
                                    <span>{siteSettings.announcement_text || 'Free Delivery on all orders over Rs. 5000! 🚚'}</span>
                                    <span>•</span>
                                    <span>{siteSettings.announcement_text || 'Free Delivery on all orders over Rs. 5000! 🚚'}</span>
                                    <span>•</span>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full py-1.5 px-4 text-center">
                            <Link
                                href={siteSettings.announcement_link || "#"}
                                className="text-[12px] font-black uppercase tracking-[0.2em] hover:underline decoration-white/30 underline-offset-4"
                                style={{ color: siteSettings.announcement_text_color || '#ffffff' }}
                            >
                                {siteSettings.announcement_text || 'Free Delivery on all orders over Rs. 5000! 🚚'}
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* ── TOP HEADER (AMAZON NAVY) ── */}
            <div className="bg-[#131921] h-16 flex items-center px-2 gap-1 md:gap-4 lg:gap-8">

                {/* Logo Section */}
                <Link href="/" className="flex items-center shrink-0 p-1 rounded-sm cursor-pointer ml-2">
                    <Logo size="sm" src={getImageUrl(settings?.logo)} />
                </Link>

                {/* Deliver To */}
                <div className="hidden lg:flex flex-col text-white p-1 px-2 rounded-sm cursor-pointer leading-tight">
                    <span className="text-[12px] text-slate-300 ml-4">Deliver to</span>
                    <div className="flex items-center gap-1">
                        <MapPin size={15} className="text-white" />
                        <span className="text-sm font-bold uppercase tracking-tighter">Gilgit-Baltistan</span>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="flex-1 max-w-4xl relative" ref={searchRef}>
                    <form onSubmit={handleSearch} className="flex h-10 w-full rounded-md overflow-hidden group">
                        <div className="hidden md:flex items-center px-3 bg-[#f3f3f3] border-r border-slate-300 text-[12px] text-slate-600 cursor-pointer hover:bg-slate-200 transition-colors">
                            All <ChevronDown size={14} className="ml-1 opacity-60" />
                        </div>
                        <input
                            type="text"
                            className="flex-1 h-full px-4 text-sm text-black outline-none focus:ring-0 transition-all"
                            placeholder={`Search ${siteSettings?.site_name || 'Alqavi Traders'}`}
                            value={searchQuery}
                            onChange={(e) => handleQueryChange(e.target.value)}
                        />
                        <button
                            className="px-4 transition-all flex items-center justify-center hover:brightness-110 active:scale-95"
                            style={{ backgroundColor: BRAND_ORANGE }}
                        >
                            <Search className="h-6 w-6 text-white stroke-[2.5]" />
                        </button>
                    </form>

                    {/* Results Dropdown */}
                    <AnimatePresence>
                        {searchOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-b-md overflow-hidden z-[10000] border border-slate-200"
                            >
                                {searchResults.map((p) => (
                                    <Link
                                        key={p.id}
                                        href={`/customer/product/${p.id}`}
                                        onClick={() => setSearchOpen(false)}
                                        className="flex items-center gap-4 p-3 hover:bg-slate-100 transition-colors border-b border-slate-50 last:border-0"
                                    >
                                        <div className="w-10 h-10 shrink-0">
                                            <img src={getImageUrl(p.image_url || p.image) || ''} className="w-full h-full object-contain" alt="" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-slate-900 line-clamp-1">
                                                {(p.name || p.product_name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}
                                            </div>
                                            <div className="text-[11px] text-slate-500 uppercase font-black tracking-widest">{p.category_name || siteSettings?.site_name || 'Alqavi Traders'}</div>
                                        </div>
                                        <div className="text-sm font-black text-[#b12704]">Rs. {p.selling_price || p.price}</div>
                                    </Link>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1 text-white pr-2">
                    {/* Account Dropdown */}
                    <div className="relative group/user" ref={userRef} onMouseEnter={() => setUserMenuOpen(true)}>
                        <div className="flex flex-col p-1 px-2 rounded-sm cursor-pointer leading-tight min-w-[120px]">
                            <span className="text-[12px] text-slate-300">Hello, {user ? user.name.split(' ')[0] : 'sign in'}</span>
                            <div className="flex items-center gap-1">
                                <span className="text-sm font-bold">Account & Lists</span>
                                <ChevronDown size={14} className="text-slate-400" />
                            </div>
                        </div>

                        {userMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                className="absolute top-full right-0 mt-3 z-[10000]"
                                onMouseLeave={() => setUserMenuOpen(false)}
                            >
                                {/* Arrow Pointer */}
                                <div className="absolute top-0 right-10 w-4 h-4 bg-white rotate-45 border-l border-t border-slate-200 mt-[-8px] pointer-events-none"></div>

                                <div className="w-72 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-slate-200 rounded-xl overflow-hidden">
                                    {!user ? (
                                        <div className="p-8 flex flex-col items-center bg-slate-50/50">
                                            <Link
                                                href="/login"
                                                className="w-full py-2.5 bg-gradient-to-b from-[#febd69] to-[#f90] text-black border border-[#a88734] rounded-md text-center text-sm font-bold shadow-sm hover:brightness-105 transition-all active:scale-95"
                                            >
                                                Sign in
                                            </Link>
                                            <div className="text-[11px] text-slate-600 mt-4">
                                                New customer? <Link href="/register" className="text-blue-600 font-bold hover:text-orange-600 hover:underline">Start here.</Link>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-0">
                                            <div className="px-6 py-5 bg-[#232f3e] text-white flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                                    <User size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-0.5">Your Account</div>
                                                    <div className="font-bold text-[14px] truncate">{user.name}</div>
                                                </div>
                                            </div>
                                            <div className="p-3 space-y-1">
                                                <Link href="/customer/dashboard" className="px-4 py-2.5 rounded-lg text-[14px] font-medium text-slate-700 hover:bg-slate-50 hover:text-[#232f3e] transition-all flex items-center gap-3 group/link">
                                                    <User size={18} className="text-slate-400 group-hover/link:text-[#232f3e]" />
                                                    Your Account
                                                </Link>
                                                <Link href="/customer/dashboard/orders" className="px-4 py-2.5 rounded-lg text-[14px] font-medium text-slate-700 hover:bg-slate-50 hover:text-[#232f3e] transition-all flex items-center gap-3 group/link">
                                                    <Package size={18} className="text-slate-400 group-hover/link:text-[#232f3e]" />
                                                    Your Orders
                                                </Link>
                                                <div className="my-2 border-t border-slate-100"></div>
                                                <button onClick={handleLogout} className="w-full px-4 py-2.5 rounded-lg text-[14px] font-bold text-red-600 hover:bg-red-50 transition-all flex items-center gap-3">
                                                    <LogOut size={18} />
                                                    Sign Out
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </div>



                    {/* Cart Utility */}
                    <div
                        onClick={openCart}
                        className="flex items-end p-1 px-3 rounded-sm relative h-12 cursor-pointer"
                    >
                        <div className="relative group/cart">
                            <ShoppingCart size={32} className="text-white group-hover:scale-105 transition-transform" />
                            {cartCount > 0 && (
                                <span
                                    className="absolute top-[-2px] right-[-4px] text-white text-[11px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-[#131921]"
                                    style={{ backgroundColor: BRAND_ORANGE }}
                                >
                                    {cartCount}
                                </span>
                            )}
                        </div>
                        <span className="text-sm font-bold mb-0.5 ml-1 hidden lg:block uppercase tracking-tighter">Cart</span>
                    </div>
                </div>
            </div>

            {/* ── SUB HEADER (AMAZON LIGHT NAVY) ── */}
            {!pathname.startsWith('/customer/dashboard') && (
                <div className="bg-[#232f3e] h-10 flex items-center px-4 overflow-x-auto no-scrollbar gap-4 text-white text-sm font-medium">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="flex items-center gap-1 shrink-0 p-1 rounded-sm hover:text-slate-200 transition-colors"
                    >
                        <Menu size={20} />
                        <span className="font-bold">All</span>
                    </button>
                    <Link href="/customer/shop/deals" className="shrink-0 p-1 px-2 rounded-sm hover:text-slate-200 transition-colors" style={{ color: pathname === '/customer/shop/deals' ? '#EFB366' : 'white' }}>Today's Deals</Link>
                    <Link href="/customer/shop/cosmetics" className="shrink-0 p-1 px-2 rounded-sm hover:text-slate-200 transition-colors" style={{ color: pathname === '/customer/shop/cosmetics' ? '#EFB366' : 'white' }}>Cosmetics</Link>
                    <Link href="/customer/tracking" className="shrink-0 p-1 px-2 rounded-sm hover:text-slate-200 transition-colors" style={{ color: pathname === '/customer/tracking' ? '#EFB366' : 'white' }}>Track Order</Link>
                    <Link href="/contact" className="shrink-0 p-1 px-2 rounded-sm hover:text-slate-200 transition-colors" style={{ color: pathname === '/contact' ? '#EFB366' : 'white' }}>Customer Service</Link>
                    <Link href="/gift-cards" className="shrink-0 p-1 px-2 rounded-sm hover:text-slate-200 transition-colors" style={{ color: pathname === '/gift-cards' ? '#EFB366' : 'white' }}>Gift Cards</Link>
                    <Link href="/customer/wishlist" className="shrink-0 p-1 px-2 rounded-sm hover:text-slate-200 transition-colors" style={{ color: pathname === '/customer/wishlist' ? '#EFB366' : 'white' }}>Wishlists</Link>

                    {/* Right-most Become a Seller Link */}
                    <Link
                        href="/register/supplier"
                        className="ml-auto shrink-0 font-serif italic font-medium capitalize text-[14px] hover:underline hover:opacity-80 transition-all active:scale-95 flex items-center justify-center underline-offset-[4px] decoration-1"
                        style={{ color: pathname === '/register/supplier' ? '#EFB366' : AMAZON_ORANGE }}
                    >
                        Become a Seller
                    </Link>
                </div>
            )}

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <div className="fixed inset-0 z-[200]">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/70"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'tween', duration: 0.3 }}
                            className="absolute top-0 left-0 bottom-0 w-[300px] bg-white flex flex-col"
                        >
                            <div className="bg-[#232f3e] p-4 text-white flex items-center gap-3">
                                <User size={24} className="bg-slate-200 text-slate-500 rounded-full p-1" />
                                <span className="font-bold text-lg">Hello, {user ? user.name.split(' ')[0] : 'Sign In'}</span>
                                <button onClick={() => setMobileOpen(false)} className="ml-auto">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                <div>
                                    <h3 className="font-bold text-lg mb-2">Shop by Category</h3>
                                    <div className="grid gap-4 text-slate-700 font-medium">
                                        <Link href="/customer/shop" onClick={() => setMobileOpen(false)}>All Products</Link>
                                        <Link href="/customer/shop?cat=Face" onClick={() => setMobileOpen(false)}>Face Care</Link>
                                        <Link href="/customer/shop?cat=Hair" onClick={() => setMobileOpen(false)}>Hair Care</Link>
                                    </div>
                                </div>
                                <div className="border-t pt-4">
                                    <h3 className="font-bold text-lg mb-2">Help & Settings</h3>
                                    <div className="grid gap-4 text-slate-700 font-medium">
                                        <Link href="/customer/dashboard" onClick={() => setMobileOpen(false)}>Your Account</Link>
                                        <Link href="/contact" onClick={() => setMobileOpen(false)}>Customer Service</Link>
                                        {user ? (
                                            <button onClick={handleLogout} className="text-left text-red-600 font-bold">Sign Out</button>
                                        ) : (
                                            <Link href="/login" onClick={() => setMobileOpen(false)} style={{ color: BRAND_ORANGE }} className="font-bold">Sign In</Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </header>
    );
}
