'use client';
import { useState } from 'react';
import { Save, Loader2, Phone, Mail, MapPin, MessageCircle, Instagram, Youtube, RotateCcw } from 'lucide-react';
import { SiteSettings } from '@/services/cms.service';

interface Props { 
    settings: SiteSettings; 
    onSave: (d: Partial<SiteSettings>) => Promise<void>; 
    saving: boolean; 
}

// ── AMAZON STYLE COMPONENTS ──
const AmazonBtn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[35px] px-8 rounded-[3px] text-[13px] font-medium border shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = "w-full h-[35px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";

export default function ContactTab({ settings, onSave, saving }: Props) {
    const [form, setForm] = useState({ ...settings });

    const Field = ({ label, field, icon: Icon, type = 'text', placeholder = '' }: {
        label: string; field: keyof SiteSettings; icon?: any; type?: string; placeholder?: string;
    }) => (
        <div className="space-y-1.5 text-left">
            <label className="text-[13px] font-bold text-[#111]">{label}</label>
            <div className="relative">
                {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
                <input type={type} value={(form[field] as string) || ''}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className={`${inputCls} ${Icon ? 'pl-9' : ''}`} />
            </div>
        </div>
    );

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
            
            {/* Business Contact */}
            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left">
                <div className="bg-[#f7f8fa] border-b border-[#ddd] px-6 py-3">
                    <h3 className="font-bold text-[#111] text-[15px]">Business Contact Details</h3>
                </div>
                <div className="p-6 grid md:grid-cols-2 gap-6">
                    <Field label="WhatsApp Primary" field="whatsapp_number" icon={MessageCircle} placeholder="+923001234567" />
                    <Field label="Phone Support" field="phone_number" icon={Phone} placeholder="+92-42-1234567" />
                    <Field label="Business Email" field="contact_email" icon={Mail} type="email" placeholder="info@alqavihub.com" />
                    
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[13px] font-bold text-[#111]">Business Address</label>
                        <div className="relative">
                            <MapPin size={14} className="absolute left-3 top-3 text-slate-400" />
                            <textarea rows={2} value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                placeholder="Shop #123, Main Market, Lahore, Pakistan"
                                className="w-full min-h-[60px] px-9 py-2 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2_rgba(228,121,17,0.5)] bg-white transition-all resize-none" />
                        </div>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[13px] font-bold text-[#111]">Google Maps Embed Link</label>
                        <input type="url" value={form.google_maps_url || ''} onChange={e => setForm(f => ({ ...f, google_maps_url: e.target.value }))}
                            placeholder="https://maps.google.com/embed?..."
                            className={inputCls} />
                    </div>
                </div>
            </div>

            {/* Social Links */}
            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left">
                <div className="bg-[#f7f8fa] border-b border-[#ddd] px-6 py-3">
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

            {/* Save Actions */}
            <div className="bg-white border border-[#ddd] rounded-[4px] p-6 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3 text-slate-400">
                    <RotateCcw size={18} />
                    <p className="text-[13px] font-medium italic text-slate-500">Updates are applied globally across the customer storefront.</p>
                </div>
                <AmazonBtn onClick={() => onSave(form)} loading={saving}>
                    Update Business Info
                </AmazonBtn>
            </div>
        </div>
    );
}
