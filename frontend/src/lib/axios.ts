import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/$/, '') + '/';

const api = axios.create({
    baseURL: API_URL,
    timeout: 30000, // 30s — more robust for local dev while backend optimizes queries
});

// ── View-only enforcement ────────────────────────────────────────────────────
// The admin shell flips this on when the current page is view-only for the
// signed-in staff user (no per-page "edit" grant). While on, mutating requests
// are blocked client-side so the UI matches the backend's edit enforcement.
let readOnlyMode = false;
export function setReadOnlyMode(v: boolean) { readOnlyMode = v; }

// Requests that must work even on view-only pages (auth, self profile/settings,
// reading + dismissing notifications). Matched as substrings of the URL.
const READ_ONLY_WHITELIST = [
    'users/token', 'users/profile', 'users/settings', 'activity-logs',
    'mark-read', 'mark-all-read',
];
const MUTATING = ['post', 'put', 'patch', 'delete'];

function isWhitelisted(url?: string) {
    if (!url) return false;
    return READ_ONLY_WHITELIST.some(p => url.includes(p));
}

api.interceptors.request.use(
    (config) => {
        const method = (config.method || 'get').toLowerCase();
        if (readOnlyMode && MUTATING.includes(method) && !isWhitelisted(config.url)) {
            toast.error('View-only access — you don’t have edit permission for this page.', { id: 'view-only' });
            return Promise.reject(new axios.Cancel('view-only'));
        }
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
        // View-only blocks (and any cancellations) are intentional — pass through.
        if (axios.isCancel(error)) {
            return Promise.reject(error);
        }
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
