'use client';
import { useState, useEffect } from 'react';
import { Save, Loader2, Globe, Search, BarChart3, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
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
export default function SeoTab({ settings, onSave, saving }: Props) {
    const [form, setForm] = useState({ ...settings });

    useEffect(() => {
        setForm({ ...settings });
    }, [settings]);

    const titleLen = (form.meta_title || '').length;
    const descLen = (form.meta_description || '').length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h1 className="text-[21px] font-bold text-[#111]">SEO & Search Settings</h1>
            </div>
            
            {/* Search Preview */}
            <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm overflow-hidden text-left">
                <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-6 py-3">
                    <h3 className="font-bold text-[#111] text-[15px] flex items-center gap-2">
                        <Search size={16} className="text-[#007185]" /> 
                        Google Search Appearance
                    </h3>
                </div>
                <div className="p-4 md:p-8 flex items-center justify-center bg-[#f0f2f2]/30 border-b border-[#e2e8f0]">
                    <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-4 md:p-6 w-full max-w-xl font-sans">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-6 h-6 rounded-full bg-[#f0f2f2] flex items-center justify-center">
                                <Globe size={12} className="text-[#64748B]" />
                            </div>
                            <span className="text-[12px] text-[#202124]">https://alqavihub.com › <span className="text-[#5f6368]">shop</span></span>
                        </div>
                        <p className="text-[#1a0dab] text-xl font-normal leading-tight hover:underline cursor-pointer line-clamp-1 mb-1">
                            {form.meta_title || 'Al-Qavi Hub | Luxury Cosmetics'}
                        </p>
                        <p className="text-[#4d5156] text-sm leading-relaxed line-clamp-2">
                            {form.meta_description || 'No meta description provided. Google will automatically crawl your site content.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Meta Tags */}
            <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm overflow-hidden text-left">
                <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-6 py-3">
                    <h3 className="font-bold text-[#111] text-[15px]">Meta Data & Social Tags</h3>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[13px] font-bold text-[#111]">SEO Page Title</label>
                            <span className={`text-[10px] font-bold ${titleLen > 60 ? 'text-red-600' : 'text-[#64748B]'}`}>
                                {titleLen}/60 characters
                            </span>
                        </div>
                        <input type="text" value={form.meta_title || ''} onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))}
                            placeholder="e.g. Al-Qavi Hub | Professional Makeup & Skincare"
                            className={inputCls} />
                        <p className="text-[11px] text-[#64748B]">Appears in browser tabs and search results. Keep it between 50-60 characters.</p>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[13px] font-bold text-[#111]">Meta Description</label>
                            <span className={`text-[10px] font-bold ${descLen > 160 ? 'text-red-600' : 'text-[#64748B]'}`}>
                                {descLen}/160 characters
                            </span>
                        </div>
                        <textarea rows={3} value={form.meta_description || ''} onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))}
                            placeholder="Briefly describe what your store sells..."
                            className="w-full min-h-[80px] px-3 py-2 border border-[#cbd5e1] rounded-lg text-[13px] outline-none focus:border-[#F59E0B] focus:shadow-[0_0_3px_2_rgba(228,121,17,0.5)] bg-white transition-all resize-none" />
                        <p className="text-[11px] text-[#64748B]">A short summary of your page. Keep it between 120-160 characters.</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-[#111]">Meta Keywords</label>
                        <input type="text" value={form.meta_keywords || ''} onChange={e => setForm(f => ({ ...f, meta_keywords: e.target.value }))}
                            placeholder="cosmetics, beauty, pakistan, makeup"
                            className={inputCls} />
                        <p className="text-[11px] text-[#64748B]">Separate keywords with commas. Used by secondary search engines.</p>
                    </div>
                </div>
            </div>

            {/* Tracking */}
            <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm overflow-hidden text-left">
                <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-6 py-3">
                    <h3 className="font-bold text-[#111] text-[15px] flex items-center gap-2">
                        <BarChart3 size={16} className="text-amber-600" />
                        Tracking & Analytics
                    </h3>
                </div>
                <div className="p-6 grid md:grid-cols-2 gap-8">
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-[#111]">Google Analytics ID (G-XXXX)</label>
                        <input type="text" value={form.google_analytics_id || ''} onChange={e => setForm(f => ({ ...f, google_analytics_id: e.target.value }))}
                            placeholder="G-XXXXXX"
                            className={inputCls + " font-mono"} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-[#111]">Facebook Pixel ID</label>
                        <input type="text" value={form.pixel_id || ''} onChange={e => setForm(f => ({ ...f, pixel_id: e.target.value }))}
                            placeholder="1234567890"
                            className={inputCls + " font-mono"} />
                    </div>
                </div>
            </div>

            {/* Footer Aligned Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-[#e2e8f0] rounded-lg p-4 md:p-6 shadow-sm">
                <div className="flex items-center gap-3 text-slate-400">
                    <RotateCcw size={18} />
                    <p className="text-[13px] font-medium italic">SEO changes may take a few days to reflect in search engines.</p>
                </div>
                <Btn onClick={() => onSave(form)} loading={saving} className="w-full sm:w-auto min-w-[180px] h-[35px] justify-center">
                    Sync Meta Settings
                </Btn>
            </div>
        </div>
    );
}
