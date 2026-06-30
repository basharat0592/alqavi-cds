'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}: {
    title: string;
    subtitle?: string;
    breadcrumbs?: Crumb[];
    actions?: React.ReactNode;
    className?: string;
    /** Hide the automatic desktop back button (e.g. when the page renders its own contextual back control). */
    hideBack?: boolean;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const showBack = !hideBack && pathname !== '/admin/dashboard';

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
                                <span className={i === breadcrumbs.length - 1 ? 'text-indigo-600' : ''}>{c.label}</span>
                            )}
                        </React.Fragment>
                    ))}
                </nav>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-bold text-slate-900 tracking-tight truncate">{title}</h1>
                    {subtitle && <p className="text-[13px] text-slate-500 mt-1">{subtitle}</p>}
                </div>
                {(actions || showBack) && (
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Desktop back button — same line as page actions (mobile uses the top-bar back button) */}
                        {showBack && (
                            <button
                                type="button"
                                onClick={() => router.back()}
                                aria-label="Go back"
                                className="hidden md:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white border border-slate-200 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm hover:shadow transition-all"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </button>
                        )}
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
}

export default PageHeader;
