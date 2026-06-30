import axios from 'axios';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/$/, '') + '/';

const api = axios.create({
    baseURL: API_URL,
    timeout: 30000, // 30s — more robust for local dev while backend optimizes queries
});

api.interceptors.request.use(
    (config) => {
        const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
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

        // Custom handling for Network Error (likely backend down)
        if (error.code === 'ERR_NETWORK') {
            const backendUrl = error.config?.baseURL || 'the backend';
            error.message = `Network Error: Could not connect to ${backendUrl}. Please ensure the server is running and the database is connected.`;
        }

        const isInvalidToken = error.response?.data?.code === 'token_not_valid';
        const status = error.response?.status;

        // If the error is 401/403 or invalid token, and we haven't retried yet
        if ((status === 401 || status === 403 || isInvalidToken) && !originalRequest._retry) {
            // If the error occurred while trying to refresh the token, we must logout
            if (originalRequest.url?.includes('/v1/users/token/refresh/')) {
                sessionStorage.removeItem('accessToken');
                sessionStorage.removeItem('refreshToken');
                sessionStorage.removeItem('cosmetic_distro_user');
                window.location.href = '/login';
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            try {
                const refreshToken = sessionStorage.getItem('refreshToken');
                if (refreshToken) {
                    const response = await axios.post(`${API_URL}v1/users/token/refresh/`, {
                        refresh: refreshToken
                    });
                    const newAccessToken = response.data.access;
                    sessionStorage.setItem('accessToken', newAccessToken);
                    api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                    originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                console.error("Token refresh failed:", refreshError);
            }

            // If we reached here, it means refresh failed or no refresh token
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('refreshToken');
            sessionStorage.removeItem('cosmetic_distro_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
