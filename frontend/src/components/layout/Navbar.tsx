'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
    Search, ShoppingCart, Menu, X, MapPin, ChevronDown, User,
    LogOut, Package, LayoutDashboard, ChevronRight,
    Heart, Percent, Truck, Gift, HelpCircle, LogIn, UserPlus, Store
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
    const mobileUserRef = useRef<HTMLDivElement>(null);

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
            const clickOutsideDesktopUser = !userRef.current || !userRef.current.contains(e.target as Node);
            const clickOutsideMobileUser = !mobileUserRef.current || !mobileUserRef.current.contains(e.target as Node);
            if (clickOutsideDesktopUser && clickOutsideMobileUser) {
                setUserMenuOpen(false);
            }
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
            <div className="bg-[#131921] py-2 md:py-0 px-2 flex flex-col md:flex-row items-center gap-2 md:gap-4 lg:gap-8">
                {/* Row 1: Logo & mobile actions */}
                <div className="flex items-center justify-between w-full md:w-auto shrink-0">
                    <div className="flex items-center gap-2">
                        {/* Hamburger menu on mobile */}
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="flex md:hidden text-white p-1 rounded-sm hover:text-slate-200 transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                        
                        {/* Logo */}
                        <Link href="/" className="flex items-center shrink-0 p-1 rounded-sm cursor-pointer">
                            <Logo size="sm" src={getImageUrl(settings?.logo)} />
                        </Link>
                    </div>

                    {/* Deliver To (visible on large screens, hidden on smaller screens) */}
                    <div className="hidden lg:flex flex-col text-white p-1 px-2 rounded-sm cursor-pointer leading-tight">
                        <span className="text-[12px] text-slate-300 ml-4">Deliver to</span>
                        <div className="flex items-center gap-1">
                            <MapPin size={15} className="text-white" />
                            <span className="text-sm font-bold uppercase tracking-tighter">Gilgit-Baltistan</span>
                        </div>
                    </div>

                    {/* Mobile right icons (User & Cart) */}
                    <div className="flex md:hidden items-center gap-2 text-white pr-1">
                        {/* Mobile User Profile */}
                        <div className="relative" ref={mobileUserRef}>
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="p-0.5 hover:bg-white/10 rounded-sm transition-colors flex items-center justify-center gap-1"
                            >
                                <span className="text-[13px] text-white font-normal hover:underline whitespace-nowrap max-w-[65px] truncate inline-block align-middle">
                                    {user ? `${user.name.split(' ')[0]} ›` : 'Sign in ›'}
                                </span>
                                <User size={20} className="text-white shrink-0" />
                            </button>

                            <AnimatePresence>
                                {userMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                        className="absolute right-0 mt-3 z-[10000] w-72 bg-white shadow-[0_25px_60px_rgba(0,0,0,0.15)] border border-slate-200/80 rounded-2xl overflow-hidden text-black"
                                    >
                                        {!user ? (
                                            <div className="p-2.5 space-y-0.5">
                                                <Link 
                                                    href="/login" 
                                                    onClick={() => setUserMenuOpen(false)} 
                                                    className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-[#f58220] transition-all flex items-center gap-2.5 group"
                                                >
                                                    <LogIn size={16} className="text-slate-400 group-hover:text-[#f58220] transition-colors" />
                                                    <span className="flex-1 group-hover:translate-x-0.5 transition-transform duration-200">Log In</span>
                                                    <ChevronRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </Link>
                                                
                                                <Link 
                                                    href="/register" 
                                                    onClick={() => setUserMenuOpen(false)} 
                                                    className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-[#f58220] transition-all flex items-center gap-2.5 group"
                                                >
                                                    <UserPlus size={16} className="text-slate-400 group-hover:text-[#f58220] transition-colors" />
                                                    <span className="flex-1 group-hover:translate-x-0.5 transition-transform duration-200">Create Account</span>
                                                    <ChevronRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </Link>

                                                <Link 
                                                    href="/register/supplier" 
                                                    onClick={() => setUserMenuOpen(false)} 
                                                    className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-[#f58220] transition-all flex items-center gap-2.5 group"
                                                >
                                                    <Store size={16} className="text-slate-400 group-hover:text-[#f58220] transition-colors" />
                                                    <span className="flex-1 group-hover:translate-x-0.5 transition-transform duration-200">Become a Seller</span>
                                                    <ChevronRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </Link>
                                            </div>
                                        ) : (
                                            <div className="p-0">
                                                <div className="px-5 py-4 bg-[#232f3e] text-white flex items-center gap-3 relative overflow-hidden">
                                                    {/* Decorative radial gradient in header */}
                                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_right_top,rgba(254,189,105,0.15),transparent_45%)] pointer-events-none"></div>
                                                    
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-[#f58220] flex items-center justify-center text-white font-bold text-base shadow-inner shrink-0 uppercase">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[9px] text-slate-300 font-extrabold uppercase tracking-[0.2em] mb-0.5">Welcome</div>
                                                        <div className="font-extrabold text-[14px] truncate leading-tight">{user.name}</div>
                                                    </div>
                                                </div>
                                                <div className="p-2.5 space-y-0.5">
                                                    <Link 
                                                        href="/customer/dashboard" 
                                                        onClick={() => setUserMenuOpen(false)} 
                                                        className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-[#f58220] transition-all flex items-center gap-2.5 group"
                                                    >
                                                        <User size={16} className="text-slate-400 group-hover:text-[#f58220] transition-colors" />
                                                        <span className="flex-1 group-hover:translate-x-0.5 transition-transform duration-200">Your Account</span>
                                                        <ChevronRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </Link>
                                                    
                                                    <Link 
                                                        href="/customer/dashboard/orders" 
                                                        onClick={() => setUserMenuOpen(false)} 
                                                        className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-[#f58220] transition-all flex items-center gap-2.5 group"
                                                    >
                                                        <Package size={16} className="text-slate-400 group-hover:text-[#f58220] transition-colors" />
                                                        <span className="flex-1 group-hover:translate-x-0.5 transition-transform duration-200">Your Orders</span>
                                                        <ChevronRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </Link>

                                                    <Link 
                                                        href="/customer/wishlist" 
                                                        onClick={() => setUserMenuOpen(false)} 
                                                        className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-[#f58220] transition-all flex items-center gap-2.5 group"
                                                    >
                                                        <Heart size={16} className="text-slate-400 group-hover:text-[#f58220] transition-colors" />
                                                        <span className="flex-1 group-hover:translate-x-0.5 transition-transform duration-200">My Wishlist</span>
                                                        <ChevronRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </Link>

                                                    <div className="my-1.5 border-t border-slate-100"></div>
                                                    
                                                    <button 
                                                        onClick={handleLogout} 
                                                        className="w-full px-3.5 py-2 rounded-lg text-[13px] font-bold text-rose-600 hover:bg-rose-50 transition-all flex items-center gap-2.5 text-left"
                                                    >
                                                        <LogOut size={16} className="text-rose-500" />
                                                        <span>Sign Out</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Mobile Cart */}
                        <div
                            onClick={openCart}
                            className="relative p-0.5 hover:bg-white/10 rounded-sm cursor-pointer flex items-center justify-center shrink-0"
                        >
                            <div className="relative">
                                <ShoppingCart size={24} className="text-white" />
                                <span
                                    className="absolute top-[0.5px] left-[9px] text-[10px] font-black text-[#f08804]"
                                >
                                    {cartCount}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Bar - Full-width on mobile, auto-width on desktop */}
                <div className="w-full md:flex-1 md:max-w-4xl relative px-1 md:px-0 mb-1 md:mb-0" ref={searchRef}>
                    <style>{`
                        #mobile-search-btn {
                            background-color: #febd69 !important;
                        }
                        @media (min-width: 768px) {
                            #mobile-search-btn {
                                background-color: ${BRAND_ORANGE} !important;
                            }
                        }
                    `}</style>
                    <form onSubmit={handleSearch} className="flex h-10 w-full rounded-lg md:rounded-md overflow-hidden bg-white">
                        <div className="hidden md:flex items-center px-3 bg-[#f3f3f3] border-r border-slate-300 text-[12px] text-slate-600 cursor-pointer hover:bg-slate-200 transition-colors">
                            All <ChevronDown size={14} className="ml-1 opacity-60" />
                        </div>
                        <input
                            type="text"
                            className="flex-1 h-full px-4 text-sm text-black outline-none focus:ring-0 transition-all"
                            placeholder={siteSettings?.site_name ? `Search ${siteSettings.site_name}` : "Search Al-Qavi Hub"}
                            value={searchQuery}
                            onChange={(e) => handleQueryChange(e.target.value)}
                        />
                        <button
                            id="mobile-search-btn"
                            type="submit"
                            className="px-5 transition-all flex items-center justify-center hover:brightness-105 active:scale-95 rounded-r-lg md:rounded-r-md"
                        >
                            <Search className="h-6 w-6 text-[#111111] md:text-white stroke-[2.5]" />
                        </button>
                    </form>

                    {/* Results Dropdown */}
                    <AnimatePresence>
                        {searchOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 12, scale: 0.99 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.99 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white/95 backdrop-blur-md shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] rounded-2xl overflow-hidden z-[10000] border border-slate-200/80 p-2 space-y-1 max-h-[480px] overflow-y-auto"
                            >
                                <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">
                                    Search Results
                                </div>
                                {searchResults.map((p) => (
                                    <Link
                                        key={p.id}
                                        href={`/customer/product/${p.id}`}
                                        onClick={() => setSearchOpen(false)}
                                        className="group flex items-center gap-4 p-2.5 rounded-xl hover:bg-slate-50/80 hover:shadow-sm border border-transparent hover:border-slate-100 transition-all duration-300"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center p-1.5 shrink-0 overflow-hidden group-hover:scale-[1.03] transition-transform duration-300">
                                            <img 
                                                src={getImageUrl(p.image_url || p.image || p.catalog_image || p.additional_images?.[0]?.image) || ''} 
                                                className="w-full h-full object-contain mix-blend-multiply" 
                                                alt="" 
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-[#119AB8] transition-colors text-left">
                                                {(p.name || p.product_name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}
                                                {(p.weight || p.size || p.type) && (
                                                    <span className="text-slate-400 font-medium text-[12px] ml-1.5">
                                                        ({[p.weight, p.size || p.type].filter(Boolean).join(' - ')})
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-150 text-slate-500 border border-slate-200 text-left">
                                                    {p.category_name || 'Beauty'}
                                                </span>
                                                {(p.total_quantity || p.quantity_in_stock || p.available_quantity || 0) > 0 ? (
                                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                        In Stock
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                                                        Out of Stock
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="text-right">
                                                <div className="text-sm font-black text-[#b12704] tracking-tight">
                                                    Rs. {parseFloat(p.selling_price || p.price || 0).toLocaleString()}
                                                </div>
                                            </div>
                                            <ChevronRight size={15} className="text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
                                        </div>
                                    </Link>
                                ))}
                                <div className="border-t border-slate-100 mt-2 pt-2 px-3 pb-1 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                                    <span>Showing top {searchResults.length} matches</span>
                                    <button 
                                        onClick={handleSearch}
                                        className="font-bold text-[#f58220] hover:underline flex items-center gap-0.5 transition-all"
                                    >
                                        View all products <ChevronRight size={10} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Actions - Desktop only */}
                <div className="hidden md:flex items-center gap-1 text-white pr-2 shrink-0">
                    {/* Account Dropdown */}
                    <div className="relative group/user" ref={userRef} onMouseEnter={() => setUserMenuOpen(true)} onMouseLeave={() => setUserMenuOpen(false)}>
                        <div 
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className="flex flex-col p-1 px-2 rounded-sm cursor-pointer leading-tight min-w-[120px] select-none hover:bg-white/10 transition-colors"
                        >
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
                            >
                                {/* Arrow Pointer */}
                                <div className="absolute top-0 right-10 w-4 h-4 bg-white rotate-45 border-l border-t border-slate-200 mt-[-8px] pointer-events-none"></div>

                                <div className="w-80 bg-white shadow-[0_25px_60px_rgba(0,0,0,0.15)] border border-slate-200/80 rounded-2xl overflow-hidden text-black backdrop-blur-md">
                                    {/* Header Section */}
                                    {user && (
                                        <div className="px-6 py-5 bg-[#232f3e] text-white flex items-center gap-4 relative overflow-hidden">
                                            {/* Decorative radial gradient in header */}
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_right_top,rgba(254,189,105,0.15),transparent_45%)] pointer-events-none"></div>
                                            
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-[#f58220] flex items-center justify-center text-white font-bold text-lg shadow-inner shrink-0 uppercase">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] text-slate-300 font-extrabold uppercase tracking-[0.2em] mb-0.5">Welcome Back</div>
                                                <div className="font-extrabold text-[16px] truncate leading-tight">{user.name}</div>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 mt-1 border border-emerald-500/30">
                                                    Active Session
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Single Column list */}
                                    <div className="p-4 bg-white space-y-3">
                                        <h3 className="px-3 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                                            Your Account
                                        </h3>
                                        <div className="space-y-1">
                                            {user ? (
                                                <>
                                                    <Link 
                                                        href="/customer/dashboard" 
                                                        onClick={() => setUserMenuOpen(false)}
                                                        className="w-full px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-[#f58220] transition-all duration-200 flex items-center gap-2.5 group"
                                                    >
                                                        <User size={16} className="text-slate-400 group-hover:text-[#f58220] transition-colors" />
                                                        <span className="flex-1 group-hover:translate-x-0.5 transition-transform duration-200">Account Hub</span>
                                                        <ChevronRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </Link>

                                                    <Link 
                                                        href="/customer/dashboard/orders" 
                                                        onClick={() => setUserMenuOpen(false)}
                                                        className="w-full px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-[#f58220] transition-all duration-200 flex items-center gap-2.5 group"
                                                    >
                                                        <Package size={16} className="text-slate-400 group-hover:text-[#f58220] transition-colors" />
                                                        <span className="flex-1 group-hover:translate-x-0.5 transition-transform duration-200">Your Orders</span>
                                                        <ChevronRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </Link>

                                                    <Link 
                                                        href="/register/supplier" 
                                                        onClick={() => setUserMenuOpen(false)}
                                                        className="w-full px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-[#f58220] transition-all duration-200 flex items-center gap-2.5 group"
                                                    >
                                                        <Store size={16} className="text-slate-400 group-hover:text-[#f58220] transition-colors" />
                                                        <span className="flex-1 group-hover:translate-x-0.5 transition-transform duration-200">Become a Seller</span>
                                                        <ChevronRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </Link>

                                                    <Link 
                                                        href="/contact" 
                                                        onClick={() => setUserMenuOpen(false)}
                                                        className="w-full px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-[#f58220] transition-all duration-200 flex items-center gap-2.5 group"
                                                    >
                                                        <HelpCircle size={16} className="text-slate-400 group-hover:text-[#f58220] transition-colors" />
                                                        <span className="flex-1 group-hover:translate-x-0.5 transition-transform duration-200">Contact Support</span>
                                                        <ChevronRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </Link>

                                                    <div className="my-1.5 border-t border-slate-100"></div>

                                                    <button 
                                                        onClick={handleLogout} 
                                                        className="w-full px-3 py-2 rounded-lg text-[13px] font-bold text-rose-600 hover:bg-rose-50 transition-all duration-200 flex items-center gap-2.5 text-left"
                                                    >
                                                        <LogOut size={16} className="text-rose-500" />
                                                        <span>Sign Out</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <Link 
                                                        href="/login" 
                                                        onClick={() => setUserMenuOpen(false)}
                                                        className="w-full px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-[#f58220] transition-all duration-200 flex items-center gap-2.5 group"
                                                    >
                                                        <LogIn size={16} className="text-slate-400 group-hover:text-[#f58220] transition-colors" />
                                                        <span className="flex-1 group-hover:translate-x-0.5 transition-transform duration-200">Log In</span>
                                                        <ChevronRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </Link>

                                                    <Link 
                                                        href="/register" 
                                                        onClick={() => setUserMenuOpen(false)}
                                                        className="w-full px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-[#f58220] transition-all duration-200 flex items-center gap-2.5 group"
                                                    >
                                                        <UserPlus size={16} className="text-slate-400 group-hover:text-[#f58220] transition-colors" />
                                                        <span className="flex-1 group-hover:translate-x-0.5 transition-transform duration-200">Create Account</span>
                                                        <ChevronRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </Link>

                                                    <Link 
                                                        href="/register/supplier" 
                                                        onClick={() => setUserMenuOpen(false)}
                                                        className="w-full px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-[#f58220] transition-all duration-200 flex items-center gap-2.5 group"
                                                    >
                                                        <Store size={16} className="text-slate-400 group-hover:text-[#f58220] transition-colors" />
                                                        <span className="flex-1 group-hover:translate-x-0.5 transition-transform duration-200">Become a Seller</span>
                                                        <ChevronRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </Link>

                                                    <Link 
                                                        href="/contact" 
                                                        onClick={() => setUserMenuOpen(false)}
                                                        className="w-full px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-[#f58220] transition-all duration-200 flex items-center gap-2.5 group"
                                                    >
                                                        <HelpCircle size={16} className="text-slate-400 group-hover:text-[#f58220] transition-colors" />
                                                        <span className="flex-1 group-hover:translate-x-0.5 transition-transform duration-200">Contact Support</span>
                                                        <ChevronRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </Link>
                                                </>
                                            )}
                                        </div>
                                    </div>
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
                <div className="bg-[#232f3e] h-10 flex items-center px-4 overflow-x-auto no-scrollbar gap-4 text-white text-sm font-medium w-full max-w-full">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="flex items-center gap-1 shrink-0 p-1 rounded-sm hover:text-slate-200 transition-colors"
                    >
                        <Menu size={20} />
                        <span className="font-bold">All</span>
                    </button>
                    <Link href="/about" className="shrink-0 p-1 px-2 rounded-sm hover:text-slate-200 transition-colors" style={{ color: pathname === '/about' ? '#EFB366' : 'white' }}>About Us</Link>
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
