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
    { href: '/supplier/activity', label: 'Recent Activity', icon: History },
    { href: '/supplier/sales', label: 'Finance & Sales', icon: TrendingUp },
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
    }, []);

    const renderAvatar = (size = "w-8 h-8") => {
        const name = profile?.first_name || user?.name || 'P';
        const initial = name.charAt(0).toUpperCase();

        if (profile?.avatar) {
            return (
                <img
                    src={getImageUrl(profile.avatar)}
                    alt=""
                    className={cn(size, "rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-slate-100")}
                />
            );
        }

        return (
            <div className={cn(size, "rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs border-2 border-white shadow-sm")}>
                {initial}
            </div>
        );
    };

    return (
        <AuthGuard allowedRoles={['supplier']}>
            <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
                
                {/* ── MODERN SIDEBAR ── */}
                <aside className={cn(
                    "fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out lg:static lg:block print:hidden",
                    isSidebarOpen ? "w-64" : "w-20",
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}>
                    <div className="h-full flex flex-col">
                        {/* Logo Area */}
                        <div className={cn("p-6 flex items-center gap-3", !isSidebarOpen && "justify-center")}>
                            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-indigo-200 shrink-0">A</div>
                            {isSidebarOpen && (
                                <div className="flex flex-col overflow-hidden">
                                    <span className="font-black text-slate-900 text-[14px] leading-tight truncate">AL-QAVI Hub</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">Partner Portal</span>
                                </div>
                            )}
                        </div>

                        {/* Navigation Section */}
                        <nav className="flex-1 px-4 space-y-6 overflow-y-auto no-scrollbar py-4">
                            <div>
                                {isSidebarOpen && <span className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-4">Core Management</span>}
                                <div className="space-y-1">
                                    {SIDEBAR_LINKS.map(link => {
                                        const isActive = pathname === link.href || (link.href !== '/supplier/dashboard' && pathname.startsWith(link.href));
                                        return (
                                            <Link
                                                key={link.href}
                                                href={link.href}
                                                className={cn(
                                                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                                                    isActive 
                                                        ? "bg-indigo-50 text-indigo-700 font-bold shadow-sm" 
                                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                                )}
                                            >
                                                <link.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                                                {isSidebarOpen && <span className="text-sm">{link.label}</span>}
                                                {isActive && isSidebarOpen && <div className="ml-auto w-1 h-4 bg-indigo-600 rounded-full" />}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                {isSidebarOpen && <span className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-4">Account & Help</span>}
                                <div className="space-y-1">
                                    {ACCOUNT_LINKS.map(link => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
                                        >
                                            <link.icon className="h-5 w-5 text-slate-400 group-hover:text-slate-600 shrink-0" />
                                            {isSidebarOpen && <span className="text-sm">{link.label}</span>}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </nav>

                        {/* Logout Area */}
                        <div className="p-4 border-t border-slate-100">
                            <button
                                onClick={() => { authService.logout(); window.location.href = '/login'; }}
                                className={cn(
                                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 group",
                                    !isSidebarOpen && "justify-center"
                                )}
                            >
                                <LogOut className="h-5 w-5 text-slate-400 group-hover:text-rose-500 shrink-0" />
                                {isSidebarOpen && <span className="text-sm font-medium">Sign Out</span>}
                            </button>
                        </div>
                    </div>
                </aside>

                {/* ── MAIN AREA ── */}
                <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                    
                    {/* Modern Top Navbar */}
                    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40 shrink-0 print:hidden">
                        <div className="flex items-center gap-4 flex-1">
                            <button 
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="hidden lg:flex p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                            >
                                <Menu size={20} />
                            </button>
                            <button 
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                            >
                                <Menu size={20} />
                            </button>
                            
                            {/* Modern Search */}
                            <div className="relative max-w-md w-full hidden sm:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                <input 
                                    type="text" 
                                    placeholder="Global search orders, tracking, units..."
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="p-2.5 rounded-xl hover:bg-slate-50 text-slate-500 transition-all relative group">
                                <Bell size={20} />
                                <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-indigo-600 rounded-full ring-2 ring-white"></span>
                            </button>
                            <button className="p-2.5 rounded-xl hover:bg-slate-50 text-slate-500 transition-all">
                                <Mail size={20} />
                            </button>
                            
                            <div className="h-8 w-px bg-slate-200 mx-2"></div>
                            
                            <Link href="/supplier/profile" className="flex items-center gap-3 p-1 rounded-xl hover:bg-slate-50 transition-all group max-w-[180px]">
                                {renderAvatar("w-9 h-9")}
                                <div className="hidden md:flex flex-col text-left overflow-hidden">
                                    <span className="text-[12px] font-bold text-slate-900 leading-none truncate">{profile?.first_name || user?.name?.split(' ')[0] || 'Partner'}</span>
                                    <span className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-tighter">Verified Hub</span>
                                </div>
                                <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors hidden md:block" />
                            </Link>
                        </div>
                    </header>

                    {/* Content Scroll Container */}
                    <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-6 py-6 pb-0 print:p-0">
                        {/* Page Header Section (Dynamic Breadcrumb) */}
                        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                           <div className="flex items-center gap-2 text-xs font-bold text-indigo-600/60 uppercase tracking-widest mb-1 group cursor-pointer" onClick={() => router.push('/supplier/dashboard')}>
                                <Home size={10} className="group-hover:translate-x-0.5 transition-transform" />
                                <span>Supplier Portal</span>
                                <ChevronRight size={10} />
                                <span className="text-slate-900">{SIDEBAR_LINKS.find(l => pathname === l.href || (l.href !== '/supplier/dashboard' && pathname.startsWith(l.href)))?.label || 'Account'}</span>
                           </div>
                           <h2 className="text-[28px] font-black translate-x-[-1px] text-slate-900 tracking-tight">
                                {SIDEBAR_LINKS.find(l => pathname === l.href || (l.href !== '/supplier/dashboard' && pathname.startsWith(l.href)))?.label || 'Account Overview'}
                           </h2>
                        </div>

                        {children}
                    </main>

                </div>

                {/* Mobile Menu Backdrop */}
                {isMobileMenuOpen && (
                    <div 
                        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity" 
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}
            </div>
        </AuthGuard>
    );
}
