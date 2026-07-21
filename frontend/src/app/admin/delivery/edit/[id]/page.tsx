"use client";

import { use } from 'react';
import DeliveryForm from '@/components/admin/DeliveryForm';

export default function EditDeliveryPersonPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <DeliveryForm id={id} />;
}
