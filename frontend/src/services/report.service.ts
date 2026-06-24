import api from '@/lib/axios';

/** Date range params shared by the grouped analytics endpoints. */
export type ReportRange = { date_from?: string; date_to?: string };

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
};
