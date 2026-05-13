'use client';
import { useState, useEffect } from 'react';
import { X, Search, Loader2, Image as ImageIcon, Video, Upload, Check } from 'lucide-react';
import cmsService, { MediaAsset } from '@/services/cms.service';
import { getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props {
    isOpen?: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
    title?: string;
    allowVideo?: boolean;
}

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

const inputCls = "h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";

export default function MediaPickerModal({ isOpen = true, onClose, onSelect, title = 'Select Media', allowVideo = false }: Props) {
    const [media, setMedia] = useState<MediaAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
    const [uploading, setUploading] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    useEffect(() => {
        loadMedia();
    }, []);

    const loadMedia = async () => {
        setLoading(true);
        try {
            const data = await cmsService.getMedia();
            setMedia(data);
        } catch { toast.error('Failed to load library'); }
        finally { setLoading(false); }
    };

    const handleUpload = async (file: File) => {
        setUploading(true);
        try {
            const asset = await cmsService.uploadMedia(file, file.name);
            setMedia([asset, ...media]);
            setSelectedId(asset.id!);
            toast.success('Uploaded to library');
        } catch { toast.error('Upload failed'); }
        finally { setUploading(false); }
    };

    const filtered = media.filter(m => {
        if (!allowVideo && m.file_type === 'video') return false;
        if (filter !== 'all' && m.file_type !== filter) return false;
        if (search && !m.alt_text.toLowerCase().includes(search.toLowerCase()) && !m.file.includes(search)) return false;
        return true;
    });

    const selectedAsset = media.find(m => m.id === selectedId);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[4px] shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="bg-[#f7f8fa] border-b border-[#ddd] px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ImageIcon size={18} className="text-[#565959]" />
                        <h3 className="font-bold text-[#111] text-[15px]">{title}</h3>
                    </div>
                    <button onClick={onClose} className="text-[#565959] hover:text-[#111] transition-colors"><X size={20} /></button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Library Main */}
                    <div className="flex-[3] flex flex-col border-r border-[#ddd]">
                        {/* Toolbar */}
                        <div className="p-4 border-b border-[#ddd] bg-[#fcfcfc] flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
                                    <input placeholder="Search library..." value={search} onChange={e => setSearch(e.target.value)}
                                        className={inputCls + " pl-9 w-[200px]"} />
                                </div>
                                {allowVideo && (
                                    <select value={filter} onChange={e => setFilter(e.target.value as any)} className={inputCls}>
                                        <option value="all">All Files</option>
                                        <option value="image">Images</option>
                                        <option value="video">Videos</option>
                                    </select>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    id="media-upload-input"
                                    accept="image/*,video/*" 
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            handleUpload(file);
                                            e.target.value = ''; // Reset for same file re-upload
                                        }
                                    }} 
                                />
                                <AmazonBtn 
                                    variant="secondary" 
                                    loading={uploading} 
                                    className="bg-white"
                                    onClick={() => document.getElementById('media-upload-input')?.click()}
                                >
                                    <Upload size={14} /> Upload New
                                </AmazonBtn>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#f0f2f2]">
                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                                    <Loader2 className="animate-spin" />
                                    <p className="text-[13px]">Loading Assets...</p>
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                                    <ImageIcon size={40} className="opacity-20" />
                                    <p className="text-[13px]">Library is empty</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                    {filtered.map(asset => (
                                        <div key={asset.id} onClick={() => setSelectedId(asset.id!)}
                                            className={cn(
                                                "aspect-square bg-white border-2 rounded-[3px] overflow-hidden cursor-pointer relative transition-all group",
                                                selectedId === asset.id ? "border-[#e77600] shadow-sm ring-2 ring-[#e77600]/20" : "border-transparent hover:border-[#ddd]"
                                            )}>
                                            {asset.file_type === 'image' ? (
                                                <img src={getImageUrl(asset.file) || asset.file} alt={asset.alt_text} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full relative flex items-center justify-center bg-slate-900">
                                                    <Video size={24} className="text-white/50" />
                                                </div>
                                            )}
                                            {selectedId === asset.id && (
                                                <div className="absolute top-1 right-1 bg-[#e77600] text-white rounded-full p-0.5 shadow-sm">
                                                    <Check size={12} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar / Details */}
                    <div className="w-72 bg-[#fcfcfc] flex flex-col">
                        <div className="p-6 flex-1 overflow-y-auto space-y-6">
                            <h4 className="text-[13px] font-bold text-[#111] uppercase tracking-wider">Asset Details</h4>
                            {selectedAsset ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                    <div className="aspect-square bg-white border border-[#ddd] rounded-[3px] overflow-hidden flex items-center justify-center">
                                        {selectedAsset.file_type === 'image' ? (
                                            <img src={getImageUrl(selectedAsset.file) || selectedAsset.file} className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <Video size={48} className="text-[#ddd]" />
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-bold text-[#565959]">FILENAME</label>
                                            <p className="text-[12px] font-medium text-[#111] truncate">{selectedAsset.file.split('/').pop()}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-bold text-[#565959]">TYPE</label>
                                            <p className="text-[12px] font-medium text-[#111] uppercase">{selectedAsset.file_type}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-64 flex flex-col items-center justify-center text-center px-4">
                                    <ImageIcon size={32} className="text-[#ddd] mb-2" />
                                    <p className="text-[12px] text-[#888]">Select an asset from the library to see details</p>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 bg-[#f7f8fa] border-t border-[#ddd] flex flex-col gap-2">
                            <AmazonBtn disabled={!selectedId} className="w-full" onClick={() => selectedAsset && onSelect(selectedAsset.file)}>
                                Insert Selected Asset
                            </AmazonBtn>
                            <button onClick={onClose} className="text-[12px] font-medium text-[#565959] hover:underline py-1">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
