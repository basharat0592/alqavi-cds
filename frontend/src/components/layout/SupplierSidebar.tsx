'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, Package, ShoppingCart, 
    LogOut, Boxes, Bell, TrendingUp,
    ChevronsLeft, ChevronsRight, Settings,
    User, HelpCircle
} from 'lucide-react';
import { authService } from '@/lib/auth';

interface NavItem {
    name: string;
    href: string;
    icon: any;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

export default function SupplierSidebar({ isCollapsed = false, onToggle }: { isCollapsed?: boolean; onToggle?: () => void }) {
    const pathname = usePathname();

    const menuGroups: NavGroup[] = [
        {
            label: 'Operational Hub',
            items: [
                { name: 'Dashboard', href: '/supplier/dashboard', icon: LayoutDashboard },
                { name: 'My Catalog', href: '/supplier/products', icon: Package },
                { name: 'Stock Registry', href: '/supplier/inventory', icon: Boxes },
            ],
        },
        {
            label: 'Business Records',
            items: [
                { name: 'Sale Registry', href: '/supplier/sales', icon: TrendingUp },
                { name: 'Return Logs', href: '/supplier/returns', icon: ShoppingCart },
            ],
        },
        {
            label: 'Account Hub',
            items: [
                { name: 'Partner Profile', href: '/supplier/profile', icon: User },
                { name: 'Support Center', href: '/supplier/support', icon: HelpCircle },
            ],
        },
    ];

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

    return (
        <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white text-slate-600 h-screen flex flex-col flex-shrink-0 z-30 font-sans border-r border-gray-200 transition-all duration-300 shadow-xl shadow-black/5`}>
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-gray-100">
                {!isCollapsed && (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#F7CA00] rounded-lg flex items-center justify-center font-black text-white text-sm shadow-md shadow-yellow-500/20">A</div>
                        <div className="flex flex-col">
                            <span className="font-black text-[12px] tracking-tight uppercase text-slate-900 leading-none">Al-Qavi</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Partner</span>
                        </div>
                    </div>
                )}
                <button onClick={onToggle} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#F7CA00] transition-colors">
                    {isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-8 custom-scrollbar">
                {menuGroups.map((group) => (
                    <div key={group.label} className="space-y-1">
                        {!isCollapsed && (
                            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{group.label}</p>
                        )}
                        <div className="space-y-[2px]">
                            {group.items.map((item) => {
                                const active = isActive(item.href);
                                return (
                                    <Link key={item.name} href={item.href}
                                        className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all group
                                            ${active ? 'bg-[#F7CA00]/10 text-slate-900 shadow-sm border border-yellow-500/20' : 'hover:bg-gray-50 text-slate-500 hover:text-slate-900'}`}>
                                        <div className="flex items-center gap-3">
                                            <item.icon size={18} className={`${active ? 'text-[#F7CA00]' : 'text-gray-400 group-hover:text-[#F7CA00]'} transition-colors`} />
                                            {!isCollapsed && <span className="text-xs font-bold tracking-tight">{item.name}</span>}
                                        </div>
                                        {active && !isCollapsed && <div className="w-1.5 h-1.5 bg-[#F7CA00] rounded-full shadow-[0_0_8px_#F7CA00]"></div>}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 space-y-1">
                <Link href="/supplier/settings" className="flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:bg-gray-50 hover:text-slate-900 rounded-xl transition-all">
                    <Settings size={18} />
                    {!isCollapsed && <span className="text-xs font-bold tracking-tight">Settings</span>}
                </Link>
                <button 
                    onClick={() => authService.logout()}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                >
                    <LogOut size={18} />
                    {!isCollapsed && <span className="text-xs font-bold tracking-tight">Sign Out</span>}
                </button>
            </div>
        </div>
    );
}
