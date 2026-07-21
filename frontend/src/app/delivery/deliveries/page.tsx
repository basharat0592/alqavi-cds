'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Truck, MapPin, Phone, Loader2, Search, XCircle, Camera, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { riderService } from '@/services/delivery.service';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { isDone, upper } from '@/lib/deliveryStats';


const statusPill = (s: string) => {
    const u = upper(s);
    if (u === 'DELIVERED') return 'bg-[#007600] text-white';
    if (u === 'CANCELLED' || u === 'REJECTED') return 'bg-red-50 text-red-700';
    if (u === 'SHIPPED') return 'bg-sky-50 text-sky-700';
    return 'bg-[#FFD814]/20 text-[#111]';
};

export default function MyDeliveriesPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>({ rider: {}, stats: {}, results: [] });
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);
    const [uploadingProof, setUploadingProof] = useState<string | null>(null);

    const uploadProof = (order: any, file?: File | null) => {
        if (!file) return;
        setUploadingProof(order.id);
        const doUpload = (lat: string, lng: string) => {
            riderService.uploadProof(order.id, file, lat, lng)
                .then(() => { toast.success('Delivery photo saved'); load(true); })
                .catch((e: any) => toast.error(e?.response?.data?.error || 'Failed to upload photo'))
                .finally(() => setUploadingProof(null));
        };
        // Capture GPS location alongside the photo (best-effort — proceed if denied).
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => doUpload(String(pos.coords.latitude), String(pos.coords.longitude)),
                () => doUpload('', ''),
                { enableHighAccuracy: true, timeout: 8000 }
            );
        } else { doUpload('', ''); }
    };

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const d = await riderService.myDeliveries();
            setData(d || { rider: {}, stats: {}, results: [] });
        } catch { toast.error('Failed to load deliveries'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        load();
        // Live sync: silently refresh so the admin's Delivered confirmation flips this
        // view to Delivered without a manual refresh.
        const id = setInterval(() => load(true), 12000);
        return () => clearInterval(id);
    }, [load]);

    const setStatus = async (orderId: string, status: string) => {
        setUpdating(orderId + status);
        try {
            await riderService.updateStatus(orderId, status);
            const su = status.toUpperCase();
            toast.success(su === 'DELIVERED' ? 'Delivery reported — waiting for admin confirmation'
                : su === 'CANCELLED' ? 'Customer cancellation reported — waiting for admin confirmation'
                : `Marked ${status.toLowerCase()}`);
            load(true);
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Update failed');
        } finally { setUpdating(null); }
    };

    const results: any[] = data.results || [];
    const filtered = results.filter((o) => {
        const q = search.toLowerCase();
        const matches = !q ||
            `${o.order_number || ''} ${o.tracking_id || ''}`.toLowerCase().includes(q) ||
            (o.customer_display_name || o.customer_name || '').toLowerCase().includes(q) ||
            (o.shipping_address || '').toLowerCase().includes(q);
        if (!matches) return false;
        // Active deliveries only — completed/cancelled live in Delivery History.
        return !isDone(o.status);
    });

    return (
        <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-200 pb-3 sm:pb-4">
                <div>
                    <h1 className="text-2xl font-semibold text-[#111]">Active Orders</h1>
                    <p className="text-[12.5px] sm:text-[13px] text-gray-500 mt-1">Orders assigned to you — update each as you deliver.</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by ID, name, address..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-8 pl-9 pr-3 bg-white border border-[#D5D9D9] rounded-md text-sm text-[#111] outline-none focus:border-[#F59E0B] shadow-inner"
                    />
                </div>
            </div>

            {loading && results.length === 0 ? (
                <div className="py-24 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-lg p-12 text-center border border-[#D5D9D9]">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Truck className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-[#111]">No active orders.</h3>
                    <p className="text-[13px] text-gray-600 mt-2">Orders assigned to you will appear here.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((o) => {
                        const done = isDone(o.status);
                        const u = upper(o.status);
                        const expanded = expandedId === o.id;
                        const cust = o.customer_display_name || o.customer_name || 'Customer';
                        const addr = o.shipping_address || 'Walk-in Store Selection';
                        const phone = (o.phone_number && o.phone_number !== 'N/A') ? o.phone_number : o.customer_phone;
                        return (
                            <div key={o.id} className="bg-white border border-[#D5D9D9] rounded-xl shadow-sm overflow-hidden">
                                {/* Summary row — tap to expand */}
                                <button onClick={() => setExpandedId(expanded ? null : o.id)} className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-gray-50/60 transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[14px] font-bold text-[#111]">#{o.order_number || o.tracking_id}</span>
                                            <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider ${statusPill(o.status)}`}>{o.status_display || o.status}</span>
                                        </div>
                                        <p className="text-[12.5px] text-gray-700 font-semibold mt-1 truncate">{cust}</p>
                                        <p className="text-[11.5px] text-gray-400 mt-0.5 flex items-center gap-1"><MapPin size={11} className="shrink-0" /> <span className="truncate">{addr}</span></p>
                                        <p className="text-[10.5px] text-gray-400 mt-1">{o.created_at ? formatDateTime(o.created_at) : '—'}</p>
                                        {!done && o.rider_reported_delivered && <span className="inline-block mt-1.5 text-[10px] font-bold text-amber-600">Awaiting confirmation…</span>}
                                        {!done && o.rider_reported_cancelled && <span className="inline-block mt-1.5 text-[10px] font-bold text-rose-600">Customer cancelled…</span>}
                                        {!done && o.customer_reported_delivered && !o.rider_reported_delivered && <span className="inline-block mt-1.5 text-[10px] font-bold text-emerald-600">Customer confirmed…</span>}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[14px] font-bold text-[#B12704] tabular-nums">{formatCurrency(o.total_amount)}</p>
                                        <span className="text-[11px] font-bold text-[#007185]">{expanded ? 'Hide' : 'Details'}</span>
                                    </div>
                                </button>

                                {/* Expanded details */}
                                {expanded && (
                                    <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/40 space-y-4 animate-in slide-in-from-top-1 duration-200">
                                        <div className="space-y-2.5">
                                            <p className="text-[10.5px] text-gray-500 font-bold uppercase tracking-wider">Customer &amp; Delivery</p>
                                            <p className="text-slate-900 font-bold text-[13.5px]">{cust}</p>
                                            <p className="text-slate-700 flex items-start gap-2 text-[12.5px] font-medium leading-relaxed">
                                                <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" /> {addr}
                                            </p>
                                            {phone && (
                                                <a href={`tel:${phone}`} className="text-indigo-600 font-bold flex items-center gap-1.5 hover:underline w-max text-[12.5px]">
                                                    <Phone size={13} /> {phone}
                                                </a>
                                            )}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-gray-200/60">
                                                <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Payment: <span className="text-slate-800">{o.payment_method || '—'}</span></span>
                                                <span className="text-[#007600] text-[12.5px] font-extrabold">Your Earnings: <span className="tabular-nums font-black">{formatCurrency(Math.max(0, Number(o.shipping_cost ?? 0) || 0))}</span></span>
                                            </div>
                                        </div>

                                        <div className="space-y-2.5">
                                            <p className="text-[10.5px] text-gray-500 font-bold uppercase tracking-wider">Proof &amp; Status</p>
                                            {done ? (
                                                <p className="text-[12.5px] text-gray-500 italic">This order is {(o.status_display || o.status || '').toLowerCase()}.</p>
                                            ) : o.customer_reported_delivered ? (
                                                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-bold">
                                                    <CheckCircle size={14} /> Customer confirmed delivery — waiting for admin…
                                                </div>
                                            ) : o.rider_reported_delivered ? (
                                                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[12px] font-bold">
                                                    <Loader2 size={14} className="animate-spin" /> Waiting for admin to confirm delivery…
                                                </div>
                                            ) : o.rider_reported_cancelled ? (
                                                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[12px] font-bold">
                                                    <Loader2 size={14} className="animate-spin" /> Customer cancelled — waiting for admin…
                                                </div>
                                            ) : (
                                                <div className="space-y-2.5">
                                                    {o.proof_image_url ? (
                                                        <div className="flex items-center gap-3">
                                                            <a href={o.proof_image_url} target="_blank" rel="noreferrer">
                                                                <img src={o.proof_image_url} alt="Delivery proof" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                                                            </a>
                                                            <div className="text-[11px]">
                                                                <span className="block font-bold text-[#007600]">✓ Delivery photo captured</span>
                                                                {o.proof_lat && o.proof_lng ? (
                                                                    <a href={`https://maps.google.com/?q=${o.proof_lat},${o.proof_lng}`} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline font-semibold inline-flex items-center gap-1"><MapPin size={11} /> View location</a>
                                                                ) : <span className="text-gray-400">Location unavailable</span>}
                                                            </div>
                                                        </div>
                                                    ) : uploadingProof === o.id ? (
                                                        <div className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md border border-slate-300 bg-white text-slate-500 text-[12px] font-bold">
                                                            <Loader2 size={13} className="animate-spin" /> Uploading photo…
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <label className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-md bg-[#232F3E] text-white text-[12px] font-bold cursor-pointer hover:bg-black">
                                                                <Camera size={14} /> Take Photo
                                                                <input type="file" accept="image/*" capture="environment" className="hidden"
                                                                    onChange={e => uploadProof(o, e.target.files?.[0])} />
                                                            </label>
                                                            <label className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-[12px] font-bold cursor-pointer hover:bg-slate-50">
                                                                <Upload size={14} /> Upload
                                                                <input type="file" accept="image/*" className="hidden"
                                                                    onChange={e => uploadProof(o, e.target.files?.[0])} />
                                                            </label>
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                        {u !== 'SHIPPED' && (
                                                            <button onClick={() => setStatus(o.id, 'SHIPPED')} disabled={!!updating}
                                                                className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-md border border-sky-200 bg-sky-50 text-sky-700 text-[12px] font-bold hover:bg-sky-100 disabled:opacity-50">
                                                                {updating === o.id + 'SHIPPED' ? <Loader2 size={13} className="animate-spin" /> : <Truck size={13} />} Out for Delivery
                                                            </button>
                                                        )}
                                                        <button onClick={() => setStatus(o.id, 'DELIVERED')} disabled={!!updating || !o.proof_image_url}
                                                            title={!o.proof_image_url ? 'Take a delivery photo first' : ''}
                                                            className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-md bg-[#007600] text-white text-[12px] font-bold hover:bg-[#005c00] disabled:opacity-40">
                                                            {updating === o.id + 'DELIVERED' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />} Mark Delivered
                                                        </button>
                                                        <button onClick={() => setStatus(o.id, 'CANCELLED')} disabled={!!updating}
                                                            className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-md border border-rose-200 bg-rose-50 text-rose-700 text-[12px] font-bold hover:bg-rose-100 disabled:opacity-50">
                                                            {updating === o.id + 'CANCELLED' ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />} Cancel by Customer
                                                        </button>
                                                    </div>
                                                    {!o.proof_image_url && <p className="text-[10.5px] text-amber-600 font-semibold">Take a delivery photo before marking delivered.</p>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
