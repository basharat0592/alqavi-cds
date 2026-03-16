import React from 'react';
import Link from 'next/link';
import { CheckCircle, AlertTriangle, Loader2, Trash2, Search, RefreshCw, ArrowLeft, Save } from 'lucide-react';

// ── Shared Styling Variables ──────────────────────────────────────────────────
export const AMZ_INPUT = `w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#a6a6a6] dark:border-slate-700 rounded text-sm outline-none transition-all focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-gray-400 disabled:bg-gray-100 disabled:opacity-50`;
export const AMZ_SELECT = AMZ_INPUT;
export const AMZ_LABEL = `block text-xs font-bold text-gray-900 dark:text-gray-200 mb-1`;

// ── Structural Components ─────────────────────────────────────────────────────

export const PageWrapper = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6 ${className}`}>
        {children}
    </div>
);

export const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

export const SectionHeader = ({ title, icon: Icon, rightAction, iconColor = "text-gray-600 dark:text-gray-400" }: { title: string; icon?: any; rightAction?: React.ReactNode; iconColor?: string }) => (
    <div className="bg-[#f6f6f6] dark:bg-slate-800 px-4 py-2 border-b border-[#ddd] dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
            {Icon && <Icon className={`w-4 h-4 ${iconColor.startsWith('#') ? '' : iconColor}`} style={iconColor.startsWith('#') ? { color: iconColor } : {}} />}
            <span className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">{title}</span>
        </div>
        {rightAction && <div>{rightAction}</div>}
    </div>
);

export const PageHeader = ({ title, subtitle, icon: Icon, action, iconColor = "#FF9900" }: { title: string; subtitle?: string; icon?: any; action?: React.ReactNode; iconColor?: string }) => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
        <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                {Icon && <Icon className="h-6 w-6" style={{ color: iconColor }} />}
                {title}
            </h1>
            {subtitle && <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">{subtitle}</p>}
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
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center">
            {onSearch !== undefined && (
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        className={AMZ_INPUT}
                        value={searchValue}
                        onChange={e => onSearch(e.target.value)}
                    />
                </div>
            )}
            {extraFilters}
            {children}
            {onRefresh && (
                <button onClick={onRefresh} className="p-2 border border-[#a6a6a6] rounded hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shrink-0">
                    <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            )}
        </div>
    </SectionCard>
);

// ── Admin Table ───────────────────────────────────────────────────────────────

interface AdminTableProps<T> {
    headers: string[];
    data: T[];
    loading?: boolean;
    emptyMessage?: string;
    renderRow: (item: T, index: number) => React.ReactNode;
    currentPage?: number;
    totalPages?: number;
    totalCount?: number;
    onPageChange?: (page: number) => void;
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
    onPageChange
}: AdminTableProps<T>) {
    return (
        <SectionCard>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-[#f6f6f6] dark:bg-slate-800/50 border-b border-[#ddd] dark:border-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                            {headers.map((h, i) => (
                                <th key={i} className={`px-6 py-3 ${i === headers.length - 1 ? 'text-right' : ''}`}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i}>
                                    <td colSpan={headers.length} className="px-6 py-6 animate-pulse">
                                        <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-full" />
                                    </td>
                                </tr>
                            ))
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={headers.length} className="px-6 py-12 text-center text-gray-500 italic">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            data.map((item, index) => renderRow(item, index))
                        )}
                    </tbody>
                </table>
            </div>

            {onPageChange && totalCount !== undefined && currentPage !== undefined && totalPages !== undefined && (
                <div className="bg-[#f6f6f6] dark:bg-slate-800 px-6 py-4 flex items-center justify-between border-t border-[#ddd] dark:border-slate-800">
                    <p className="text-xs text-gray-500">Showing {data.length} of {totalCount} records</p>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 1 || loading}
                            onClick={() => onPageChange(currentPage - 1)}
                            className="px-3 py-1 bg-white dark:bg-slate-700 border border-[#a6a6a6] rounded text-xs hover:bg-gray-50 disabled:opacity-50 transition-colors dark:text-gray-200"
                        >
                            Previous
                        </button>
                        <span className="text-xs font-bold px-4 text-gray-700 dark:text-gray-300">
                            Page {currentPage} / {totalPages || 1}
                        </span>
                        <button
                            disabled={currentPage >= totalPages || totalCount === 0 || loading}
                            onClick={() => onPageChange(currentPage + 1)}
                            className="px-3 py-1 bg-white dark:bg-slate-700 border border-[#a6a6a6] rounded text-xs hover:bg-gray-50 disabled:opacity-50 transition-colors dark:text-gray-200"
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
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-normal text-gray-900 dark:text-white tracking-tight uppercase">
                {title}
            </h1>
            {(onCancel || cancelHref) && (
                <div className="flex gap-2">
                    {cancelHref ? (
                        <Link href={cancelHref} className="text-sm text-[#007185] hover:text-[#C45500] hover:underline flex items-center gap-1 uppercase font-bold tracking-tighter">
                            <ArrowLeft className="w-4 h-4" /> Back to list
                        </Link>
                    ) : (
                        <button onClick={onCancel} className="text-sm text-[#007185] hover:text-[#C45500] hover:underline flex items-center gap-1 uppercase font-bold tracking-tighter">
                            <ArrowLeft className="w-4 h-4" /> Back to list
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
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {submitLabel}
                    </ActionButton>
                </div>
            </div>
        </form>
    </div>
);

// ── Buttons ───────────────────────────────────────────────────────────────────

export const PrimaryButton = ({ children, onClick, disabled, className = "", type = "button", href, color = "#FF9900", hoverColor = "#e68a00" }: {
    children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit"; href?: string; color?: string; hoverColor?: string;
}) => {
    const baseClass = `text-[#131921] px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 ${className}`;
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
    const baseClass = `bg-white dark:bg-slate-800 border border-[#adb1b8] border-gray-300 rounded text-xs font-bold text-gray-700 dark:text-gray-200 px-4 py-1.5 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50 ${className}`;
    if (href) {
        return <Link href={href} className={baseClass}>{children}</Link>;
    }
    return <button type={type} onClick={onClick} disabled={disabled} className={baseClass}>{children}</button>;
};

