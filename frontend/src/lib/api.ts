import type {
    Product, ProductParams, Order, OrderItem,
    AppUser, AppRole, ActivityLog,
    CompanyInfo, CompanyCategory, UserSettingsData, ProductCategory, PaginatedResponse,
} from '@/types';

// Export types to maintain backward compatibility for existing imports
export type { Product, ProductParams, Order, AppUser, AppRole, ActivityLog, CompanyInfo, CompanyCategory, UserSettingsData, ProductCategory, PaginatedResponse };

// Export all refactored services from their respective files
export { productService, supplierProductService } from '../services/product.service';
export { orderService } from '../services/order.service';
export { categoryService } from '../services/category.service';
export { mainCategoryService } from '../services/main-category.service';
export { roleService, userService, permissionService, settingsService } from '../services/user.service';
export { companyService, companyCategoryService } from '../services/company.service';
export { inventoryService } from '../services/inventory.service';
export { paymentService, paymentCategoryService } from '../services/payment.service';
export { purchaseService } from '../services/purchase.service';
export { salesService } from '../services/sales.service';
export { supplierService } from '../services/supplier.service';
