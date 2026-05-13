import api from '@/lib/axios';

export interface SiteSettings {
  id?: number;
  site_name: string;
  primary_color: string;
  secondary_color: string;
  show_announcement: boolean;
  announcement_text: string;
  announcement_link: string;
  whatsapp_number: string;
  phone_number: string;
  contact_email: string;
  address: string;
  google_maps_url: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  youtube_url: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  google_analytics_id: string;
  pixel_id: string;
  logo?: string;
  favicon?: string;
  footer_logo?: string;
  og_image?: string;
}

export interface WebsiteSection {
  id?: number;
  name: string;
  section_type: string;
  content: Record<string, any>;
  order: number;
  is_visible: boolean;
}

export interface MediaAsset {
  id?: number;
  file: string;
  file_type: 'image' | 'video';
  alt_text: string;
  created_at?: string;
}

export interface NavigationItem {
  id?: number;
  title: string;
  url: string;
  order: number;
  parent?: number | null;
  children?: NavigationItem[];
}

export interface NavigationMenu {
  id?: number;
  name: string;
  location: string;
  items: NavigationItem[];
}

const cmsService = {
  getFullState: async () => {
    const { data } = await api.get('v1/cms/config/get_full_site_state/');
    return data;
  },
  updateSettings: async (payload: Partial<SiteSettings>) => {
    const { data } = await api.patch('v1/cms/config/update_settings/', payload);
    return data;
  },
  uploadBranding: async (field: string, file: File) => {
    const form = new FormData();
    form.append('field', field);
    form.append('file', file);
    const { data } = await api.post('v1/cms/config/upload_branding/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  // Sections
  getSections: async () => {
    const { data } = await api.get('v1/cms/sections/');
    return Array.isArray(data) ? data : data.results || [];
  },
  createSection: async (payload: Omit<WebsiteSection, 'id'>) => {
    const { data } = await api.post('v1/cms/sections/', payload);
    return data;
  },
  updateSection: async (id: number, payload: Partial<WebsiteSection>) => {
    const { data } = await api.patch(`v1/cms/sections/${id}/`, payload);
    return data;
  },
  deleteSection: async (id: number) => {
    await api.delete(`v1/cms/sections/${id}/`);
  },
  duplicateSection: async (id: number) => {
    const { data } = await api.post(`v1/cms/sections/${id}/duplicate/`);
    return data;
  },
  reorderSections: async (orders: { id: number; order: number }[]) => {
    const { data } = await api.post('v1/cms/sections/reorder/', { orders });
    return data;
  },
  // Media
  getMedia: async () => {
    const { data } = await api.get('v1/cms/media/');
    return Array.isArray(data) ? data : data.results || [];
  },
  uploadMedia: async (file: File, altText = '') => {
    const form = new FormData();
    form.append('file', file);
    form.append('alt_text', altText);
    form.append('file_type', file.type.startsWith('video') ? 'video' : 'image');
    const { data } = await api.post('v1/cms/media/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  deleteMedia: async (id: number) => {
    await api.delete(`v1/cms/media/${id}/`);
  },
  // Navigation
  getMenus: async () => {
    const { data } = await api.get('v1/cms/menus/');
    return Array.isArray(data) ? data : data.results || [];
  },
  createMenu: async (payload: Omit<NavigationMenu, 'id' | 'items'>) => {
    const { data } = await api.post('v1/cms/menus/', payload);
    return data;
  },
  createNavItem: async (payload: Omit<NavigationItem, 'id' | 'children'>) => {
    const { data } = await api.post('v1/cms/nav-items/', payload);
    return data;
  },
  updateNavItem: async (id: number, payload: Partial<NavigationItem>) => {
    const { data } = await api.patch(`v1/cms/nav-items/${id}/`, payload);
    return data;
  },
  deleteNavItem: async (id: number) => {
    await api.delete(`v1/cms/nav-items/${id}/`);
  },
};

export default cmsService;
