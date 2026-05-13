'use client';
import { useState } from 'react';
import { Plus, Eye, EyeOff, Trash2, Copy, GripVertical, ChevronDown, ChevronUp, ChevronRight, Edit3, X, Save, Loader2, Layout, Settings, Image as ImageIcon, CheckCircle } from 'lucide-react';
import cmsService, { WebsiteSection } from '@/services/cms.service';
import toast from 'react-hot-toast';
import { cn, getImageUrl } from '@/lib/utils';
import MediaPickerModal from '../components/MediaPickerModal';

const SECTION_TYPES = [
    { type: 'hero', label: 'Hero / Slider', icon: '🎯', desc: 'Main banner with slides' },
    { type: 'products', label: 'Product Grid', icon: '🛍️', desc: 'Showcase products' },
    { type: 'search_hero', label: 'Search Hero', icon: '🔍', desc: 'Large centered search bar' },
    { type: 'spotlight', label: 'Product Spotlight', icon: '🔦', desc: 'Featured single item' },
    { type: 'model_3d', label: '3D Product Viewer', icon: '📦', desc: 'Interactive 3D model' },
    { type: 'brands', label: 'Brand Logos', icon: '🏢', desc: 'Marquee of partners' },
    { type: 'categories', label: 'Categories', icon: '🗂️', desc: 'Category cards' },
    { type: 'collections', label: 'Collection Grid', icon: '🎨', desc: 'Visual collection cards' },
    { type: 'about', label: 'About / Text', icon: '📝', desc: 'Rich text block' },
    { type: 'parallax', label: 'Parallax Banner', icon: '🌌', desc: 'Scroll-effect background' },
    { type: 'features', label: 'Core Features', icon: '✨', desc: 'Icon with text boxes' },
    { type: 'steps', label: 'Process Steps', icon: '🔢', desc: '1-2-3 How it works' },
    { type: 'quiz', label: 'Product Finder Quiz', icon: '🧪', desc: 'Help users choose products' },
    { type: 'stats', label: 'Live Statistics', icon: '📊', desc: 'Animated counters' },
    { type: 'testimonials', label: 'Reviews', icon: '⭐', desc: 'Customer testimonials' },
    { type: 'faq', label: 'FAQ', icon: '❓', desc: 'Accordion questions' },
    { type: 'newsletter', label: 'Newsletter', icon: '📧', desc: 'Email signup' },
    { type: 'gallery', label: 'Gallery', icon: '🖼️', desc: 'Media grid' },
    { type: 'video', label: 'Video', icon: '🎬', desc: 'Video embed' },
    { type: 'promotion', label: 'Promotion', icon: '🏷️', desc: 'Promo banner' },
    { type: 'countdown', label: 'Countdown Timer', icon: '⏰', desc: 'Flash sale clock' },
    { type: 'banner_split', label: 'Split Banner', icon: '🌓', desc: '50/50 Image & Text' },
    { type: 'marquee', label: 'Scrolling Text', icon: '↔️', desc: 'Moving announcement' },
    { type: 'comparison', label: 'Before/After', icon: '🔄', desc: 'Image comparison slider' },
    { type: 'tabs', label: 'Tabbed Content', icon: '📑', desc: 'Switchable info blocks' },
    { type: 'contact', label: 'Contact Info', icon: '📞', desc: 'Location & Phone' },
    { type: 'map', label: 'Store Map', icon: '🗺️', desc: 'Interactive Google Map' },
    { type: 'social', label: 'Social Feed', icon: '📱', desc: 'Instagram grid' },
    { type: 'pricing', label: 'Pricing Table', icon: '💰', desc: 'Service plan cards' },
    { type: 'html', label: 'Custom HTML', icon: '💻', desc: 'Embed custom scripts' },
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
    promotion: { title: 'Special Offer', subtitle: '50% Off Selected Items', cta_text: 'Grab Deal', cta_link: '/sale' },
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

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";

interface Props {
    sections: WebsiteSection[];
    setSections: (s: WebsiteSection[]) => void;
    products?: any[];
    categories?: any[];
}

export default function SectionsTab({ sections, setSections, products = [], categories = [] }: Props) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState<number | null>(null);

    const addSection = async (type: string) => {
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
        if (!confirm('Permanently remove this layout section?')) return;
        try {
            await cmsService.deleteSection(id);
            setSections(sections.filter(s => s.id !== id));
            toast.success('Deleted');
        } catch { toast.error('Delete failed'); }
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
            <div className="bg-white border border-[#ddd] rounded-[4px] px-6 py-4 flex items-center justify-between shadow-sm">
                <div>
                    <h3 className="text-[15px] font-bold text-[#111]">Landing Page Layout Builder</h3>
                    <p className="text-[12px] text-[#565959]">Manage the sequence and content of sections on your storefront.</p>
                </div>
                <AmazonBtn onClick={() => setShowAddModal(true)}>
                    <Plus size={16} /> Add Page Section
                </AmazonBtn>
            </div>

            <div className="bg-[#f7f8fa] border border-[#ddd] rounded-[4px] p-0 shadow-sm overflow-hidden">
                <div className="grid grid-cols-12 px-6 py-3 border-b border-[#ddd] text-[11px] font-bold text-[#565959] uppercase tracking-wider bg-[#f7f8fa]">
                    <div className="col-span-1">Order</div>
                    <div className="col-span-1">Type</div>
                    <div className="col-span-6">Section Name & Details</div>
                    <div className="col-span-2">Visibility</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>

                <div className="bg-white divide-y divide-[#eee]">
                    {sections.length === 0 ? (
                        <div className="p-16 text-center text-[#888]">
                            <p className="text-[14px]">No layout sections defined yet.</p>
                            <button onClick={() => setShowAddModal(true)} className="text-[#007185] font-bold hover:underline mt-2">Get started by adding a hero section</button>
                        </div>
                    ) : (
                        sections.map((s: WebsiteSection, idx: number) => {
                            const meta = SECTION_TYPES.find(t => t.type === s.section_type);
                            return (
                                <div key={s.id}
                                    draggable
                                    onDragStart={(e) => {
                                        setDragIndex(idx);
                                        e.dataTransfer.effectAllowed = 'move';
                                        // Create a slight delay for the ghost image effect
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
                                        'grid grid-cols-12 items-center px-6 py-4 hover:bg-[#fcfcfc] transition-all group relative border-l-4 border-transparent',
                                        !s.is_visible && 'opacity-60 bg-slate-50/50',
                                        dragIndex === idx && 'bg-blue-50 border-blue-500 shadow-inner scale-[0.98]',
                                        dragOverIndex === idx && dragIndex !== idx && 'border-b-blue-400 bg-slate-50'
                                    )}>

                                    {/* Drop Indicator */}
                                    {dragOverIndex === idx && dragIndex !== idx && (
                                        <div className={cn(
                                            "absolute left-0 w-full h-1 bg-[#13B0D1] z-50 rounded-full animate-pulse",
                                            dragIndex! < idx ? "bottom-0" : "top-0"
                                        )} />
                                    )}

                                    <div className="col-span-1 flex items-center gap-1.5">
                                        <div className="cursor-grab active:cursor-grabbing text-[#ddd] group-hover:text-[#aaa]">
                                            <GripVertical size={14} />
                                        </div>
                                        <div className="flex flex-col -space-y-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }}
                                                disabled={idx === 0}
                                                className="text-[#999] hover:text-[#007185] disabled:opacity-0 transition-all active:scale-125"
                                            >
                                                <ChevronUp size={16} strokeWidth={3} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }}
                                                disabled={idx === sections.length - 1}
                                                className="text-[#999] hover:text-[#007185] disabled:opacity-0 transition-all active:scale-125"
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
                                        <button onClick={() => toggleVisibility(s)}
                                            className={cn(
                                                "text-[11px] font-bold uppercase px-2.5 py-1 rounded-full border",
                                                s.is_visible
                                                    ? "text-green-700 bg-green-50 border-green-200"
                                                    : "text-[#565959] bg-[#eee] border-[#ddd]"
                                            )}>
                                            {s.is_visible ? 'Live' : 'Hidden'}
                                        </button>
                                    </div>

                                    <div className="col-span-2 flex items-center justify-end gap-2">
                                        <button onClick={() => setEditingId(s.id!)} className="text-[12px] font-bold text-[#007185] hover:underline">Edit</button>
                                        <span className="text-[#ddd]">|</span>
                                        <button onClick={() => deleteSection(s.id!)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-[#000000a0] z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[4px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-[#f7f8fa] border-b border-[#ddd] px-6 py-4 flex items-center justify-between">
                            <h3 className="font-bold text-[#111] text-[17px]">Select Section Type</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-[#565959] hover:text-[#111]"><X size={20} /></button>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {SECTION_TYPES.map(t => (
                                <button key={t.type} onClick={() => addSection(t.type)}
                                    className="flex items-center gap-4 p-4 border border-[#ddd] rounded-[4px] hover:border-[#e77600] hover:bg-[#fff9e6] transition-all group text-left">
                                    <span className="text-2xl w-10 h-10 bg-[#f7f8fa] flex items-center justify-center border border-[#eee] rounded-[4px]">{t.icon}</span>
                                    <div>
                                        <p className="font-bold text-[#111] text-[14px]">{t.label}</p>
                                        <p className="text-[11px] text-[#565959]">{t.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="bg-[#f7f8fa] border-t border-[#ddd] px-6 py-4 flex justify-end">
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
        </div>
    );
}

function SectionEditor({ section, onSave, onClose, products = [], categories = [] }: { section: WebsiteSection; onSave: (d: any) => Promise<void>; onClose: () => void; products?: any[]; categories?: any[] }) {
    const [form, setForm] = useState({ ...section });
    const [saving, setSaving] = useState(false);
    const [picker, setPicker] = useState<{ open: boolean; onSelect: (url: string) => void; allowVideo?: boolean }>({ open: false, onSelect: () => { } });
    const [searchQuery, setSearchQuery] = useState('');

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
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 bg-white border border-[#ddd] rounded-[2px] overflow-hidden shadow-sm">
                            <img src={getImageUrl(value)} className="h-full w-full object-cover" />
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
            <div className="bg-white rounded-[4px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="bg-[#f7f8fa] border-b border-[#ddd] px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white border border-[#ddd] rounded-[4px] flex items-center justify-center">
                            {SECTION_TYPES.find(t => t.type === section.section_type)?.icon}
                        </div>
                        <h3 className="font-bold text-[#111] text-[17px]">Edit {section.name}</h3>
                    </div>
                    <button onClick={onClose} className="text-[#565959] hover:text-[#111]"><X size={20} /></button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar text-left">
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
                                        <button onClick={() => updateContent('slides', [...(form.content.slides || []), { title: 'New Slide', subtitle: '', description: '', media_type: 'image', image: '' }])}
                                            className="text-[12px] font-bold text-[#007185] hover:underline">+ Add Slide</button>
                                    </div>
                                    <div className="space-y-4">
                                        {(form.content.slides || []).map((s: any, i: number) => (
                                            <div key={i} className="p-4 bg-[#fcfcfc] border border-[#ddd] rounded-[4px] space-y-4 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-bold text-[#565959] uppercase">Slide {i + 1}</span>
                                                    <button onClick={() => updateContent('slides', form.content.slides.filter((_: any, idx: number) => idx !== i))} className="text-red-600 hover:bg-red-50 p-1.5 rounded-[3px]"><Trash2 size={14} /></button>
                                                </div>
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <MediaField label="Slide Image" value={s.image} onChange={(url: string) => { const list = [...form.content.slides]; list[i].image = url; updateContent('slides', list); }} />
                                                    <input placeholder="Slide Title" value={s.title} onChange={e => { const list = [...form.content.slides]; list[i].title = e.target.value; updateContent('slides', list); }} className={inputCls} />
                                                    <input placeholder="Subtitle" value={s.subtitle} onChange={e => { const list = [...form.content.slides]; list[i].subtitle = e.target.value; updateContent('slides', list); }} className={inputCls} />
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
                                            <option value="billboard">Hero Billboard</option>
                                            <option value="carousel">Product Carousel</option>
                                            <option value="list">List View</option>
                                            <option value="minimal">Minimal Grid</option>
                                            <option value="split">Banner & Grid</option>
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

                                <div className="space-y-4 pt-4 border-t border-[#eee]">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <label className="text-[13px] font-bold text-[#111]">Selected Products ({(form.content.product_ids || []).length})</label>
                                            <p className="text-[11px] text-[#565959]">Select specific products to display in this grid.</p>
                                        </div>
                                        <div className="w-48 relative">
                                            <input
                                                type="text"
                                                placeholder="Search products..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className={inputCls + " pr-8"}
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[#888]">
                                                <Settings size={12} className="animate-spin-slow" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                                        {products.filter(p => (p.name || p.product_name || '').toLowerCase().includes(searchQuery.toLowerCase())).map(p => {
                                            const isSelected = (form.content.product_ids || []).includes(p.id);
                                            return (
                                                <button key={p.id}
                                                    onClick={() => {
                                                        const current = form.content.product_ids || [];
                                                        const next = isSelected ? current.filter((id: any) => id !== p.id) : [...current, p.id];
                                                        updateContent('product_ids', next);
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
                                                        <p className="text-[10px] text-[#565959]">
                                                            Rs. {p.selling_price || p.price || p.sale_price}
                                                            {(p.batch || p.batch_number) && <span className="ml-2 text-[9px] bg-slate-100 px-1 rounded text-[#888]">Batch: {p.batch || p.batch_number}</span>}
                                                        </p>
                                                    </div>
                                                    {isSelected && <div className="ml-auto text-[#e77600]"><CheckCircle size={14} /></div>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {['search_hero', 'spotlight', 'parallax', 'newsletter', 'promotion'].includes(section.section_type) && (
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
                                            }} className="text-[12px] font-bold text-[#007185] hover:underline">+ Add Item</button>
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
                                        <label className="text-[13px] font-bold text-[#111]">List Items ({(form.content.items || form.content.reviews || form.content.plans || []).length})</label>
                                        <button onClick={() => {
                                            const key = form.content.items ? 'items' : (form.content.reviews ? 'reviews' : 'plans');
                                            const newItem = section.section_type === 'faq' ? { q: '', a: '' } : { title: '', text: '' };
                                            updateContent(key, [...(form.content[key] || []), newItem]);
                                        }} className="text-[12px] font-bold text-[#007185] hover:underline">+ Add Entry</button>
                                    </div>
                                    <div className="grid gap-3">
                                        {(form.content.items || form.content.reviews || form.content.plans || []).map((item: any, i: number) => (
                                            <div key={i} className="p-4 bg-[#fcfcfc] border border-[#ddd] rounded-[4px] space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-[#565959]">ENTRY {i + 1}</span>
                                                    <button onClick={() => {
                                                        const key = form.content.items ? 'items' : (form.content.reviews ? 'reviews' : 'plans');
                                                        updateContent(key, form.content[key].filter((_: any, idx: number) => idx !== i));
                                                    }} className="text-red-600 hover:bg-red-50 p-1 rounded-[3px]"><Trash2 size={14} /></button>
                                                </div>
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <input placeholder="Title / Label" value={item.title || item.name || item.q || ''} onChange={e => {
                                                        const key = form.content.items ? 'items' : (form.content.reviews ? 'reviews' : 'plans');
                                                        const list = [...form.content[key]];
                                                        if (item.title !== undefined) list[i].title = e.target.value;
                                                        else if (item.name !== undefined) list[i].name = e.target.value;
                                                        else if (item.q !== undefined) list[i].q = e.target.value;
                                                        updateContent(key, list);
                                                    }} className={inputCls} />
                                                    <textarea placeholder="Description / Content" rows={2} value={item.text || item.content || item.a || ''} onChange={e => {
                                                        const key = form.content.items ? 'items' : (form.content.reviews ? 'reviews' : 'plans');
                                                        const list = [...form.content[key]];
                                                        if (item.text !== undefined) list[i].text = e.target.value;
                                                        else if (item.content !== undefined) list[i].content = e.target.value;
                                                        else if (item.a !== undefined) list[i].a = e.target.value;
                                                        updateContent(key, list);
                                                    }} className="md:col-span-2 w-full px-3 py-2 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] bg-white resize-none" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
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
                    <button onClick={onClose} className="text-[13px] font-bold text-[#007185] hover:underline">Dismiss Changes</button>
                    <div className="flex gap-2">
                        <AmazonBtn variant="secondary" onClick={onClose}>Cancel</AmazonBtn>
                        <AmazonBtn onClick={save} loading={saving} className="min-w-[140px]">Update Section</AmazonBtn>
                    </div>
                </div>
            </div>
        </div>
    );
}
