'use client';
import { useState, useEffect } from 'react';
import { Save, Loader2, Phone, Mail, MapPin, MessageCircle, Instagram, Youtube, RotateCcw } from 'lucide-react';
import { SiteSettings } from '@/services/cms.service';
import { ui } from '@/components/admin/ui';

interface Props { 
    settings: SiteSettings; 
    onSave: (d: Partial<SiteSettings>) => Promise<void>; 
    saving: boolean; 
}

// ── AMAZON STYLE COMPONENTS ──
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-[#F59E0B] border-[#F59E0B] hover:bg-[#D97706] text-[#0F172A]',
        secondary: 'bg-gradient-to-b from-[#f8fafc] to-[#e7e9ec] border-[#cbd5e1] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0F172A]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[35px] px-8 rounded-lg text-[13px] font-medium border shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = ui.inputBase.replace('h-10', 'h-9');
const Field = ({ label, value, onChange, icon: Icon, type = 'text', placeholder = '' }: {
    label: string; value: string; onChange: (v: string) => void; icon?: any; type?: string; placeholder?: string;
}) => (
    <div className="space-y-1.5 text-left">
        <label className="text-[13px] font-bold text-[#111]">{label}</label>
        <div className="relative">
            {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
            <input type={type} value={value || ''}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={`${inputCls} ${Icon ? 'pl-9' : ''}`} />
        </div>
    </div>
);

export default function ContactTab({ settings, onSave, saving }: Props) {
    const [form, setForm] = useState({ ...settings });

    useEffect(() => {
        setForm({ ...settings });
    }, [settings]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-[21px] font-bold text-[#111]">Business Information</h1>
            </div>
            
            {/* Business Contact */}
            <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm overflow-hidden text-left">
                <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-6 py-3">
                    <h3 className="font-bold text-[#111] text-[15px]">Business Contact Details</h3>
                </div>
                <div className="p-6 grid md:grid-cols-2 gap-6">
                    <Field label="WhatsApp Primary" value={form.whatsapp_number || ''} onChange={v => setForm(f => ({ ...f, whatsapp_number: v }))} icon={MessageCircle} placeholder="+923001234567" />
                    <Field label="Phone Support" value={form.phone_number || ''} onChange={v => setForm(f => ({ ...f, phone_number: v }))} icon={Phone} placeholder="+92-42-1234567" />
                    <Field label="Business Email" value={form.contact_email || ''} onChange={v => setForm(f => ({ ...f, contact_email: v }))} icon={Mail} type="email" placeholder="info@alqavihub.com" />
                    
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[13px] font-bold text-[#111]">Business Address</label>
                        <div className="relative">
                            <MapPin size={14} className="absolute left-3 top-3 text-slate-400" />
                            <textarea rows={2} value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                placeholder="Shop #123, Main Market, Lahore, Pakistan"
                                className="w-full min-h-[60px] px-9 py-2 border border-[#cbd5e1] rounded-lg text-[13px] outline-none focus:border-[#F59E0B] focus:shadow-[0_0_3px_2_rgba(228,121,17,0.5)] bg-white transition-all resize-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Social Links */}
            <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm overflow-hidden text-left">
                <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-6 py-3">
                    <h3 className="font-bold text-[#111] text-[15px]">Social Media Presence</h3>
                </div>
                <div className="p-6 grid md:grid-cols-2 gap-6">
                    {[
                        { label: 'Instagram Profile', field: 'instagram_url' as keyof SiteSettings, placeholder: 'https://instagram.com/...' },
                        { label: 'Facebook Page', field: 'facebook_url' as keyof SiteSettings, placeholder: 'https://facebook.com/...' },
                        { label: 'TikTok Account', field: 'tiktok_url' as keyof SiteSettings, placeholder: 'https://tiktok.com/@...' },
                        { label: 'YouTube Channel', field: 'youtube_url' as keyof SiteSettings, placeholder: 'https://youtube.com/...' },
                    ].map(({ label, field, placeholder }) => (
                        <div key={field} className="space-y-1.5">
                            <label className="text-[13px] font-bold text-[#111]">{label}</label>
                            <input type="url" value={(form[field] as string) || ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                                placeholder={placeholder}
                                className={inputCls} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Aligned Action */}
            <div className="flex items-center justify-between bg-white border border-[#e2e8f0] rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-3 text-slate-400">
                    <RotateCcw size={18} />
                    <p className="text-[13px] font-medium italic">Updates are applied globally across the customer storefront.</p>
                </div>
                <Btn onClick={() => onSave(form)} loading={saving} className="min-w-[180px] h-[35px]">
                    Update Business Info
                </Btn>
            </div>
        </div>
    );
}
