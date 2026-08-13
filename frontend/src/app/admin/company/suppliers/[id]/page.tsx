'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    Mail, Phone, MapPin, Building2, ArrowLeft, Archive
} from 'lucide-react';
import { userService, AppUser, productService } from '@/lib/api';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';
import { getImageUrl, exportToCSV } from '@/lib/utils';
import { Product } from '@/types';
import { PageHeader, Card, Button, Badge, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar } from '@/components/admin/ui';

export default function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [supplier, setSupplier] = useState<AppUser | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            try {
                const s = await userService.getById(parseInt(id));
                setSupplier(s);

                const allProducts = await productService.getAll();
                const filteredProducts = allProducts.filter((p: Product) => 
                    (p.supplier && typeof p.supplier === 'object' && p.supplier.id === parseInt(id)) ||
                    (p.supplier === parseInt(id)) || 
                    (p.created_by_name && p.created_by_name.includes(s.first_name))
                );
                setProducts(filteredProducts);

            } catch (err) {
                console.error(err);
                toast.error('Failed to load supplier details');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    const sel = useTableSelection(products);

    if (loading) return <PageLoader />;
    if (!supplier) return <div className="text-center p-20 text-slate-500">Supplier not found.</div>;

    const initials = `${supplier.first_name?.[0] || ''}${supplier.last_name?.[0] || ''}`.toUpperCase();

    return (
        <div className="max-w-[1400px] mx-auto pb-20">
            <PageHeader
                title="Supplier Details"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Suppliers', href: '/admin/company/suppliers' },
                    { label: 'Supplier Details' },
                ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── LEFT: PROFILE CARD ── */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="overflow-hidden">
                        <div className="bg-slate-50/60 px-6 py-4 flex items-center justify-between border-b border-slate-100">
                            <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Supplier Identity</h2>
                            <Badge tone={supplier.is_active ? 'green' : 'red'}>
                                {supplier.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>

                        <div className="p-8 flex flex-col items-center border-b border-slate-100">
                            <div className="h-24 w-24 bg-[#13B0D1]/10 border-4 border-[#13B0D1]/15 text-[#0E8CA8] rounded-3xl flex items-center justify-center font-bold text-3xl shadow-sm mb-4">
                                {initials}
                            </div>
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">{supplier.first_name} {supplier.last_name}</h1>
                            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mt-1">{supplier.business_name || 'Individual Entity'}</p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                                <Mail className="h-5 w-5 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                                    <p className="text-sm font-semibold text-slate-700">{supplier.email}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                                <Phone className="h-5 w-5 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                                    <p className="text-sm font-semibold text-slate-700">{supplier.phone_number || supplier.phone || 'Not provided'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                                <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</p>
                                    <p className="text-sm font-semibold text-slate-700">{supplier.address || 'Not provided'}</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* ── RIGHT: PRODUCTS SUPPLIED ── */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="overflow-hidden">
                        <div className="bg-slate-50/60 px-6 py-4 flex items-center justify-between border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <Building2 className="h-5 w-5 text-[#0E8CA8]" />
                                <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Catalogs Managed</h2>
                            </div>
                            <Badge tone="indigo">{products.length} Assets</Badge>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/60 border-b border-slate-200">
                                        <SelectAllTh sel={sel} />
                                        <th className="px-6 py-3 text-[11px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-wider">Asset Details</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-wider text-center">Acquisition Price</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-wider text-center">Availability</th>
                                        <th className="px-6 py-3 text-[11px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-wider text-right">Visibility</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {products.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                                                <Archive className="h-12 w-12 mx-auto opacity-20 mb-3" />
                                                <p className="text-xs font-semibold uppercase tracking-wider">No assets associated</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        products.map(p => (
                                            <tr key={p.id} className="hover:bg-slate-50">
                                                <RowCheckboxTd sel={sel} id={p.id} />
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                                                            <img src={getImageUrl((p.image_url || p.image || '') as string) || "https://images.unsplash.com/photo-1596462502278-27bfdd403cc2?w=800"} className="w-full h-full object-cover" alt="" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-800 leading-tight">{p.name}</p>
                                                            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">{p.sku || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-sm font-bold text-slate-900 tabular-nums">Rs. {Number(p.cost_price || p.cost || 0).toLocaleString()}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Badge tone={p.quantity_in_stock && p.quantity_in_stock > 0 ? 'green' : 'red'}>
                                                        {p.quantity_in_stock || 0} Units
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {p.is_supplier_only ? (
                                                        <Badge tone="indigo">Isolated</Badge>
                                                    ) : (
                                                        <Badge tone="blue">Public</Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>

            <BulkBar
                sel={sel}
                entity="products"
                onExport={() => exportToCSV(
                    sel.selectedItems.map((p: any) => ({
                        name: p.name || '',
                        sku: p.sku || '',
                        cost_price: Number(p.cost_price || p.cost || 0),
                        quantity_in_stock: p.quantity_in_stock || 0,
                        visibility: p.is_supplier_only ? 'Isolated' : 'Public',
                    })),
                    'supplier-products.csv',
                )}
            />
        </div>
    );
}
