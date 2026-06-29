'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    Truck, LogOut, ChevronRight, ClipboardList, User, Star,
    LayoutDashboard, Wallet, Bell,
} from 'lucide-react';
import AuthGuard from '@/components/auth/AuthGuard';
import { authService } from '@/lib/auth';

// Same shape/styling as the customer dashboard sidebar, with the full rider menu.
const SIDEBAR_SECTIONS = [
    {
        title: 'Overview',
        links: [
            { href: '/delivery/dashboard', label: 'Dashboard', icon: LayoutDashboard, accent: '#F59E0B' },
        ],
    },
    {
        title: 'Deliveries',
        links: [
            { href: '/delivery/deliveries', label: 'My Deliveries', icon: Truck, accent: '#007185' },
            { href: '/delivery/history', label: 'Delivery History', icon: ClipboardList, accent: '#6366F1' },
        ],
    },
    {
        title: 'Performance',
        links: [
            { href: '/delivery/earnings', label: 'My Earnings', icon: Wallet, accent: '#059669' },
            { href: '/delivery/rating', label: 'My Rating & Performance', icon: Star, accent: '#F59E0B' },
        ],
    },
    {
        title: 'Account',
        links: [
            { href: '/delivery/notifications', label: 'Notifications', icon: Bell, accent: '#EF4444' },
            { href: '/delivery/profile', label: 'Profile & Security', icon: User, accent: '#374151' },
        ],
    },
];

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [name, setName] = useState('Rider');

    useEffect(() => {
        const u = authService.getUser();
        if (u) setName(u.name || 'Rider');
    }, []);

    const logout = () => {
        authService.logout();
        router.replace('/login');
    };

    const isRoot = pathname === '/delivery/dashboard';

    return (
        <AuthGuard allowedRoles={['delivery']}>
            <div className="min-h-screen bg-[#F0F2F2] flex flex-col font-sans text-slate-800">
                {/* Top header (delivery-branded, same spirit as the storefront navbar) */}
                <header className="sticky top-0 z-30 bg-white border-b border-[#D5D9D9] shadow-sm">
                    <div className="max-w-[1240px] mx-auto px-4 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-[#232F3E] text-white flex items-center justify-center shadow-sm">
                                <Truck size={18} />
                            </span>
                            <div className="leading-none">
                                <h1 className="text-[15px] font-bold text-[#111]">Delivery Console</h1>
                                <p className="text-[11px] text-gray-400 mt-1">Al-Qavi Hub</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="hidden sm:inline text-[13px] text-gray-600">Hello, <span className="font-bold text-[#111]">{name}</span></span>
                            <button onClick={logout}
                                className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md border border-[#D5D9D9] bg-white text-[12.5px] font-semibold text-gray-600 hover:bg-gray-50 hover:text-[#C45500] transition-all">
                                <LogOut size={14} /> Sign Out
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex max-w-[1240px] mx-auto w-full px-4 py-8 gap-8">
                    {/* Left Sidebar */}
                    <aside className="hidden lg:block w-64 shrink-0">
                        <div className="bg-white border border-[#D5D9D9] rounded-lg p-3 sticky top-24 shadow-sm">
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
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <div className="flex-1 min-w-0">
                        {!isRoot && (
                            <div className="flex items-center gap-2 text-sm mb-6 text-slate-500 font-medium">
                                <Link href="/delivery/dashboard" className="hover:text-[#007185] hover:underline">Delivery Console</Link>
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
            </div>
        </AuthGuard>
    );
}
