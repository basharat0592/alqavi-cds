'use client';
import React from 'react';
import Link from 'next/link';
import { CheckCircle, AlertTriangle, Loader2, Trash2, Search, RefreshCw, ArrowLeft, Save } from 'lucide-react';

// ── Shared Styling Variables ──────────────────────────────────────────────────
export const AMZ_INPUT = `w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none transition-all focus:border-[#EEAF1C]/60 focus:ring-2 focus:ring-[#EEAF1C]/10 placeholder:text-slate-400 dark:placeholder:text-white/20 text-slate-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-white/5 disabled:opacity-50 font-medium`;
export const AMZ_SELECT = AMZ_INPUT;
export const AMZ_LABEL = `block text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.15em] mb-1.5`;

// ── Structural Components ─────────────────────────────────────────────────────

export const PageWrapper = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6 ${className}`}>
        {children}
    </div>
);

export const SectionCard = ({ children, className = "", overflowVisible = false }: { children: React.ReactNode; className?: string; overflowVisible?: boolean }) => (
    <div className={`bg-white dark:bg-[#2d3a4b] border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] ${overflowVisible ? '' : 'overflow-hidden'} ${className}`}>
        {children}
    </div>
);

export const SectionHeader = ({ title, icon: Icon, rightAction, iconColor = "text-slate-500 dark:text-white/40" }: { title: string; icon?: any; rightAction?: React.ReactNode; iconColor?: string }) => (
    <div className="bg-slate-50/50 dark:bg-white/[0.02] px-6 py-3.5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
            {Icon && <Icon className={`w-4 h-4 ${iconColor.startsWith('#') ? '' : iconColor}`} style={iconColor.startsWith('#') ? { color: iconColor } : {}} />}
            <span className="text-[11px] font-black text-slate-600 dark:text-white/60 uppercase tracking-[0.2em]">{title}</span>
        </div>
        {rightAction && <div>{rightAction}</div>}
    </div>
);

export const PageHeader = ({ title, subtitle, icon: Icon, action, iconColor = "#EEAF1C" }: { title: string; subtitle?: string; icon?: any; action?: React.ReactNode; iconColor?: string }) => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase flex items-center gap-3">
                {Icon && <Icon className="h-5 w-5" style={{ color: iconColor }} />}
                {title}
            </h1>
            {subtitle && <p className="text-[11px] text-slate-400 dark:text-white/30 font-black uppercase tracking-[0.2em] mt-1.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
    </div>
);

export const FilterHub = ({ children, onSearch, searchValue, searchPlaceholder = "Search...", loading, onRefresh, extraFilters }: {
    children?: React.ReactNode;
    onSearch?: (val: string) => void;
    searchValue?: string;
    searchPlaceholder?: string;
    loading?: boolean;
    onRefresh?: () => void;
    extraFilters?: React.ReactNode;
}) => (
    <SectionCard className="mb-6">
        <div className="p-4 flex flex-col md:flex-row gap-3 items-center">
            {onSearch !== undefined && (
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-white/20" />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        className={`${AMZ_INPUT} pl-9`}
                        value={searchValue}
                        onChange={e => onSearch(e.target.value)}
                    />
                </div>
            )}
            {extraFilters}
            {children}
            {onRefresh && (
                <button onClick={onRefresh} className="p-2.5 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 hover:border-[#EEAF1C]/40 transition-all shrink-0">
                    <RefreshCw className={`h-3.5 w-3.5 text-slate-500 dark:text-white/40 ${loading ? 'animate-spin' : ''}`} />
                </button>
            )}
        </div>
    </SectionCard>
);

// ── Admin Table ───────────────────────────────────────────────────────────────

interface AdminTableProps<T> {
    headers: (string | React.ReactNode)[];
    data: T[];
    loading?: boolean;
    emptyMessage?: string;
    renderRow: (item: T, index: number) => React.ReactNode;
    currentPage?: number;
    totalPages?: number;
    totalCount?: number;
    onPageChange?: (page: number) => void;
    overflowVisible?: boolean;
}

