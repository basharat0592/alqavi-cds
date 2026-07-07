'use client';

import { useState, useEffect } from 'react';
import { Package, X, Warehouse as WarehouseIcon, Check, Search, AlertCircle, Loader2 } from 'lucide-react';
import { inventoryService } from '@/services/inventory.service';
import toast from 'react-hot-toast';

interface WarehouseSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (warehouseId: string) => void;
    loading?: boolean;
    title?: string;
    description?: string;
}

export const WarehouseSelectionModal = ({
    isOpen,
    onClose,
    onConfirm,
    loading = false,
    title = "Select Branch",
    description = "Please select the branch where this stock will be received. The inventory will be updated only for the selected branch."
}: WarehouseSelectionModalProps) => {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string>('');
    const [fetching, setFetching] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchWarehouses();
        }
    }, [isOpen]);

    const fetchWarehouses = async () => {
        setFetching(true);
        try {
            const data = await inventoryService.getWarehouses();
            setWarehouses(data || []);
            // Select first by default if available
            if (data && data.length > 0) {
                setSelectedId(String(data[0].id));
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load branches");
        } finally {
            setFetching(false);
        }
    };

    if (!isOpen) return null;

    const filtered = warehouses.filter(w => 
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        (w.location && w.location.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f1111]/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div 
                className="bg-white rounded-[8px] w-full max-w-[500px] shadow-2xl overflow-hidden border border-[#ddd] flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#fef8e2] rounded-full flex items-center justify-center border border-[#fbd8b4]">
                            <WarehouseIcon size={20} className="text-[#c45500]" />
                        </div>
                        <div>
                            <h3 className="text-[17px] font-bold text-[#0f1111]">{title}</h3>
                            <p className="text-[12px] text-[#565959] mt-0.5">{description}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-[#565959] hover:text-[#0f1111] p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="px-6 py-3 border-b border-[#eee] bg-white sticky top-0 z-10">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            placeholder="Search branch by name or location..."
                            className="w-full h-[38px] pl-9 pr-3 border border-slate-300 rounded-[4px] text-[13px] outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600]/20 transition-all"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Content - Warehouse List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#fcfcfc] custom-scrollbar">
                    {fetching ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="h-8 w-8 text-[#e77600] animate-spin" />
                            <p className="text-[13px] text-slate-500 font-medium">Fetching available branches...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center px-10">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle size={32} className="text-slate-200" />
                            </div>
                            <p className="text-[15px] font-bold text-[#0f1111]">No branches found</p>
                            <p className="text-[13px] text-slate-500 mt-1">We couldn't find any branches matching your search or in the system.</p>
                        </div>
                    ) : (
                        filtered.map((w) => (
                            <div 
                                key={w.id}
                                onClick={() => setSelectedId(String(w.id))}
                                className={`
                                    relative p-4 border rounded-[6px] cursor-pointer transition-all duration-200 group
                                    ${selectedId === String(w.id) 
                                        ? 'bg-[#f7fafa] border-[#007185] shadow-sm ring-1 ring-[#007185]' 
                                        : 'bg-white border-[#ddd] hover:border-[#adb1b8] hover:shadow-md'}
                                `}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={`
                                            w-12 h-12 rounded-lg flex items-center justify-center border transition-colors
                                            ${selectedId === String(w.id) ? 'bg-white border-[#007185] text-[#007185]' : 'bg-slate-50 border-slate-200 text-slate-400 group-hover:text-slate-600'}
                                        `}>
                                            <Package size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-[15px] font-bold text-[#0f1111]">{w.name}</h4>
                                            <p className="text-[12px] text-[#565959] flex items-center gap-1.5 mt-0.5">
                                                <WarehouseIcon size={12} />
                                                {w.location || 'Central Facility'}
                                            </p>
                                            {w.capacity && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="bg-emerald-500 h-full w-[65%]" />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">65% Full</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`
                                        w-6 h-6 rounded-full border flex items-center justify-center transition-all
                                        ${selectedId === String(w.id) 
                                            ? 'bg-[#007185] border-[#007185] text-white scale-110' 
                                            : 'bg-white border-[#ddd] text-transparent'}
                                    `}>
                                        <Check size={14} strokeWidth={3} />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#ddd] bg-white flex items-center justify-end gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                    <button 
                        onClick={onClose}
                        className="h-[31px] px-6 text-[13px] font-medium text-[#0f1111] hover:bg-slate-50 border border-[#adb1b8] rounded-[3px] transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        disabled={!selectedId || loading}
                        onClick={() => onConfirm(selectedId)}
                        className={`
                            h-[31px] px-8 text-[13px] font-bold rounded-[3px] shadow-sm flex items-center gap-2 transition-all
                            ${!selectedId || loading
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border border-[#a88734] text-[#0f1111] hover:from-[#f5d78e] hover:to-[#eeb933] active:shadow-inner'}
                        `}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check size={16} />}
                        Receive Stock in Branch
                    </button>
                </div>
            </div>
        </div>
    );
};
