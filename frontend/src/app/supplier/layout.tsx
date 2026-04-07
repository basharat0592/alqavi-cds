'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
    Bell, 
    Search, 
    User, 
    Building2, 
    LayoutDashboard, 
    Package, 
    Boxes, 
    TrendingUp, 
    ShoppingCart, 
    HelpCircle, 
    Settings, 
    LogOut, 
    ChevronDown,
    ChevronRight,
    Home
} from 'lucide-react';
import { authService } from '@/lib/auth';
import AuthGuard from '@/components/auth/AuthGuard';

const SIDEBAR_LINKS = [
    { href: '/supplier/dashboard', label: 'Dashboard', icon: Home },
    { href: '/supplier/orders', label: 'Recent Orders', icon: ShoppingCart },
    { href: '/supplier/products', label: 'Your Catalog', icon: Package },
    { href: '/supplier/inventory', label: 'Warehouse Status', icon: Boxes },
    { href: '/supplier/sales', label: 'Sale Registry', icon: TrendingUp },
    { href: '/supplier/profile', label: 'Login & Security', icon: User },
    { href: '/supplier/support', label: 'Partner Support', icon: HelpCircle },
];

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        setUser(authService.getUser());
    }, []);

    return (
        <AuthGuard allowedRoles={['supplier']}>
            <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
                {/* Global Brand Navbar - High End Amazon Style */}
                <header className="bg-[#131921] h-14 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-50 shadow-md shrink-0">
                    {/* Left: Logo */}
                    <Link href="/supplier/dashboard" className="flex items-center gap-3 group">
                        <div className="w-8 h-8 bg-[#F7CA00] rounded-lg flex items-center justify-center font-black text-slate-900 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(247,202,0,0.3)]">A</div>
                        <div className="flex flex-col">
                            <span className="font-extrabold text-[13px] tracking-tight text-white uppercase leading-none">Al-Qavi</span>
                            <span className="text-[9px] text-[#F7CA00] font-black uppercase tracking-[0.2em] leading-none mt-1">Supplier Hub</span>
                        </div>
                    </Link>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col text-right cursor-pointer group">
                            <span className="text-[10px] text-gray-300 font-medium leading-none">Hello, {user?.name || 'Partner'}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-xs font-black text-white group-hover:text-[#F7CA00] transition-colors uppercase tracking-tight">Partner Portal</span>
                                <ChevronDown size={12} className="text-gray-400" />
                            </div>
                        </div>

                        <button 
                            onClick={() => {
                                authService.logout();
                                window.location.href = '/login';
                            }}
                            className="bg-[#F7CA00] hover:bg-[#e6be00] text-slate-900 px-4 py-1.5 rounded font-black text-[11px] uppercase tracking-wider shadow-sm transition-all active:scale-95"
                        >
                            Sign Out
                        </button>
                    </div>
                </header>

                {/* Main Content Area: Responsive Split with Sidebar */}
                <div className="flex-1 flex flex-col lg:flex-row max-w-[1250px] mx-auto w-full px-4 lg:px-8 py-6 gap-8 overflow-hidden">
                    
                    {/* Minimalist Amazon Sidebar */}
                    <aside className="w-full lg:w-64 shrink-0 space-y-6 animate-in slide-in-from-left duration-500">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 mb-6">Menu Settings</h2>
                            <nav className="space-y-1">
                                {SIDEBAR_LINKS.map(link => {
                                    const isActive = pathname === link.href || (link.href !== '/supplier/dashboard' && pathname.startsWith(link.href));
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className={`
                                                flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all
                                                ${isActive 
                                                    ? 'bg-blue-50 text-[#F7CA00] font-bold border border-blue-100' 
                                                    : 'text-slate-600 hover:bg-gray-50 hover:text-[#F7CA00]'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <link.icon className={`h-4 w-4 ${isActive ? 'text-[#F7CA00]' : 'text-slate-400'}`} />
                                                <span>{link.label}</span>
                                            </div>
                                            <ChevronRight className={`h-3 w-3 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                        
                        <div className="pt-6 border-t font-bold">
                            <button 
                                onClick={() => { authService.logout(); window.location.href = '/'; }}
                                className="flex items-center gap-2 text-sm text-rose-600 font-medium hover:underline"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Logout Session</span>
                            </button>
                        </div>
                    </aside>

                    {/* Content Area */}
                    <main className="flex-1 lg:border-l lg:pl-8 overflow-y-auto no-scrollbar">
                        {/* Breadcrumb Style Navigation */}
                        <div className="flex items-center gap-2 text-xs mb-8 text-slate-500 font-medium uppercase tracking-wider">
                            <Link href="/supplier/dashboard" className="hover:text-[#F7CA00] hover:underline">Supplier Portal</Link>
                            <ChevronRight className="h-3 w-3" />
                            <span className="text-slate-900 font-bold">
                                {SIDEBAR_LINKS.find(l => pathname === l.href || (l.href !== '/supplier/dashboard' && pathname.startsWith(l.href)))?.label || 'Overview'}
                            </span>
                        </div>
                        
                        {children}
                    </main>

                </div>

                {/* Footer Brand */}
                <div className="mt-auto py-10 bg-white border-t border-gray-200 text-center shrink-0">
                    <div className="flex items-center justify-center gap-2 mb-4 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
                        <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center font-bold text-white text-[10px]">A</div>
                        <span className="font-black text-xs tracking-tighter uppercase text-slate-900">Al-Qavi Distributor Network</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.4em]">© 2026 Partner Enterprise Portal</p>
                </div>
            </div>
        </AuthGuard>
    );
}
