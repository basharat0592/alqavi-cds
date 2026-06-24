'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Eye } from 'lucide-react';
import { authService } from '@/lib/auth';
import { getUserEditPerms, isEditAllowed } from '@/lib/access';
import { setReadOnlyMode } from '@/lib/axios';

/**
 * Watches the current admin route and, when the signed-in staff user has
 * view-only access to it (no per-page "edit" grant), turns on read-only mode:
 *   • blocks mutating API calls (handled in lib/axios), and
 *   • shows a "view only" banner so the restriction is visible.
 * Full-access roles / superusers / unconfigured users are never restricted.
 */
export default function ReadOnlyController() {
    const pathname = usePathname();
    const [readOnly, setReadOnly] = useState(false);

    useEffect(() => {
        const user = authService.getUser();
        const editPerms = getUserEditPerms(user);
        const ro = !isEditAllowed(editPerms, pathname);
        setReadOnly(ro);
        setReadOnlyMode(ro);
        return () => setReadOnlyMode(false);
    }, [pathname]);

    if (!readOnly) return null;

    return (
        <div className="sticky top-0 z-30 mb-3 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-800 shadow-sm">
            <Eye className="h-4 w-4 shrink-0" />
            <p className="text-[12.5px] font-semibold">
                View only — your role can open this page but not make changes here.
            </p>
        </div>
    );
}
