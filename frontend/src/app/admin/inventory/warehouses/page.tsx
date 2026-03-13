"use client";

import React, { useEffect, useState } from 'react';
import { 
    Plus, Warehouse, MapPin, Phone, Mail, 
    MoreVertical, Edit, Trash2, ShieldCheck, 
    X, AlertCircle, Info, ChevronRight, Download,
    Boxes, Building2, Globe, Activity, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { inventoryService } from '@/lib/api';
import toast from 'react-hot-toast';

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedWH, setSelectedWH] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '', code: '', type: 'Main', address: '', city: '', 
        state: '', country: 'Pakistan', postal_code: '', 
        contact_person: '', contact_phone: '', email: '', 
        capacity: '0', status: 'Active'
    });

    useEffect(() => { loadWarehouses(); }, []);

    const loadWarehouses = async () => {
        try {
            const data = await inventoryService.getWarehouses();
            setWarehouses(data);
        } catch (error) {
            toast.error("Failed to load warehouses");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await inventoryService.createWarehouse(formData);
            toast.success("Warehouse registered successfully");
            setIsCreateModalOpen(false);
            loadWarehouses();
            setFormData({
                name: '', code: '', type: 'Main', address: '', city: '', 
                state: '', country: 'Pakistan', postal_code: '', 
                contact_person: '', contact_phone: '', email: '', 
                capacity: '0', status: 'Active'
            });
        } catch (error) {
            toast.error("Failed to create warehouse");
        }
    };

    const handleDelete = async () => {
        if (!selectedWH) return;
        try {
            await inventoryService.deleteWarehouse(selectedWH.id);
            toast.success("Entry removed from registry");
            setIsDeleteModalOpen(false);
            loadWarehouses();
        } catch (error) {
            toast.error("Protected node: Cannot delete");
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-[#E68A00]" />
                        Fulfillment Network
                    </h1>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Manage global distribution nodes, storage capacity and hub status</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded shadow-sm text-xs font-bold uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-slate-700 transition-all">
                        <Download className="w-4 h-4" /> Export Config
                    </button>
                    <Link 
                        href="/admin/inventory/warehouses/add"
                        style={{ backgroundColor: '#E68A00' }}
                        className="text-white px-6 py-2 rounded shadow-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all hover:opacity-90"
                    >
                        <Plus className="w-4 h-4" strokeWidth={3} /> Register New Node
                    </Link>
                </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricBox label="Active Centers" value={warehouses.filter(w => w.status === 'Active').length} icon={Activity} color="text-emerald-500" />
                <MetricBox label="Global Locations" value={new Set(warehouses.map(w => w.city)).size} icon={Globe} color="text-blue-500" />
                <MetricBox label="Total Capacity" value={`${warehouses.reduce((a, b) => a + Number(b.capacity || 0), 0).toLocaleString()} SQFT`} icon={Boxes} color="text-indigo-500" />
                <MetricBox label="System Nodes" value={warehouses.length} icon={Warehouse} />
            </div>

            {/* Grid View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => <div key={i} className="h-64 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-lg animate-pulse"></div>)
                ) : warehouses.length === 0 ? (
                    <div className="col-span-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-20 text-center">
                        <Building2 className="w-16 h-16 mx-auto mb-4 opacity-10" />
                        <p className="text-sm font-bold uppercase tracking-widest text-gray-400">No fulfillment nodes registered in the network.</p>
                    </div>
                ) : warehouses.map((wh) => (
                    <div key={wh.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col group overflow-hidden">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg group-hover:bg-[#E68A00]/10 transition-colors">
                                    <Warehouse className="w-6 h-6 text-gray-400 dark:text-slate-500 group-hover:text-[#E68A00]" />
                                </div>
                                <div className="flex gap-1.5">
                                    <Link href={`/admin/inventory/warehouses/edit/${wh.id}`} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                                        <Edit className="w-4 h-4" />
                                    </Link>
                                    <button onClick={() => { setSelectedWH(wh); setIsDeleteModalOpen(true); }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-gray-400 hover:text-red-600 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-[#E68A00] transition-colors tracking-tight">{wh.name}</h3>
                            <div className="text-[10px] font-black text-gray-400 dark:text-slate-500 flex items-center gap-2 uppercase tracking-widest mb-4">
                                <span>ID: {wh.code || 'SYS-NODE'}</span>
                                <span className="text-gray-200 dark:text-slate-800">|</span>
                                <span className="text-[#007185] dark:text-[#4caec2]">{wh.type} HUB</span>
                            </div>
                            <div className="space-y-3 mb-2">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-slate-400">
                                    <MapPin className="w-3.5 h-3.5 text-gray-300 dark:text-slate-700" />
                                    <span className="truncate">{wh.address || 'Location Pending'}, {wh.city}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-slate-400">
                                    <Phone className="w-3.5 h-3.5 text-gray-300 dark:text-slate-700" />
                                    <span>{wh.contact_phone || '-- -- --'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-auto px-6 py-4 bg-gray-50/50 dark:bg-slate-800/30 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                            <div className={`flex items-center gap-2 px-2 py-0.5 rounded text-[9px] font-black uppercase ${wh.status === 'Active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${wh.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                {wh.status}
                            </div>
                            <Link href={`/admin/inventory/list?warehouse=${wh.id}`} className="text-[10px] font-black text-[#007185] dark:text-[#4caec2] hover:text-[#E68A00] flex items-center gap-1 uppercase tracking-tight group-hover:translate-x-1 transition-transform">
                                Node Details <ChevronRight className="w-3 h-3" />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            {/* Amazon Style Delete Confirmation */}
            {isDeleteModalOpen && selectedWH && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-sm w-full shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-[#e47911]" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">System Purge</h3>
                            </div>
                        </div>
                        <div className="p-6 text-sm text-gray-700 dark:text-gray-300">
                            Permanently delete node <span className="font-bold text-gray-900 dark:text-white">{selectedWH.name}</span>? This will orphan any stock records at this location.
                        </div>
                        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-[#adb1b8] rounded text-xs font-bold shadow-sm">Cancel</button>
                            <button onClick={handleDelete} className="px-4 py-1.5 bg-[#f0c14b] border border-[#a88734] rounded text-xs font-bold text-[#111] hover:bg-[#ebae1e] shadow-sm flex items-center gap-2">
                                <Trash2 className="h-3 w-3" />
                                Commit Erasure
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricBox({ label, value, icon: Icon, color = 'text-gray-900 dark:text-white' }: { label: string; value: string | number; icon: any; color?: string }) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-5 rounded shadow-sm hover:border-[#E68A00] transition-colors group">
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest group-hover:text-[#E68A00] transition-colors">{label}</p>
                <Icon className="h-4 w-4 text-gray-300 dark:text-slate-700 group-hover:text-[#E68A00]/40 transition-colors" />
            </div>
            <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
        </div>
    );
}

