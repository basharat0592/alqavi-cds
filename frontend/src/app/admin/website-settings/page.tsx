'use client';

import { useState, useEffect } from 'react';
import {
    Globe, Layout, Image as ImageIcon, Phone, Settings, Menu,
    Palette, CheckCircle, Loader2, Eye, RefreshCw, ChevronRight
} from 'lucide-react';
import cmsService, { SiteSettings, WebsiteSection, MediaAsset } from '@/services/cms.service';
import { productService, categoryService } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

import BrandingTab from './tabs/BrandingTab';
import SectionsTab from './tabs/SectionsTab';
import MediaTab from './tabs/MediaTab';
import SeoTab from './tabs/SeoTab';
import ContactTab from './tabs/ContactTab';
import LivePreviewTab from './tabs/LivePreviewTab';

const TABS = [
    { id: 'sections', label: 'Page Builder', icon: Layout, desc: 'Edit Layout' },
    { id: 'branding', label: 'Site Identity', icon: Palette, desc: 'Logo & Colors' },
    { id: 'media', label: 'Media Assets', icon: ImageIcon, desc: 'Library' },
    { id: 'contact', label: 'Business Info', icon: Phone, desc: 'Socials' },
    { id: 'seo', label: 'SEO Settings', icon: Globe, desc: 'Analytics' },
];

const defaultSettings: SiteSettings = {
    site_name: 'Al-Qavi Hub', primary_color: '#c45500', secondary_color: '#111c31',
    show_announcement: true, announcement_text: 'Free Delivery on orders over Rs. 5000!', announcement_link: '',
    whatsapp_number: '+923000000000', phone_number: '', contact_email: 'info@alqavihub.com',
    address: '', google_maps_url: '', instagram_url: '', facebook_url: '', tiktok_url: '', youtube_url: '',
    meta_title: 'Al-Qavi Hub | Luxury Cosmetics', meta_description: '', meta_keywords: '',
    google_analytics_id: '', pixel_id: '',
};

// ── AMAZON DESIGN SYSTEM COMPONENTS ──
const AmazonBtn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[31px] px-4 rounded-[3px] text-[13px] font-medium border shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
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

    useEffect(() => { loadAll(); }, []);

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
            const updated = await cmsService.updateSettings(data);
            setSettings(updated);
            setLastSaved(new Date());
            toast.success('Settings saved!');
        } catch { toast.error('Failed to save'); }
        finally { setSaving(false); }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[70vh] bg-white">
            <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-[#c45500] animate-spin mx-auto" strokeWidth={1} />
                <p className="text-[#565959] font-medium text-[13px] animate-pulse">Loading CMS Console...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1100px] mx-auto px-6 pt-5 text-left">
                {/* ── BREADCRUMB ── */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <span className="hover:text-[#c45500] hover:underline cursor-pointer">Dashboard</span>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500]">Website CMS</span>
                </div>

                {/* ── TITLE SECTION ── */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-3">
                            <h1 className="text-[22px] font-normal text-[#111]">Elite CMS Console</h1>
                            {saving ? (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full uppercase animate-pulse">
                                    <RefreshCw size={10} className="animate-spin" /> Auto-Saving
                                </span>
                            ) : lastSaved && (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-50 border border-green-100 px-2.5 py-0.5 rounded-full uppercase">
                                    <CheckCircle size={10} /> Synced {lastSaved.toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                        <p className="text-[13px] text-[#565959]">Manage landing page sections, media, and site identity.</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <AmazonBtn variant="secondary" onClick={loadAll}>
                            <RefreshCw size={14} /> Refresh
                        </AmazonBtn>
                        <a href="/" target="_blank" className="contents">
                            <AmazonBtn>
                                <Eye size={14} /> View Site
                            </AmazonBtn>
                        </a>
                    </div>
                </div>
                <div className="border-b border-[#ddd] mb-6" />

                {/* ── TABS NAVIGATION ── */}
                <div className="flex gap-8 overflow-x-auto scrollbar-hide border-b border-[#ddd] mb-6">
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 pb-3.5 text-[14px] font-medium transition-all relative whitespace-nowrap pt-2 ${activeTab === tab.id ? 'text-[#c45500]' : 'text-[#565959] hover:text-[#111]'
                                }`}>
                            <tab.icon size={16} />
                            <span>{tab.label}</span>
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 w-full h-[2.5px] bg-[#c45500]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* ── CONTENT AREA ── */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'sections' && <SectionsTab sections={sections} setSections={setSections} products={products} categories={categories} media={media} />}
                    {activeTab === 'branding' && settings && <BrandingTab settings={settings} onSave={handleSaveSettings} saving={saving} />}
                    {activeTab === 'media' && <MediaTab media={media} setMedia={setMedia} />}
                    {activeTab === 'contact' && settings && <ContactTab settings={settings} onSave={handleSaveSettings} saving={saving} />}
                    {activeTab === 'seo' && settings && <SeoTab settings={settings} onSave={handleSaveSettings} saving={saving} />}
                </div>
            </div>
        </div>
    );
}
