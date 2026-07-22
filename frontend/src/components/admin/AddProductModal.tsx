'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   Shared "Add Product" popup — used by the New Purchase page and the Products
   List page so the popup is identical everywhere. Creates a real SupplierProduct
   (tagged with its Company) and has an inline "Find Company" sub-popup.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { companyService } from '@/services/company.service';
import { productService } from '@/services/product.service';
import { Modal, Button, ui } from '@/components/admin/ui';
import toast from 'react-hot-toast';

const EMPTY_P = { name: '', company: '', barcode: '', packing: '', reorder: '', category: '', status: 'ACTIVE' };
const selectCls = ui.inputBase + ' cursor-pointer';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-[12px] font-bold text-slate-700 mb-1">{label}{required && <span className="text-rose-600 ml-0.5">*</span>}</label>
            {children}
        </div>
    );
}

export default function AddProductModal({
    open, onClose, companies, onCompaniesReload, supplierId, suppliers, onCreated,
}: {
    open: boolean;
    onClose: () => void;
    companies: any[];
    onCompaniesReload: () => void;
    supplierId?: string;          // preferred supplier (purchase context)
    suppliers?: any[];            // fallback supplier list
    onCreated: (product: any) => void;
}) {
    const [pForm, setPForm] = useState({ ...EMPTY_P });
    const [cForm, setCForm] = useState({ name: '', category: '' });
    const [showCompany, setShowCompany] = useState(false);
    const [savingP, setSavingP] = useState(false);
    const [savingC, setSavingC] = useState(false);

    useEffect(() => { if (open) setPForm({ ...EMPTY_P }); }, [open]);

    const resolveSupplier = () => supplierId || (suppliers && suppliers[0]?.id ? String(suppliers[0].id) : '');

    const createProduct = async () => {
        if (!pForm.name.trim()) return toast.error('Enter a product name.');
        const sup = resolveSupplier();
        if (!sup) return toast.error('Add a supplier first (Supplier Registry).');
        setSavingP(true);
        try {
            const created = await productService.createSupplier({
                name: pForm.name.trim(),
                supplier: sup,
                company: pForm.company || '',
                sku: pForm.barcode || `SKU-${Date.now().toString().slice(-6)}`,
                barcode: pForm.barcode || '',
                status: pForm.status,
                price: '0',
                retail_price: '0',
            });
            onCreated({ ...created, _packing: parseInt(pForm.packing) || 1, _company: pForm.company });
            onClose();
            toast.success('Product created.');
        } catch (e: any) {
            toast.error(e?.response?.data?.name?.[0] || e?.response?.data?.detail || 'Failed to create product');
        } finally { setSavingP(false); }
    };

    const createCompany = async () => {
        if (!cForm.name.trim()) return toast.error('Enter a company name.');
        setSavingC(true);
        try {
            const created = await (companyService as any).createCompany({ name: cForm.name.trim(), category: cForm.category.trim() });
            onCompaniesReload();
            if (created?.id) setPForm(f => ({ ...f, company: String(created.id) }));
            setCForm({ name: '', category: '' });
            setShowCompany(false);
            toast.success('Company added to the list.');
        } catch (e: any) {
            toast.error(e?.response?.data?.name?.[0] || e?.response?.data?.detail || 'Failed to add company');
        } finally { setSavingC(false); }
    };

    return (
        <>
            <Modal open={open} onClose={onClose} title="Add Product" size="md">
                <div className="space-y-4 text-left">
                    <Field label="Product Name" required>
                        <input className={ui.inputBase} value={pForm.name} onChange={e => setPForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Bio 7day cream large" autoFocus />
                    </Field>
                    <Field label="Company">
                        <div className="flex gap-2">
                            <select className={selectCls} value={pForm.company} onChange={e => setPForm(f => ({ ...f, company: e.target.value }))}>
                                <option value="">Select any one</option>
                                {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <Button variant="outline" className="shrink-0 whitespace-nowrap" onClick={() => { setCForm({ name: '', category: '' }); setShowCompany(true); }}>
                                <Building2 size={14} /> Find Company
                            </Button>
                        </div>
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Bar Code">
                            <input className={ui.inputBase} value={pForm.barcode} onChange={e => setPForm(f => ({ ...f, barcode: e.target.value }))} placeholder="Bar code" />
                        </Field>
                        <Field label="Category">
                            <input className={ui.inputBase} value={pForm.category} onChange={e => setPForm(f => ({ ...f, category: e.target.value }))} placeholder="Category" />
                        </Field>
                        <Field label="Packing">
                            <input className={ui.inputBase} type="number" min="1" value={pForm.packing} onChange={e => setPForm(f => ({ ...f, packing: e.target.value }))} placeholder="1" />
                        </Field>
                        <Field label="Re-Order Qty">
                            <input className={ui.inputBase} type="number" min="0" value={pForm.reorder} onChange={e => setPForm(f => ({ ...f, reorder: e.target.value }))} placeholder="0" />
                        </Field>
                        <Field label="Status">
                            <select className={selectCls} value={pForm.status} onChange={e => setPForm(f => ({ ...f, status: e.target.value }))}>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </Field>
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button variant="primary" onClick={createProduct} disabled={savingP}>
                            <Plus size={14} /> {savingP ? 'Saving…' : 'Add Product'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Nested "Add New Company" popup */}
            <Modal open={showCompany} onClose={() => setShowCompany(false)} title="Add New Company" size="sm">
                <div className="space-y-4 text-left">
                    <Field label="Company Name" required>
                        <input className={ui.inputBase} value={cForm.name} onChange={e => setCForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Amour Company" autoFocus />
                    </Field>
                    <Field label="Company Category">
                        <input className={ui.inputBase} value={cForm.category} onChange={e => setCForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Local / Imported / Pakistani" />
                    </Field>
                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                        <Button variant="outline" onClick={() => setShowCompany(false)}>Cancel</Button>
                        <Button variant="primary" onClick={createCompany} disabled={savingC}>
                            <Plus size={14} /> {savingC ? 'Saving…' : 'Add Company'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
