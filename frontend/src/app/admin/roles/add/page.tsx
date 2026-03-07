'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X, Shield } from 'lucide-react';

const AVAILABLE_PERMISSIONS = [
    { id: 'users_manage', name: 'Manage Users', category: 'User Management' },
    { id: 'users_view', name: 'View Users', category: 'User Management' },
    { id: 'roles_manage', name: 'Manage Roles', category: 'Roles & Permissions' },
    { id: 'roles_view', name: 'View Roles', category: 'Roles & Permissions' },
    { id: 'products_manage', name: 'Manage Products', category: 'Products' },
    { id: 'products_view', name: 'View Products', category: 'Products' },
    { id: 'inventory_manage', name: 'Manage Inventory', category: 'Inventory' },
    { id: 'orders_manage', name: 'Manage Orders', category: 'Sales' },
    { id: 'orders_create', name: 'Create Orders', category: 'Sales' },
    { id: 'orders_view', name: 'View Orders', category: 'Sales' },
    { id: 'purchases_manage', name: 'Manage Purchases', category: 'Purchases' },
    { id: 'suppliers_view', name: 'View Suppliers', category: 'Suppliers' },
    { id: 'accounting_manage', name: 'Manage Accounting', category: 'Finance' },
    { id: 'transactions_view', name: 'View Transactions', category: 'Finance' },
    { id: 'reports_view', name: 'View Reports', category: 'Reports' },
    { id: 'settings_manage', name: 'Manage Settings', category: 'System' },
    { id: 'invoices_view', name: 'View Invoices', category: 'Billing' },
    { id: 'deliveries_manage', name: 'Manage Deliveries', category: 'Logistics' },
];

export default function AddRolePage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        color: '#FF9900',
    });
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleTogglePermission = (permissionId: string) => {
        setSelectedPermissions(prev =>
            prev.includes(permissionId)
                ? prev.filter(id => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('Role name is required');
            return;
        }

        setIsLoading(true);
        try {
            const newRole = {
                id: Date.now().toString(),
                name: formData.name,
                description: formData.description,
                color: formData.color,
                permissions: selectedPermissions,
                userCount: 0,
                createdAt: new Date().toISOString(),
            };

            const savedRoles = localStorage.getItem('qavi_roles');
            const roles = savedRoles ? JSON.parse(savedRoles) : [];
            roles.push(newRole);
            localStorage.setItem('qavi_roles', JSON.stringify(roles));

            router.push('/admin/roles');
        } finally {
            setIsLoading(false);
        }
    };

    const permissionsByCategory = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
        if (!acc[perm.category]) {
            acc[perm.category] = [];
        }
        acc[perm.category].push(perm);
        return acc;
    }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/admin/roles"
                    className="inline-flex items-center gap-2 text-[#FF9900] hover:text-[#005070] font-medium mb-4">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Roles
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Shield className="h-8 w-8 text-[#FF9900]" />
                    Create New Role
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                    <h2 className="text-lg font-bold text-gray-900">Basic Information</h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Role Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Junior Manager"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF9900] focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe the purpose and responsibilities of this role..."
                            rows={4}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF9900] focus:border-transparent resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Role Color
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                className="h-12 w-20 rounded-lg cursor-pointer border border-gray-300"
                            />
                            <span className="text-sm text-gray-600">{formData.color}</span>
                        </div>
                    </div>
                </div>

                {/* Permissions */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Permissions</h2>
                        <p className="text-sm text-gray-600">Select which actions this role can perform</p>
                    </div>

                    {Object.entries(permissionsByCategory).map(([category, perms]) => (
                        <div key={category} className="border-t border-gray-100 pt-6">
                            <h3 className="font-semibold text-gray-900 mb-3">{category}</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {perms.map((perm) => (
                                    <label
                                        key={perm.id}
                                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                                        <input
                                            type="checkbox"
                                            checked={selectedPermissions.includes(perm.id)}
                                            onChange={() => handleTogglePermission(perm.id)}
                                            className="h-4 w-4 text-[#FF9900] rounded"
                                        />
                                        <span className="text-sm font-medium text-gray-700">{perm.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}

                    <p className="text-xs text-gray-500 pt-4 border-t border-gray-100">
                        Selected: {selectedPermissions.length} permission{selectedPermissions.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                    <Link
                        href="/admin/roles"
                        className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium">
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#FF9900] to-[#005070] text-white rounded-lg hover:shadow-lg transition font-medium disabled:opacity-50">
                        <Plus className="h-5 w-5" />
                        {isLoading ? 'Creating...' : 'Create Role'}
                    </button>
                </div>
            </form>
        </div>
    );
}
