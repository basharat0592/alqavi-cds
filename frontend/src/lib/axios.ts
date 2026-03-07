import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000, // 10s — more realistic for local dev
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If we get an explicit "token_not_valid" error, it's likely a demo token being sent to a real backend
        const isInvalidToken = error.response?.data?.code === 'token_not_valid';

        // Check if this is a demo token — don't redirect, just reject silently
        const token = localStorage.getItem('accessToken') || '';
        const isDemoToken = token.startsWith('demo-token-');

        if ((error.response?.status === 401 || isInvalidToken) && !originalRequest._retry) {
            originalRequest._retry = true;

            // Demo tokens can't be refreshed — just reject silently without redirect
            if (isDemoToken || isInvalidToken) {
                if (!isDemoToken) {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const response = await axios.post(`${API_URL}/v1/users/token/refresh/`, {
                        refresh: refreshToken
                    });
                    localStorage.setItem('accessToken', response.data.access);
                    api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Handle refresh token failure (e.g., logout)
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
