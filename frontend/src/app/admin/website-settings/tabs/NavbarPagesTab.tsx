'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Save, X, Loader2, Eye, Check, AlertCircle } from 'lucide-react';
import cmsService from '@/services/cms.service';
import toast from 'react-hot-toast';

interface NavbarPage {
    id?: number;
    name: string;
    slug?: string;
    description: string;
    icon_url: string;
    order: number;
    is_visible: boolean;
    created_at?: string;
    updated_at?: string;
}

// ── AMAZON STYLE COMPONENTS ──
const AmazonBtn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false, size = 'md' }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
        danger: 'bg-gradient-to-b from-[#f7b5b0] to-[#f08080] border-[#d32f2f] hover:from-[#f5a0a0] hover:to-[#ee6f6f] text-[#0f1111]',
    };
    const sizes = {
        sm: 'h-[28px] px-2 text-[11px]',
        md: 'h-[31px] px-4 text-[13px]',
        lg: 'h-[36px] px-6 text-[14px]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`${sizes[size]} rounded-[3px] font-medium border shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = "h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";

export default function NavbarPagesTab() {
    const [pages, setPages] = useState<NavbarPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [addingNew, setAddingNew] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [newPage, setNewPage] = useState<NavbarPage>({
        name: '', slug: '', description: '', icon_url: '', order: 0, is_visible: true
    });
    const [categoriesCounts, setCategoriesCounts] = useState<Record<number, number>>({});

    useEffect(() => {
        loadPages();
    }, []);

    const loadPages = async () => {
        setLoading(true);
        try {
            const data = await cmsService.getNavbarPages();
            setPages(Array.isArray(data) ? data : []);
            // Load categories count for each navbar page
            try {
                const counts = await cmsService.getNavbarPagesWithCategoriesCount();
                const countsMap: Record<number, number> = {};
                counts.forEach((item: any) => {
                    countsMap[item.id] = item.categories_count || 0;
                });
                setCategoriesCounts(countsMap);
            } catch { }
        } catch (error: any) {
            console.error('Failed to load navbar pages:', error);
            const msg = error?.response?.data?.detail || error?.response?.data || error?.message || 'Failed to load navbar pages';
            toast.error(typeof msg === 'string' ? msg : 'Failed to load navbar pages');
            setPages([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPage = async () => {
        if (!newPage.name.trim()) {
            toast.error('Please enter a page name');
            return;
        }
        setSaving(true);
        try {
            const created = await cmsService.createNavbarPage(newPage);
            setPages([...pages, created]);
            setNewPage({ name: '', slug: '', description: '', icon_url: '', order: 0, is_visible: true });
            setAddingNew(false);
            toast.success('Navbar page created');
        } catch (error) {
            toast.error('Failed to create navbar page');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePage = async (page: NavbarPage) => {
        if (!page.id) return;
        setSaving(true);
        try {
            const updated = await cmsService.updateNavbarPage(page.id, page);
            setPages(pages.map(p => p.id === page.id ? updated : p));
            setEditingId(null);
            toast.success('Navbar page updated');
        } catch (error) {
            toast.error('Failed to update navbar page');
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePage = async (id: number) => {
        if (!confirm('Are you sure you want to delete this navbar page? Associated categories will not be deleted.')) return;
        try {
            await cmsService.deleteNavbarPage(id);
            setPages(pages.filter(p => p.id !== id));
            toast.success('Navbar page deleted');
        } catch (error) {
            toast.error('Failed to delete navbar page');
        }
    };

    const handleReorder = async (pages: NavbarPage[]) => {
        try {
            const orders = pages.map((p, idx) => ({ id: p.id, order: idx }));
            await cmsService.reorderNavbarPages(orders);
            setPages(pages.sort((a, b) => a.order - b.order));
            toast.success('Order updated');
        } catch {
            toast.error('Failed to reorder pages');
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-[#c45500]" />
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-[21px] font-bold text-[#111]">Navbar Pages</h2>
                    <p className="text-[13px] text-[#565959] mt-1">Manage pages that appear in the top navigation bar</p>
                </div>
                {!addingNew && (
                    <AmazonBtn onClick={() => setAddingNew(true)} className="flex items-center gap-2">
                        <Plus size={14} /> Add New Page
                    </AmazonBtn>
                )}
            </div>

            {/* Add New Form */}
            {addingNew && (
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                    <div className="bg-[#f7f8fa] border-b border-[#ddd] px-6 py-3 flex items-center justify-between">
                        <h3 className="font-bold text-[#111]">Create New Navbar Page</h3>
                        <button onClick={() => setAddingNew(false)} className="text-[#565959] hover:text-[#111]">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-bold text-[#111]">Page Name *</label>
                                <input type="text" value={newPage.name}
                                    onChange={e => setNewPage({ ...newPage, name: e.target.value })}
                                    placeholder="e.g., Skincare Products"
                                    className={inputCls} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-bold text-[#111]">Icon URL</label>
                                <input type="text" value={newPage.icon_url}
                                    onChange={e => setNewPage({ ...newPage, icon_url: e.target.value })}
                                    placeholder="e.g., /icons/skincare.svg"
                                    className={inputCls} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-bold text-[#111]">Description</label>
                            <textarea rows={2} value={newPage.description}
                                onChange={e => setNewPage({ ...newPage, description: e.target.value })}
                                placeholder="Internal description for admin"
                                className="w-full px-3 py-2 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2_rgba(228,121,17,0.5)] bg-white resize-none" />
                        </div>
                        <div className="flex items-center gap-2 pt-4 border-t border-[#eee]">
                            <input type="checkbox" id="visible" checked={newPage.is_visible}
                                onChange={e => setNewPage({ ...newPage, is_visible: e.target.checked })}
                                className="cursor-pointer" />
                            <label htmlFor="visible" className="text-[13px] font-medium text-[#111] cursor-pointer">Visible on storefront</label>
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-4">
                            <AmazonBtn onClick={() => setAddingNew(false)} variant="secondary" size="sm">Cancel</AmazonBtn>
                            <AmazonBtn onClick={handleAddPage} loading={saving} size="sm">
                                <Check size={14} /> Create Page
                            </AmazonBtn>
                        </div>
                    </div>
                </div>
            )}

            {/* Pages Table */}
            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                <div className="bg-[#f7f8fa] border-b border-[#ddd] px-6 py-3">
                    <h3 className="font-bold text-[#111]">All Navbar Pages ({pages.length})</h3>
                </div>

                {pages.length === 0 ? (
                    <div className="p-12 text-center">
                        <AlertCircle size={40} className="mx-auto text-[#aaa] mb-3" />
                        <p className="text-[#565959] text-[14px]">No navbar pages created yet. Start by creating your first page.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[13px]">
                            <thead>
                                <tr className="border-b border-[#eee] bg-[#fafbfc]">
                                    <th className="px-6 py-3 text-left font-bold text-[#111]">ID</th>
                                    <th className="px-6 py-3 text-left font-bold text-[#111]">Name</th>
                                    <th className="px-6 py-3 text-left font-bold text-[#111]">Slug</th>
                                    <th className="px-6 py-3 text-left font-bold text-[#111]">Categories</th>
                                    <th className="px-6 py-3 text-center font-bold text-[#111]">Order</th>
                                    <th className="px-6 py-3 text-center font-bold text-[#111]">Status</th>
                                    <th className="px-6 py-3 text-left font-bold text-[#111]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pages.map((page, idx) => (
                                    <tr key={page.id ?? idx} className="border-b border-[#eee] hover:bg-[#fafbfc] transition-colors group">
                                        <td className="px-6 py-3 text-[13px] text-[#444]">{page.id ?? '-'}</td>
                                        <td className="px-6 py-3">
                                            {editingId === page.id ? (
                                                <input type="text" value={page.name}
                                                    onChange={e => setPages(pages.map(p => p.id === page.id ? { ...p, name: e.target.value } : p))}
                                                    className={inputCls} />
                                            ) : (
                                                <div className="font-medium text-[#111]">{page.name}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            <code className="bg-[#f1f3f5] text-[#d63031] px-2 py-1 rounded text-[11px] font-mono">{page.slug}</code>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[12px] font-medium">
                                                {categoriesCounts[page.id || 0] || 0} categories
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            {editingId === page.id ? (
                                                <input type="number" value={page.order}
                                                    onChange={e => setPages(pages.map(p => p.id === page.id ? { ...p, order: parseInt(e.target.value) } : p))}
                                                    className={`${inputCls} text-center w-16 mx-auto`} />
                                            ) : (
                                                <span className="font-medium">{page.order}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            {editingId === page.id ? (
                                                <input type="checkbox" checked={page.is_visible}
                                                    onChange={e => setPages(pages.map(p => p.id === page.id ? { ...p, is_visible: e.target.checked } : p))}
                                                    className="cursor-pointer w-5 h-5" />
                                            ) : (
                                                page.is_visible ? (
                                                    <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-[11px] font-bold">Active</span>
                                                ) : (
                                                    <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-[11px] font-bold">Hidden</span>
                                                )
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                {editingId === page.id ? (
                                                    <>
                                                        <AmazonBtn onClick={() => handleUpdatePage(page)} loading={saving} size="sm" className="gap-1">
                                                            <Save size={12} /> Save
                                                        </AmazonBtn>
                                                        <AmazonBtn onClick={() => setEditingId(null)} variant="secondary" size="sm" className="gap-1">
                                                            <X size={12} /> Cancel
                                                        </AmazonBtn>
                                                    </>
                                                ) : (
                                                    <>
                                                        <AmazonBtn onClick={() => setEditingId(page.id || null)} variant="secondary" size="sm" className="gap-1">
                                                            <Edit3 size={12} /> Edit
                                                        </AmazonBtn>
                                                        <AmazonBtn onClick={() => handleDeletePage(page.id!)} variant="danger" size="sm" className="gap-1">
                                                            <Trash2 size={12} /> Delete
                                                        </AmazonBtn>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-[4px] p-4">
                <p className="text-[13px] text-blue-800 flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span><strong>Tip:</strong> Create navbar pages first, then assign categories to them. Categories will appear as dropdown items in the navbar under their parent page.</span>
                </p>
            </div>
        </div>
    );
}
