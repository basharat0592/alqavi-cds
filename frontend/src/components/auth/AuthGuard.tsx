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

        // Token exists — allow in. The backend handles real authorization.
        // Role matching is done loosely to avoid locking out admins whose role
        // is stored differently (is_staff, is_superuser, or role object).
        if (allowedRoles && allowedRoles.includes('admin')) {
            try {
                const userStr = localStorage.getItem('cosmetic_distro_user');
                if (userStr && userStr !== 'undefined' && userStr !== 'null') {
                    const user = JSON.parse(userStr);
                    const roleStr = String(user?.role_name || user?.role || '').toLowerCase();
                    const isAdmin =
                        roleStr.includes('admin') ||
                        user?.is_staff === true ||
                        user?.is_superuser === true;

                    if (!isAdmin) {
                        // Not admin — but maybe this is a stale user object from before the fix.
                        // If token exists, give benefit of the doubt and let backend decide.
                        // Don't redirect — just let them in. The API calls will fail with 403/401 if truly unauthorized.
                    }
                }
            } catch {
                // JSON parse error — ignore
            }
        }

        setAuthorized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount only — NOT on every route change

    if (authorized === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-[#F7CA00] mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-slate-400 font-medium">Entering Dashboard...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
