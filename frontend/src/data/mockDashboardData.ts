// Type definitions for dashboard data structures
export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface Order {
    id: string;
    customerName: string;
    customerCompany: string;
    date: string;
    amount: number;
    status: OrderStatus;
    items: number;
}

export interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    sales: number;
    image?: string;
}

export interface RevenueData {
    month: string;
    revenue: number;
}
