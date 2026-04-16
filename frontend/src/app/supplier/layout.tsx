'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AuthGuard from '@/components/auth/AuthGuard';
import { 
    LayoutDashboard, Package, ShoppingBag, LogOut, 
    Menu, Bell, Box, User, Settings
} from 'lucide-react';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import { cn } from '@/lib/utils';

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const u = authService.getUser();
        if (u) setUser(u);
    }, []);

    const navItems = [
        { name: 'Overview', href: '/supplier/dashboard', icon: LayoutDashboard },
        { name: 'My Products', href: '/supplier/products', icon: Package },
        { name: 'Admin Orders', href: '/supplier/orders', icon: ShoppingBag },
    ];

    const handleLogout = () => {
        authService.logout();
        router.push('/login');
    };

    return (
        <AuthGuard allowedRoles={['supplier', 'admin']}>
            <div className="min-h-screen bg-slate-50 flex font-sans">
                {/* Desktop Sidebar */}
                <aside className={cn(
                    "fixed inset-y-0 left-0 bg-[#1a1a2e] text-white transition-all duration-300 z-50",
                    isSidebarOpen ? "w-64" : "w-20"
                )}>
                    <div className="flex flex-col h-full">
                        {/* Logo */}
                        <div className="h-16 flex items-center px-6 border-b border-white/5">
                            <Box className="h-6 w-6 text-[#F59E0B] shrink-0" />
                            {isSidebarOpen && (
                                <span className="ml-3 font-black text-sm tracking-tight uppercase">
                                    Supplier <span className="text-[#F59E0B]">Hub</span>
                                </span>
                            )}
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 py-6 px-4 space-y-1">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link 
                                        key={item.href} 
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                                            isActive 
                                                ? "bg-[#F59E0B] text-white shadow-lg shadow-amber-500/20" 
                                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "group-hover:text-white")} />
                                        {isSidebarOpen && <span className="text-sm font-bold">{item.name}</span>}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/5 space-y-1">
                            {isSidebarOpen && (
                                <div className="px-3 py-2 mb-2">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Logged in as</p>
                                    <p className="text-xs font-bold text-white truncate">{user?.name || user?.email}</p>
                                </div>
                            )}
                            <button 
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all"
                            >
                                <LogOut className="h-5 w-5 shrink-0" />
                                {isSidebarOpen && <span className="text-sm font-bold">Logout</span>}
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className={cn(
                    "flex-1 flex flex-col transition-all duration-300",
                    isSidebarOpen ? "ml-64" : "ml-20"
                )}>
                    {/* Header */}
                    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-8 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                                {navItems.find(i => i.href === pathname)?.name || 'Dashboard'}
                            </h2>
                        </div>

                        <div className="flex items-center gap-4">
                            <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 relative">
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full border border-white" />
                            </button>
                            <div className="h-8 w-px bg-slate-200 mx-2" />
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs font-black text-slate-900 leading-tight uppercase">{user?.name}</p>
                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">Verified Partner</p>
                                </div>
                                <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 font-black text-sm border-2 border-white shadow-sm overflow-hidden">
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="P" className="w-full h-full object-cover" />
                                    ) : (
                                        user?.name?.[0] || 'S'
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Content */}
                    <main className="p-8 pb-20">
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>
    );
}
