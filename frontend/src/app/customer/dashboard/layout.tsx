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
    LogOut,
    RefreshCw,
    Undo2
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

    const isRoot = pathname === '/customer/dashboard';

    return (
        <AuthGuard allowedRoles={['customer']}>
            <div className="min-h-screen bg-[#F0F2F2] flex flex-col font-sans">
                <Navbar />

                <div className="flex-1 flex max-w-[1240px] mx-auto w-full px-4 py-8 gap-8">
                    {/* Left Sidebar - Hidden on mobile for now or made simple */}
                    <aside className="hidden lg:block w-64 shrink-0">
                        <div className="bg-white border border-[#D5D9D9] rounded-lg p-3 sticky top-8 shadow-sm">
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
                                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all relative group ${isActive
                                                                ? 'bg-[#F0F2F2] font-bold text-[#111]'
                                                                : 'text-gray-600 hover:bg-gray-50 hover:text-[#007185]'
                                                            }`}
                                                    >
                                                        {/* Accent Bar */}
                                                        <div
                                                            className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full transition-all ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                                                }`}
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
                                        onClick={() => {
                                            authService.logout();
                                            router.push('/');
                                        }}
                                        className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-md text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Sign Out
                                    </button>
                                </div>
                            </nav>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <div className="flex-1 min-w-0">
                        {/* Breadcrumb Style Navigation */}
                        {!isRoot && (
                            <div className="flex items-center gap-2 text-sm mb-6 text-slate-500 font-medium">
                                <Link href="/customer/dashboard" className="hover:text-[#007185] hover:underline">Your Account</Link>
                                <ChevronRight className="h-3 w-3" />
                                <span className="text-[#C45500] font-bold">
                                    {SIDEBAR_SECTIONS.flatMap(s => s.links).find(l => l.href === pathname)?.label || 'Page'}
                                </span>
                            </div>
                        )}

                        <main className="bg-white lg:bg-transparent rounded-lg p-0">
                            {children}
                        </main>
                    </div>
                </div>

                <Footer />
            </div>
        </AuthGuard>
    );
}
