"use client";

import { use } from 'react';
import SaleDetailView from '@/components/admin/SaleDetailView';

export default function SaleDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <SaleDetailView id={id} backHref="/admin/sales" backLabel="Back to Sales" deleteRedirect="/admin/sales" />;
}
