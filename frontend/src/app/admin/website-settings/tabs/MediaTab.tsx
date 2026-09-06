'use client';
import { useState, useRef } from 'react';
import { Upload, Trash2, Image as ImageIcon, Video, Search, X, Loader2, FileText, Globe } from 'lucide-react';
import cmsService, { MediaAsset } from '@/services/cms.service';
import { getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import { ui } from '@/components/admin/ui';

interface Props {
    media: MediaAsset[];
    setMedia: (m: MediaAsset[]) => void;
}

// ── AMAZON STYLE COMPONENTS ──
const AmazonBtn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-[#F59E0B] border-[#F59E0B] hover:bg-[#D97706] text-[#0F172A]',
        secondary: 'bg-gradient-to-b from-[#f8fafc] to-[#e7e9ec] border-[#cbd5e1] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0F172A]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[31px] px-4 rounded-lg text-[13px] font-medium border shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = ui.inputBase.replace('h-10', 'h-9');
export default function MediaTab({ media, setMedia }: Props) {
    const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
    const [search, setSearch] = useState('');
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<MediaAsset | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const filtered = media.filter(m => {
        if (filter !== 'all' && m.file_type !== filter) return false;
        if (search && !m.alt_text.toLowerCase().includes(search.toLowerCase()) && !m.file.includes(search)) return false;
        return true;
    });

    const upload = async (files: FileList) => {
        setUploading(true);
        let uploaded = 0;
        for (const file of Array.from(files)) {
            try {
                const asset = await cmsService.uploadMedia(file, file.name);
                setMedia([asset, ...media]);
                uploaded++;
            } catch { toast.error(`Failed to upload ${file.name}`); }
        }
        if (uploaded > 0) toast.success(`${uploaded} asset${uploaded > 1 ? 's' : ''} added to library`);
        setUploading(false);
    };

    const deleteMedia = async (id: number) => {
        try {
            await cmsService.deleteMedia(id);
            setMedia(media.filter(m => m.id !== id));
            if (preview?.id === id) setPreview(null);
            toast.success('Asset removed');
        } catch { toast.error('Delete failed'); }
    };

    const copyUrl = (url: string) => {
        navigator.clipboard.writeText(getImageUrl(url) || url);
        toast.success('Asset URL copied to clipboard');
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 text-left">

            {/* Library Control Bar */}
            <div className="bg-white border border-[#e2e8f0] rounded-lg px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div>
                    <h3 className="text-[15px] font-bold text-[#111]">Media Library</h3>
                    <p className="text-[12px] text-[#64748B]">
                        {media.length} items total • {media.filter(m => m.file_type === 'image').length} images, {media.filter(m => m.file_type === 'video').length} videos
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-auto">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
                        <input placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)}
                            className={inputCls + " pl-9 w-full sm:w-[220px]"} />
                    </div>
                    <AmazonBtn onClick={() => fileRef.current?.click()} loading={uploading} className="w-full sm:w-auto justify-center">
                        <Upload size={14} /> Upload Asset
                    </AmazonBtn>
                    <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden"
                        onChange={e => e.target.files && upload(e.target.files)} />
                </div>
            </div>

            {/* Filter Sub-bar */}
            <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-1">
                {(['all', 'image', 'video'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-4 py-2 text-[13px] font-medium transition-all relative ${filter === f ? 'text-[#c45500] font-bold' : 'text-[#64748B] hover:text-[#111]'
                            }`}>
                        {f === 'all' ? 'All Assets' : f === 'image' ? 'Images Only' : 'Videos Only'}
                        {filter === f && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#c45500]" />}
                    </button>
                ))}
            </div>

            {/* Drop Zone */}
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-8 text-center border-dashed hover:border-[#F59E0B] transition-all cursor-pointer group"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); e.dataTransfer.files && upload(e.dataTransfer.files); }}>
                <div className="w-12 h-12 bg-white rounded-full border border-[#e2e8f0] shadow-sm flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Upload size={20} className="text-[#888]" />
                </div>
                <p className="text-[13px] font-bold text-[#111]">Drag and drop files to upload</p>
                <p className="text-[12px] text-[#64748B] mt-1">Supports High-Resolution Images & MP4 Videos</p>
            </div>

            {/* Media Grid */}
            {filtered.length === 0 ? (
                <div className="bg-white border border-[#e2e8f0] rounded-lg p-20 text-center text-[#888]">
                    <ImageIcon size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="text-[14px]">No media found matching your filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filtered.map(asset => (
                        <div key={asset.id} className="bg-white border border-[#e2e8f0] rounded-lg overflow-hidden hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => setPreview(asset)}>
                            <div className="aspect-square bg-[#f0f2f2] relative flex items-center justify-center overflow-hidden">
                                {asset.file_type === 'image' ? (
                                    <img src={getImageUrl(asset.file) || asset.file} alt={asset.alt_text}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                ) : (
                                    <div className="w-full h-full relative">
                                        <video src={getImageUrl(asset.file) || asset.file}
                                            className="w-full h-full object-cover opacity-80"
                                            preload="metadata"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-transparent transition-colors">
                                            <Video size={28} className="text-white drop-shadow-lg" />
                                        </div>
                                    </div>
                                )}

                                {/* Hover Actions */}
                                <div className="absolute inset-x-0 bottom-0 bg-white/95 border-t border-[#e2e8f0] p-1.5 flex items-center justify-end gap-2.5 translate-y-full group-hover:translate-y-0 transition-transform">
                                    <button onClick={e => { e.stopPropagation(); copyUrl(asset.file); }}
                                        className="text-[12px] font-bold text-slate-600 hover:underline">Copy link</button>
                                    <span className="text-slate-300">|</span>
                                    <button onClick={e => { e.stopPropagation(); setDeleteId(asset.id!); }}
                                        className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                </div>
                            </div>
                            <div className="p-2 border-t border-[#eee]">
                                <p className="text-[11px] font-medium text-[#64748B] truncate">{asset.alt_text || asset.file.split('/').pop()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Preview Dialog */}
            {preview && (
                <div className="fixed inset-0 bg-[#000000cc] z-[70] flex items-center justify-center p-4" onClick={() => setPreview(null)}>
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-6 py-3 flex items-center justify-between">
                            <h3 className="font-bold text-[#111] text-[15px] flex items-center gap-2">
                                <FileText size={16} /> Asset Details
                            </h3>
                            <button onClick={() => setPreview(null)} className="text-[#64748B] hover:text-[#111]"><X size={20} /></button>
                        </div>
                        <div className="flex flex-col md:flex-row h-auto md:h-[500px] overflow-y-auto md:overflow-hidden">
                            <div className="flex-1 md:flex-[2] h-64 md:h-auto bg-[#f0f2f2] p-4 md:p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-[#e2e8f0] shrink-0">
                                {preview.file_type === 'image' ? (
                                    <img src={getImageUrl(preview.file) || preview.file} alt={preview.alt_text} className="max-w-full max-h-full object-contain drop-shadow-xl" />
                                ) : (
                                    <video src={getImageUrl(preview.file) || preview.file} controls className="max-w-full max-h-full shadow-lg" autoPlay />
                                )}
                            </div>
                            <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-[#64748B] uppercase">Filename</label>
                                    <p className="text-[13px] font-mono break-all text-[#111]">{preview.file.split('/').pop()}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-[#64748B] uppercase">Alt Text / Label</label>
                                    <input value={preview.alt_text} readOnly className={inputCls + " bg-[#fcfcfc] cursor-default"} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-[#64748B] uppercase">Full Access URL</label>
                                    <div className="flex gap-2">
                                        <input value={getImageUrl(preview.file) || preview.file} readOnly className={inputCls + " bg-[#fcfcfc] text-[11px] font-mono"} />
                                        <AmazonBtn variant="secondary" onClick={() => copyUrl(preview.file)}>Copy</AmazonBtn>
                                    </div>
                                </div>
                                <div className="pt-8 border-t border-[#eee]">
                                    <AmazonBtn variant="secondary" onClick={() => setDeleteId(preview.id!)} className="w-full text-red-600 border-red-200 hover:bg-red-50">
                                        <Trash2 size={14} /> Remove from Library
                                    </AmazonBtn>
                                </div>
                            </div>
                        </div>
                        <div className="bg-[#f8fafc] border-t border-[#e2e8f0] px-6 py-4 flex justify-end">
                            <AmazonBtn onClick={() => setPreview(null)}>Close Viewer</AmazonBtn>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteId !== null && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setDeleteId(null)}>
                    <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-2xl w-full max-w-[420px] overflow-hidden animate-in zoom-in-95 duration-200 text-center p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 border border-red-100">
                            <Trash2 size={24} />
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-[17px] font-bold text-[#111]">Delete Media Asset?</h3>
                            <p className="text-[13px] text-[#64748B] leading-relaxed">
                                Are you sure you want to permanently remove this asset from your library? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setDeleteId(null)} className="flex-1 h-[35px] border border-[#cbd5e1] rounded-lg text-[13px] font-medium bg-gradient-to-b from-[#f8fafc] to-[#e7e9ec] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0F172A] shadow-sm transition-all">
                                Cancel
                            </button>
                            <button onClick={() => { deleteMedia(deleteId); setDeleteId(null); }} className="flex-1 h-[35px] border border-[#a83434] rounded-lg text-[13px] font-medium bg-gradient-to-b from-[#f59e9e] to-[#e63946] hover:from-[#fca5a5] hover:to-[#d62828] text-white shadow-sm transition-all">
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
