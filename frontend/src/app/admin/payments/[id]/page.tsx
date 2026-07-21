"use client";

import { use } from 'react';
import SaleDetailView from '@/components/admin/SaleDetailView';

// Payments-side "View" opens the same full sale-detail view, but keeps the user
// inside the Payments section (back link + post-delete both return to Payments).
export default function PaymentSaleView({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <SaleDetailView id={id} backHref="/admin/payments" backLabel="Back to Payments" deleteRedirect="/admin/payments" />;
}
