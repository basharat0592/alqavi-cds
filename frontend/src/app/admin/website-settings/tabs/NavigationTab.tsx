'use client';
import { useState } from 'react';
import { Plus, Save, X, Loader2, ChevronRight, Menu as MenuIcon } from 'lucide-react';
import cmsService, { NavigationMenu, NavigationItem } from '@/services/cms.service';
import toast from 'react-hot-toast';
import { ui } from '@/components/admin/ui';

interface Props {
    menus: NavigationMenu[];
    setMenus: (m: NavigationMenu[]) => void;
}

const LOCATIONS = [
    { id: 'header', label: 'Main Header Navigation' },
    { id: 'footer_1', label: 'Footer - Useful Links' },
    { id: 'footer_2', label: 'Footer - Account & Support' },
];

// ── AMAZON STYLE COMPONENTS ──
const AmazonBtn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-[#13B0D1] border-[#0E8CA8] hover:bg-[#0E8CA8] text-[#0F172A]',
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
export default function NavigationTab({ menus, setMenus }: Props) {
    const [activeMenu, setActiveMenu] = useState<number | null>(menus[0]?.id || null);
    const [addingItem, setAddingItem] = useState(false);
    const [newItem, setNewItem] = useState({ title: '', url: '' });
    const [editingItem, setEditingItem] = useState<NavigationItem | null>(null);
    const [saving, setSaving] = useState(false);

    const currentMenu = menus.find(m => m.id === activeMenu);

    const createMenu = async (location: string) => {
        const loc = LOCATIONS.find(l => l.id === location)!;
        try {
            const m = await cmsService.createMenu({ name: loc.label, location });
            setMenus([...menus, m]);
            setActiveMenu(m.id!);
            toast.success('Menu location initialized');
        } catch { toast.error('Failed to create menu'); }
    };

    const addItem = async () => {
        if (!newItem.title || !newItem.url || !activeMenu) return;
        setSaving(true);
        try {
            const created = await cmsService.createNavItem({ title: newItem.title, url: newItem.url, order: currentMenu?.items.length || 0, parent: null, menu: activeMenu } as any);
            setMenus(menus.map(m => m.id === activeMenu ? { ...m, items: [...m.items, created] } : m));
            setNewItem({ title: '', url: '' });
            setAddingItem(false);
            toast.success('Link added to menu');
        } catch { toast.error('Failed to add item'); }
        finally { setSaving(false); }
    };

    const saveEditItem = async () => {
        if (!editingItem?.id) return;
        setSaving(true);
        try {
            const updated = await cmsService.updateNavItem(editingItem.id, { title: editingItem.title, url: editingItem.url });
            setMenus(menus.map(m => ({ ...m, items: m.items.map(i => i.id === editingItem.id ? updated : i) })));
            setEditingItem(null);
            toast.success('Link updated');
        } catch { toast.error('Update failed'); }
        finally { setSaving(false); }
    };

    const deleteItem = async (id: number) => {
        if (!confirm('Permanently remove this navigation link?')) return;
        try {
            await cmsService.deleteNavItem(id);
            setMenus(menus.map(m => ({ ...m, items: m.items.filter(i => i.id !== id) })));
            toast.success('Link removed');
        } catch { toast.error('Delete failed'); }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 text-left">
            <div className="grid md:grid-cols-4 gap-8">

                {/* Menu List */}
                <div className="md:col-span-1 space-y-3">
                    <p className="text-[13px] font-bold text-[#64748B] uppercase px-1">Menu Sets</p>
                    <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm overflow-hidden">
                        {LOCATIONS.map(loc => {
                            const menu = menus.find(m => m.location === loc.id);
                            const isActive = activeMenu === menu?.id;
                            return menu ? (
                                <button key={loc.id} onClick={() => setActiveMenu(menu.id!)}
                                    className={`w-full text-left px-4 py-3 text-[13px] font-medium border-l-4 transition-all flex items-center justify-between border-b border-[#eee] last:border-0 ${isActive ? 'border-[#13B0D1] bg-[#f8fafc] text-[#111]' : 'border-transparent text-[#64748B] hover:bg-[#f8fafc]'
                                        }`}>
                                    <span>{loc.label.split(' - ')[1] || loc.label}</span>
                                    <span className="text-[11px] font-bold text-[#888]">{menu.items.length}</span>
                                </button>
                            ) : (
                                <button key={loc.id} onClick={() => createMenu(loc.id)}
                                    className="w-full text-left px-4 py-3 text-[13px] font-bold text-[#007185] hover:underline flex items-center gap-2 border-b border-[#eee] last:border-0">
                                    <Plus size={14} /> Initialize {loc.id.replace('_', ' ')}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Items Editor */}
                <div className="md:col-span-3 space-y-4">
                    <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-4 md:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <h3 className="font-bold text-[#111] text-[15px] flex items-center gap-2">
                                <MenuIcon size={16} />
                                {currentMenu ? currentMenu.name : 'Select a Menu Set'}
                            </h3>
                            {currentMenu && (
                                <AmazonBtn onClick={() => setAddingItem(true)} variant="secondary" className="h-[28px] text-[12px] w-full sm:w-auto justify-center">
                                    <Plus size={12} /> Add Navigation Link
                                </AmazonBtn>
                            )}
                        </div>

                        <div className="p-0">
                            {!currentMenu ? (
                                <div className="p-16 text-center text-[#888]">
                                    <p className="text-[14px]">Select a menu location from the left sidebar to manage links.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-[#eee]">
                                    {currentMenu.items.length === 0 && !addingItem && (
                                        <div className="p-12 text-center text-[#888]">
                                            <p className="text-[13px]">No links defined for this menu yet.</p>
                                            <button onClick={() => setAddingItem(true)} className="text-[#007185] font-bold hover:underline mt-2">Add your first link</button>
                                        </div>
                                    )}

                                    {/* List Items */}
                                    {currentMenu.items.map((item, idx) => (
                                        <div key={item.id} className="group flex items-center gap-4 px-6 py-4 hover:bg-[#fcfcfc] transition-colors">
                                            {editingItem && editingItem.id === item.id ? (
                                                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                                                    <input value={editingItem.title} onChange={e => setEditingItem({ ...editingItem, title: e.target.value } as NavigationItem)}
                                                        className={inputCls + " w-full sm:flex-1 font-bold"} placeholder="Label (e.g. Shop All)" />
                                                    <input value={editingItem.url} onChange={e => setEditingItem({ ...editingItem, url: e.target.value } as NavigationItem)}
                                                        className={inputCls + " w-full sm:flex-1 font-mono"} placeholder="URL (e.g. /shop)" />
                                                    <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
                                                        <AmazonBtn onClick={saveEditItem} loading={saving} className="h-[31px] w-full sm:w-auto justify-center">Update</AmazonBtn>
                                                        <button onClick={() => setEditingItem(null)} className="p-2 text-slate-400 hover:text-[#111] border border-[#e2e8f0] rounded-lg hover:bg-slate-50"><X size={16} /></button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="text-[#888] font-mono text-[11px] w-6">{idx + 1}</div>
                                                    <div className="flex-1">
                                                        <p className="text-[14px] font-bold text-[#111]">{item.title}</p>
                                                        <p className="text-[12px] text-[#007185] hover:underline cursor-pointer">{item.url}</p>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-2.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                                                        <button onClick={() => setEditingItem(item)} className="text-[12px] font-bold text-[#0E8CA8] hover:underline">Edit</button>
                                                        <span className="text-slate-300">|</span>
                                                        <button onClick={() => deleteItem(item.id!)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}

                                        <div className="bg-[#e6f7fb] px-4 md:px-6 py-5 border-t border-[#fbd38d]">
                                            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                                                <div className="flex-1 space-y-1 w-full">
                                                    <label className="text-[11px] font-bold text-[#111] uppercase">Link Text</label>
                                                    <input value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                                                        className={inputCls + " w-full font-bold"} placeholder="e.g. New Arrivals" autoFocus />
                                                </div>
                                                <div className="flex-1 space-y-1 w-full">
                                                    <label className="text-[11px] font-bold text-[#111] uppercase">Target URL</label>
                                                    <input value={newItem.url} onChange={e => setNewItem({ ...newItem, url: e.target.value })}
                                                        className={inputCls + " w-full font-mono"} placeholder="e.g. /shop/new" />
                                                </div>
                                                <div className="flex items-center gap-2 justify-end w-full sm:w-auto pt-2 sm:pt-0">
                                                    <AmazonBtn onClick={addItem} loading={saving} className="w-full sm:w-auto justify-center">Add to Menu</AmazonBtn>
                                                    <button onClick={() => setAddingItem(false)} className="text-[13px] font-bold text-[#007185] hover:underline px-2 whitespace-nowrap">Cancel</button>
                                                </div>
                                            </div>
                                        </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {currentMenu && (
                        <div className="bg-[#f0f2f2] border border-[#e2e8f0] rounded-lg px-6 py-4 flex items-center gap-3">
                            <div className="p-2 bg-white rounded-full border border-[#e2e8f0] shadow-sm">
                                <MenuIcon size={16} className="text-[#c45500]" />
                            </div>
                            <p className="text-[12px] text-[#64748B] font-medium leading-relaxed">
                                Tip: Use absolute paths like <span className="font-mono bg-white px-1">/shop</span> or <span className="font-mono bg-white px-1">/contact</span>. External links should start with <span className="font-mono bg-white px-1">https://</span>.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