export function AdminTable<T>({
    headers,
    data,
    loading,
    emptyMessage = "No records found.",
    renderRow,
    currentPage,
    totalPages,
    totalCount,
    onPageChange,
    overflowVisible = false
}: AdminTableProps<T>) {
    return (
        <SectionCard overflowVisible={overflowVisible}>
            <div className={overflowVisible ? 'overflow-visible' : 'overflow-x-auto'}>
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 text-[9px] font-black text-slate-400 dark:text-white/25 uppercase tracking-[0.2em]">
                            {headers.map((h, i) => (
                                <th key={i} className={`px-6 py-4 ${i === headers.length - 1 ? 'text-right' : ''}`}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/[0.03]">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i}>
                                    <td colSpan={headers.length} className="px-6 py-5 animate-pulse">
                                        <div className="h-3.5 bg-slate-100 dark:bg-white/5 rounded-full w-full" />
                                    </td>
                                </tr>
                            ))
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={headers.length} className="px-6 py-16 text-center">
                                    <p className="text-[11px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.2em]">{emptyMessage}</p>
                                </td>
                            </tr>
                        ) : (
                            data.map((item, index) => renderRow(item, index))
                        )}
                    </tbody>
                </table>
            </div>

            {onPageChange && totalCount !== undefined && currentPage !== undefined && totalPages !== undefined && (
                <div className="bg-slate-50/50 dark:bg-white/[0.02] px-6 py-4 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                    <p className="text-[10px] font-black text-slate-400 dark:text-white/25 uppercase tracking-widest">
                        Showing {data.length} of {totalCount} records
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 1 || loading}
                            onClick={() => onPageChange(currentPage - 1)}
                            className="px-4 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-white/[0.08] hover:border-[#EEAF1C]/40 disabled:opacity-30 transition-all"
                        >
                            Prev
                        </button>
                        <span className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest px-3">
                            {currentPage} / {totalPages || 1}
                        </span>
                        <button
                            disabled={currentPage >= totalPages || totalCount === 0 || loading}
                            onClick={() => onPageChange(currentPage + 1)}
                            className="px-4 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-white/[0.08] hover:border-[#EEAF1C]/40 disabled:opacity-30 transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </SectionCard>
    );
}

// ── Admin Form ────────────────────────────────────────────────────────────────

export const AdminForm = ({
    title,
    children,
    onSubmit,
    saving,
    onCancel,
    cancelHref,
    submitLabel = "Save Changes",
    maxWidth = "max-w-4xl",
    submitColor,
    submitHoverColor
}: {
    title: string;
    children: React.ReactNode;
    onSubmit: (e: React.FormEvent) => void;
    saving?: boolean;
    onCancel?: () => void;
    cancelHref?: string;
    submitLabel?: string;
    maxWidth?: string;
    submitColor?: string;
    submitHoverColor?: string;
}) => (
    <div className={`${maxWidth} mx-auto py-8 px-4`}>
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                {title}
            </h1>
            {(onCancel || cancelHref) && (
                <div className="flex gap-2">
                    {cancelHref ? (
                        <Link href={cancelHref} className="text-[11px] font-black text-[#EEAF1C] hover:opacity-80 flex items-center gap-2 uppercase tracking-widest border border-slate-200 dark:border-white/10 px-4 py-2 rounded-xl hover:border-[#EEAF1C]/40 transition-all">
                            <ArrowLeft className="w-3.5 h-3.5" /> Back
                        </Link>
                    ) : (
                        <button onClick={onCancel} className="text-[11px] font-black text-[#EEAF1C] hover:opacity-80 flex items-center gap-2 uppercase tracking-widest border border-slate-200 dark:border-white/10 px-4 py-2 rounded-xl hover:border-[#EEAF1C]/40 transition-all">
                            <ArrowLeft className="w-3.5 h-3.5" /> Back
                        </button>
                    )}
                </div>
            )}
        </div>

        <form onSubmit={onSubmit}>
            <div className="space-y-6">
                {children}

                <div className="flex justify-end gap-3 pt-4">
                    {cancelHref ? (
                        <SecondaryButton href={cancelHref}>Cancel</SecondaryButton>
                    ) : onCancel ? (
                        <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
                    ) : null}
                    
                    <ActionButton 
                        type="submit" 
                        disabled={saving} 
                        className="px-8"
                        color={submitColor}
                        hoverColor={submitHoverColor}
                    >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        {submitLabel}
                    </ActionButton>
                </div>
            </div>
        </form>
    </div>
);

