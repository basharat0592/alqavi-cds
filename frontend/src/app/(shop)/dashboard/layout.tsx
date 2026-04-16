'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    ChevronRight,
    LayoutDashboard,
    Package,
    Heart,
    LogOut,
    Home
} from 'lucide-react';
import { authService, User as AuthUser } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const SIDEBAR_LINKS = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/orders', label: 'Order History', icon: Package },
    { href: '/dashboard/wishlist', label: 'Wishlist', icon: Heart },
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-[#4f46e5]/20 border-t-[#4f46e5] rounded-full animate-spin" />
            </div>
        );
    }

    const isRoot = pathname === '/dashboard';

    return (
        <div className="min-h-screen bg-[#f8f9fb] flex flex-col font-sans">
            <Navbar />

            <div className="flex-1 flex flex-col lg:flex-row max-w-[1300px] mx-auto w-full px-4 lg:px-8 py-8 gap-8">
                
                {/* Sidebar — always visible */}
                <aside className="w-full lg:w-60 shrink-0 animate-in slide-in-from-left duration-500">
                    {/* User info card */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] flex items-center justify-center text-white font-black text-lg shadow-md">
                                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
                                <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                        <nav className="py-2">
                            {SIDEBAR_LINKS.map(link => {
                                const isActive = pathname === link.href;
                                const Icon = link.icon;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`
                                            flex items-center gap-3 px-5 py-3 text-sm transition-all relative
                                            ${isActive 
                                                ? 'text-[#4f46e5] font-bold bg-[#4f46e5]/5' 
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-[#4f46e5] font-medium'
                                            }
                                        `}
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#4f46e5] rounded-r-full" />
                                        )}
                                        <Icon className="h-4 w-4 flex-shrink-0" />
                                        <span>{link.label}</span>
                                        <ChevronRight className={`h-3 w-3 ml-auto transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="border-t border-gray-100">
                            <Link
                                href="/"
                                className="flex items-center gap-3 px-5 py-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#4f46e5] font-medium transition-all"
                            >
                                <Home className="h-4 w-4" />
                                <span>Go to Shop</span>
                            </Link>
                            <button 
                                onClick={() => { authService.logout(); router.push('/'); }}
                                className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-500 hover:bg-red-50 font-medium transition-all"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Content Area */}
                <main className="flex-1 min-w-0">
                    {/* Breadcrumb */}
                    {!isRoot && (
                        <div className="flex items-center gap-2 text-xs mb-6 text-gray-400 font-medium">
                            <Link href="/dashboard" className="hover:text-[#4f46e5] transition">Dashboard</Link>
                            <ChevronRight className="h-3 w-3" />
                            <span className="text-gray-700 font-bold">{SIDEBAR_LINKS.find(l => l.href === pathname)?.label || 'Page'}</span>
                        </div>
                    )}
                    
                    {children}
                </main>

            </div>

            <Footer />
        </div>
    );
}
