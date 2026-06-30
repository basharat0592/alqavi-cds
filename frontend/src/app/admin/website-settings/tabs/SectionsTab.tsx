'use client';
import { useState, useEffect } from 'react';
import {
    Plus, Eye, EyeOff, Trash2, Copy, GripVertical, ChevronDown, ChevronUp,
    ChevronRight, Edit3, X, Save, Loader2, Layout, Settings,
    Image as ImageIcon, CheckCircle, Monitor, Package, Star, Layers,
    Film, Globe, Mail, MessageSquare, HelpCircle, Tag, ShieldCheck,
    Truck, Users, Sparkles, MapPin, Phone, Coffee, Zap, Heart, Globe2
} from 'lucide-react';
import cmsService, { WebsiteSection } from '@/services/cms.service';
import toast from 'react-hot-toast';
import { cn, getImageUrl, checkIsVideo } from '@/lib/utils';
import MediaPickerModal from '../components/MediaPickerModal';

const SECTION_TYPES = [
    { type: 'announcement', label: 'Announcement Bar', icon: '📢', desc: 'Top header notification bar' },
    { type: 'hero', label: 'Hero / Slider', icon: '🎯', desc: 'Main banner with slides' },
    { type: 'products', label: 'Product Grid', icon: '🛍️', desc: 'Showcase products' },
    { type: 'categories', label: 'Categories', icon: '🗂️', desc: 'Category cards' },
    { type: 'about', label: 'About / Text', icon: '📝', desc: 'Rich text block' },
    { type: 'testimonials', label: 'Reviews', icon: '⭐', desc: 'Customer testimonials' },
    { type: 'faq', label: 'FAQ', icon: '❓', desc: 'Accordion questions' },
    { type: 'newsletter', label: 'Newsletter', icon: '📧', desc: 'Email signup' },
    { type: 'gallery', label: 'Gallery', icon: '🖼️', desc: 'Media grid' },
    { type: 'video', label: 'Video', icon: '🎬', desc: 'Video embed' },
    { type: 'promotion', label: 'Promotion', icon: '🏷️', desc: 'Promo banner' },
    { type: 'brands', label: 'Brands Slider', icon: '💎', desc: 'Trusted partner logos' },
    { type: 'stats', label: 'Impact Stats', icon: '📊', desc: 'Counter card grid' },
    { type: 'features', label: 'Core Features', icon: '✨', desc: 'Icon-based value grid' },
    { type: 'steps', label: 'How It Works', icon: '🛤️', desc: 'Numbered process steps' },
    { type: 'spotlight', label: 'Product Spotlight', icon: '🔦', desc: 'Single featured product' },
    { type: 'marquee', label: 'Ticker Bar', icon: '🎢', desc: 'Scrolling announcement' },
    { type: 'banner_split', label: 'Split Banner', icon: '🌓', desc: 'Image & text split' },
    { type: 'contact', label: 'Contact Info', icon: '📞', desc: 'Contact details block' },
    { type: 'map', label: 'Store Location', icon: '📍', desc: 'Google Maps embed' },
    { type: 'parallax', label: 'Parallax Experience', icon: '🌌', desc: 'Depth-based scrolling visual' },
    { type: 'html', label: 'Custom HTML', icon: '💻', desc: 'Advanced code widget' },
];

const DEFAULT_CONTENT: Record<string, any> = {
    hero: { title: 'Luxury Cosmetics for You', subtitle: 'Shop the finest collection', slides: [] },
    products: { title: 'Best Sellers', subtitle: '', layout_type: 'grid', per_row: 4, show_price: true, show_stock: true, product_ids: [] },
    search_hero: { title: 'What are you looking for today?', placeholder: 'Search products, brands, or skin types...' },
    spotlight: { title: 'Product of the Month', product_id: '', description: '', image: '' },
    model_3d: { title: 'Examine Closely', model_url: '', poster_image: '', auto_rotate: true },
    brands: { title: 'Our Trusted Partners', logos: [] },
    categories: { title: 'Shop by Category', items: [] },
    collections: { title: 'Curated Collections', items: [{ title: 'Summer Glow', image: '', link: '/collection/summer' }] },
    about: { title: 'About Us', body: 'Write your story here...', image: null },
    parallax: { title: 'Feel the Texture', subtitle: 'Experience quality like never before.', bg_image: '', intensity: 0.5 },
    features: { title: 'Why Choose Us', items: [{ icon: 'truck', title: 'Free Shipping', text: 'On orders over Rs. 5000' }] },
    steps: { title: 'How to Order', items: [{ title: 'Select Product', text: 'Browse our catalog' }] },
    quiz: { title: 'Find Your Perfect Routine', subtitle: 'Answer 3 questions to see personalized recommendations.', steps: [] },
    stats: { title: 'Our Impact', items: [{ label: 'Happy Clients', value: '10,000+' }] },
    testimonials: { title: 'What Customers Say', reviews: [] },
    faq: { title: 'Frequently Asked Questions', items: [] },
    newsletter: { title: 'Stay Updated', subtitle: 'Subscribe to get the latest deals', placeholder: 'Enter your email' },
    gallery: { title: 'Our Gallery', items: [] },
    video: { title: 'Watch Our Story', url: '' },
    promotion: { title: 'Special Offer', subtitle: '50% Off Selected Items', cta_text: 'Grab Deal', cta_link: '/sale', discount_percent: 50, product_ids: [] },
    countdown: { title: 'Flash Sale Ending Soon', end_date: '', bg_color: '#f3a847' },
    banner_split: { title: 'Premium Collection', body: 'Experience the luxury of organic beauty.', image: null, reversed: false },
    marquee: { text: 'FREE SHIPPING ON ALL ORDERS OVER RS. 5000 • NEW SUMMER COLLECTION OUT NOW • SHOP TODAY AND GET 10% OFF', speed: 'medium' },
    comparison: { title: 'Visible Results', before_image: '', after_image: '' },
    tabs: { title: 'Product Details', items: [{ label: 'Ingredients', content: '' }] },
    contact: { title: 'Get In Touch', email: '', phone: '', address: '' },
    map: { title: 'Our Location', iframe_url: '' },
    social: { title: 'Follow Us', items: [] },
    pricing: { title: 'Our Plans', plans: [{ name: 'Basic', price: '0', features: ['Feature 1'] }] },
    html: { title: 'Custom Widget', code: '<!-- Enter custom HTML/Script here -->' },
};

const AmazonBtn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent shadow-sm shadow-indigo-600/20',
        secondary: 'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-9 px-4 rounded-lg text-[13px] font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = "w-full h-9 px-3 border border-slate-200 rounded-lg text-[13px] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400 bg-white transition-all";

interface Props {
    sections: WebsiteSection[];
    setSections: (s: WebsiteSection[]) => void;
    products?: any[];
    categories?: any[];
    media?: any[];
    settings?: any;
    onSave?: any;
}

