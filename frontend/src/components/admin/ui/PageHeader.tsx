import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
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
}: {
    title: string;
    subtitle?: string;
    breadcrumbs?: Crumb[];
    actions?: React.ReactNode;
    className?: string;
}) {
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
                {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
            </div>
        </div>
    );
}

export default PageHeader;
