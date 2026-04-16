'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children, allowedRoles }: {
    children: React.ReactNode;
    allowedRoles?: string[];
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState<boolean | null>(null);
    // Prevent multiple redirects with a ref
    const redirected = useRef(false);

    useEffect(() => {
        // Only check once per mount — don't let pathname/router changes retrigger
        if (redirected.current) return;

        const token = localStorage.getItem('accessToken');

        if (!token) {
            redirected.current = true;
            router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
            return;
        }

        // Perform role-based authorization check
        const userStr = localStorage.getItem('cosmetic_distro_user');
        if (userStr && userStr !== 'undefined' && userStr !== 'null') {
            try {
                const user = JSON.parse(userStr);
                const roleStr = String(user?.role_name || user?.role || '').toLowerCase();
                
                const isAdmin = roleStr.includes('admin') || user?.is_staff || user?.is_superuser;
                const isSupplier = roleStr.includes('supplier');
                const isCustomer = roleStr.includes('customer');
                
                if (allowedRoles && allowedRoles.length > 0) {
                    const isAuthorized = allowedRoles.some(r => {
                        const role = r.toLowerCase();
                        if (role === 'admin') return isAdmin;
                        if (role === 'supplier') return isSupplier;
                        if (role === 'customer') return isCustomer;
                        return roleStr.includes(role);
                    });

                    if (!isAuthorized) {
                        redirected.current = true;
                        if (isAdmin) router.replace('/admin/dashboard');
                        else if (isSupplier) router.replace('/supplier/dashboard');
                        else if (isCustomer) router.replace('/dashboard');
                        else router.replace('/login');
                        return;
                    }
                }
            } catch (e) {
                console.error("AuthGuard evaluation failed:", e);
            }
        }

        setAuthorized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount only — NOT on every route change

    if (authorized === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-[#F59E0B] mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-slate-400 font-medium">Entering Dashboard...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

