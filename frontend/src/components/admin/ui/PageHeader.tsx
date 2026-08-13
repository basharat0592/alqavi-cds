'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authService } from '@/lib/auth';

export interface Crumb {
    label: string;
    href?: string;
}

export function PageHeader({
    title,
    subtitle,
    breadcrumbs,
    actions,
    className,
    hideBack = false,
    backUrl,
}: {
    title: string;
    subtitle?: string;
    breadcrumbs?: Crumb[];
    actions?: React.ReactNode;
    className?: string;
    /** Hide the automatic desktop back button (e.g. when the page renders its own contextual back control). */
    hideBack?: boolean;
    backUrl?: string;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const showBack = !hideBack && pathname !== '/admin/dashboard';
    // On the Super Admin side, mobile headers are compact: no subtitle, and the
    // action button sits on the same line as the title (right-most).
    const [isSuper, setIsSuper] = useState(false);
    useEffect(() => { setIsSuper(authService.isSuperAdmin()); }, []);

    return (
        <div className={cn('mb-6', className)}>
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 mb-2.5 select-none">
                    {breadcrumbs.map((c, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <ChevronRight size={10} className="text-slate-300" />}
                            {c.href ? (
                                <Link href={c.href} className="hover:text-slate-600 transition-colors">
                                    {c.label}
                                </Link>
                            ) : (
                                <span className={i === breadcrumbs.length - 1 ? 'text-[#B4780B]' : ''}>{c.label}</span>
                            )}
                        </React.Fragment>
                    ))}
                </nav>
            )}
            <div className={cn('flex justify-between gap-3 sm:gap-4', isSuper ? 'flex-row items-center' : 'flex-col sm:flex-row sm:items-center')}>
                <div className="min-w-0">
                    <h1 className="text-[20px] sm:text-[22px] font-bold text-slate-900 tracking-tight truncate">{title}</h1>
                    {subtitle && <p className={cn('text-[13px] text-slate-500 mt-1', isSuper && 'hidden sm:block')}>{subtitle}</p>}
                </div>
                {(actions || showBack) && (
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Super Admin on mobile: keep only the primary (last) action —
                            secondary utility buttons like Refresh/Export are hidden. */}
                        {actions && (
                            <div className={cn('flex items-center gap-2', isSuper && 'max-sm:[&>*:not(:last-child)]:hidden')}>
                                {actions}
                            </div>
                        )}
                        {/* Desktop back button — same line as page actions (mobile uses the top-bar back button) */}
                        {showBack && (
                            <button
                                type="button"
                                onClick={() => backUrl ? router.push(backUrl) : router.back()}
                                aria-label="Go back"
                                className="hidden md:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white border border-slate-200 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm hover:shadow transition-all"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default PageHeader;
