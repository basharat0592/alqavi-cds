'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
    Search, ShoppingCart, Menu, X, MapPin, ChevronDown, User,
    LogOut, Package, LayoutDashboard, ChevronRight, ChevronLeft,
    Heart, Truck, HelpCircle, LogIn, UserPlus, Store,
    FileText, Map as MapIcon, Newspaper, Briefcase,
    RotateCcw, Cookie, ShieldCheck, Check
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { getImageUrl } from "@/lib/utils";
import { authService, User as AuthUser } from '@/lib/auth';
import { productService } from '@/lib/api';
import { inventoryService } from '@/services/inventory.service';
import Logo from "@/components/ui/Logo";
import { motion, AnimatePresence } from 'framer-motion';

// Fallback links used only until the dynamic navbar pages are loaded from the CMS.
const DEFAULT_NAV_PAGES = [
    { name: 'About Us', link: '/about' },
    { name: 'Track Order', link: '/customer/tracking' },
    { name: 'Customer Service', link: '/contact' },
    { name: 'Gift Cards', link: '/gift-cards' },
    { name: 'Wishlists', link: '/customer/wishlist' },
];

export default function Navbar({ settings }: { settings?: any }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [user, setUser] = useState<AuthUser | null>(null);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [siteSettings, setSiteSettings] = useState<any>(settings);
    const [navbarPages, setNavbarPages] = useState<any[]>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [announcementVisible, setAnnouncementVisible] = useState(true);
    // "Deliver to" city picker — cities come from the dashboard's Areas.
    const [cities, setCities] = useState<string[]>([]);
    const [selectedCity, setSelectedCity] = useState('');
    const [cityOpen, setCityOpen] = useState(false);
    // Compact prompt that auto-drops from "Deliver to" on load (once per browser
    // session). Shows "Choose your city" first time, then the saved city afterwards.
    const [cityPromptOpen, setCityPromptOpen] = useState(false);
    // Active branches the Super Admin created (used to derive the cities list).
    const [branches, setBranches] = useState<any[]>([]);
    const [branchOpen, setBranchOpen] = useState(false);
    const branchRef = useRef<HTMLDivElement>(null);

    const router = useRouter();
    const pathname = usePathname();
    const { cartCount, openCart } = useCart();
    const searchRef = useRef<HTMLDivElement>(null);
    const cityRef = useRef<HTMLDivElement>(null);
    const userRef = useRef<HTMLDivElement>(null);
    const mobileUserRef = useRef<HTMLDivElement>(null);
    const navScrollRef = useRef<HTMLDivElement>(null);

    const scrollNav = (dir: number) => {
        navScrollRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' });
    };

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

        // Always fetch full state once for the dynamic navbar pages (public endpoint),
        // and use it to hydrate settings when they weren't passed in as a prop.
        import('@/services/cms.service').then(m => m.default.getFullState()).then(state => {
            if (Array.isArray(state?.navbar_pages)) setNavbarPages(state.navbar_pages);
            if (!settings && state?.settings) setSiteSettings(state.settings);
        }).catch(() => { });

        if (settings) setSiteSettings(settings);

        // Cities that have at least one ACTIVE branch (deduped) — the single source
        // for both the "Deliver to" picker and the search "All" city dropdown.
        inventoryService.getPublicBranches().then(list => {
            const arr = Array.isArray(list) ? list : [];
            setBranches(arr);
            const cityNames = Array.from(new Set(arr.map((b: any) => b.area).filter(Boolean))).sort() as string[];
            setCities(cityNames);
            const saved = (typeof window !== 'undefined' && localStorage.getItem('deliver_to_city')) || '';
            // '' = All Cities (every branch). Keep a saved city only if it still has a
            // branch. Match case-insensitively (the backend filters with iexact) and
            // re-canonicalise so the picker label always agrees with what's filtered.
            const match = saved ? cityNames.find(c => c.toLowerCase() === saved.toLowerCase()) : '';
            if (saved && !match) { try { localStorage.removeItem('deliver_to_city'); } catch { } }
            else if (match && match !== saved) { try { localStorage.setItem('deliver_to_city', match); } catch { } }
            setSelectedCity(match || '');
            // Auto-drop the compact prompt once per browser session (sessionStorage
            // clears on browser close, so a fresh session re-shows it — now carrying
            // the previously-saved city).
            try {
                if (sessionStorage.getItem('city_prompt_seen') !== '1' && cityNames.length > 0) {
                    setCityPromptOpen(true);
                    sessionStorage.setItem('city_prompt_seen', '1');
                }
            } catch { }
        }).catch(() => { setBranches([]); setCities([]); });
    }, [settings]);

    // Close the city dropdown on outside click.
    useEffect(() => {
        if (!cityOpen) return;
        const onDown = (e: MouseEvent) => {
            if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [cityOpen]);

    // Close the branch dropdown on outside click.
    useEffect(() => {
        if (!branchOpen) return;
        const onDown = (e: MouseEvent) => {
            if (branchRef.current && !branchRef.current.contains(e.target as Node)) setBranchOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [branchOpen]);

    // Selecting a city scopes the WHOLE storefront to that city's branch inventory.
    // Persist it and reload so every product section refetches with the new city.
    const selectCity = (c: string) => {
        setSelectedCity(c);
        setCityOpen(false);
        setBranchOpen(false);
        try {
            if (c) localStorage.setItem('deliver_to_city', c);
            else localStorage.removeItem('deliver_to_city');
        } catch { }
        if (typeof window !== 'undefined') window.location.reload();
    };

    // From the compact prompt → open the simple city dropdown.
    const openCityDropdown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCityPromptOpen(false);
        setCityOpen(true);
    };

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

    // Fully lock the window behind the browse drawer and restore scroll position on close
    useEffect(() => {
        if (!mobileOpen) return;
        const scrollY = window.scrollY;
        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.paddingRight = `${scrollBarWidth}px`;
        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.paddingRight = '';
            window.scrollTo(0, scrollY);
        };
    }, [mobileOpen]);

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
                <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                    <div className="flex items-center gap-2">
                        {/* Logo */}
                        <Link href="/" className="flex items-center shrink-0 p-1 rounded-sm cursor-pointer">
                            <Logo size="sm" src={getImageUrl(settings?.logo)} />
                        </Link>
                    </div>

                    {/* Deliver To — city picker driven by the dashboard's Areas (mobile + desktop) */}
                    <div ref={cityRef} className="relative flex flex-col text-white p-1 px-2 rounded-sm cursor-pointer leading-tight hover:bg-white/5"
                        onClick={() => { setCityPromptOpen(false); setCityOpen(o => !o); }}>
                        {/* Trigger — kept above the blur backdrop so the "Deliver to" icon stays visible */}
                        <div className="relative z-[9997]">
                            <span className="hidden lg:block text-[12px] text-slate-300 ml-4">Deliver to</span>
                            <div className="flex items-center gap-1">
                                <MapPin size={15} className="text-white shrink-0" />
                                <span className="text-[12px] lg:text-sm font-bold uppercase tracking-tighter truncate max-w-[110px] lg:max-w-[150px]">{selectedCity || 'All Cities'}</span>
                                <ChevronDown size={14} className={`text-white transition-transform shrink-0 ${cityOpen ? 'rotate-180' : ''}`} />
                            </div>
                        </div>
                        {/* ── Simple city dropdown (opens on click of "Deliver to") ── */}
                        <AnimatePresence>
                            {cityOpen && (
                                <>
                                {/* Mobile-only blur backdrop (desktop uses outside-click to close) */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="fixed inset-0 z-[9993] bg-slate-900/25 backdrop-blur-[3px] cursor-default lg:hidden"
                                    onClick={(e) => { e.stopPropagation(); setCityOpen(false); }}
                                />
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.15 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute top-full left-0 mt-2 z-[9995] w-[230px] max-w-[calc(100vw-64px)] cursor-default"
                                >
                                    {/* Caret connecting the dropdown to the control */}
                                    <div className="absolute -top-[6px] left-6 w-3 h-3 bg-white rotate-45 rounded-[2px] ring-1 ring-slate-900/[0.06]" />
                                    <div className="bg-white text-slate-800 rounded-xl shadow-[0_16px_40px_-12px_rgba(2,15,35,0.35)] ring-1 ring-slate-900/[0.08] overflow-hidden">
                                        <div className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">Choose your city</div>
                                        <div className="py-1 max-h-72 overflow-y-auto">
                                            <button type="button" onClick={(e) => { e.stopPropagation(); selectCity(''); }}
                                                className={`flex w-full items-center gap-2.5 text-left px-3.5 py-2 text-[13px] hover:bg-slate-50 transition-colors ${!selectedCity ? 'font-bold text-[#0891B2]' : 'text-slate-700'}`}>
                                                <Store size={14} className={!selectedCity ? 'text-[#0891B2]' : 'text-slate-400'} />
                                                All Cities
                                                {!selectedCity && <Check size={14} className="ml-auto text-[#0891B2]" />}
                                            </button>
                                            {cities.length === 0 ? (
                                                <div className="px-3.5 py-3 text-[12px] text-slate-400">No cities available yet.</div>
                                            ) : cities.map(c => (
                                                <button key={c} type="button" onClick={(e) => { e.stopPropagation(); selectCity(c); }}
                                                    className={`flex w-full items-center gap-2.5 text-left px-3.5 py-2 text-[13px] hover:bg-slate-50 transition-colors ${c === selectedCity ? 'font-bold text-[#0891B2]' : 'text-slate-700'}`}>
                                                    <MapPin size={14} className={c === selectedCity ? 'text-[#0891B2]' : 'text-slate-400'} />
                                                    {c}
                                                    {c === selectedCity && <Check size={14} className="ml-auto text-[#0891B2]" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                                </>
                            )}
                        </AnimatePresence>

                        {/* ── Compact prompt (auto-drops on load; shows the saved city after choosing) ── */}
                        <AnimatePresence>
                            {cityPromptOpen && !cityOpen && (
                                <>
                                {/* Slight full-page blur while the prompt is open */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="fixed inset-0 z-[9993] bg-slate-900/20 backdrop-blur-[3px] cursor-default"
                                    onClick={(e) => { e.stopPropagation(); setCityPromptOpen(false); }}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.92, y: -8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.94, y: -6 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                                    style={{ transformOrigin: 'top left' }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute top-full left-0 mt-3 z-[9994] w-[240px] max-w-[calc(100vw-72px)] cursor-default lg:w-[300px] lg:max-w-[92vw]"
                                >
                                    {/* Caret connecting the popup to the control */}
                                    <div className="absolute -top-[6px] left-9 w-3.5 h-3.5 bg-[#0b6f86] rotate-45 rounded-[2px]" />
                                    <div className="relative rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-[0_28px_70px_-16px_rgba(2,15,35,0.6)] text-slate-800">
                                        {/* ── Vibrant gradient header ── */}
                                        <div className="relative px-4 pt-4 pb-4 bg-gradient-to-br from-[#0b6f86] via-[#119AB8] to-[#18c6e4] text-white overflow-hidden">
                                            <div className="pointer-events-none absolute -top-10 -right-8 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
                                            <div className="pointer-events-none absolute -bottom-14 -left-6 w-28 h-28 rounded-full bg-cyan-200/25 blur-2xl" />
                                            <div className="pointer-events-none absolute inset-0 opacity-[0.09]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '13px 13px' }} />

                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setCityPromptOpen(false); }}
                                                aria-label="Close"
                                                className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors z-10"
                                            >
                                                <X size={15} />
                                            </button>

                                            <div onClick={openCityDropdown} className="relative flex items-center gap-3 cursor-pointer pr-6">
                                                <span className="relative w-11 h-11 rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur-sm flex items-center justify-center shrink-0">
                                                    {/* Pulsing ring to draw the eye */}
                                                    <motion.span
                                                        className="absolute inset-0 rounded-2xl ring-2 ring-white/60"
                                                        animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
                                                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                                                    />
                                                    <MapPin size={21} className="text-white relative" />
                                                </span>
                                                <div className="min-w-0">
                                                    <h3 className="text-[16px] font-black tracking-tight leading-tight truncate">{selectedCity || 'Choose your city'}</h3>
                                                    <p className="text-[11px] text-white/85 mt-0.5 leading-snug">See only what&apos;s available near you</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── CTA ── */}
                                        <div className="p-3 bg-white">
                                            <button
                                                type="button"
                                                onClick={openCityDropdown}
                                                className="group w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-gradient-to-r from-[#0b6f86] to-[#18c6e4] text-white text-[13px] font-bold tracking-tight shadow-lg shadow-[#119AB8]/30 hover:shadow-xl hover:shadow-[#119AB8]/40 hover:brightness-[1.05] active:scale-[0.98] transition-all"
                                            >
                                                {selectedCity ? 'Change your city' : 'Choose your city'}
                                                <ChevronDown size={16} className="group-hover:translate-y-0.5 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Mobile right icons (User & Cart) */}
                    <div className="flex md:hidden items-center gap-2 text-white pr-1 ml-auto">
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
                        <div ref={branchRef} className="relative hidden md:block">
                            <button
                                type="button"
                                onClick={() => setBranchOpen(o => !o)}
                                className="h-full flex items-center px-3 bg-[#f3f3f3] border-r border-slate-300 text-[12px] text-slate-600 cursor-pointer hover:bg-slate-200 transition-colors max-w-[160px]"
                                title="Filter by city"
                            >
                                <span className="truncate">{selectedCity || 'All'}</span>
                                <ChevronDown size={14} className={`ml-1 opacity-60 shrink-0 transition-transform ${branchOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {branchOpen && (
                                <div className="absolute top-[calc(100%+6px)] left-0 w-60 bg-white rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-slate-200 z-[10001] overflow-hidden py-1 max-h-[320px] overflow-y-auto">
                                    <p className="px-4 pt-2 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cities</p>
                                    <button type="button" onClick={() => selectCity('')}
                                        className={`flex w-full items-center gap-2 text-left px-4 py-2 text-[13px] hover:bg-slate-50 transition-colors ${!selectedCity ? 'font-bold text-indigo-600' : 'text-slate-700'}`}>
                                        <Store size={13} className={!selectedCity ? 'text-indigo-600' : 'text-slate-400'} /> All Branches
                                    </button>
                                    {cities.length === 0 ? (
                                        <p className="px-4 py-2 text-[12px] text-slate-400 italic">No cities available.</p>
                                    ) : cities.map((c) => (
                                        <button key={c} type="button" onClick={() => selectCity(c)}
                                            className={`flex w-full items-center gap-2 text-left px-4 py-2 text-[13px] hover:bg-slate-50 transition-colors ${c === selectedCity ? 'font-bold text-indigo-600' : 'text-slate-700'}`}>
                                            <MapPin size={13} className={c === selectedCity ? 'text-indigo-600' : 'text-slate-400'} />
                                            <span className="truncate">{c}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
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
                    <div className="relative group/user" ref={userRef}>
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
                <div className="bg-[#232f3e] h-10 flex items-center px-2 md:px-4 gap-1 md:gap-2 text-white text-sm font-medium w-full max-w-full">
                    {/* Mobile scroll-left arrow */}
                    <button
                        onClick={() => scrollNav(-1)}
                        className="md:hidden shrink-0 p-0.5 -ml-1.5 text-[#4ad7f5] active:scale-90 transition"
                        aria-label="Scroll menu left"
                    >
                        <ChevronLeft size={20} className="stroke-[4]" />
                    </button>

                    <div ref={navScrollRef} className="flex items-center gap-4 overflow-x-auto no-scrollbar flex-1 min-w-0">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="flex items-center gap-1 shrink-0 p-1 rounded-sm hover:text-slate-200 transition-colors"
                        >
                            <Menu size={20} />
                            <span className="font-bold">All</span>
                        </button>
                        {(navbarPages.length > 0 ? navbarPages : DEFAULT_NAV_PAGES).map((p: any) => (
                            <Link
                                key={p.id ?? p.link}
                                href={p.link || '#'}
                                className="shrink-0 p-1 px-2 rounded-sm hover:text-slate-200 transition-colors"
                                style={{ color: pathname === p.link ? '#EFB366' : 'white' }}
                            >
                                {p.name}
                            </Link>
                        ))}

                        {/* Right-most Become a Seller Link */}
                        <Link
                            href="/register/supplier"
                            className="ml-auto shrink-0 font-serif italic font-medium capitalize text-[14px] hover:underline hover:opacity-80 transition-all active:scale-95 flex items-center justify-center underline-offset-[4px] decoration-1"
                            style={{ color: pathname === '/register/supplier' ? '#EFB366' : AMAZON_ORANGE }}
                        >
                            Become a Seller
                        </Link>
                    </div>

                    {/* Mobile scroll-right arrow */}
                    <button
                        onClick={() => scrollNav(1)}
                        className="md:hidden shrink-0 p-0.5 -mr-1.5 text-[#4ad7f5] active:scale-90 transition"
                        aria-label="Scroll menu right"
                    >
                        <ChevronRight size={20} className="stroke-[4]" />
                    </button>
                </div>
            )}

            {/* ── BROWSE MENU DRAWER (matches CartDrawer design) ── */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000]"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                            className="fixed top-0 left-0 h-screen w-[300px] sm:w-[400px] bg-white z-[10001] shadow-2xl flex flex-col font-sans"
                        >
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-[15px] font-black text-slate-800 uppercase tracking-[0.2em]">Browse</h2>
                                </div>
                                <button
                                    onClick={() => setMobileOpen(false)}
                                    className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-800 rounded-full transition-all duration-200 active:scale-95"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Account strip */}
                            <Link
                                href={user ? "/customer/dashboard" : "/login"}
                                onClick={() => setMobileOpen(false)}
                                className="px-6 py-4 bg-slate-50/60 border-b border-slate-100 flex items-center gap-3 hover:bg-slate-50 transition-colors group"
                            >
                                <div className="w-10 h-10 rounded-full bg-[#119AB8]/10 border border-[#119AB8]/20 flex items-center justify-center text-[#119AB8] font-black uppercase shrink-0">
                                    {user ? user.name.charAt(0) : <User size={18} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user ? 'Welcome' : 'Account'}</p>
                                    <p className="text-[14px] font-bold text-slate-800 truncate group-hover:text-[#119AB8] transition-colors">
                                        {user ? user.name : 'Sign in / Register'}
                                    </p>
                                </div>
                                <ChevronRight size={16} className="text-slate-300 group-hover:text-[#119AB8] group-hover:translate-x-0.5 transition-all" />
                            </Link>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-5 space-y-7">
                                {[
                                    {
                                        title: 'Your Account',
                                        links: [
                                            { name: 'Account Dashboard', href: '/customer/dashboard', Icon: LayoutDashboard },
                                            { name: 'Your Orders', href: '/customer/dashboard/orders', Icon: Package },
                                        ],
                                    },
                                    {
                                        title: 'Company',
                                        links: [
                                            { name: 'Beauty Blog', href: '/blog', Icon: Newspaper },
                                            { name: 'Careers', href: '/careers', Icon: Briefcase },
                                        ],
                                    },
                                    {
                                        title: 'Help & Policies',
                                        links: [
                                            { name: 'FAQs', href: '/faq', Icon: HelpCircle },
                                            { name: 'Shipping Rates', href: '/shipping-policy', Icon: Truck },
                                            { name: 'Returns & Refunds', href: '/returns', Icon: RotateCcw },
                                            { name: 'Conditions of Use', href: '/terms', Icon: FileText },
                                            { name: 'Privacy Notice', href: '/privacy', Icon: ShieldCheck },
                                            { name: 'Cookie Policy', href: '/cookies', Icon: Cookie },
                                            { name: 'Sitemap', href: '/sitemap', Icon: MapIcon },
                                        ],
                                    },
                                ].map((section) => (
                                    <div key={section.title}>
                                        <h3 className="px-3 mb-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">{section.title}</h3>
                                        <div className="space-y-0.5">
                                            {section.links.map((link) => (
                                                <Link
                                                    key={link.href}
                                                    href={link.href}
                                                    onClick={() => setMobileOpen(false)}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-[#119AB8] transition-all group"
                                                >
                                                    <link.Icon size={16} className="text-slate-400 group-hover:text-[#119AB8] transition-colors shrink-0" />
                                                    <span className="flex-1">{link.name}</span>
                                                    <ChevronRight size={13} className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                                {user ? (
                                    <button
                                        onClick={handleLogout}
                                        className="w-full py-2.5 bg-white border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-rose-600 font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wider active:scale-[0.99]"
                                    >
                                        <LogOut size={14} /> Sign Out
                                    </button>
                                ) : (
                                    <Link
                                        href="/login"
                                        onClick={() => setMobileOpen(false)}
                                        className="group w-full py-2.5 bg-[#119AB8] hover:bg-[#13B0D1] active:scale-[0.99] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-[#119AB8]/10 transition-all text-xs uppercase tracking-wider"
                                    >
                                        <LogIn size={14} /> Sign In
                                    </Link>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </header>
    );
}
