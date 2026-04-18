"use client";

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import PageLoader from '@/components/ui/PageLoader';

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    useEffect(() => {
        router.replace(`/admin/sales/${id}/invoice`);
    }, [id, router]);

    return <PageLoader />;
}