export default function SectionsTab({ sections, setSections, products = [], categories = [], media = [], settings, onSave }: Props) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [previewId, setPreviewId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState<number | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const [announcementForm, setAnnouncementForm] = useState({
        show_announcement: settings?.show_announcement ?? true,
        announcement_text: settings?.announcement_text ?? '',
        announcement_link: settings?.announcement_link ?? '',
        announcement_bg_color: settings?.announcement_bg_color ?? '#131921',
        announcement_text_color: settings?.announcement_text_color ?? '#ffffff',
        announcement_scroll: settings?.announcement_scroll ?? false,
        announcement_scroll_speed: settings?.announcement_scroll_speed ?? 'medium',
        announcement_duration: settings?.announcement_duration ?? 5,
    });

    const [savingAnnouncement, setSavingAnnouncement] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState(false);

    // The Announcement Bar lives in site settings (not a DB section). Presence in the layout
    // list is tracked with a dedicated flag (NOT derived from the live form) so that re-syncing
    // settings — or toggling Live/Hidden — never makes the row flicker. It is "added" once the
    // bar is enabled or has text, and only removed via the explicit Delete action.
    const [announcementAdded, setAnnouncementAdded] = useState<boolean>(
        !!(settings?.show_announcement || (settings?.announcement_text || '').trim())
    );
    useEffect(() => {
        if (settings && (settings.show_announcement || (settings.announcement_text || '').trim())) {
            setAnnouncementAdded(true);
        }
    }, [settings]);

    useEffect(() => {
        if (settings) {
            setAnnouncementForm({
                show_announcement: settings.show_announcement,
                announcement_text: settings.announcement_text || '',
                announcement_link: settings.announcement_link || '',
                announcement_bg_color: settings.announcement_bg_color || '#131921',
                announcement_text_color: settings.announcement_text_color || '#ffffff',
                announcement_scroll: !!settings.announcement_scroll,
                announcement_scroll_speed: settings.announcement_scroll_speed || 'medium',
                announcement_duration: settings.announcement_duration ?? 5,
            });
        }
    }, [settings]);

    const handleSaveAnnouncement = async () => {
        if (!onSave) return;
        setSavingAnnouncement(true);
        try {
            await onSave(announcementForm);
            setEditingAnnouncement(false);
        } catch {
            toast.error('Failed to save Announcement Bar');
        } finally {
            setSavingAnnouncement(false);
        }
    };

    // Toggle the storefront visibility of the announcement bar (keeps it in the list).
    const toggleAnnouncement = async () => {
        const updated = { ...announcementForm, show_announcement: !announcementForm.show_announcement };
        setAnnouncementForm(updated);
        if (onSave) {
            try { await onSave(updated); } catch { toast.error('Failed to update'); }
        }
    };

    // Remove the announcement bar from the layout (disable + clear text).
    const removeAnnouncement = async () => {
        const cleared = { ...announcementForm, show_announcement: false, announcement_text: '' };
        setAnnouncementForm(cleared);
        setAnnouncementAdded(false);
        setEditingAnnouncement(false);
        if (onSave) {
            try { await onSave(cleared); toast.success('Announcement Bar removed'); }
            catch { toast.error('Failed to remove'); }
        }
    };

    const handleSync = () => {
        setIsSyncing(true);
        localStorage.setItem('cms-sync-reload', Date.now().toString());
        setTimeout(() => {
            setIsSyncing(false);
            toast.success('Website Synchronized Successfully!');
        }, 2000);
    };

    const addSection = async (type: string) => {
        // Announcement Bar is not a DB section — it's a site setting. Adding it just
        // enables it and opens its editor; it then appears as a row in the list below.
        if (type === 'announcement') {
            setShowAddModal(false);
            setAnnouncementAdded(true);
            setAnnouncementForm(f => ({ ...f, show_announcement: true }));
            setEditingAnnouncement(true);
            return;
        }
        const meta = SECTION_TYPES.find(t => t.type === type)!;
        setLoading(-1);
        try {
            const created = await cmsService.createSection({
                name: `${meta.label} Section`,
                section_type: type,
                content: DEFAULT_CONTENT[type] || {},
                order: sections.length,
                is_visible: true,
            });
            setSections([...sections, created]);
            setShowAddModal(false);
            setEditingId(created.id!); // Auto-open editor
            toast.success(`${meta.label} section added!`);
        } catch { toast.error('Failed to add section'); }
        finally { setLoading(null); }
    };

    const toggleVisibility = async (s: WebsiteSection) => {
        try {
            const updated = await cmsService.updateSection(s.id!, { is_visible: !s.is_visible });
            setSections(sections.map((sec: WebsiteSection) => sec.id === s.id ? updated : sec));
        } catch { toast.error('Failed to update'); }
    };

    const deleteSection = async (id: number) => {
        setLoading(id);
        try {
            await cmsService.deleteSection(id);
            setSections(sections.filter(s => s.id !== id));
            setDeletingId(null);
            toast.success('Section removed');
        } catch { toast.error('Delete failed'); }
        finally { setLoading(null); }
    };

    const duplicateSection = async (id: number) => {
        try {
            const dup = await cmsService.duplicateSection(id);
            setSections([...sections, dup]);
            toast.success('Section cloned!');
        } catch { toast.error('Duplicate failed'); }
    };

    const handleDragEnd = async (newList: WebsiteSection[]) => {
        const orders = newList.map((s, i) => ({ id: s.id!, order: i }));
        try {
            await cmsService.reorderSections(orders);
            setSections(newList);
        } catch { toast.error('Reorder failed'); }
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= sections.length) return;

        const newList = [...sections];
        const [moved] = newList.splice(index, 1);
        newList.splice(newIndex, 0, moved);
        handleDragEnd(newList);
    };

    const editingSection = sections.find(s => s.id === editingId);

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 text-left">
            {/* ── ANNOUNCEMENT BAR EDITOR (opens from "Add Page Section" → Announcement Bar, or the row's Edit) ── */}
            {editingAnnouncement && settings && (
              <div className="fixed inset-0 bg-[#000000a0] z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-left">
                    <div className="bg-slate-50/60 border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[15px] font-bold text-slate-900">Announcement Bar</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full border border-indigo-100">Header Notification</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Live</span>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={!!announcementForm.show_announcement}
                                    onChange={() => setAnnouncementForm(f => ({ ...f, show_announcement: !f.show_announcement }))}
                                />
                                <div className={`w-10 h-5 rounded-full transition-colors relative ${announcementForm.show_announcement ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${announcementForm.show_announcement ? 'left-[20px]' : 'left-0.5'}`} />
                                </div>
                            </label>
                            <button onClick={() => setEditingAnnouncement(false)} className="text-slate-400 hover:text-slate-900"><X size={20} /></button>
                        </div>
                    </div>

                    <div className="p-6 space-y-6 overflow-y-auto">
                        {/* Row 1: Text and Link */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-bold text-[#565959] uppercase tracking-wider">Banner Text</label>
                                <input
                                    type="text"
                                    value={announcementForm.announcement_text}
                                    onChange={e => setAnnouncementForm(f => ({ ...f, announcement_text: e.target.value }))}
                                    className={inputCls}
                                    placeholder="Free Delivery on all orders over Rs. 5000! 🚚"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-bold text-[#565959] uppercase tracking-wider">Action Link (Optional)</label>
                                <input
                                    type="text"
                                    value={announcementForm.announcement_link}
                                    onChange={e => setAnnouncementForm(f => ({ ...f, announcement_link: e.target.value }))}
                                    placeholder="/shop"
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        {/* Row 2: Colors, Scroll, Speed, Duration */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-bold text-[#565959] uppercase tracking-wider">Background Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={announcementForm.announcement_bg_color}
                                        onChange={e => setAnnouncementForm(f => ({ ...f, announcement_bg_color: e.target.value }))}
                                        className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                                    />
                                    <input
                                        type="text"
                                        value={announcementForm.announcement_bg_color}
                                        onChange={e => setAnnouncementForm(f => ({ ...f, announcement_bg_color: e.target.value }))}
                                        className={inputCls + " font-mono uppercase"}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-bold text-[#565959] uppercase tracking-wider">Text Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={announcementForm.announcement_text_color}
                                        onChange={e => setAnnouncementForm(f => ({ ...f, announcement_text_color: e.target.value }))}
                                        className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                                    />
                                    <input
                                        type="text"
                                        value={announcementForm.announcement_text_color}
                                        onChange={e => setAnnouncementForm(f => ({ ...f, announcement_text_color: e.target.value }))}
                                        className={inputCls + " font-mono uppercase"}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-bold text-[#565959] uppercase tracking-wider">Scroll Text (Ticker)</label>
                                <div className="h-[31px] flex items-center">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={!!announcementForm.announcement_scroll}
                                            onChange={() => setAnnouncementForm(f => ({ ...f, announcement_scroll: !f.announcement_scroll }))}
                                        />
                                        <div className={`w-10 h-5 rounded-full transition-colors relative ${announcementForm.announcement_scroll ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${announcementForm.announcement_scroll ? 'left-[20px]' : 'left-0.5'}`} />
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-bold text-[#565959] uppercase tracking-wider">Scroll Speed</label>
                                <select
                                    value={announcementForm.announcement_scroll_speed}
                                    onChange={e => setAnnouncementForm(f => ({ ...f, announcement_scroll_speed: e.target.value }))}
                                    disabled={!announcementForm.announcement_scroll}
                                    className="w-full h-9 px-2 border border-slate-200 rounded-lg text-[13px] bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-400"
                                >
                                    <option value="slow">Slow</option>
                                    <option value="medium">Medium</option>
                                    <option value="fast">Fast</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-bold text-[#565959] uppercase tracking-wider">Display Length (Sec)</label>
                                <input
                                    type="number"
                                    value={announcementForm.announcement_duration}
                                    onChange={e => setAnnouncementForm(f => ({ ...f, announcement_duration: parseInt(e.target.value) || 0 }))}
                                    className={inputCls}
                                    min="0"
                                    max="60"
                                />
                            </div>
                        </div>

                    </div>

                    <div className="bg-slate-50/60 border-t border-slate-100 px-6 py-4 flex justify-end gap-2 shrink-0">
                        <AmazonBtn variant="secondary" onClick={() => setEditingAnnouncement(false)}>Cancel</AmazonBtn>
                        <AmazonBtn onClick={handleSaveAnnouncement} loading={savingAnnouncement}>
                            Save Announcement Bar
                        </AmazonBtn>
                    </div>
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200/70 rounded-2xl px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div>
                    <h3 className="text-[15px] font-bold text-slate-900">Landing Page Layout Builder</h3>
                    <p className="text-[12px] text-slate-500">Manage the sequence and content of sections on your storefront.</p>
                </div>
                <AmazonBtn onClick={() => setShowAddModal(true)} className="w-full sm:w-auto justify-center whitespace-nowrap">
                    <Plus size={16} /> Add Page Section
                </AmazonBtn>
            </div>

            <div className="bg-slate-50/60 border border-slate-200/70 rounded-2xl p-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden relative min-h-[400px]">
                {/* ── SYNCHRONIZING OVERLAY (FIXED VIEWPORT CENTER - DARK BG) ── */}
                {isSyncing && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
                            <div className="relative">
                                <Loader2 className="w-20 h-20 text-[#119AB8] animate-spin opacity-40" strokeWidth={1} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Globe className="w-8 h-8 text-[#c45500] animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-3xl font-black text-white uppercase tracking-[0.3em] drop-shadow-2xl">Synchronizing</h3>
                                <p className="text-[12px] text-zinc-300 font-black uppercase tracking-widest mt-2">Broadcasting live update to storefront...</p>
                            </div>
                        </div>
                    </div>
                )}
                <div className="hidden md:grid grid-cols-12 px-6 py-3 border-b border-slate-200/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                    <div className="col-span-1">Order</div>
                    <div className="col-span-1">Type</div>
                    <div className="col-span-6">Section Name & Details</div>
                    <div className="col-span-2">Visibility</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>

                <div className="bg-white divide-y divide-[#eee]">
                    {/* ── PINNED ANNOUNCEMENT BAR ROW (settings-backed, not a DB section) ── */}
                    {announcementAdded && (
                        <div className="relative bg-indigo-50/20">
                            {/* DESKTOP */}
                            <div className="hidden md:grid grid-cols-12 items-center px-6 py-4 w-full">
                                <div className="col-span-1">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">Pinned</span>
                                </div>
                                <div className="col-span-1">
                                    <div className="w-8 h-8 rounded-[4px] bg-slate-50 border border-slate-200 flex items-center justify-center text-lg">📢</div>
                                </div>
                                <div className="col-span-6">
                                    <p className="text-[14px] font-bold text-slate-900">Announcement Bar</p>
                                    <p className="text-[12px] text-slate-500">Top header notification bar</p>
                                </div>
                                <div className="col-span-2">
                                    <div className="flex items-center gap-3">
                                        <button onClick={toggleAnnouncement} className={cn("relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none", announcementForm.show_announcement ? "bg-green-600" : "bg-gray-300")}>
                                            <span className={cn("pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out", announcementForm.show_announcement ? "translate-x-4" : "translate-x-0")} />
                                        </button>
                                        <span className={cn("text-[10px] font-black uppercase tracking-tight", announcementForm.show_announcement ? "text-green-700" : "text-gray-400")}>{announcementForm.show_announcement ? 'Live' : 'Hidden'}</span>
                                    </div>
                                </div>
                                <div className="col-span-2 flex items-center justify-end gap-3">
                                    <button onClick={() => setEditingAnnouncement(true)} className="text-[12px] font-bold text-indigo-600 hover:underline">Edit</button>
                                    <span className="text-[#ddd]">|</span>
                                    <button onClick={removeAnnouncement} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                </div>
                            </div>
                            {/* MOBILE */}
                            <div className="flex md:hidden flex-col p-4 gap-3 w-full">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">Pinned</span>
                                        <p className="text-[14px] font-bold text-slate-900">Announcement Bar</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-[4px] bg-slate-50 border border-slate-200 flex items-center justify-center text-lg">📢</div>
                                </div>
                                <div className="flex items-center justify-between border-t border-[#eee] pt-3">
                                    <div className="flex items-center gap-2">
                                        <button onClick={toggleAnnouncement} className={cn("relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors", announcementForm.show_announcement ? "bg-green-600" : "bg-gray-300")}>
                                            <span className={cn("pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition", announcementForm.show_announcement ? "translate-x-4" : "translate-x-0")} />
                                        </button>
                                        <span className={cn("text-[10px] font-black uppercase", announcementForm.show_announcement ? "text-green-700" : "text-gray-400")}>{announcementForm.show_announcement ? 'Live' : 'Hidden'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setEditingAnnouncement(true)} className="h-[28px] px-3 border border-slate-200 rounded-lg text-[12px] font-bold text-indigo-600 hover:bg-slate-50">Edit</button>
                                        <button onClick={removeAnnouncement} className="h-[28px] px-3 border border-[#c40000]/20 rounded-lg text-[12px] font-bold text-[#c40000] hover:bg-red-50/50">Delete</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {sections.length === 0 && !announcementAdded ? (
                        <div className="p-16 text-center text-[#888]">
                            <p className="text-[14px]">No layout sections defined yet.</p>
                            <button onClick={() => setShowAddModal(true)} className="text-indigo-600 font-bold hover:underline mt-2">Get started by adding a hero section</button>
                        </div>
                    ) : (
                        sections.map((s: WebsiteSection, idx: number) => {
                            const meta = SECTION_TYPES.find(t => t.type === s.section_type);
                            return (
                                <div key={s.id}>
                                    <div
                                        draggable
                                        onDragStart={(e) => {
                                            setDragIndex(idx);
                                            e.dataTransfer.effectAllowed = 'move';
                                            setTimeout(() => {
                                                const target = e.target as HTMLElement;
                                                target.style.opacity = '0.4';
                                            }, 0);
                                        }}
                                        onDragEnd={(e) => {
                                            setDragIndex(null);
                                            setDragOverIndex(null);
                                            const target = e.target as HTMLElement;
                                            target.style.opacity = '1';
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setDragOverIndex(idx);
                                        }}
                                        onDrop={() => {
                                            if (dragIndex === null || dragIndex === idx) return;
                                            const newList = [...sections];
                                            const [moved] = newList.splice(dragIndex, 1);
                                            newList.splice(idx, 0, moved);
                                            handleDragEnd(newList);
                                            setDragIndex(null);
                                            setDragOverIndex(null);
                                        }}
                                        className={cn(
                                            'hover:bg-[#fcfcfc] transition-all group relative border-l-4 border-transparent w-full',
                                            !s.is_visible && 'opacity-60 bg-slate-50/50',
                                            dragIndex === idx && 'bg-blue-50 border-blue-500 shadow-inner scale-[0.98]',
                                            dragOverIndex === idx && dragIndex !== idx && 'border-b-blue-400 bg-slate-50',
                                            previewId === s.id && 'bg-indigo-50/40 border-l-indigo-500'
                                        )}>

                                        {/* Drop Indicator */}
                                        {dragOverIndex === idx && dragIndex !== idx && (
                                            <div className={cn(
                                                "absolute left-0 w-full h-1 bg-[#13B0D1] z-50 rounded-full animate-pulse",
                                                dragIndex! < idx ? "bottom-0" : "top-0"
                                            )} />
                                        )}

                                        {/* DESKTOP ROW */}
                                        <div className="hidden md:grid grid-cols-12 items-center px-6 py-4 w-full">
                                            <div className="col-span-1 flex items-center gap-1.5">
                                                <div className="cursor-grab active:cursor-grabbing text-[#ddd] group-hover:text-[#aaa]">
                                                    <GripVertical size={14} />
                                                </div>
                                                <div className="flex flex-col -space-y-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }}
                                                        disabled={idx === 0}
                                                        className="text-[#999] hover:text-indigo-600 disabled:opacity-0 transition-all active:scale-125"
                                                    >
                                                        <ChevronUp size={16} strokeWidth={3} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }}
                                                        disabled={idx === sections.length - 1}
                                                        className="text-[#999] hover:text-indigo-600 disabled:opacity-0 transition-all active:scale-125"
                                                    >
                                                        <ChevronDown size={16} strokeWidth={3} />
                                                    </button>
                                                </div>
                                                <span className="text-[13px] font-black text-[#111] min-w-[14px] text-center">{idx + 1}</span>
                                            </div>

                                            <div className="col-span-1">
                                                <div className="w-8 h-8 rounded-[4px] bg-[#f7f8fa] border border-[#ddd] flex items-center justify-center text-lg">
                                                    {meta?.icon || '📄'}
                                                </div>
                                            </div>

                                            <div className="col-span-6">
                                                <p className="text-[14px] font-bold text-[#111]">{s.name}</p>
                                                <p className="text-[12px] text-[#565959]">{meta?.label} • {meta?.desc}</p>
                                            </div>

                                            <div className="col-span-2">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => toggleVisibility(s)}
                                                        className={cn(
                                                            "relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                                            s.is_visible ? "bg-green-600" : "bg-gray-300"
                                                        )}
                                                    >
                                                        <span
                                                            className={cn(
                                                                "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                                s.is_visible ? "translate-x-4" : "translate-x-0"
                                                            )}
                                                        />
                                                    </button>
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-tight",
                                                        s.is_visible ? "text-green-700" : "text-gray-400"
                                                    )}>
                                                        {s.is_visible ? 'Live' : 'Hidden'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="col-span-2 flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => setPreviewId(previewId === s.id ? null : s.id!)}
                                                    className={cn(
                                                        "p-1.5 rounded-full transition-all",
                                                        previewId === s.id ? "bg-[#111] text-white" : "text-[#565959] hover:bg-slate-100"
                                                    )}
                                                    title="Toggle Preview"
                                                >
                                                    {previewId === s.id ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                                <button onClick={() => setEditingId(s.id!)} className="text-[12px] font-bold text-indigo-600 hover:underline">Edit</button>
                                                <span className="text-[#ddd]">|</span>
                                                <button onClick={() => setDeletingId(s.id!)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                            </div>
                                        </div>

                                        {/* MOBILE CARD */}
                                        <div className="flex md:hidden flex-col p-4 gap-3 w-full">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="cursor-grab active:cursor-grabbing text-[#aaa] p-1">
                                                        <GripVertical size={16} />
                                                    </div>
                                                    <div className="flex flex-col -space-y-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }}
                                                            disabled={idx === 0}
                                                            className="text-[#999] hover:text-indigo-600 disabled:opacity-0 transition-all active:scale-125"
                                                        >
                                                            <ChevronUp size={16} strokeWidth={3} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }}
                                                            disabled={idx === sections.length - 1}
                                                            className="text-[#999] hover:text-indigo-600 disabled:opacity-0 transition-all active:scale-125"
                                                        >
                                                            <ChevronDown size={16} strokeWidth={3} />
                                                        </button>
                                                    </div>
                                                    <span className="text-[13px] font-black text-[#111] ml-1 bg-slate-100 w-6 h-6 rounded-full flex items-center justify-center border border-slate-200">
                                                        {idx + 1}
                                                    </span>
                                                </div>

                                                <div className="w-8 h-8 rounded-[4px] bg-[#f7f8fa] border border-[#ddd] flex items-center justify-center text-lg">
                                                    {meta?.icon || '📄'}
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-[14px] font-bold text-[#111]">{s.name}</p>
                                                <p className="text-[12px] text-[#565959] mt-0.5">{meta?.label} • {meta?.desc}</p>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-[#eee] pt-3 mt-1">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => toggleVisibility(s)}
                                                        className={cn(
                                                            "relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                                            s.is_visible ? "bg-green-600" : "bg-gray-300"
                                                        )}
                                                    >
                                                        <span
                                                            className={cn(
                                                                "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                                s.is_visible ? "translate-x-4" : "translate-x-0"
                                                            )}
                                                        />
                                                    </button>
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-tight",
                                                        s.is_visible ? "text-green-700" : "text-gray-400"
                                                    )}>
                                                        {s.is_visible ? 'Live' : 'Hidden'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setPreviewId(previewId === s.id ? null : s.id!)}
                                                        className={cn(
                                                            "p-1.5 rounded-full transition-all border",
                                                            previewId === s.id ? "bg-[#111] text-white border-black" : "text-[#565959] hover:bg-slate-100 border-[#ddd]"
                                                        )}
                                                        title="Toggle Preview"
                                                    >
                                                        {previewId === s.id ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                    <button onClick={() => setEditingId(s.id!)} className="h-[28px] px-3 border border-slate-200 rounded-lg text-[12px] font-bold text-indigo-600 hover:bg-slate-50 transition-all flex items-center justify-center">Edit</button>
                                                    <button onClick={() => setDeletingId(s.id!)} className="h-[28px] px-3 border border-[#c40000]/20 rounded-[3px] text-[12px] font-bold text-[#c40000] hover:bg-red-50/50 transition-all flex items-center justify-center">Delete</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Inline Preview Area */}
                                    {previewId === s.id && (
                                        <div className="bg-[#f8f9fa] border-t border-b border-[#eee] p-6 animate-in slide-in-from-top-2 duration-300">
                                            <div className="bg-white border border-[#ddd] rounded-[8px] overflow-hidden shadow-xl max-w-5xl mx-auto">
                                                <div className="bg-[#f7f8fa] border-b border-[#ddd] px-4 py-2 flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-[#565959] uppercase tracking-widest flex items-center gap-2">
                                                        <Monitor size={12} /> Live Render Simulation
                                                    </span>
                                                    <button onClick={() => setPreviewId(null)} className="text-[#565959] hover:text-[#c40000]"><X size={14} /></button>
                                                </div>
                                                <div className="transform scale-[0.95] origin-top">
                                                    {renderPreview(s, products, categories, openFaq, setOpenFaq)}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── FOOTER ACTIONS ── */}
            <div className="mt-8 flex justify-end pb-12 pr-6">
                <AmazonBtn
                    className="w-[280px] h-[48px] !text-[16px] !font-black !rounded-[4px] shadow-md border-[#888c8e]"
                    onClick={handleSync}
                >
                    <CheckCircle size={20} /> SAVE ALL CHANGES
                </AmazonBtn>
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-[#000000a0] z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-slate-50/60 border-b border-slate-100 px-4 md:px-6 py-4 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 text-[17px]">Select Section Type</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900"><X size={20} /></button>
                        </div>
                        <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {SECTION_TYPES.map(t => (
                                <button key={t.type} onClick={() => addSection(t.type)}
                                    className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/40 transition-all group text-left">
                                    <span className="text-2xl w-10 h-10 bg-slate-50 flex items-center justify-center border border-slate-100 rounded-xl">{t.icon}</span>
                                    <div>
                                        <p className="font-bold text-slate-900 text-[14px]">{t.label}</p>
                                        <p className="text-[11px] text-slate-500">{t.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="bg-slate-50/60 border-t border-slate-100 px-6 py-4 flex justify-end">
                            <AmazonBtn variant="secondary" onClick={() => setShowAddModal(false)}>Close</AmazonBtn>
                        </div>
                    </div>
                </div>
            )}

            {editingSection && (
                <SectionEditor section={editingSection}
                    onSave={async (updated) => {
                        try {
                            const result = await cmsService.updateSection(editingSection.id!, updated);
                            setSections(sections.map(s => s.id === editingSection.id ? result : s));
                            setEditingId(null);
                            toast.success('Layout updated successfully');
                        } catch { toast.error('Failed to save section'); }
                    }}
                    onClose={() => setEditingId(null)}
                    products={products}
                    categories={categories}
                />
            )}

            {deletingId && (
                <div className="fixed inset-0 bg-[#000000a0] z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200 text-left">
                    <div className="bg-white rounded-[4px] shadow-2xl w-full max-w-[380px] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-[#fcfcfc] px-6 py-4 border-b border-[#eee] flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                                <Trash2 size={18} />
                            </div>
                            <h3 className="font-bold text-[#111] text-[16px]">Permanently Delete?</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-[13px] text-[#565959] leading-relaxed">
                                Are you sure you want to remove <span className="font-bold text-[#111]">"{sections.find(s => s.id === deletingId)?.name}"</span>?
                                <br /><br />
                                This will erase all configured content for this section. This action <span className="text-[#c40000] font-bold">cannot be undone</span>.
                            </p>
                        </div>
                        <div className="bg-[#f7f8fa] px-6 py-4 flex justify-end gap-2 border-t border-[#eee]">
                            <button
                                onClick={() => setDeletingId(null)}
                                className="h-[31px] px-4 rounded-[3px] text-[13px] font-medium border border-[#adb1b8] bg-white hover:bg-slate-50 text-[#111] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteSection(deletingId)}
                                disabled={loading === deletingId}
                                className="h-[31px] px-4 rounded-[3px] text-[13px] font-bold bg-[#c40000] text-white hover:bg-[#a00000] transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading === deletingId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                Delete Section
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── PREVIEW RENDERER (Ported from LivePreviewTab) ───────────────────────────
function renderPreview(section: WebsiteSection, products: any[], categories: any[], openFaq: number | null, setOpenFaq: any) {
    const { section_type, content } = section;

    switch (section_type) {
        case 'hero':
            const slides = content.slides || [];
            const isVideo = slides[0] && (slides[0].media_type === 'video' || checkIsVideo(slides[0].image) || checkIsVideo(slides[0].video));
            return (
                <div className="relative aspect-[21/9] bg-[#0F172A] overflow-hidden">
                    {slides.length > 0 ? (
                        <>
                            {isVideo ? (
                                <video src={getImageUrl(slides[0].image || slides[0].video)} className="w-full h-full object-cover opacity-50" autoPlay muted loop playsInline />
                            ) : (
                                <img src={getImageUrl(slides[0].image)} className="w-full h-full object-cover opacity-60" />
                            )}
                            <div className="absolute inset-0 flex flex-col justify-center px-12 md:px-20">
                                <p className="text-[#f0c14b] text-[11px] font-black uppercase tracking-[0.3em] mb-3">{slides[0].subtitle}</p>
                                <h3 className="text-4xl md:text-5xl font-bold text-white max-w-2xl leading-tight">{slides[0].title}</h3>
                                <p className="text-slate-300 mt-4 max-w-lg text-sm leading-relaxed">{slides[0].description}</p>
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                            <ImageIcon size={48} strokeWidth={1} />
                            <p className="text-sm font-bold uppercase tracking-widest">No Slides Configured</p>
                        </div>
                    )}
                </div>
            );

        case 'products':
            const gridProds = products.filter(p => (content.product_ids || []).includes(p.id));
            return (
                <div className="p-8 space-y-6">
                    <div className="flex flex-col gap-1">
                        <h4 className="text-xl font-bold text-[#111]">{content.title}</h4>
                        {content.subtitle && <p className="text-slate-500 text-xs">{content.subtitle}</p>}
                    </div>
                    {gridProds.length > 0 ? (
                        <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${content.per_row || 4}, minmax(0, 1fr))` }}>
                            {gridProds.map(p => (
                                <div key={p.id} className="bg-white border border-[#eee] rounded-lg overflow-hidden group">
                                    <div className="aspect-square bg-[#f8f9fa] flex items-center justify-center">
                                        <img src={getImageUrl(p.images?.[0]?.image || p.image)} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-3">
                                        <p className="text-[12px] font-bold text-[#111] line-clamp-1">{p.name || p.product_name}</p>
                                        <p className="text-[#c45500] font-black mt-1 text-sm">Rs. {Number(p.selling_price || p.price).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 bg-slate-50 rounded-lg text-center text-slate-400">
                            <Package size={24} className="mx-auto mb-2 opacity-30" />
                            <p className="text-[12px] font-bold uppercase tracking-widest">No Products Selected</p>
                        </div>
                    )}
                </div>
            );

        case 'categories':
            const catItems = content.items || [];
            return (
                <div className="p-8 space-y-8">
                    <h4 className="text-xl font-bold text-[#111] text-center">{content.title}</h4>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
                        {catItems.map((cat: any, i: number) => (
                            <div key={i} className="flex flex-col items-center gap-2 group cursor-pointer">
                                <div className="w-16 h-16 bg-[#f0f2f2] rounded-full border border-[#ddd] overflow-hidden shadow-sm group-hover:border-[#c45500] transition-all">
                                    <img src={getImageUrl(cat.image)} className="w-full h-full object-cover" />
                                </div>
                                <span className="text-[11px] font-bold text-[#111] uppercase tracking-tight text-center">{cat.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'about':
            return (
                <div className="grid md:grid-cols-2 gap-8 p-8 items-center">
                    <div className="space-y-4">
                        <h3 className="text-3xl font-black text-[#111] tracking-tighter leading-tight">{content.title}</h3>
                        <p className="text-[#565959] leading-relaxed text-sm whitespace-pre-wrap">{content.body}</p>
                    </div>
                    <div className="relative aspect-square rounded-2xl overflow-hidden shadow-xl border border-[#eee]">
                        <img src={getImageUrl(content.image)} className="w-full h-full object-cover" />
                    </div>
                </div>
            );

        case 'faq':
            const items = content.items || [];
            return (
                <div className="p-8 bg-[#f7f8fa] space-y-6">
                    <h4 className="text-xl font-black text-[#111] text-center tracking-tight">{content.title}</h4>
                    <div className="max-w-2xl mx-auto space-y-2">
                        {items.map((item: any, i: number) => (
                            <div key={i} className="bg-white border border-[#ddd] rounded-lg overflow-hidden shadow-sm">
                                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between px-4 py-3 text-left group">
                                    <span className="text-sm font-bold text-[#111] group-hover:text-[#c45500]">{item.q}</span>
                                    <ChevronDown size={14} className={cn("text-[#888] transition-transform", openFaq === i && "rotate-180")} />
                                </button>
                                {openFaq === i && (
                                    <div className="px-4 pb-4 pt-1 text-xs text-[#565959] border-t border-[#f0f2f2] leading-relaxed">
                                        {item.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'promotion':
            return (
                <div className="flex bg-white border border-[#ddd] rounded-xl overflow-hidden h-[300px]">
                    <div className="flex-1 p-8 flex flex-col justify-center space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="h-[1px] w-4 bg-[#119AB8]" />
                            <span className="text-[8px] font-bold text-[#119AB8] uppercase tracking-[0.2em]">Elite Collection</span>
                        </div>
                        <h3 className="text-2xl font-bold text-[#111] leading-tight">{content.title}</h3>
                        <p className="text-[#565959] text-[10px] leading-relaxed max-w-xs">{content.subtitle}</p>
                        <div className="pt-2">
                            <div className="inline-block px-6 py-2 bg-[#119AB8] text-white rounded-full text-[10px] font-bold uppercase tracking-widest">
                                {content.cta_text || "Shop Now"}
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 relative">
                        <img src={getImageUrl(content.image)} className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                </div>
            );

        case 'brands':
            const logos = content.logos || [];
            return (
                <div className="p-8 space-y-6 text-center">
                    <h4 className="text-sm font-black text-[#565959] uppercase tracking-[0.3em]">{content.title}</h4>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-60 grayscale hover:grayscale-0 transition-all">
                        {logos.length > 0 ? logos.map((logo: string, i: number) => (
                            <img key={i} src={getImageUrl(logo)} className="h-8 md:h-10 w-auto object-contain" />
                        )) : <p className="text-[10px] font-bold text-slate-300">No logos added</p>}
                    </div>
                </div>
            );

        case 'stats':
            const statItems = content.items || [];
            return (
                <div className="p-8 md:p-12 bg-[#111] m-4 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {statItems.map((item: any, i: number) => (
                            <div key={i} className="text-center space-y-1">
                                <p className="text-3xl font-black text-white tracking-tighter">{item.value}</p>
                                <p className="text-[9px] font-bold text-[#119AB8] uppercase tracking-widest">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );


        case 'features':
            const featItems = content.items || [];
            return (
                <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {featItems.map((item: any, i: number) => (
                        <div key={i} className="space-y-4">
                            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
                                <Sparkles size={20} className="text-[#119AB8]" />
                            </div>
                            <h5 className="font-bold text-[#111]">{item.title}</h5>
                            <p className="text-[11px] text-[#565959] leading-relaxed">{item.text}</p>
                        </div>
                    ))}
                </div>
            );

        case 'steps':
            const stepItems = content.items || [];
            return (
                <div className="p-10 space-y-10">
                    <h4 className="text-xl font-bold text-center text-[#111]">{content.title}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {stepItems.map((item: any, i: number) => (
                            <div key={i} className="relative text-center space-y-4">
                                <div className="w-12 h-12 bg-white border-2 border-[#119AB8] rounded-full flex items-center justify-center mx-auto text-[#119AB8] font-black text-lg shadow-lg">
                                    {i + 1}
                                </div>
                                <h5 className="font-bold text-[#111] text-sm">{item.title}</h5>
                                <p className="text-[10px] text-[#565959] px-2">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'spotlight':
            const spotProd = products.find(p => p.id === content.product_id);
            return (
                <div className="p-6 md:p-10">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden grid md:grid-cols-2 items-center">
                        <div className="aspect-square relative group overflow-hidden">
                            <img src={getImageUrl(content.image || spotProd?.images?.[0]?.image)} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                            <div className="absolute bottom-4 left-4 right-4">
                                <p className="text-white text-lg font-black uppercase leading-tight drop-shadow-lg">{content.title || spotProd?.name}</p>
                            </div>
                        </div>
                        <div className="p-8 flex flex-col justify-center space-y-4">
                            <span className="text-[8px] font-black text-[#119AB8] uppercase tracking-[0.4em]">Product Spotlight</span>
                            <h4 className="text-2xl font-black text-[#111] tracking-tighter leading-none">{content.title || spotProd?.name}</h4>
                            <p className="text-[11px] text-[#565959] leading-relaxed line-clamp-3">{content.description || spotProd?.description}</p>
                            <div className="flex items-center gap-4 pt-2">
                                <div className="px-6 py-2 bg-[#111] text-white rounded-full text-[9px] font-bold uppercase tracking-widest">Shop Now</div>
                                {spotProd && <span className="font-black text-lg text-[#111]">Rs. {Number(spotProd.selling_price || spotProd.price).toLocaleString()}</span>}
                            </div>
                        </div>
                    </div>
                </div>
            );


        case 'contact':
            return (
                <div className="p-10 grid md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-6">
                        <h4 className="text-3xl font-black text-[#111] tracking-tight">{content.title}</h4>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-[#119AB8]/10 rounded-full flex items-center justify-center text-[#119AB8]">
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Email Us</p>
                                    <p className="text-sm font-bold text-[#111]">{content.email || "support@alqavi.com"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-[#119AB8]/10 rounded-full flex items-center justify-center text-[#119AB8]">
                                    <Phone size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Call Us</p>
                                    <p className="text-sm font-bold text-[#111]">{content.phone || "+92 300 1234567"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-[#119AB8]/10 rounded-full flex items-center justify-center text-[#119AB8]">
                                    <MapPin size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Visit Us</p>
                                    <p className="text-sm font-bold text-[#111]">{content.address || "123 Beauty Lane, Karachi, Pakistan"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-100 rounded-2xl h-[300px] flex items-center justify-center border-2 border-dashed border-slate-200">
                        <MessageSquare size={48} className="text-slate-300" />
                    </div>
                </div>
            );

        case 'map':
            return (
                <div className="p-8">
                    {content.title && (
                        <div className="text-center mb-6">
                            <span className="text-[8px] font-black text-[#119AB8] uppercase tracking-[0.4em] block mb-1">Visit Store</span>
                            <h4 className="text-xl font-bold text-[#111] tracking-tight">{content.title}</h4>
                            <div className="h-0.5 w-8 bg-[#119AB8] mx-auto mt-2 rounded-full" />
                        </div>
                    )}
                    <div className="aspect-[21/9] bg-slate-100 rounded-xl overflow-hidden border-4 border-white shadow-xl relative">
                        {content.iframe_url ? (
                            <iframe src={content.iframe_url} className="w-full h-full border-0 grayscale" allowFullScreen loading="lazy" />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                                <MapPin size={32} strokeWidth={1} />
                                <p className="text-[9px] font-bold uppercase tracking-widest">No Map URL Configured</p>
                            </div>
                        )}
                    </div>
                </div>
            );


        case 'banner_split':
            return (
                <div className={cn("flex flex-col md:flex-row min-h-[400px]", content.reversed && "md:flex-row-reverse")}>
                    <div className="flex-1 bg-[#111] p-12 flex flex-col justify-center space-y-6">
                        <h4 className="text-3xl font-bold text-white leading-tight">{content.title}</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">{content.body}</p>
                    </div>
                    <div className="flex-1 relative">
                        <img src={getImageUrl(content.image)} className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                </div>
            );

        case 'parallax':
            return (
                <div className="relative h-[300px] overflow-hidden flex items-center justify-center">
                    <img src={getImageUrl(content.bg_image)} className="absolute inset-0 w-full h-[150%] object-cover -translate-y-1/4" />
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="relative text-center space-y-4 px-6">
                        <h4 className="text-4xl font-black text-white tracking-tighter">{content.title}</h4>
                        <p className="text-white/80 text-sm max-w-md mx-auto">{content.subtitle}</p>
                    </div>
                </div>
            );

        case 'marquee':
            return (
                <div className="bg-[#119AB8] py-4 overflow-hidden">
                    <div className="whitespace-nowrap flex items-center animate-marquee">
                        {[...Array(4)].map((_, i) => (
                            <span key={i} className="text-white font-black text-[10px] uppercase tracking-[0.3em] flex items-center shrink-0">
                                {content.text || "AUTHENTIC COSMETICS DISTRIBUTION"}
                                <Star size={10} className="mx-8 text-white fill-white" />
                            </span>
                        ))}
                    </div>
                </div>
            );

        case 'html':
            return (
                <div className="p-10 border-2 border-dashed border-[#119AB8]/30 m-4 rounded-xl relative overflow-hidden">
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#119AB8] text-white text-[8px] font-black uppercase rounded tracking-widest">Custom HTML Widget</div>
                    <div className="text-center py-12">
                        <Zap size={32} className="mx-auto mb-4 text-[#119AB8] animate-pulse" />
                        <h4 className="text-lg font-bold text-[#111] mb-1">{content.title || "Embedded Widget"}</h4>
                        <p className="text-[10px] text-slate-500 font-mono opacity-60 truncate max-w-xs mx-auto">{content.code?.substring(0, 50)}...</p>
                    </div>
                </div>
            );

        default:
            return (
                <div className="p-12 text-center bg-slate-50 border border-dashed border-[#ddd] m-4 rounded-xl">
                    <Layers size={24} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Quick Preview: {section_type}</p>
                </div>
            );
    }
}

function SectionEditor({ section, onSave, onClose, products = [], categories = [] }: { section: WebsiteSection; onSave: (d: any) => Promise<void>; onClose: () => void; products?: any[]; categories?: any[] }) {
    const [form, setForm] = useState({ ...section });
    const [saving, setSaving] = useState(false);
    const [picker, setPicker] = useState<{ open: boolean; onSelect: (url: string) => void; allowVideo?: boolean }>({ open: false, onSelect: () => { } });
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const save = async () => {
        setSaving(true);
        try { await onSave({ name: form.name, content: form.content, is_visible: form.is_visible }); }
        finally { setSaving(false); }
    };

    const updateContent = (path: string, val: any) => {
        setForm(f => ({ ...f, content: { ...f.content, [path]: val } }));
    };

    const openPicker = (onSelect: (url: string) => void, allowVideo = false) => {
        setPicker({ open: true, onSelect: (url) => { onSelect(url); setPicker(p => ({ ...p, open: false })); }, allowVideo });
    };

    const MediaField = ({ label, value, onChange, allowVideo = false }: any) => (
        <div className="space-y-1.5 text-left">
            <label className="text-[13px] font-bold text-[#111]">{label}</label>
            <div className="flex gap-2">
                <div className="flex-1 relative group">
                    <input value={value || ''} onChange={e => onChange(e.target.value)} className={inputCls + " pr-10"} placeholder="Enter URL or Choose from Library..." />
                    {value && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 bg-white border border-[#ddd] rounded-[2px] overflow-hidden shadow-sm flex items-center justify-center">
                            {checkIsVideo(value) ? (
                                <Film size={12} className="text-[#565959]" />
                            ) : (
                                <img src={getImageUrl(value)} className="h-full w-full object-cover" />
                            )}
                        </div>
                    )}
                </div>
                <AmazonBtn variant="secondary" onClick={() => openPicker(onChange, allowVideo)}>
                    <ImageIcon size={14} /> Library
                </AmazonBtn>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-[#000000a0] z-[60] flex items-center justify-center p-4">
            {picker.open && <MediaPickerModal allowVideo={picker.allowVideo} onClose={() => setPicker(p => ({ ...p, open: false }))} onSelect={picker.onSelect} />}
            <div className="bg-white rounded-[4px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[95vh] h-full sm:h-auto">
                <div className="bg-[#f7f8fa] border-b border-[#ddd] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white border border-[#ddd] rounded-[4px] flex items-center justify-center">
                            {SECTION_TYPES.find(t => t.type === section.section_type)?.icon}
                        </div>
                        <h3 className="font-bold text-[#111] text-[17px]">Edit {section.name}</h3>
                    </div>
                    <button onClick={onClose} className="text-[#565959] hover:text-[#111]"><X size={20} /></button>
                </div>

                <div className="p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto flex-1 custom-scrollbar text-left">
                    <div className="grid md:grid-cols-2 gap-6 pb-6 border-b border-[#eee]">
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-bold text-[#111]">Internal Label</label>
                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                className={inputCls + " font-bold"} />
                        </div>
                        <div className="flex flex-col justify-end gap-1.5">
                            <label className="text-[13px] font-bold text-[#111]">Visibility Status</label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.is_visible} onChange={e => setForm(f => ({ ...f, is_visible: e.target.checked }))} className="rounded text-[#e77600] w-4 h-4" />
                                <span className="text-[13px] text-[#565959]">Show this section on the landing page</span>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {section.section_type === 'hero' && (
                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-[#111]">Primary Heading</label>
                                    <input value={form.content.title} onChange={e => updateContent('title', e.target.value)} className={inputCls} />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b border-[#eee] pb-2">
                                        <label className="text-[13px] font-bold text-[#111]">Carousel Slides ({(form.content.slides || []).length})</label>
                                        <button onClick={() => updateContent('slides', [...(form.content.slides || []), { title: 'New Slide', subtitle: '', description: '', media_type: 'image', image: '', cta_text: '', cta_link: '', color: '', thumbnail: '' }])}
                                            className="text-[12px] font-bold text-indigo-600 hover:underline">+ Add Slide</button>
                                    </div>
                                    <div className="space-y-4">
                                        {(form.content.slides || []).map((s: any, i: number) => (
                                            <div key={i} className="p-4 bg-[#fcfcfc] border border-[#ddd] rounded-[4px] space-y-4 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-bold text-[#565959] uppercase">Slide {i + 1}</span>
                                                    <button onClick={() => updateContent('slides', form.content.slides.filter((_: any, idx: number) => idx !== i))} className="text-red-600 hover:bg-red-50 p-1.5 rounded-[3px]"><Trash2 size={14} /></button>
                                                </div>
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <MediaField
                                                        label="Slide Image / Video"
                                                        value={s.image}
                                                        allowVideo={true}
                                                        onChange={(url: string) => {
                                                            const list = [...form.content.slides];
                                                            list[i].image = url;
                                                            const isVid = checkIsVideo(url);
                                                            list[i].media_type = isVid ? 'video' : 'image';
                                                            list[i].video = isVid ? url : '';
                                                            updateContent('slides', list);
                                                        }}
                                                    />
                                                    <input placeholder="Slide Title" value={s.title} onChange={e => { const list = [...form.content.slides]; list[i].title = e.target.value; updateContent('slides', list); }} className={inputCls} />
                                                    <input placeholder="Subtitle" value={s.subtitle} onChange={e => { const list = [...form.content.slides]; list[i].subtitle = e.target.value; updateContent('slides', list); }} className={inputCls} />
                                                    <input placeholder="Button Label (e.g. Shop Now)" value={s.cta_text || ''} onChange={e => { const list = [...form.content.slides]; list[i].cta_text = e.target.value; updateContent('slides', list); }} className={inputCls} />
                                                    <input placeholder="Button Link (e.g. /customer/shop)" value={s.cta_link || ''} onChange={e => { const list = [...form.content.slides]; list[i].cta_link = e.target.value; updateContent('slides', list); }} className={inputCls} />
                                                    <select value={s.color || ''} onChange={e => { const list = [...form.content.slides]; list[i].color = e.target.value; updateContent('slides', list); }} className={inputCls}>
                                                        <option value="">Default / Index Gradient</option>
                                                        <option value="from-amber-500 to-orange-600">Amber to Orange</option>
                                                        <option value="from-pink-500 to-rose-600">Pink to Rose</option>
                                                        <option value="from-violet-500 to-purple-600">Violet to Purple</option>
                                                        <option value="from-teal-400 to-emerald-600">Teal to Emerald</option>
                                                        <option value="from-blue-500 to-cyan-600">Blue to Cyan</option>
                                                    </select>
                                                    {checkIsVideo(s.image) && (
                                                        <MediaField
                                                            label="Fallback Poster Image"
                                                            value={s.thumbnail}
                                                            allowVideo={false}
                                                            onChange={(url: string) => {
                                                                const list = [...form.content.slides];
                                                                list[i].thumbnail = url;
                                                                updateContent('slides', list);
                                                            }}
                                                        />
                                                    )}
                                                    <textarea placeholder="Description Text" rows={2} value={s.description} onChange={e => { const list = [...form.content.slides]; list[i].description = e.target.value; updateContent('slides', list); }} className="md:col-span-2 w-full min-h-[60px] px-3 py-2 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] bg-white resize-none" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {section.section_type === 'products' && (
                            <div className="space-y-8">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-bold text-[#111]">Section Title</label>
                                        <input value={form.content.title} onChange={e => updateContent('title', e.target.value)} className={inputCls} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-bold text-[#111]">Subheading</label>
                                        <input value={form.content.subtitle} onChange={e => updateContent('subtitle', e.target.value)} className={inputCls} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-bold text-[#111]">Layout Type</label>
                                        <select value={form.content.layout_type || "grid"} onChange={e => updateContent("layout_type", e.target.value)} className={inputCls}>
                                            <option value="grid">Standard Grid</option>
                                            <option value="carousel">Product Carousel</option>
                                            <option value="list">List View</option>
                                            <option value="minimal">Minimal Grid</option>
                                            <option value="modern_animatic">Modern Animatic</option>
                                            <option value="showcase">Image Showcase (Hover)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-bold text-[#111]">Grid Columns (Desktop)</label>
                                        <select value={form.content.per_row} onChange={e => updateContent('per_row', parseInt(e.target.value))} className={inputCls}>
                                            <option value={2}>2 Items Per Row</option>
                                            <option value={3}>3 Items Per Row</option>
                                            <option value={4}>4 Items Per Row</option>
                                            <option value={5}>5 Items Per Row</option>
                                            <option value={6}>6 Items Per Row</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-bold text-[#111]">Display Toggles</label>
                                        <div className="flex gap-6">
                                            <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#565959]">
                                                <input type="checkbox" checked={form.content.show_price} onChange={e => updateContent('show_price', e.target.checked)} className="rounded text-[#e77600]" />
                                                Show Prices
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#565959]">
                                                <input type="checkbox" checked={form.content.show_stock} onChange={e => updateContent('show_stock', e.target.checked)} className="rounded text-[#e77600]" />
                                                Stock Status
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {(!form.content.title || form.content.title === 'Full Collection' || form.name === 'Full Product Collection') ? (
                                    <div className="pt-4 border-t border-[#eee]">
                                        <div className="p-4 bg-[#f0f9ff] border border-[#bae0ff] rounded-[6px]">
                                            <p className="text-[13px] font-bold text-[#0050b3]">Full Collection Mode Active</p>
                                            <p className="text-[12px] text-[#0050b3] mt-1">This section automatically syncs with your product catalog and displays all active products. Manual selection is disabled.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 pt-4 border-t border-[#eee]">
                                        <div className="flex-1 mb-2">
                                            <label className="text-[13px] font-bold text-[#111]">Selected Products ({(form.content.product_ids || []).length})</label>
                                            <p className="text-[11px] text-[#565959]">Search and select products to display in this grid.</p>
                                        </div>

                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search products by name to add..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onFocus={() => setIsDropdownOpen(true)}
                                                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                                                className={inputCls + " w-full bg-[#f9f9f9] border-[#ccc] focus:bg-white focus:border-[#e77600] text-[13px] shadow-inner"}
                                            />

                                            {/* Dropdown Results */}
                                            {isDropdownOpen && (
                                                <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-[#ddd] shadow-[0_15px_30px_rgba(0,0,0,0.15)] rounded-[6px] max-h-[280px] overflow-y-auto z-[60] custom-scrollbar">
                                                    {products.filter(p =>
                                                        (p.name || p.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
                                                        !(form.content.product_ids || []).includes(p.id)
                                                    ).map(p => (
                                                        <button key={p.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const current = form.content.product_ids || [];
                                                                updateContent('product_ids', [...current, p.id]);
                                                                setSearchQuery(''); // Close dropdown
                                                            }}
                                                            className="w-full flex items-center gap-3 p-3 border-b border-[#f0f0f0] hover:bg-[#f2f8f9] text-left transition-colors last:border-0"
                                                        >
                                                            <div className="w-10 h-10 bg-white border border-[#eee] rounded-[4px] overflow-hidden flex-shrink-0 shadow-sm">
                                                                <img src={getImageUrl(p.images?.[0]?.image || p.image)} className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[13px] font-bold text-[#111] truncate leading-tight">{p.name || p.product_name}</p>
                                                                <p className="text-[11px] font-medium text-[#565959] mt-0.5">Rs. {p.selling_price || p.price || p.sale_price}</p>
                                                            </div>
                                                            <div className="text-[#007185] bg-[#007185]/10 px-3 py-1.5 rounded-[4px] text-[11px] font-bold shrink-0 shadow-sm">Add +</div>
                                                        </button>
                                                    ))}
                                                    {products.filter(p =>
                                                        (p.name || p.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
                                                        !(form.content.product_ids || []).includes(p.id)
                                                    ).length === 0 && (
                                                            <div className="p-6 text-center text-[13px] font-medium text-[#888]">No additional products found.</div>
                                                        )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Grid of Selected Products */}
                                        {(form.content.product_ids || []).length > 0 && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                                {(form.content.product_ids || []).map((id: any) => {
                                                    const p = products.find((prod: any) => prod.id === id);
                                                    if (!p) return null;
                                                    return (
                                                        <div key={p.id} className="flex items-center gap-3 p-2.5 border-2 border-[#e77600]/80 bg-[#fffdfa] shadow-sm rounded-[6px] relative group hover:shadow-md transition-shadow">
                                                            <div className="w-12 h-12 bg-white border border-[#eee] rounded-[4px] overflow-hidden flex-shrink-0">
                                                                <img src={getImageUrl(p.images?.[0]?.image || p.image)} className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className="min-w-0 flex-1 pr-8">
                                                                <p className="text-[12px] font-bold text-[#111] leading-tight line-clamp-2">{p.name || p.product_name}</p>
                                                                <p className="text-[11px] font-bold text-[#565959] mt-1">Rs. {p.selling_price || p.price || p.sale_price}</p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = form.content.product_ids || [];
                                                                    updateContent('product_ids', current.filter((pid: any) => pid !== p.id));
                                                                }}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-white bg-red-50 hover:bg-red-500 p-2 rounded-[6px] transition-all shadow-sm"
                                                                title="Remove product"
                                                            >
                                                                <X size={14} className="stroke-[3px]" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {['search_hero', 'spotlight', 'parallax', 'newsletter'].includes(section.section_type) && (
                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-[#111]">Main Title</label>
                                    <input value={form.content.title} onChange={e => updateContent('title', e.target.value)} className={inputCls} />
                                </div>
                                {(form.content.image !== undefined || form.content.bg_image !== undefined) && (
                                    <MediaField label="Visual Asset" value={form.content.image || form.content.bg_image} onChange={(url: string) => updateContent(form.content.image !== undefined ? 'image' : 'bg_image', url)} />
                                )}
                                {form.content.subtitle !== undefined && (
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-bold text-[#111]">Subtext / Tagline</label>
                                        <input value={form.content.subtitle} onChange={e => updateContent('subtitle', e.target.value)} className={inputCls} />
                                    </div>
                                )}
                                {form.content.placeholder !== undefined && (
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-bold text-[#111]">Placeholder Text</label>
                                        <input value={form.content.placeholder} onChange={e => updateContent('placeholder', e.target.value)} className={inputCls} />
                                    </div>
                                )}
                                {form.content.description !== undefined && (
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-bold text-[#111]">Description</label>
                                        <textarea rows={3} value={form.content.description} onChange={e => updateContent('description', e.target.value)} className="w-full px-3 py-2 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] bg-white resize-none" />
                                    </div>
                                )}
                                <div className="grid md:grid-cols-2 gap-4">
                                    {form.content.cta_text !== undefined && (
                                        <input placeholder="Button Label" value={form.content.cta_text} onChange={e => updateContent('cta_text', e.target.value)} className={inputCls} />
                                    )}
                                    {form.content.cta_link !== undefined && (
                                        <input placeholder="Button Link" value={form.content.cta_link} onChange={e => updateContent('cta_link', e.target.value)} className={inputCls} />
                                    )}
                                </div>

                                {section.section_type === 'spotlight' && (
                                    <div className="space-y-4 pt-4 border-t border-[#eee]">
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="text-[13px] font-bold text-[#111]">Select Featured Product</label>
                                            <input
                                                type="text"
                                                placeholder="Search products..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className={inputCls + " w-48"}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[250px] overflow-y-auto custom-scrollbar">
                                            {products.filter(p => (p.name || p.product_name || '').toLowerCase().includes(searchQuery.toLowerCase())).map(p => {
                                                const isSelected = form.content.product_id === p.id;
                                                return (
                                                    <button key={p.id}
                                                        onClick={() => {
                                                            updateContent('product_id', p.id);
                                                            // Auto-fill some fields if empty
                                                            if (!form.content.title) updateContent('title', p.name || p.product_name);
                                                            if (!form.content.description) updateContent('description', p.description);
                                                            if (!form.content.image) updateContent('image', p.images?.[0]?.image || p.image);
                                                        }}
                                                        className={cn(
                                                            "flex items-center gap-3 p-2 border rounded-[4px] text-left transition-all",
                                                            isSelected ? "border-[#e77600] bg-[#fff9e6]" : "border-[#ddd] hover:border-[#888]"
                                                        )}>
                                                        <div className="w-10 h-10 bg-white border border-[#eee] rounded-[2px] overflow-hidden flex-shrink-0">
                                                            <img src={getImageUrl(p.images?.[0]?.image || p.image)} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[12px] font-bold text-[#111] truncate">{p.name || p.product_name}</p>
                                                            {(p.batch || p.batch_number) && <p className="text-[9px] text-[#888]">Batch: {p.batch || p.batch_number}</p>}
                                                        </div>
                                                        {isSelected && <div className="ml-auto text-[#e77600]"><CheckCircle size={14} /></div>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {section.section_type === 'promotion' && (
                            <div className="space-y-8">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-bold text-[#111]">Promotion Heading</label>
                                        <input value={form.content.title} onChange={e => updateContent('title', e.target.value)} className={inputCls} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-bold text-[#111]">Discount Percentage (%)</label>
                                        <input type="number" value={form.content.discount_percent} onChange={e => updateContent('discount_percent', parseInt(e.target.value))} className={inputCls} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <MediaField label="Banner Image" value={form.content.image} onChange={(url: string) => updateContent('image', url)} />
                                    </div>
                                    <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-[13px] font-bold text-[#111]">Subheading / Offer Text</label>
                                        <input value={form.content.subtitle} onChange={e => updateContent('subtitle', e.target.value)} className={inputCls} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-bold text-[#111]">Button Label</label>
                                        <input value={form.content.cta_text} onChange={e => updateContent('cta_text', e.target.value)} className={inputCls} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-bold text-[#111]">Button Link</label>
                                        <input value={form.content.cta_link} onChange={e => updateContent('cta_link', e.target.value)} className={inputCls} />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-[#eee]">
                                    <div className="flex-1 mb-2">
                                        <label className="text-[13px] font-bold text-[#111]">Selected Products ({(form.content.product_ids || []).length})</label>
                                        <p className="text-[11px] text-[#565959]">Search and select products to link to this promotion.</p>
                                    </div>

                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search products by name to add..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onFocus={() => setIsDropdownOpen(true)}
                                            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                                            className={inputCls + " w-full bg-[#f9f9f9] border-[#ccc] focus:bg-white focus:border-[#e77600] text-[13px] shadow-inner"}
                                        />

                                        {/* Dropdown Results */}
                                        {isDropdownOpen && (
                                            <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-[#ddd] shadow-[0_15px_30px_rgba(0,0,0,0.15)] rounded-[6px] max-h-[280px] overflow-y-auto z-[60] custom-scrollbar">
                                                {products.filter(p =>
                                                    (p.name || p.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
                                                    !(form.content.product_ids || []).includes(p.id)
                                                ).map(p => (
                                                    <button key={p.id}
                                                        type="button"
                                                        onClick={() => {
                                                            const current = form.content.product_ids || [];
                                                            updateContent('product_ids', [...current, p.id]);
                                                            setSearchQuery(''); // Close dropdown
                                                        }}
                                                        className="w-full flex items-center gap-3 p-3 border-b border-[#f0f0f0] hover:bg-[#f2f8f9] text-left transition-colors last:border-0"
                                                    >
                                                        <div className="w-10 h-10 bg-white border border-[#eee] rounded-[4px] overflow-hidden flex-shrink-0 shadow-sm">
                                                            <img src={getImageUrl(p.images?.[0]?.image || p.image)} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[13px] font-bold text-[#111] truncate leading-tight">{p.name || p.product_name}</p>
                                                            <p className="text-[11px] font-medium text-[#565959] mt-0.5">Rs. {p.selling_price || p.price || p.sale_price}</p>
                                                        </div>
                                                        <div className="text-[#007185] bg-[#007185]/10 px-3 py-1.5 rounded-[4px] text-[11px] font-bold shrink-0 shadow-sm">Add +</div>
                                                    </button>
                                                ))}
                                                {products.filter(p =>
                                                    (p.name || p.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
                                                    !(form.content.product_ids || []).includes(p.id)
                                                ).length === 0 && (
                                                        <div className="p-6 text-center text-[13px] font-medium text-[#888]">No additional products found.</div>
                                                    )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Grid of Selected Products */}
                                    {(form.content.product_ids || []).length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                            {(form.content.product_ids || []).map((id: any) => {
                                                const p = products.find((prod: any) => prod.id === id);
                                                if (!p) return null;
                                                return (
                                                    <div key={p.id} className="flex items-center gap-3 p-2.5 border-2 border-[#e77600]/80 bg-[#fffdfa] shadow-sm rounded-[6px] relative group hover:shadow-md transition-shadow">
                                                        <div className="w-12 h-12 bg-white border border-[#eee] rounded-[4px] overflow-hidden flex-shrink-0">
                                                            <img src={getImageUrl(p.images?.[0]?.image || p.image)} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="min-w-0 flex-1 pr-8">
                                                            <p className="text-[12px] font-bold text-[#111] leading-tight line-clamp-2">{p.name || p.product_name}</p>
                                                            <p className="text-[11px] font-bold text-[#565959] mt-1">Rs. {p.selling_price || p.price || p.sale_price}</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const current = form.content.product_ids || [];
                                                                updateContent('product_ids', current.filter((pid: any) => pid !== p.id));
                                                            }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-white bg-red-50 hover:bg-red-500 p-2 rounded-[6px] transition-all shadow-sm"
                                                            title="Remove product"
                                                        >
                                                            <X size={14} className="stroke-[3px]" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {section.section_type === 'about' && (
                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-[#111]">About Heading</label>
                                    <input value={form.content.title} onChange={e => updateContent('title', e.target.value)} className={inputCls} />
                                </div>
                                <MediaField label="Banner Image" value={form.content.image} onChange={(url: string) => updateContent('image', url)} />
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-[#111]">Our Story</label>
                                    <textarea rows={6} value={form.content.body} onChange={e => updateContent('body', e.target.value)} className="w-full px-3 py-2 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] bg-white resize-none" />
                                </div>
                            </div>
                        )}

                        {section.section_type === 'video' && (
                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-[#111]">Section Title</label>
                                    <input value={form.content.title} onChange={e => updateContent('title', e.target.value)} className={inputCls} />
                                </div>
                                <MediaField label="Video File / URL" value={form.content.url} onChange={(url: string) => updateContent('url', url)} allowVideo={true} />
                            </div>
                        )}

                        {['gallery', 'brands', 'collections', 'social', 'categories'].includes(section.section_type) && (
                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-[#111]">{section.section_type === 'categories' ? 'Section Title' : 'Grid Title'}</label>
                                    <input value={form.content.title} onChange={e => updateContent('title', e.target.value)} className={inputCls} />
                                </div>

                                {section.section_type === 'categories' ? (
                                    <div className="space-y-4 pt-4 border-t border-[#eee]">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[13px] font-bold text-[#111]">Select Categories to Show</label>
                                            <p className="text-[11px] text-[#565959]">Select categories to display as cards in this section.</p>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                                            {categories.map(cat => {
                                                const isSelected = (form.content.items || []).some((item: any) => item.id === cat.id);
                                                return (
                                                    <button key={cat.id}
                                                        onClick={() => {
                                                            const current = form.content.items || [];
                                                            const next = isSelected
                                                                ? current.filter((item: any) => item.id !== cat.id)
                                                                : [...current, { id: cat.id, name: cat.name, image: cat.image }];
                                                            updateContent('items', next);
                                                        }}
                                                        className={cn(
                                                            "flex flex-col items-center gap-2 p-3 border rounded-[4px] text-center transition-all",
                                                            isSelected ? "border-[#e77600] bg-[#fff9e6]" : "border-[#ddd] hover:border-[#888]"
                                                        )}>
                                                        <div className="w-12 h-12 bg-white border border-[#eee] rounded-full overflow-hidden flex-shrink-0">
                                                            <img src={getImageUrl(cat.image)} className="w-full h-full object-cover" />
                                                        </div>
                                                        <p className="text-[11px] font-bold text-[#111] truncate w-full">{cat.name}</p>
                                                        {isSelected && <CheckCircle size={12} className="text-[#e77600]" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-[#eee] pb-2">
                                            <label className="text-[13px] font-bold text-[#111]">Items ({(form.content.items || form.content.logos || []).length})</label>
                                            <button onClick={() => {
                                                const key = form.content.items ? 'items' : 'logos';
                                                const newItem = key === 'items' ? { title: '', image: '', link: '' } : '';
                                                updateContent(key, [...(form.content[key] || []), newItem]);
                                            }} className="text-[12px] font-bold text-indigo-600 hover:underline">+ Add Item</button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {(form.content.items || form.content.logos || []).map((item: any, i: number) => (
                                                <div key={i} className="p-3 bg-[#fcfcfc] border border-[#ddd] rounded-[4px] space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-[#565959]">ITEM {i + 1}</span>
                                                        <button onClick={() => {
                                                            const key = form.content.items ? 'items' : 'logos';
                                                            updateContent(key, form.content[key].filter((_: any, idx: number) => idx !== i));
                                                        }} className="text-red-600 hover:bg-red-50 p-1 rounded-[3px]"><Trash2 size={12} /></button>
                                                    </div>
                                                    {typeof item === 'string' ? (
                                                        <MediaField label="Logo URL" value={item} onChange={(url: string) => { const list = [...form.content.logos]; list[i] = url; updateContent('logos', list); }} />
                                                    ) : (
                                                        <>
                                                            <MediaField label="Image" value={item.image} onChange={(url: string) => { const list = [...form.content.items]; list[i].image = url; updateContent('items', list); }} />
                                                            <input placeholder="Label/Title" value={item.title} onChange={e => { const list = [...form.content.items]; list[i].title = e.target.value; updateContent('items', list); }} className={inputCls + " text-[11px]"} />
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {['features', 'steps', 'stats', 'testimonials', 'faq', 'tabs'].includes(section.section_type) && (
                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-[#111]">Section Title</label>
                                    <input value={form.content.title} onChange={e => updateContent('title', e.target.value)} className={inputCls} />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-[#eee] pb-2">
                                        <label className="text-[13px] font-bold text-[#111]">
                                            {section.section_type === 'stats' ? 'Statistics' :
                                                section.section_type === 'features' ? 'Feature Cards' :
                                                    section.section_type === 'steps' ? 'Process Steps' :
                                                        section.section_type === 'testimonials' ? 'Customer Reviews' : 'List Items'}
                                            ({(form.content.items || form.content.reviews || []).length})
                                        </label>
                                        <button onClick={() => {
                                            const key = form.content.reviews ? 'reviews' : 'items';
                                            const newItem = section.section_type === 'faq' ? { q: '', a: '' } :
                                                section.section_type === 'stats' ? { label: '', value: '' } :
                                                    section.section_type === 'testimonials' ? { name: '', role: '', text: '', rating: 5, image: '' } :
                                                        { title: '', text: '' };
                                            updateContent(key, [...(form.content[key] || []), newItem]);
                                        }} className="text-[12px] font-bold text-indigo-600 hover:underline">+ Add Entry</button>
                                    </div>
                                    <div className="grid gap-3">
                                        {(form.content.items || form.content.reviews || []).map((item: any, i: number) => (
                                            <div key={i} className="p-4 bg-[#fcfcfc] border border-[#ddd] rounded-[4px] space-y-3 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-[#565959] uppercase tracking-widest">Entry {i + 1}</span>
                                                    <button onClick={() => {
                                                        const key = form.content.reviews ? 'reviews' : 'items';
                                                        updateContent(key, form.content[key].filter((_: any, idx: number) => idx !== i));
                                                    }} className="text-red-600 hover:bg-red-50 p-1 rounded-[3px] transition-colors"><Trash2 size={14} /></button>
                                                </div>

                                                {section.section_type === 'testimonials' ? (
                                                    <div className="grid md:grid-cols-2 gap-4">
                                                        <input placeholder="Customer Name" value={item.name || ''} onChange={e => {
                                                            const list = [...form.content.reviews];
                                                            list[i].name = e.target.value;
                                                            updateContent('reviews', list);
                                                        }} className={inputCls} />

                                                        <input placeholder="Role / Tagline" value={item.role || ''} onChange={e => {
                                                            const list = [...form.content.reviews];
                                                            list[i].role = e.target.value;
                                                            updateContent('reviews', list);
                                                        }} className={inputCls} />

                                                        <div className="space-y-1.5">
                                                            <label className="text-[11px] font-bold text-[#111] uppercase tracking-tight">Rating</label>
                                                            <select value={item.rating || 5} onChange={e => {
                                                                const list = [...form.content.reviews];
                                                                list[i].rating = parseInt(e.target.value);
                                                                updateContent('reviews', list);
                                                            }} className={inputCls}>
                                                                {[5, 4, 3, 2, 1].map(num => <option key={num} value={num}>{num} Stars</option>)}
                                                            </select>
                                                        </div>

                                                        <MediaField label="Customer Photo" value={item.image} onChange={(url: string) => {
                                                            const list = [...form.content.reviews];
                                                            list[i].image = url;
                                                            updateContent('reviews', list);
                                                        }} />

                                                        <textarea placeholder="Testimonial Text" rows={3} value={item.text || ''} onChange={e => {
                                                            const list = [...form.content.reviews];
                                                            list[i].text = e.target.value;
                                                            updateContent('reviews', list);
                                                        }} className="md:col-span-2 w-full px-3 py-2 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] bg-white resize-none" />
                                                    </div>
                                                ) : section.section_type === 'stats' ? (
                                                    <div className="grid md:grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <label className="text-[11px] font-bold text-[#565959]">VALUE (e.g. 10k+)</label>
                                                            <input value={item.value} onChange={e => {
                                                                const list = [...form.content.items];
                                                                list[i].value = e.target.value;
                                                                updateContent('items', list);
                                                            }} className={inputCls} />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[11px] font-bold text-[#565959]">LABEL (e.g. Partners)</label>
                                                            <input value={item.label} onChange={e => {
                                                                const list = [...form.content.items];
                                                                list[i].label = e.target.value;
                                                                updateContent('items', list);
                                                            }} className={inputCls} />
                                                        </div>
                                                    </div>
                                                ) : section.section_type === 'faq' ? (
                                                    <div className="space-y-3">
                                                        <input placeholder="Question" value={item.q} onChange={e => {
                                                            const list = [...form.content.items];
                                                            list[i].q = e.target.value;
                                                            updateContent('items', list);
                                                        }} className={inputCls} />
                                                        <textarea placeholder="Answer" rows={2} value={item.a} onChange={e => {
                                                            const list = [...form.content.items];
                                                            list[i].a = e.target.value;
                                                            updateContent('items', list);
                                                        }} className="w-full px-3 py-2 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] bg-white resize-none" />
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        <input placeholder="Title / Step Name" value={item.title} onChange={e => {
                                                            const list = [...form.content.items];
                                                            list[i].title = e.target.value;
                                                            updateContent('items', list);
                                                        }} className={inputCls} />
                                                        <textarea placeholder="Description" rows={2} value={item.text} onChange={e => {
                                                            const list = [...form.content.items];
                                                            list[i].text = e.target.value;
                                                            updateContent('items', list);
                                                        }} className="w-full px-3 py-2 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] bg-white resize-none" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {section.section_type === 'marquee' && (
                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-[#111]">Scrolling Text</label>
                                    <textarea rows={3} value={form.content.text} onChange={e => updateContent('text', e.target.value)} className="w-full px-3 py-2 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] bg-white resize-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-[#111]">Scroll Speed</label>
                                    <select value={form.content.speed || "medium"} onChange={e => updateContent('speed', e.target.value)} className={inputCls}>
                                        <option value="slow">Slow</option>
                                        <option value="medium">Medium</option>
                                        <option value="fast">Fast</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {section.section_type === 'contact' && (
                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-[#111]">Section Title</label>
                                    <input value={form.content.title} onChange={e => updateContent('title', e.target.value)} className={inputCls} />
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-bold text-[#111]">Email Address</label>
                                        <input value={form.content.email} onChange={e => updateContent('email', e.target.value)} className={inputCls} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-bold text-[#111]">Phone Number</label>
                                        <input value={form.content.phone} onChange={e => updateContent('phone', e.target.value)} className={inputCls} />
                                    </div>
                                    <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-[13px] font-bold text-[#111]">Physical Address</label>
                                        <textarea rows={2} value={form.content.address} onChange={e => updateContent('address', e.target.value)} className="w-full px-3 py-2 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] bg-white resize-none" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {section.section_type === 'map' && (
                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-[#111]">Section Title</label>
                                    <input value={form.content.title} onChange={e => updateContent('title', e.target.value)} className={inputCls} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-[#111]">Google Maps Iframe URL / Embed Code</label>
                                    <textarea
                                        rows={4}
                                        placeholder="Paste the 'src' URL or the entire <iframe> embed code from Google Maps..."
                                        value={form.content.iframe_url}
                                        onChange={e => {
                                            let val = e.target.value;
                                            // Auto-extract src from iframe tag if present
                                            if (val.includes('<iframe')) {
                                                const match = val.match(/src="([^"]+)"/);
                                                if (match && match[1]) val = match[1];
                                            }
                                            updateContent('iframe_url', val);
                                        }}
                                        className="w-full px-3 py-2 border border-[#888c8e] rounded-[3px] text-[11px] font-mono outline-none focus:border-[#e77600] bg-white resize-none"
                                    />
                                    <p className="text-[10px] text-slate-400 italic">Go to Google Maps &gt; Share &gt; Embed a map &gt; Copy HTML and paste it here.</p>
                                </div>
                            </div>
                        )}

                        {section.section_type === 'banner_split' && (
                            <div className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-bold text-[#111]">Heading</label>
                                            <input value={form.content.title} onChange={e => updateContent('title', e.target.value)} className={inputCls} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-bold text-[#111]">Body Text</label>
                                            <textarea rows={4} value={form.content.body} onChange={e => updateContent('body', e.target.value)} className="w-full px-3 py-2 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] bg-white resize-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <MediaField label="Banner Image" value={form.content.image} onChange={(url: string) => updateContent('image', url)} />
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={form.content.reversed} onChange={e => updateContent('reversed', e.target.checked)} className="rounded text-[#e77600]" />
                                            <span className="text-[13px] font-bold text-[#111]">Reverse Layout (Image on Right)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {section.section_type === 'html' && (
                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-[#111]">Internal Description</label>
                                    <input value={form.content.title} onChange={e => updateContent('title', e.target.value)} className={inputCls} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-[#111]">Custom HTML / Script Code</label>
                                    <textarea rows={10} value={form.content.code} onChange={e => updateContent('code', e.target.value)} className="w-full font-mono text-[12px] px-3 py-2 border border-[#888c8e] rounded-[3px] outline-none focus:border-[#e77600] bg-[#1e1e1e] text-green-400 resize-none" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-[#f7f8fa] border-t border-[#ddd] px-8 py-4 flex justify-between items-center">
                    <button onClick={onClose} className="text-[13px] font-bold text-indigo-600 hover:underline">Dismiss Changes</button>
                    <div className="flex gap-2">
                        <AmazonBtn variant="secondary" onClick={onClose}>Cancel</AmazonBtn>
                        <AmazonBtn onClick={save} loading={saving} className="min-w-[140px]">Update Section</AmazonBtn>
                    </div>
                </div>
            </div >
        </div >
    );
}
