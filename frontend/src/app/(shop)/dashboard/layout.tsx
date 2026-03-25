'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
    LayoutDashboard, Package, User, Heart, Settings, 
    LogOut, ChevronRight, Menu, X, Bell, ShoppingBag, Truck
} from 'lucide-react';
import { authService, User as AuthUser } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const SIDEBAR_LINKS = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/orders', label: 'My Orders', icon: Package },
    { href: '/dashboard/track', label: 'Track Order', icon: Truck },
    { href: '/dashboard/wishlist', label: 'Wishlist', icon: Heart },
    { href: '/dashboard/profile', label: 'Profile Settings', icon: User },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const currentUser = authService.getUser();
        if (!currentUser) {
            router.push('/login?redirect=' + pathname);
        } else {
            setUser(currentUser);
            setLoading(false);
        }
    }, [router, pathname]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-4 border-[#FF9900]/20 border-t-[#FF9900] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-screen bg-white dark:bg-[#131921] flex flex-col font-sans overflow-hidden">
            
            <div className="flex-1 flex overflow-hidden">
                
                {/* Sidebar - Fixed Height, Scrollable if needed */}
                <aside className="w-72 shrink-0 border-r border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
                    
                    {/* Brand/Logo Area */}
                    <div className="h-20 flex items-center px-6 border-b border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-10 h-10 bg-[#FF9900] rounded-lg flex items-center justify-center shadow-lg shadow-[#FF9900]/20">
                                <span className="text-xl font-black text-[#131921]">A</span>
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-slate-900 dark:text-white leading-tight">My Account</h2>
                                <p className="text-[10px] font-bold text-[#FF9900] uppercase tracking-widest">Customer Portal</p>
                            </div>
                        </Link>
                    </div>

                    {/* User Profile Hook */}
                    <div className="p-6 border-b dark:border-slate-800 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-700">
                            <span className="text-xl font-black text-[#FF9900] uppercase tracking-tighter">
                                {user?.name?.[0] || 'U'}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-black text-sm text-slate-900 dark:text-white truncate uppercase tracking-tight">{user?.name}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active now</span>
                            </div>
                        </div>
                    </div>

                    {/* Nav Links */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                        <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Main Navigation</p>
                        {SIDEBAR_LINKS.map(link => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href;
                            
                            return (
                                <Link 
                                    key={link.href} 
                                    href={link.href}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded text-[11px] font-black uppercase tracking-widest transition-all group
                                        ${isActive 
                                            ? 'bg-[#FF9900] text-[#131921]' 
                                            : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-100 dark:hover:border-slate-700'
                                        }
                                    `}
                                >
                                    <Icon className={`h-4 w-4 ${isActive ? 'text-[#131921]' : 'text-slate-400 group-hover:text-[#FF9900] transition-colors'}`} />
                                    <span className="flex-1">{link.label}</span>
                                    {isActive && <ChevronRight className="h-3 w-3 opacity-50" />}
                                </Link>
                            );
                        })}

                        <div className="pt-8 mt-4 border-t dark:border-slate-800">
                            <button 
                                onClick={() => {
                                    authService.logout();
                                    router.push('/');
                                }}
                                className="w-full flex items-center gap-3 px-4 py-4 rounded text-[11px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Logout System</span>
                            </button>
                        </div>
                    </nav>

                    {/* Bottom Status */}
                    <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t dark:border-slate-800">
                        <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                            <span>Connection</span>
                            <span className="text-emerald-500">Secure AES-256</span>
                        </div>
                        <div className="h-1 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-[95%]" />
                        </div>
                    </div>
                </aside>

                {/* Content Area - Scrollable */}
                <main className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-transparent">
                    <div className="max-w-[1400px] p-8 min-h-full">
                        {children}
                    </div>
                </main>

            </div>
        </div>
    );
}