// ── Buttons ───────────────────────────────────────────────────────────────────

export const PrimaryButton = ({ children, onClick, disabled, className = "", type = "button", href, color = "#EEAF1C", hoverColor = "#D49510" }: {
    children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit"; href?: string; color?: string; hoverColor?: string;
}) => {
    const baseClass = `text-[#131921] px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 ${className}`;
    const style = { backgroundColor: color, '--hover-bg': hoverColor } as any;
    
    if (href) {
        return <Link href={href} className={baseClass} style={style}>{children}</Link>;
    }
    return (
        <button 
            type={type} 
            onClick={onClick} 
            disabled={disabled} 
            className={baseClass} 
            style={style}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = hoverColor}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = color}
        >
            {children}
        </button>
    );
};

export const SecondaryButton = ({ children, onClick, disabled, className = "", type = "button", href }: {
    children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit"; href?: string;
}) => {
    const baseClass = `bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black text-slate-600 dark:text-white/50 px-5 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 transition-all disabled:opacity-50 uppercase tracking-widest ${className}`;
    if (href) {
        return <Link href={href} className={baseClass}>{children}</Link>;
    }
    return <button type={type} onClick={onClick} disabled={disabled} className={baseClass}>{children}</button>;
};

export const ActionButton = ({ children, onClick, disabled, className = "", type = "button", href, color = "#131921", hoverColor = "#000000" }: {
    children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit"; href?: string; color?: string; hoverColor?: string;
}) => {
    const baseClass = `text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50 ${className}`;
    const style = { backgroundColor: color } as any;
    
    if (href) {
        return <Link href={href} className={baseClass} style={style}>{children}</Link>;
    }
    return (
        <button 
            type={type} 
            onClick={onClick} 
            disabled={disabled} 
            className={baseClass} 
            style={style}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = hoverColor}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = color}
        >
            {children}
        </button>
    );
};

// ── Overlays ──────────────────────────────────────────────────────────────────

export const Toast = ({ message, color = "#EEAF1C" }: { message: string, color?: string }) => {
    if (!message) return null;
    return (
        <div className="fixed bottom-6 right-6 bg-white dark:bg-[#2d3a4b] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white px-5 py-3.5 rounded-2xl shadow-2xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center gap-3 min-w-[260px] z-[300] animate-in slide-in-from-bottom-5" style={{ borderLeftWidth: '3px', borderLeftColor: color }}>
            <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color }} />
            <span className="text-[11px] font-black uppercase tracking-[0.15em]">{message}</span>
        </div>
    );
};

export const ErrorToast = ({ message }: { message: string }) => {
    if (!message) return null;
    return (
        <div className="fixed bottom-6 right-6 bg-white dark:bg-[#2d3a4b] border border-red-100 dark:border-red-500/20 text-slate-900 dark:text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[260px] z-[300] animate-in slide-in-from-bottom-5" style={{ borderLeftWidth: '3px', borderLeftColor: '#ef4444' }}>
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-[0.15em]">{message}</span>
        </div>
    );
};

export const DeleteConfirmModal = ({
    isOpen, itemName, onConfirm, onCancel, deleting, confirmColor, confirmHoverColor
}: {
    isOpen: boolean; itemName: string; onConfirm: () => void; onCancel: () => void; deleting: boolean; confirmColor?: string; confirmHoverColor?: string;
}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#2d3a4b] rounded-2xl border border-slate-100 dark:border-white/10 max-w-sm w-full shadow-2xl dark:shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Confirm Delete</h3>
                    </div>
                </div>
                <div className="p-6 text-sm text-slate-600 dark:text-white/50">
                    Permanently delete record <span className="font-black text-slate-900 dark:text-white">#{itemName}</span>? This action cannot be undone.
                </div>
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex justify-end gap-2">
                    <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
                    <ActionButton 
                        onClick={onConfirm} 
                        disabled={deleting}
                        color={confirmColor || '#dc2626'}
                        hoverColor={confirmHoverColor || '#b91c1c'}
                    >
                        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Delete
                    </ActionButton>
                </div>
            </div>
        </div>
    );
};

