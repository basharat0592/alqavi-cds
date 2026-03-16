import { productService } from './product.service';
import { orderService } from './order.service';

export const dashboardService = {
    getStats: async () => {
        const [products, orders] = await Promise.all([
            productService.getAll(),
            orderService.getAll(),
        ]);
        return {
            totalProducts: products.length,
            totalOrders: orders.length,
            totalCustomers: 0,
            totalRevenue: orders.reduce((sum: number, o: any) => sum + parseFloat(o.total_amount || o.total || 0), 0),
            todaySales: 0,
            growth: { revenue: 15, orders: 12, customers: 10 },
            lowStock: products.filter((p: any) => p.stock < 10).length,
            criticalStock: products.filter((p: any) => p.stock < 5).length
        };
    }
};
