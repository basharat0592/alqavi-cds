'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    Bell,
    Search,
    User,
    LayoutDashboard,
    Package,
    TrendingUp,
    ShoppingCart,
    HelpCircle,
    LogOut,
    ChevronDown,
    ChevronRight,
    Home,
    Menu,
    X,
    Settings,
    Mail,
    RotateCcw,
    History
} from 'lucide-react';
import { authService } from '@/lib/auth';
import AuthGuard from '@/components/auth/AuthGuard';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';

const SIDEBAR_LINKS = [
    { href: '/supplier/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/supplier/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/supplier/products', label: 'Inventory', icon: Package },
    { href: '/supplier/returns', label: 'Returns', icon: RotateCcw },
    { href: '/supplier/sales', label: 'Transactions', icon: TrendingUp },
];

const ACCOUNT_LINKS = [
    { href: '/supplier/profile', label: 'My Profile', icon: User },
    { href: '/supplier/support', label: 'Partner Help', icon: HelpCircle },
];

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    const fetchLatestProfile = async () => {
        try {
            const { data } = await api.get('v1/users/profile/');
            setProfile(data);
        } catch (err) {
            console.error("Failed to sync profile:", err);
        }
    };

    useEffect(() => {
        setUser(authService.getUser());
        fetchLatestProfile();

        // ── Auto-Sync ────────────────────────────────────────────────────────
        // Refresh profile every 5 seconds to catch changes from other pages
        const interval = setInterval(fetchLatestProfile, 5000);

        // Listen for immediate update events from the profile page
        const handleSync = () => fetchLatestProfile();
        window.addEventListener('supplier_profile_updated', handleSync);

        return () => {
            clearInterval(interval);
            window.removeEventListener('supplier_profile_updated', handleSync);
        };
    }, []);

    const renderAvatar = (size = "w-8 h-8") => {
        const fullName = profile?.first_name 
            ? `${profile.first_name} ${profile.last_name || ''}`.trim() 
            : user?.name || 'Partner';
        
        const initial = fullName.charAt(0).toUpperCase();

        // Strict check for avatar existence and validity
        const hasAvatar = profile?.avatar && typeof profile.avatar === 'string' && profile.avatar.length > 0;

        if (hasAvatar) {
            return (
                <img
                    src={getImageUrl(profile.avatar)}
                    alt=""
                    className={cn(size, "rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-slate-100")}
                    onError={(e) => {
                        // Fallback on load error
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
            );
        }

        return (
            <div className={cn(size, "rounded-full bg-gradient-to-br from-[#00b4d8] to-[#0f172a] flex items-center justify-center font-bold text-white text-[13px] border-2 border-white shadow-sm shrink-0")}>
                {initial}
            </div>
        );
    };

    return (
        <AuthGuard allowedRoles={['supplier']}>
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">

                {/* ── FULL WIDTH NAVBAR ── */}
                <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-[60] shrink-0 print:hidden shadow-sm w-full">
                    <div className="flex items-center gap-6 flex-1">
                        {/* Branding in Navbar */}
                        <div className="flex items-center gap-3 pr-4 border-r border-slate-100">
                            <div className="w-9 h-9 bg-[#00b4d8] rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-[#00b4d8]/20 shrink-0 transform -rotate-3 transition-transform">Q</div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="font-black text-slate-900 text-[15px] leading-tight truncate tracking-tight">AL-QAVI Hub</span>
                                <span className="text-[10px] text-[#00b4d8] font-black uppercase tracking-[0.3em] truncate opacity-80">Partner Portal</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="hidden lg:flex p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all font-bold"
                        >
                            <Menu size={22} />
                        </button>
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="lg:hidden p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all font-bold"
                        >
                            <Menu size={22} />
                        </button>

                        {/* Modern Search */}
                        <div className="relative max-w-md w-full hidden sm:block">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-[13px] focus:ring-4 focus:ring-cyan-50 focus:border-[#00b4d8] outline-none transition-all placeholder:text-slate-400 font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <button className="p-3 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-[#00b4d8] transition-all relative group">
                                <Bell size={20} />
                                <span className="absolute top-3 right-3 h-2 w-2 bg-[#00b4d8] rounded-full ring-4 ring-white"></span>
                            </button>
                            <button className="p-3 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-[#00b4d8] transition-all">
                                <Mail size={20} />
                            </button>
                        </div>

                        <div className="h-8 w-px bg-slate-100 mx-2"></div>

                        {/* Profile Dropdown */}
                        <div className="relative profile-dropdown">
                            <button 
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-4 p-1 pr-2 rounded-2xl hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100 outline-none"
                            >
                                <div className="relative">
                                    {renderAvatar("w-10 h-10")}
                                    <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-white"></div>
                                </div>
                                <div className="hidden lg:flex flex-col text-left overflow-hidden">
                                    <span className="text-[13px] font-black text-slate-900 leading-none truncate">{profile?.first_name || user?.name?.split(' ')[0] || 'Supplier'}</span>
                                    <span className="text-[10px] text-emerald-500 font-black mt-1.5 uppercase tracking-[0.2em] opacity-70">Active Account</span>
                                </div>
                                <ChevronDown size={14} className={cn("text-slate-300 transition-transform hidden lg:block", isProfileOpen && "rotate-180")} />
                            </button>

                            {/* Dropdown Menu */}
                            {isProfileOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                                    <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 py-3 z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="px-5 py-4 border-b border-slate-50 mb-2">
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Partner Information</p>
                                            <p className="text-[14px] font-black text-slate-900 truncate">{profile?.company || 'Al-Qavi Partner'}</p>
                                            <p className="text-[11px] text-slate-500 mt-1 truncate">{user?.email}</p>
                                        </div>

                                        <div className="px-2 space-y-0.5">
                                            <Link 
                                                href="/supplier/profile" 
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-[#00b4d8] transition-all group"
                                            >
                                                <User size={18} className="text-slate-400 group-hover:text-[#00b4d8]" />
                                                <span className="text-[13px] font-bold">My Profile</span>
                                            </Link>
                                            <Link
                                                href="/supplier/profile"
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-[#00b4d8] transition-all group"
                                            >
                                                <Settings size={18} className="text-slate-400 group-hover:text-[#00b4d8]" />
                                                <span className="text-[13px] font-bold">Account Settings</span>
                                            </Link>
                                            <Link 
                                                href="/supplier/support" 
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-[#00b4d8] transition-all group"
                                            >
                                                <HelpCircle size={18} className="text-slate-400 group-hover:text-[#00b4d8]" />
                                                <span className="text-[13px] font-bold">Partner Help</span>
                                            </Link>
                                        </div>

                                        <div className="mt-2 pt-2 border-t border-slate-50 px-2">
                                            <button 
                                                onClick={() => { authService.logout(); window.location.href = '/login'; }}
                                                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-all group font-bold"
                                            >
                                                <LogOut size={18} />
                                                <span className="text-[13px]">Sign Out</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden h-[calc(100vh-80px)]">
                    {/* ── MODERN SIDEBAR ── */}
                    <aside className={cn(
                        "fixed top-[96px] bottom-4 left-4 z-50 bg-[#131921] transition-all duration-300 ease-in-out lg:block print:hidden rounded-[16px] shadow-xl overflow-hidden",
                        isSidebarOpen ? "w-64" : "w-16",
                        isMobileMenuOpen ? "translate-x-0" : "-translate-x-[calc(100%+32px)] lg:translate-x-0"
                    )}>
                        <div className="h-full flex flex-col">
                            {/* Navigation Section */}
                            <nav className="flex-1 px-3 space-y-6 overflow-y-auto no-scrollbar py-6">
                                <div>
                                    {isSidebarOpen && <span className="px-3 text-[11px] font-bold text-[#8a919e] uppercase tracking-wider block mb-3">Menu</span>}
                                    <div className="space-y-1">
                                        {SIDEBAR_LINKS.map(link => {
                                            const isActive = pathname === link.href || (link.href !== '/supplier/dashboard' && pathname.startsWith(link.href));
                                            return (
                                                <Link
                                                    key={link.href}
                                                    href={link.href}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className={cn(
                                                        "group flex items-center gap-3 px-3 py-2.5 rounded-[4px] transition-all duration-200",
                                                        isActive
                                                            ? "bg-[#232f3e] text-white border-l-4 border-[#f0c14b] pl-2"
                                                            : "text-[#d5d9d9] hover:bg-[#232f3e] hover:text-white"
                                                    )}
                                                >
                                                    <link.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-[#f0c14b]" : "text-[#8a919e] group-hover:text-white")} />
                                                    {isSidebarOpen && <span className="text-[13px] font-medium tracking-tight">{link.label}</span>}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    {isSidebarOpen && <span className="px-3 text-[11px] font-bold text-[#8a919e] uppercase tracking-wider block mb-3">Account</span>}
                                    <div className="space-y-1">
                                        {ACCOUNT_LINKS.map(link => {
                                            const isActive = pathname === link.href;
                                            return (
                                                <Link
                                                    key={link.href}
                                                    href={link.href}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className={cn(
                                                        "group flex items-center gap-3 px-3 py-2.5 rounded-[4px] transition-all duration-200",
                                                        isActive
                                                            ? "bg-[#232f3e] text-white border-l-4 border-[#f0c14b] pl-2"
                                                            : "text-[#d5d9d9] hover:bg-[#232f3e] hover:text-white"
                                                    )}
                                                >
                                                    <link.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-[#f0c14b]" : "text-[#8a919e] group-hover:text-white")} />
                                                    {isSidebarOpen && <span className="text-[13px] font-medium tracking-tight">{link.label}</span>}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            </nav>

                            {/* Logout Area */}
                            <div className="p-4 bg-[#19222d] border-t border-[#232f3e]">
                                <button
                                    onClick={() => { authService.logout(); window.location.href = '/login'; }}
                                    className={cn(
                                        "flex items-center gap-3 w-full px-3 py-2.5 rounded-[4px] text-[#d5d9d9] hover:bg-rose-900/20 hover:text-rose-400 transition-all duration-200 font-medium",
                                        !isSidebarOpen && "justify-center"
                                    )}
                                >
                                    <LogOut className="h-5 w-5 shrink-0" />
                                    {isSidebarOpen && <span className="text-[13px]">Sign Out</span>}
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* ── MAIN AREA ── */}
                    <div className={cn(
                        "flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar transition-all duration-300",
                        isSidebarOpen ? "lg:pl-[288px]" : "lg:pl-[96px]"
                    )}>
                        <main className="px-12 pt-12 pb-24 print:p-0 bg-slate-50/50 min-h-screen">


                            {children}
                        </main>
                    </div>
                </div>

                {/* Mobile Menu Backdrop */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-[#0f172a]/60 backdrop-blur-md lg:hidden transition-opacity"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}
            </div>
        </AuthGuard>
    );
}
