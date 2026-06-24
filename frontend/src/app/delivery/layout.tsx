'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, LogOut } from 'lucide-react';
import AuthGuard from '@/components/auth/AuthGuard';
import { authService } from '@/lib/auth';

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [name, setName] = useState('Rider');

    useEffect(() => {
        const u = authService.getUser();
        if (u) setName(u.name || 'Rider');
    }, []);

    const logout = () => {
        authService.logout();
        router.replace('/login');
    };

    return (
        <AuthGuard allowedRoles={['delivery']}>
            <div className="min-h-screen bg-[#F8FAFC] text-slate-800">
                <header className="sticky top-0 z-30 bg-white border-b border-slate-200/70 shadow-sm">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                                <Truck size={18} />
                            </span>
                            <div>
                                <h1 className="text-[15px] font-bold text-slate-900 leading-none">Delivery Console</h1>
                                <p className="text-[11px] text-slate-400 mt-0.5">{name}</p>
                            </div>
                        </div>
                        <button onClick={logout}
                            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
                            <LogOut size={14} /> Sign Out
                        </button>
                    </div>
                </header>
                <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">{children}</main>
            </div>
        </AuthGuard>
    );
}
