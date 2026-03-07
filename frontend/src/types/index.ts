/**
 * Centralized TypeScript type definitions for the Al-Qavi Cosmetics application.
 * Import from '@/types' throughout the codebase instead of defining inline.
 */

// ─── Enums / Union Types ──────────────────────────────────────────────────────

export type OrderStatus =
    | 'pending'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type StockStatus = 'In Stock' | 'Low Stock' | 'Critical' | 'Out of Stock';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export type UserRole = 'admin' | 'manager' | 'user' | 'customer' | string;

// ─── Product ──────────────────────────────────────────────────────────────────

export interface ProductParams {
    page?: number;
    page_size?: number;
    search?: string;
    category?: string;
    min_price?: number;
    max_price?: number;
    ordering?: string;
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    price: string | number;
    cost?: string | number;
    /** Maps to quantity_in_stock on the backend */
    stock: number;
    quantity_in_stock?: number;
    category: number | string | { id: number; name: string };
    category_name?: string;
    sku?: string;
    image?: string;
    status?: string;
    is_active?: boolean;
    is_in_stock?: boolean;
    company_category?: number | string | { id: number; name: string };
    company_category_name?: string;
    created_at: string;
    updated_at?: string;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export interface OrderItem {
    id?: string;
    product?: Product;
    product_name?: string;
    name?: string;
    quantity: number;
    price: string | number;
    unit_price?: string | number;
    subtotal?: number;
}

export interface Order {
    id: string;
    order_number: string;
    customer?: {
        id?: number;
        first_name?: string;
        last_name?: string;
        username?: string;
        email?: string;
    } | string | null;
    customer_name?: string;
    customerName?: string;
    total_amount: string;
    total?: string | number;
    status: OrderStatus | string;
    payment_status?: PaymentStatus | string;
    items: OrderItem[];
    notes?: string;
    created_at: string;
    updated_at?: string;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface AppUser {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name?: string;
    role: number | string;
    role_name?: string;
    phone?: string;
    /** Alias for phone — used in some form fields */
    phone_number?: string;
    address?: string;
    city?: string;
    country?: string;
    postal_code?: string;
    /** Usually stored in a related model; kept for form compatibility */
    business_name?: string;
    avatar?: string;
    is_active?: boolean;
    status?: UserStatus | string;
    status_display?: string;
    date_joined?: string;
    last_login?: string;
    permissions?: string[];
}

export interface ActivityLog {
    id: number;
    user: number;
    user_name: string;
    action: string;
    action_display: string;
    description: string;
    ip_address: string;
    timestamp: string;
}

// ─── Role / Permission ────────────────────────────────────────────────────────

export interface AppRole {
    id: number;
    name: string;
    description: string;
    is_default: boolean;
    permissions?: AppPermission[];
}

export interface AppPermission {
    id: number;
    name: string;
    code: string;
    description?: string;
    category?: string;
}

// ─── Company ──────────────────────────────────────────────────────────────────
export interface CompanyCategory {
    id: number | string;
    name: string;
    code?: string;
    type?: 'local' | 'imported' | string;
    country?: string;
    description?: string;
    color?: string;
    is_active?: boolean;
    created_at?: string;
}

export interface CompanyInfo {
    id?: number;
    name: string;
    category?: number | string | { id: number; name: string };
    category_name?: string;
    tagline?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
    city?: string;
    country?: string;
    website?: string;
    logo?: string | null;
    description?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    currency?: string;
    tax_number?: string;
    created_at?: string;
    updated_at?: string;
}

// ─── User Settings ────────────────────────────────────────────────────────────

export interface UserSettingsData {
    notif_new_order?: boolean;
    notif_low_stock?: boolean;
    notif_new_user?: boolean;
    notif_weekly_report?: boolean;
    notif_marketing?: boolean;
    notif_sms?: boolean;
    theme?: string;
    accent_color?: string;
    compact_mode?: boolean;
    animations?: boolean;
    sidebar_collapsed?: boolean;
    updated_at?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: 'admin' | string;
    avatar?: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface RevenueDataPoint {
    date: string;
    revenue: number;
    orders: number;
}

export interface DashboardStats {
    totalOrders: number;
    totalRevenue: number;
    totalProducts: number;
    activeUsers: number;
    ordersToday: number;
    pendingOrders: number;
    totalCustomers?: number;
    revenueChange?: number;
    ordersChange?: number;
    productsChange?: number;
    customersChange?: number;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
    id: number | string;
    name: string;
    price: number | string;
    quantity: number;
    image: string;
    category: string;
}
