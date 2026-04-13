'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    ChevronRight,
    Home,
    Package,
    Heart,
    User,
    Truck,
    LogOut
} from 'lucide-react';
import { authService, User as AuthUser } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const SIDEBAR_LINKS = [
    { href: '/dashboard', label: 'Your Account', icon: Home },
    { href: '/dashboard/orders', label: 'Your Orders', icon: Package },
    { href: '/dashboard/track', label: 'Track Package', icon: Truck },
    { href: '/dashboard/wishlist', label: 'Your Wishlist', icon: Heart },
    { href: '/dashboard/profile', label: 'Login & Security', icon: User },
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
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-8 h-8 border-4 border-[#F59E0B]/20 border-t-[#F59E0B] rounded-full animate-spin" />
            </div>
        );
    }

    const isRoot = pathname === '/dashboard';

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />

            <div className="flex-1 flex flex-col lg:flex-row max-w-[1200px] mx-auto w-full px-4 lg:px-8 py-6 gap-8">
                
                {/* Minimalist Amazon Sidebar - Hidden on main dashboard root for a cleaner landing grid */}
                {!isRoot && (
                    <aside className="w-full lg:w-64 shrink-0 space-y-6 animate-in slide-in-from-left duration-500">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 mb-6">Account Settings</h2>
                            <nav className="space-y-1">
                                {SIDEBAR_LINKS.map(link => {
                                    const isActive = pathname === link.href;
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className={`
                                                flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all
                                                ${isActive 
                                                    ? 'bg-blue-50 text-[#F59E0B] font-bold border border-blue-100' 
                                                    : 'text-slate-600 hover:bg-gray-50 hover:text-[#F59E0B]'
                                                }
                                            `}
                                        >
                                            <span>{link.label}</span>
                                            <ChevronRight className={`h-3 w-3 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                        
                        <div className="pt-6 border-t">
                            <button 
                                onClick={() => { authService.logout(); router.push('/'); }}
                                className="flex items-center gap-2 text-sm text-rose-600 font-medium hover:underline"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </aside>
                )}

                {/* Content Area */}
                <main className={`flex-1 ${isRoot ? '' : 'lg:border-l lg:pl-8'}`}>
                    {/* Breadcrumb Style Navigation */}
                    {!isRoot && (
                        <div className="flex items-center gap-2 text-xs mb-8 text-slate-500 font-medium uppercase tracking-wider">
                            <Link href="/dashboard" className="hover:text-[#F59E0B] hover:underline">Your Account</Link>
                            <ChevronRight className="h-3 w-3" />
                            <span className="text-slate-900 font-bold">{SIDEBAR_LINKS.find(l => l.href === pathname)?.label}</span>
                        </div>
                    )}
                    
                    {children}
                </main>

            </div>

            <Footer />
        </div>
    );
}
