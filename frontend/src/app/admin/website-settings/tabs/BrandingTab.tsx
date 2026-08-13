'use client';
import { useState, useEffect } from 'react';
import { Save, RefreshCw, Upload, RotateCcw, Image as ImageIcon, Search, Trash2, CheckCircle2, ChevronDown, History } from 'lucide-react';
import { SiteSettings } from '@/services/cms.service';
import cmsService from '@/services/cms.service';
import toast from 'react-hot-toast';
import { cn, getImageUrl } from '@/lib/utils';
import MediaPickerModal from '../components/MediaPickerModal';
import { ui } from '@/components/admin/ui';

interface Props {
    settings: SiteSettings;
    onSave: (data: Partial<SiteSettings>) => Promise<void>;
    saving: boolean;
    setSettings?: (s: SiteSettings) => void;
}

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - ALIGNED WITH PURCHASES PAGE
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-[#13B0D1] border-[#0E8CA8] hover:bg-[#0E8CA8] text-[#0F172A]',
        secondary: 'bg-gradient-to-b from-[#f8fafc] to-[#e7e9ec] border-[#cbd5e1] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0F172A]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-lg text-[13px] font-medium border shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = ui.inputBase.replace('h-10', 'h-9');
export default function BrandingTab({ settings, onSave, saving, setSettings }: Props) {
    const [form, setForm] = useState({ ...settings });
    const [uploading, setUploading] = useState<string | null>(null);
    const [picker, setPicker] = useState<{ open: boolean; field: string } | null>(null);

    // Sync form with settings prop updates
    useEffect(() => {
        setForm({ ...settings });
    }, [settings]);

    const handleSelectMedia = async (url: string) => {
        if (!picker) return;
        const field = picker.field;
        try {
            const updated = await cmsService.updateSettings({ [field]: url });
            setForm(f => ({ ...f, [field]: url }));
            setSettings?.(updated);
            toast.success('Updated ' + field);
        } catch { toast.error('Failed to update'); }
        finally { setPicker(null); }
    };

    const handleUploadBranding = async (field: string, file: File) => {
        setUploading(field);
        try {
            const updated = await cmsService.uploadBranding(field, file);
            setForm(f => ({ ...f, [field]: updated[field] }));
            setSettings?.(updated);
            toast.success('Uploaded ' + field);
        } catch { toast.error('Upload failed'); }
        finally { setUploading(null); }
    };

    const BrandingUpload = ({ field, label, desc }: { field: keyof SiteSettings; label: string; desc: string }) => (
        <div className="space-y-1.5 text-left">
            <label className="text-[13px] font-bold text-[#111]">{label}</label>
            <div className="relative border border-[#e2e8f0] rounded-lg bg-white p-4 flex flex-col gap-3 shadow-sm">
                <div className="relative h-24 w-full bg-[#f8fafc] border border-[#eee] rounded-lg flex items-center justify-center p-2 group overflow-hidden">
                    {form[field] ? (
                        <img 
                            key={form[field] as string}
                            src={getImageUrl(form[field] as string)} 
                            alt={label} 
                            className="h-full w-full object-contain"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.src.includes('v=')) return; // Only retry our own local media
                                if (target.src.includes('localhost')) {
                                    target.src = target.src.replace('localhost', '127.0.0.1');
                                } else if (target.src.includes('127.0.0.1')) {
                                    target.src = target.src.replace('127.0.0.1', 'localhost');
                                }
                            }}
                        />
                    ) : (
                        <ImageIcon size={32} className="text-[#e2e8f0]" />
                    )}
                    
                    {/* Hover Quick Actions */}
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={() => setPicker({ open: true, field: field as string })} 
                            className="p-1.5 bg-white border border-[#e2e8f0] rounded-full shadow-md hover:bg-[#f8fafc] text-[#64748B]">
                            <Search size={14} />
                        </button>
                        <button onClick={() => document.getElementById(`upload_${field}`)?.click()}
                            className="p-1.5 bg-white border border-[#e2e8f0] rounded-full shadow-md hover:bg-[#f8fafc] text-[#64748B]">
                            <Upload size={14} />
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Btn variant="secondary" className="px-1" onClick={() => setPicker({ open: true, field: field as string })}>
                        Library
                    </Btn>
                    <Btn variant="secondary" className="px-1" onClick={() => document.getElementById(`upload_${field}`)?.click()} loading={uploading === field}>
                        Upload
                    </Btn>
                </div>
                <input id={`upload_${field}`} type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files?.[0] && handleUploadBranding(field as string, e.target.files[0])} />
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Page Header Aligned with Purchases */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h1 className="text-[21px] font-bold text-[#111]">Site Identity & Branding</h1>
            </div>

            {/* Main Branding Section */}
            <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm overflow-hidden">
                <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-5 py-3 flex items-center justify-between">
                    <h3 className="font-bold text-[#111] text-[15px]">Brand Assets</h3>
                </div>
                <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    <BrandingUpload field="logo" label="Main Logo" desc="Header" />
                    <BrandingUpload field="favicon" label="Favicon" desc="Tab icon" />
                    <BrandingUpload field="footer_logo" label="Footer Logo" desc="Bottom" />
                    <BrandingUpload field="og_image" label="Social Preview" desc="OG Meta" />
                </div>
            </div>

            <div>
                {/* Visual Identity */}
                <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm overflow-hidden text-left w-full">
                    <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-5 py-3">
                        <h3 className="font-bold text-[#111] text-[15px]">Visual Identity</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-bold text-[#111]">Website Display Name</label>
                            <input type="text" value={form.site_name}
                                onChange={e => setForm(f => ({ ...f, site_name: e.target.value }))}
                                className={inputCls + " font-bold"} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-bold text-[#111]">Primary Color</label>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={form.primary_color}
                                        onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                                        className="w-9 h-[31px] rounded-lg border border-[#e2e8f0] cursor-pointer p-0.5" />
                                    <input type="text" value={form.primary_color}
                                        onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                                        className={inputCls + " font-mono uppercase"} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-bold text-[#111]">Secondary Color</label>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={form.secondary_color}
                                        onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))}
                                        className="w-9 h-[31px] rounded-lg border border-[#e2e8f0] cursor-pointer p-0.5" />
                                    <input type="text" value={form.secondary_color}
                                        onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))}
                                        className={inputCls + " font-mono uppercase"} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Aligned Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-[#e2e8f0] rounded-lg p-4 md:p-6 shadow-sm">
                <div className="flex items-center gap-3 text-slate-400">
                    <History size={18} />
                    <p className="text-[13px] font-medium italic">All branding changes update the live site instantly.</p>
                </div>
                <Btn onClick={() => onSave(form)} loading={saving} className="w-full sm:w-auto min-w-[180px] h-[35px] justify-center">
                    Confirm & Save Identity
                </Btn>
            </div>

            {picker && picker.open && (
                <MediaPickerModal 
                    isOpen={true} 
                    onClose={() => setPicker(null)} 
                    onSelect={handleSelectMedia} 
                    title={`Select ${picker.field.replace('_', ' ')}`}
                />
            )}
        </div>
    );
}
