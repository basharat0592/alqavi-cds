/**
 * Shared badge components used across admin pages.
 * Import from '@/components/ui/StatusBadge'.
 */

import {
    Clock, Package, Truck, CheckCircle, XCircle, AlertCircle,
    Shield, ShoppingBag, User,
} from 'lucide-react';

// ─── Order Status Badge ───────────────────────────────────────────────────────

const ORDER_STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
    ordered:    { label: 'Ordered',    cls: 'bg-orange-50  text-orange-700  border-orange-100',  icon: ShoppingBag },
    confirmed:  { label: 'Confirmed',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle },
    pending:    { label: 'Pending',    cls: 'bg-yellow-50  text-yellow-700  border-yellow-100',  icon: Clock },
    processing: { label: 'Processing', cls: 'bg-blue-50    text-blue-700    border-blue-100',    icon: Package },
    shipped:    { label: 'Shipped',    cls: 'bg-indigo-50  text-indigo-700  border-indigo-100',  icon: Truck },
    delivered:  { label: 'Delivered',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle },
    cancel_requested: { label: 'Cancel Requested', cls: 'bg-purple-50 text-purple-700 border-purple-100', icon: Clock },
    cancelled:  { label: 'Cancelled',  cls: 'bg-red-50     text-red-700     border-red-100',     icon: XCircle },
    rejected:   { label: 'Rejected',   cls: 'bg-rose-50    text-rose-700    border-rose-100',    icon: XCircle },
    default:    { label: 'Unknown',    cls: 'bg-gray-50    text-gray-700    border-gray-100',    icon: AlertCircle },
};

interface StatusBadgeProps {
    status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const cfg = ORDER_STATUS_CONFIG[status?.toLowerCase()] ?? ORDER_STATUS_CONFIG.default;
    const Icon = cfg.icon;
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${cfg.cls}`}
        >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
            {cfg.label}
        </span>
    );
}

// ─── User Active/Inactive Badge ───────────────────────────────────────────────

interface ActiveBadgeProps {
    isActive?: boolean;
}

export function ActiveBadge({ isActive }: ActiveBadgeProps) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm group-hover:scale-105 transition-transform ${
                isActive === false
                    ? 'bg-red-50 text-red-600 border-red-100'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
            }`}
        >
            {isActive === false ? 'Inactive' : 'Active'}
        </span>
    );
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
    admin:    { cls: 'bg-purple-50  text-purple-700  border-purple-100',  icon: Shield,      label: 'Admin' },
    seller:   { cls: 'bg-blue-50    text-blue-700    border-blue-100',    icon: ShoppingBag, label: 'Seller' },
    customer: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: User,        label: 'Customer' },
};

interface RoleBadgeProps {
    roleName?: string;
}

export function RoleBadge({ roleName }: RoleBadgeProps) {
    const key = (roleName ?? 'customer').toLowerCase();
    const r = ROLE_CONFIG[key] ?? {
        cls: 'bg-gray-50 text-gray-700 border-gray-100',
        icon: User,
        label: roleName || key,
    };
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${r.cls}`}
        >
            <r.icon className="h-3.5 w-3.5" strokeWidth={2.5} />
            {r.label}
        </span>
    );
}
