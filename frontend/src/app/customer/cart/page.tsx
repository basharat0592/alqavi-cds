'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import PageLoader from '@/components/ui/PageLoader';

/**
 * REDIRECTOR PAGE
 * As per the new "Slide-Out Drawer" requirement, we no longer use a standalone cart page.
 * Accessing this route will redirect the user to the shop and trigger the drawer.
 */
export default function CartPage() {
    const router = useRouter();
    const { openCart } = useCart();

    useEffect(() => {
        // Open the cart drawer globally
        openCart();
        // Redirect to the shop/landing page
        router.replace('/customer');
    }, [router, openCart]);

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center">
            <PageLoader />
            <p className="mt-4 text-slate-500 font-medium animate-pulse">Entering Shop...</p>
        </div>
    );
}
