'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    ChevronRight,
    Home,
    Package,
    User,
    Truck,
    LogOut,
    Undo2,
    Wallet,
    Menu,
    X,
} from 'lucide-react';
import { authService, User as AuthUser } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const SIDEBAR_SECTIONS = [
    {
        title: "Overview",
        links: [
            { href: '/customer/dashboard', label: 'Your Account', icon: Home, accent: '#FFD814' },
        ]
    },
    {
        title: "Orders & Tracking",
        links: [
            { href: '/customer/dashboard/orders', label: 'Your Orders', icon: Package, accent: '#F59E0B' },
            { href: '/customer/dashboard/track', label: 'Track Package', icon: Truck, accent: '#007185' },
            { href: '/customer/dashboard/returns', label: 'Returns & Refunds', icon: Undo2, accent: '#EF4444' },
            { href: '/customer/dashboard/payments', label: 'Payments & Dues', icon: Wallet, accent: '#10B981' },
        ]
    },
    {
        title: "Security & Profile",
        links: [
            { href: '/customer/dashboard/profile', label: 'Login & Security', icon: User, accent: '#374151' },
        ]
    }
];

import AuthGuard from '@/components/auth/AuthGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [navOpen, setNavOpen] = useState(false);

    const isRoot = pathname === '/customer/dashboard';
    const currentLabel = SIDEBAR_SECTIONS.flatMap(s => s.links).find(l => l.href === pathname)?.label || 'Menu';

    // Close the mobile drawer on navigation and lock body scroll while it's open.
    useEffect(() => { setNavOpen(false); }, [pathname]);
    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.body.style.overflow = navOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [navOpen]);

    const logout = () => { authService.logout(); router.push('/'); };

    // Shared nav — used by the desktop sidebar and the mobile drawer.
    const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
        <nav className="space-y-6">
            {SIDEBAR_SECTIONS.map((section, idx) => (
                <div key={idx}>
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">
                        {section.title}
                    </h3>
                    <div className="space-y-0.5">
                        {section.links.map((link) => {
                            const isActive = pathname === link.href;
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={onNavigate}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all relative group ${isActive
                                        ? 'bg-[#F0F2F2] font-bold text-[#111]'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-[#007185]'
                                        }`}
                                >
                                    <div
                                        className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full transition-all ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                        style={{ backgroundColor: link.accent }}
                                    />
                                    <Icon className={`h-4 w-4 ${isActive ? 'text-[#111]' : 'text-gray-400'}`} />
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}

            <div className="pt-4 border-t border-gray-100">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-md text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </button>
            </div>
        </nav>
    );

    return (
        <AuthGuard allowedRoles={['customer']}>
            <div className="min-h-screen bg-[#F0F2F2] flex flex-col font-sans">
                <Navbar />

                <div className="flex-1 flex max-w-[1240px] mx-auto w-full px-3 sm:px-4 py-5 sm:py-8 gap-8">
                    {/* Left Sidebar (desktop) */}
                    <aside className="hidden lg:block w-64 shrink-0">
                        <div className="bg-white border border-[#D5D9D9] rounded-lg p-3 sticky top-[96px] shadow-sm">
                            <NavLinks />
                        </div>
                    </aside>

                    {/* Mobile navigation drawer */}
                    {navOpen && (
                        <div className="fixed inset-0 z-[10000] lg:hidden">
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setNavOpen(false)} />
                            <aside className="absolute left-0 top-0 h-full w-[82%] max-w-[300px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
                                <div className="h-14 px-4 flex items-center justify-between border-b border-[#D5D9D9] shrink-0">
                                    <h2 className="text-[14px] font-bold text-[#111]">Your Account</h2>
                                    <button onClick={() => setNavOpen(false)} aria-label="Close menu" className="p-2 -mr-1 rounded-md text-gray-500 hover:bg-gray-100"><X size={18} /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3">
                                    <NavLinks onNavigate={() => setNavOpen(false)} />
                                </div>
                            </aside>
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className="flex-1 min-w-0">
                        {/* Mobile menu trigger */}
                        <button
                            onClick={() => setNavOpen(true)}
                            className="lg:hidden mb-3 inline-flex items-center gap-2 h-10 px-3.5 rounded-lg bg-white border border-[#D5D9D9] shadow-sm text-[13px] font-bold text-[#111] active:scale-[0.99] transition-all"
                        >
                            <Menu size={16} /> {isRoot ? 'Account Menu' : currentLabel}
                        </button>

                        {/* Breadcrumb (desktop) */}
                        {!isRoot && (
                            <div className="hidden lg:flex items-center gap-2 text-sm mb-6 text-slate-500 font-medium">
                                <Link href="/customer/dashboard" className="hover:text-[#007185] hover:underline">Your Account</Link>
                                <ChevronRight className="h-3 w-3" />
                                <span className="text-[#C45500] font-bold">{currentLabel}</span>
                            </div>
                        )}

                        {/* Content sits in a clean white padded panel on mobile;
                            transparent on desktop so each page's own cards show. */}
                        <main className="bg-white lg:bg-transparent rounded-xl lg:rounded-none p-4 sm:p-5 lg:p-0 shadow-sm lg:shadow-none border border-gray-100 lg:border-0">
                            {children}
                        </main>
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}
