import axios from 'axios';
import api from '@/lib/axios';
import { CompanyInfo, CompanyCategory } from '@/types';

const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

const cleanPayload = (payload: any) => {
    const cleaned: any = {};
    Object.entries(payload).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) {
            cleaned[k] = v;
        }
    });
    return cleaned;
};

export const companyService = {
    getAll: async (): Promise<CompanyInfo[]> => {
        const { data } = await api.get('/v1/company/');
        return Array.isArray(data) ? data : data.results || [];
    },
    getById: async (id: number): Promise<CompanyInfo | null> => {
        const { data } = await api.get(`/v1/company/${id}/`);
        return data;
    },
    create: async (payload: Partial<CompanyInfo>): Promise<CompanyInfo> => {
        const cleaned = cleanPayload(payload);
        try {
            const { data } = await api.post('/v1/company/create/', cleaned);
            return data;
        } catch (err) {
            // Fallback to FormData if needed (e.g. for files like logo)
            const fd = new FormData();
            Object.entries(cleaned).forEach(([k, v]) => {
                if (v instanceof File) {
                    fd.append(k, v);
                } else if (v !== null && v !== undefined) {
                    fd.append(k, String(v));
                }
            });
            const { data } = await api.post('/v1/company/create/', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return data;
        }
    },
    update: async (id: number, payload: Partial<CompanyInfo>): Promise<CompanyInfo> => {
        const cleaned = cleanPayload(payload);
        try {
            const { data } = await api.patch(`/v1/company/${id}/`, cleaned);
            return data;
        } catch (err) {
            const fd = new FormData();
            Object.entries(cleaned).forEach(([k, v]) => {
                if (v instanceof File) {
                    fd.append(k, v);
                } else if (v !== null && v !== undefined) {
                    fd.append(k, String(v));
                }
            });
            const { data } = await api.patch(`/v1/company/${id}/`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return data;
        }
    },
    delete: async (id: number): Promise<void> => {
        await api.delete(`/v1/company/${id}/`);
    },

};

export const companyCategoryService = {
    getAll: async (): Promise<CompanyCategory[]> => {
        const { data } = await api.get('/v1/company/categories/');
        return Array.isArray(data) ? data : data.results || [];
    },
    create: async (payload: Partial<CompanyCategory>): Promise<CompanyCategory> => {
        const cleaned = cleanPayload(payload);
        const { data } = await api.post('/v1/company/categories/create/', cleaned);
        return data;
    },
    update: async (id: string | number, payload: Partial<CompanyCategory>): Promise<CompanyCategory> => {
        const cleaned = cleanPayload(payload);
        const { data } = await api.patch(`/v1/company/categories/${id}/`, cleaned);
        return data;
    },
    delete: async (id: string | number): Promise<void> => {
        await api.delete(`/v1/company/categories/${id}/`);
    }
};
