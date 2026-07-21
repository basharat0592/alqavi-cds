'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, ChevronRight, Info, Search } from 'lucide-react';
import Link from 'next/link';
import { salesService } from '@/lib/api';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

export default function AddReturnPage() {
    const router = useRouter();
    const [boughtProducts, setBoughtProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Form State
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [reason, setReason] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    
    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    
    const filteredProducts = boughtProducts.filter(item => 
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.order_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        salesService.getBoughtProducts()
            .then(data => {
                const now = new Date();
                // 30-Day Window from Delivery
                const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                
                const filtered = data.filter((item: any) => {
                    const deliveryDate = new Date(item.delivered_at || item.purchased_at);
                    return deliveryDate >= thirtyDaysAgo;
                });
                setBoughtProducts(filtered);
            })
            .catch(() => toast.error('Failed to load purchase history'))
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) {
            toast.error('Please select an item to return');
            return;
        }
        if (!reason) {
            toast.error('Please provide a reason for the return');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                order: selectedItem.order,
                reason: reason,
                notes: notes,
                items: [
                    {
                        product_id: selectedItem.product,
                        quantity: quantity,
                        price: selectedItem.price
                    }
                ]
            };
            await salesService.createReturn(payload);
            toast.success('Return request submitted successfully');
            router.push('/customer/dashboard/returns');
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || 
                           error.response?.data?.detail || 
                           (error.response?.data && typeof error.response.data === 'object' 
                               ? Object.values(error.response.data).flat().join(', ') 
                               : null) ||
                           'Failed to submit return request';
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
                <Link href="/customer/dashboard/returns" className="inline-flex items-center gap-2 text-sm text-[#007185] hover:text-[#C45500] font-bold group mb-4">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Returns
                </Link>
                <div>
                    <h1 className="text-2xl font-semibold text-[#111]">Request a Return</h1>
                    <p className="text-sm text-gray-600 mt-1 italic">
                        Select an item purchased and <span className="font-bold text-[#111]">delivered</span> within the last 30 days to initiate a return request.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Step 1: Select Item */}
                        <section className="bg-white border border-[#D5D9D9] rounded-lg">
                            <div className="bg-[#F0F2F2] px-6 py-3 border-b border-[#D5D9D9]">
                                <h3 className="text-sm font-bold text-[#111] uppercase tracking-wider">Step 1: Select Purchased Item</h3>
                            </div>
                            <div className="p-6">
                                {boughtProducts.length === 0 ? (
                                    <div className="text-center py-10">
                                        <Package className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                                        <p className="text-gray-500 font-medium">No items purchased and delivered within the last 30 days were found.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-2 relative">
                                            <label className="text-sm font-bold text-[#111]">Select Purchased Item</label>
                                            <div className="relative">
                                                <div className="relative">
                                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input 
                                                        type="text"
                                                        placeholder="Search by name or order number..."
                                                        value={searchTerm}
                                                        onFocus={() => setIsOpen(true)}
                                                        onChange={(e) => {
                                                            setSearchTerm(e.target.value);
                                                            setIsOpen(true);
                                                        }}
                                                        className="w-full h-11 pl-10 pr-10 bg-white border border-[#888C8C] rounded-[3px] text-sm focus:border-[#119AB8] focus:shadow-[0_0_0_3px_rgba(228,121,17,0.5)] outline-none transition-all"
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => setIsOpen(!isOpen)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#111]"
                                                    >
                                                        <ChevronRight size={18} className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                                                    </button>
                                                </div>

                                                {isOpen && (
                                                    <div className="absolute z-50 w-full mt-1 bg-white border border-[#D5D9D9] rounded-md shadow-lg max-h-[250px] overflow-y-auto custom-scrollbar">
                                                        {filteredProducts.length === 0 ? (
                                                            <div className="p-4 text-center text-sm text-gray-500">No matching items found.</div>
                                                        ) : (
                                                            filteredProducts.map((item) => (
                                                                <div 
                                                                    key={item.id}
                                                                    onClick={() => {
                                                                        setSelectedItem(item);
                                                                        setSearchTerm(item.product_name);
                                                                        setIsOpen(false);
                                                                        setQuantity(1);
                                                                    }}
                                                                    className="p-3 hover:bg-[#F0F2F2] cursor-pointer border-b border-[#F3F3F3] last:border-0 flex items-center gap-3"
                                                                >
                                                                    <div className="w-10 h-10 bg-gray-50 rounded border border-[#eee] flex items-center justify-center shrink-0">
                                                                        {item.image ? (
                                                                            <img src={item.image} alt={item.product_name} className="w-8 h-8 object-contain" />
                                                                        ) : (
                                                                            <Package className="h-5 w-5 text-gray-300" />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="text-xs font-bold text-[#111] line-clamp-1">{item.product_name}</p>
                                                                            {(item.weight || item.size) && (
                                                                                <span className="text-[9px] text-[#119AB8] font-black uppercase tracking-tight shrink-0">
                                                                                    {item.weight}{item.weight && item.size ? ' â€¢ ' : ''}{item.size}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-[10px] text-gray-500">Order #{item.order_number} â€¢ {new Date(item.purchased_at).toLocaleDateString()}</p>
                                                                    </div>
                                                                    <p className="text-xs font-bold text-[#111] shrink-0">Rs. {item.price.toLocaleString()}</p>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {selectedItem && (
                                            <div className="p-4 bg-[#fdfaf5] border border-[#119AB8]/30 rounded-lg flex items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
                                                <div className="w-14 h-14 bg-white rounded border border-[#D5D9D9] flex items-center justify-center shrink-0 relative group">
                                                    {selectedItem.image ? (
                                                        <img src={selectedItem.image} alt={selectedItem.product_name} className="w-12 h-12 object-contain" />
                                                    ) : (
                                                        <Package className="h-8 w-8 text-gray-200" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-bold text-[#111]">{selectedItem.product_name}</p>
                                                        {(selectedItem.weight || selectedItem.size) && (
                                                            <span className="text-[10px] text-[#119AB8] font-black uppercase tracking-tight border border-[#119AB8]/20 px-1 rounded-sm bg-[#119AB8]/5">
                                                                {selectedItem.weight}{selectedItem.weight && selectedItem.size ? ' â€¢ ' : ''}{selectedItem.size}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-600">Unit Price: Rs. {selectedItem.price.toLocaleString()} â€¢ Purchased: {new Date(selectedItem.purchased_at).toLocaleDateString()}</p>
                                                    <p className="text-xs text-emerald-600 font-bold mt-0.5 flex items-center gap-1"><CheckCircle2 size={12} /> Order #{selectedItem.order_number}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Step 2: Return Details */}
                        <section className={`bg-white border border-[#D5D9D9] rounded-lg overflow-hidden transition-opacity duration-300 ${!selectedItem ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                            <div className="bg-[#F0F2F2] px-6 py-3 border-b border-[#D5D9D9]">
                                <h3 className="text-sm font-bold text-[#111] uppercase tracking-wider">Step 2: Return Details</h3>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#111]">Return Reason</label>
                                        <select 
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            className="w-full h-10 px-3 bg-white border border-[#888C8C] rounded-[3px] text-sm focus:border-[#119AB8] focus:shadow-[0_0_0_3px_rgba(228,121,17,0.5)] outline-none transition-all"
                                            required
                                        >
                                            <option value="">Select a reason</option>
                                            <option value="DEFECTIVE">Product is defective/damaged</option>
                                            <option value="WRONG_ITEM">Received wrong item</option>
                                            <option value="NOT_AS_DESCRIBED">Item not as described</option>
                                            <option value="NO_LONGER_NEEDED">No longer needed</option>
                                            <option value="OTHER">Other reason</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#111]">Return Quantity</label>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="number" 
                                                min="1" 
                                                max={selectedItem?.quantity || 1}
                                                value={quantity}
                                                onChange={(e) => setQuantity(parseInt(e.target.value))}
                                                className="w-24 h-10 px-3 bg-white border border-[#888C8C] rounded-[3px] text-sm focus:border-[#119AB8] focus:shadow-[0_0_0_3px_rgba(228,121,17,0.5)] outline-none transition-all"
                                                required
                                            />
                                            <span className="text-xs text-gray-500">Max: {selectedItem?.quantity || 1}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[#111]">Additional Comments (Optional)</label>
                                    <textarea 
                                        rows={4}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Tell us more about the issue..."
                                        className="w-full p-3 bg-white border border-[#888C8C] rounded-[3px] text-sm focus:border-[#119AB8] focus:shadow-[0_0_0_3px_rgba(228,121,17,0.5)] outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </section>

                        <div className="flex items-center gap-4 pt-4">
                            <button 
                                type="submit"
                                disabled={submitting || !selectedItem || !reason}
                                className="h-11 px-10 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-lg text-sm font-bold text-[#111] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Submit Request'}
                            </button>
                            <button 
                                type="button"
                                onClick={() => router.back()}
                                className="h-11 px-8 bg-white hover:bg-gray-50 border border-[#D5D9D9] rounded-lg text-sm font-medium text-[#111] shadow-sm transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>

                <div className="space-y-6">
                    <div className="bg-[#fcfcfc] border border-[#D5D9D9] rounded-lg p-6">
                        <h3 className="text-base font-bold text-[#111] mb-4">Return Policy</h3>
                        <ul className="space-y-4">
                            <li className="flex gap-3">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-bold text-[#111]">30-Day Window</p>
                                    <p className="text-gray-600">Items can be returned within 30 days of delivery.</p>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-bold text-[#111]">Original Packaging</p>
                                    <p className="text-gray-600">Please keep the original packaging for a faster refund.</p>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-bold text-[#111]">Review Process</p>
                                    <p className="text-gray-600">Our team will review your request within 48 hours.</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                        <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-2">
                            <AlertCircle size={16} /> Need help?
                        </h3>
                        <p className="text-sm text-amber-800 leading-relaxed">
                            If you're having trouble with your return, please contact our support team at <span className="font-bold underline">support@alqavi.com</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
