import api from '@/lib/axios';

export const paymentCategoryService = {
    getAll: async () => {
        const { data } = await api.get('v1/payments/categories/');
        return data.results || data || [];
    },
    create: async (payload: any) => {
        const { data } = await api.post('v1/payments/categories/', payload);
        return data;
    },
    update: async (id: string | number, payload: any) => {
        const { data } = await api.patch(`v1/payments/categories/${id}/`, payload);
        return data;
    },
    delete: async (id: string | number) => {
        await api.delete(`v1/payments/categories/${id}/`);
    },
};

export const paymentService = {
    getAll: async (params = {}) => {
        const { data } = await api.get('v1/payments/transactions/', { params });
        return data.results || data || [];
    },
    create: async (payload: any) => {
        const { data } = await api.post('v1/payments/transactions/', payload);
        return data;
    },
    update: async (id: string | number, payload: any) => {
        const { data } = await api.patch(`v1/payments/transactions/${id}/`, payload);
        return data;
    },
    delete: async (id: string | number) => {
        await api.delete(`v1/payments/transactions/${id}/`);
    },
    getStats: async () => {
        const { data } = await api.get('v1/payments/stats/summary/');
        return data;
    }
};

export type InstallmentSourceType = 'order' | 'purchaseorder' | 'salereturn' | 'purchasereturn';

/** Installments (partial payments over time) against a single transaction. */
export const installmentService = {
    list: async (sourceType: InstallmentSourceType, sourceId: string | number) => {
        const { data } = await api.get('v1/payments/installments/', {
            params: { source_type: sourceType, source_id: String(sourceId) },
        });
        return data.results || data || [];
    },
    // payload may be a plain object or FormData (when a slip file is attached).
    create: async (payload: any) => {
        const isForm = typeof FormData !== 'undefined' && payload instanceof FormData;
        const { data } = await api.post('v1/payments/installments/', payload,
            isForm ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
        return data;
    },
    update: async (id: string | number, payload: any) => {
        const { data } = await api.patch(`v1/payments/installments/${id}/`, payload);
        return data;
    },
    delete: async (id: string | number) => {
        await api.delete(`v1/payments/installments/${id}/`);
    },
};

/** Unified due & overdue feed across sales, purchases and returns. */
export const paymentsDueService = {
    get: async (bucket: 'all' | 'overdue' | 'due_soon' | 'upcoming' = 'all') => {
        const { data } = await api.get('v1/payments/due/', { params: { bucket } });
        return data; // { summary, results }
    },
};

/** Customer & supplier running ledgers (statement + aging). */
export const ledgerService = {
    customer: async (id: string | number) => {
        const { data } = await api.get(`v1/company/customers/${id}/ledger/`);
        return data;
    },
    supplier: async (id: string | number) => {
        const { data } = await api.get(`v1/company/suppliers/${id}/ledger/`);
        return data;
    },
};