export const ActionButton = ({ children, onClick, disabled, className = "", type = "button", href, color = "#232f3e", hoverColor = "#131921" }: {
    children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit"; href?: string; color?: string; hoverColor?: string;
}) => {
    const baseClass = `text-white px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50 ${className}`;
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

export const Toast = ({ message, color = "#FF9900" }: { message: string, color?: string }) => {
    if (!message) return null;
    return (
        <div className="fixed bottom-6 right-6 bg-[#131921] text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] z-[300] animate-in slide-in-from-bottom-5" style={{ borderLeftWidth: '4px', borderLeftColor: color }}>
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-sm font-bold uppercase tracking-tight">{message}</span>
        </div>
    );
};

export const ErrorToast = ({ message }: { message: string }) => {
    if (!message) return null;
    return (
        <div className="fixed bottom-6 right-6 bg-red-600 text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] z-[300] animate-in slide-in-from-bottom-5">
            <AlertTriangle className="h-5 w-5 text-white" />
            <span className="text-sm font-bold uppercase tracking-tight">{message}</span>
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-sm w-full shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-[#e47911]" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">System Purge</h3>
                    </div>
                </div>
                <div className="p-6 text-sm text-gray-700 dark:text-gray-300">
                    Permanently delete record <span className="font-bold text-gray-900 dark:text-white">#{itemName}</span>?
                </div>
                <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
                    <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
                    <ActionButton 
                        onClick={onConfirm} 
                        disabled={deleting}
                        color={confirmColor}
                        hoverColor={confirmHoverColor}
                    >
                        {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        Commit Erasure
                    </ActionButton>
                </div>
            </div>
        </div>
    );
};
