'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ShopRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/customer/shop');
    }, [router]);

    return null;
}
