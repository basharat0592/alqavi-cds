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
    image?: string; // Optional URL
}

export interface RevenueData {
    month: string;
    revenue: number;
}

export const MOCK_REVENUE_DATA: RevenueData[] = [
    { month: 'Jan', revenue: 12500 },
    { month: 'Feb', revenue: 15000 },
    { month: 'Mar', revenue: 18200 },
    { month: 'Apr', revenue: 14800 },
    { month: 'May', revenue: 21000 },
    { month: 'Jun', revenue: 24500 },
    { month: 'Jul', revenue: 28000 },
    { month: 'Aug', revenue: 26500 },
    { month: 'Sep', revenue: 31000 },
    { month: 'Oct', revenue: 35200 },
    { month: 'Nov', revenue: 38500 },
    { month: 'Dec', revenue: 45000 },
];

export const MOCK_ORDERS: Order[] = [
    { id: 'ORD-7829', customerName: 'Sarah Jenkins', customerCompany: 'Glow Up Salon', date: '2023-10-25', amount: 1250.00, status: 'Pending', items: 12 },
    { id: 'ORD-7828', customerName: 'Michael Chen', customerCompany: 'Urban Beauty', date: '2023-10-25', amount: 840.50, status: 'Processing', items: 5 },
    { id: 'ORD-7827', customerName: 'Jessica Wu', customerCompany: 'Pure Skin Clinic', date: '2023-10-24', amount: 2100.00, status: 'Shipped', items: 24 },
    { id: 'ORD-7826', customerName: 'David Miller', customerCompany: 'Beauty Supply Co.', date: '2023-10-24', amount: 450.00, status: 'Delivered', items: 3 },
    { id: 'ORD-7825', customerName: 'Emily Davis', customerCompany: 'Luxe Spa', date: '2023-10-23', amount: 3200.00, status: 'Delivered', items: 45 },
];

export const MOCK_TOP_PRODUCTS: Product[] = [
    { id: 'PRD-001', name: 'Hyaluronic Acid Serum', category: 'Skincare', price: 45.00, stock: 120, sales: 850 },
    { id: 'PRD-002', name: 'Vitamin C Brightening Cream', category: 'Skincare', price: 55.00, stock: 85, sales: 720 },
    { id: 'PRD-003', name: 'Matte Long-wear Lipstick', category: 'Makeup', price: 22.00, stock: 200, sales: 650 },
    { id: 'PRD-004', name: 'Organic Rose Water Mist', category: 'Toner', price: 18.00, stock: 45, sales: 540 },
    { id: 'PRD-005', name: 'Peptide Eye Cream', category: 'Skincare', price: 60.00, stock: 30, sales: 480 },
];
