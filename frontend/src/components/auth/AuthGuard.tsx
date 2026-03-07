'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService, UserRole } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const checkAuth = () => {
            const user = authService.getUser();

            if (!user) {
                router.push(`/login?redirect=${pathname}`);
                return;
            }

            // If allowedRoles is provided, trust it as the sole gate.
            // Otherwise fall back to the admin-path guard.
            if (allowedRoles) {
                if (!allowedRoles.includes(user.role)) {
                    router.push(`/login?redirect=${pathname}`);
                    return;
                }
            } else if (pathname.startsWith('/admin') && user.role !== 'admin') {
                router.push(`/login?redirect=${pathname}`);
                return;
            }

            setAuthorized(true);
        };

        checkAuth();
    }, [router, pathname, allowedRoles]);

    if (!authorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-[#4f46e5] mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Entering Dashboard...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
