import api from '@/lib/axios';

/** Organization onboarding — the Super Admin issues an invite, the invitee
 *  redeems it. The two `onboard*` calls are unauthenticated by design: whoever
 *  opens the link has no session yet. */

export type InviteState = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface OrgInvite {
    id: number;
    warehouse: string;
    organization_name: string;
    admin_name: string;
    email: string;
    phone: string;
    state: InviteState;
    created_at: string;
    expires_at: string;
    accepted_at: string | null;
    accepted_user: string | null;
    /** Null once the invite can no longer be used. */
    token: string | null;
    /** Relative path, e.g. "/onboard/abc123". Null once unusable. */
    path: string | null;
}

export const onboardingService = {
    // ── Super Admin ──
    listInvites: async (params?: { warehouse?: string }): Promise<OrgInvite[]> => {
        const { data } = await api.get('v1/users/org-invites/', { params });
        return Array.isArray(data) ? data : [];
    },

    createOrganization: async (payload: {
        organization_name: string;
        email: string;
        admin_name?: string;
        phone?: string;
        address?: string;
        area?: number | null;
    }): Promise<OrgInvite> => {
        const { data } = await api.post('v1/users/org-invites/', payload);
        return data;
    },

    regenerateInvite: async (id: number): Promise<OrgInvite> => {
        const { data } = await api.post(`v1/users/org-invites/${id}/regenerate/`);
        return data;
    },

    revokeInvite: async (id: number): Promise<OrgInvite> => {
        const { data } = await api.post(`v1/users/org-invites/${id}/revoke/`);
        return data;
    },

    // ── Public (the invitee) ──
    getInvite: async (token: string) => {
        const { data } = await api.get(`v1/users/onboard/${token}/`);
        return data as {
            organization_name: string;
            admin_name: string;
            email: string;
            phone: string;
            address: string;
            area: number | null;
            expires_at: string;
            areas: { id: number; name: string }[];
        };
    },

    acceptInvite: async (token: string, payload: {
        username?: string;
        password: string;
        confirm_password: string;
        full_name: string;
        phone?: string;
        address?: string;
        area?: number | null;
    }) => {
        const { data } = await api.post(`v1/users/onboard/${token}/accept/`, payload);
        return data as { access: string; refresh: string; user: any; organization_name: string };
    },
};

/** Absolute link to send to the invitee. Built in the browser so it carries
 *  whatever host the Super Admin is actually on (localhost while testing, the
 *  real domain in production) rather than a value baked in at build time. */
export const inviteUrl = (path: string | null): string => {
    if (!path) return '';
    if (typeof window === 'undefined') return path;
    return `${window.location.origin}${path}`;
};
