import api from '@/lib/axios';

/** Date range (+ optional super-admin drill-down) shared by the analytics endpoints. */
export type ReportRange = {
    date_from?: string;
    date_to?: string;
    created_by?: string | number;  // super admin: focus one admin
    warehouse?: string;            // super admin: focus one branch
};

/** Grouped sales analytics (area-scoped on the backend). */
export const reportService = {
    byArea: async (params: ReportRange = {}) => {
        const { data } = await api.get('v1/sales/reports/by-area/', { params });
        return data; // { results, totals }
    },
    byUser: async (params: ReportRange = {}) => {
        const { data } = await api.get('v1/sales/reports/by-user/', { params });
        return data; // { results, totals }
    },
    statements: async (params: ReportRange = {}) => {
        const { data } = await api.get('v1/sales/reports/statements/', { params });
        return data; // { results, totals }
    },
    returnsSummary: async (params: ReportRange = {}) => {
        const { data } = await api.get('v1/sales/reports/returns-summary/', { params });
        return data; // { totals, status_counts, reasons }
    },
    delivery: async (params: ReportRange = {}) => {
        const { data } = await api.get('v1/sales/reports/delivery/', { params });
        return data; // { results: [{delivery_person, phone, total_orders, delivered, pending, earnings}], totals }
    },
};
