'use client';

import { useState, useEffect } from 'react';
import {
    Globe, Layout, Image as ImageIcon, Phone, Menu,
    Palette, CheckCircle, Loader2, Eye, RefreshCw, ShieldCheck
} from 'lucide-react';
import cmsService, { SiteSettings, WebsiteSection, MediaAsset } from '@/services/cms.service';
import { productService, categoryService } from '@/lib/api';
import { authService } from '@/lib/auth';
import toast from 'react-hot-toast';
import { PageHeader, Button, Badge } from '@/components/admin/ui';

import BrandingTab from './tabs/BrandingTab';
import SectionsTab from './tabs/SectionsTab';
import MediaTab from './tabs/MediaTab';
import SeoTab from './tabs/SeoTab';
import ContactTab from './tabs/ContactTab';
import LivePreviewTab from './tabs/LivePreviewTab';
import NavbarPagesTab from './tabs/NavbarPagesTab';

const TABS = [
    { id: 'sections', label: 'Page Builder', icon: Layout, desc: 'Edit Layout' },
    { id: 'branding', label: 'Site Identity', icon: Palette, desc: 'Logo & Colors' },
    { id: 'media', label: 'Media Assets', icon: ImageIcon, desc: 'Library' },
    { id: 'navbar-pages', label: 'Navbar Pages', icon: Menu, desc: 'Navigation' },
    { id: 'contact', label: 'Business Info', icon: Phone, desc: 'Socials' },
    { id: 'seo', label: 'SEO Settings', icon: Globe, desc: 'Analytics' },
];

const defaultSettings: SiteSettings = {
    site_name: '', primary_color: '#c45500', secondary_color: '#111c31',
    show_announcement: false, announcement_text: '', announcement_link: '',
    whatsapp_number: '', phone_number: '', contact_email: '',
    address: '', google_maps_url: '', instagram_url: '', facebook_url: '', tiktok_url: '', youtube_url: '',
    meta_title: '', meta_description: '', meta_keywords: '',
    google_analytics_id: '', pixel_id: '',
};

export default function WebsiteSettingsPage() {
    const [activeTab, setActiveTab] = useState('sections');
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const [sections, setSections] = useState<WebsiteSection[]>([]);
    const [media, setMedia] = useState<MediaAsset[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [allowed, setAllowed] = useState<boolean | null>(null);

    useEffect(() => { setAllowed(authService.isSuperAdmin()); loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [state, sec, med, prods, cats] = await Promise.all([
                cmsService.getFullState().catch(() => ({ settings: null, sections: [], menus: [] })),
                cmsService.getSections().catch(() => []),
                cmsService.getMedia().catch(() => []),
                productService.getAll({ no_pagination: 'true' }).catch(() => []),
                categoryService.getAll().catch(() => []),
            ]);
            setSettings(state.settings || defaultSettings);
            setSections(sec);
            setMedia(med);
            const p = Array.isArray(prods) ? prods : (prods as any).results || [];
            setProducts(p);
            const c = Array.isArray(cats) ? cats : (cats as any).results || [];
            setCategories(c);
        } catch {
            toast.error('Failed to load CMS data');
            setSettings(defaultSettings);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async (data: Partial<SiteSettings>) => {
        setSaving(true);
        try {
            // Cleanup: ensure we don't send system fields to avoid validation errors
            const { id, updated_at, ...payload } = data as any;
            
            const updated = await cmsService.updateSettings(payload);
            setSettings(updated);
            setLastSaved(new Date());
            toast.success('Settings saved!');
        } catch (error: any) {
            console.error('Save failed:', error);
            const msg = error.response?.data ? JSON.stringify(error.response.data) : 'Failed to save';
            toast.error(msg);
        }
        finally { setSaving(false); }
    };

    if (allowed === false) {
        return (
            <div className="max-w-xl mx-auto py-20 text-center">
                <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                    <ShieldCheck size={26} />
                </div>
                <h2 className="text-[18px] font-bold text-slate-900">Super Admin only</h2>
                <p className="text-[13px] text-slate-500 mt-2">Website CMS is restricted to Super Admins.</p>
            </div>
        );
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-[70vh]">
            <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-[#0E8CA8] animate-spin mx-auto" strokeWidth={1} />
                <p className="text-slate-500 font-medium text-[13px] animate-pulse">Loading CMS Console...</p>
            </div>
        </div>
    );

    return (
        <div className="pb-20">
            <div className="max-w-[1100px] mx-auto text-left">
                {/* ── PAGE HEADER ── */}
                <PageHeader
                    title="Website CMS"
                    subtitle="Manage landing page sections, media, and site identity."
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Website CMS' }]}
                    actions={
                        <div className="flex items-center gap-2">
                            {saving ? (
                                <Badge tone="amber">
                                    <RefreshCw size={10} className="animate-spin" /> Auto-Saving
                                </Badge>
                            ) : lastSaved && (
                                <Badge tone="green">
                                    <CheckCircle size={10} /> Synced {lastSaved.toLocaleTimeString()}
                                </Badge>
                            )}
                            <Button variant="outline" size="sm" onClick={loadAll}>
                                <RefreshCw size={14} /> Refresh
                            </Button>
                            <a href="/" target="_blank" className="contents">
                                <Button variant="primary" size="sm">
                                    <Eye size={14} /> View Site
                                </Button>
                            </a>
                        </div>
                    }
                />

                {/* ── TABS NAVIGATION ── */}
                <div className="flex gap-4 md:gap-8 overflow-x-auto scrollbar-hide border-b border-slate-200 mb-6 pb-0.5">
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 pb-3.5 text-[14px] font-semibold transition-all relative whitespace-nowrap pt-2 ${activeTab === tab.id ? 'text-[#0E8CA8]' : 'text-slate-500 hover:text-slate-900'
                                }`}>
                            <tab.icon size={16} />
                            <span>{tab.label}</span>
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 w-full h-[2.5px] bg-[#13B0D1]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* ── CONTENT AREA ── */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'sections' && settings && <SectionsTab sections={sections} setSections={setSections} products={products} categories={categories} media={media} settings={settings} onSave={handleSaveSettings} />}
                    {activeTab === 'branding' && settings && <BrandingTab settings={settings} onSave={handleSaveSettings} saving={saving} setSettings={setSettings} />}
                    {activeTab === 'media' && <MediaTab media={media} setMedia={setMedia} />}
                    {activeTab === 'navbar-pages' && <NavbarPagesTab />}
                    {activeTab === 'contact' && settings && <ContactTab settings={settings} onSave={handleSaveSettings} saving={saving} />}
                    {activeTab === 'seo' && settings && <SeoTab settings={settings} onSave={handleSaveSettings} saving={saving} />}
                </div>
            </div>
        </div>
    );
}
