"use client";

import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';

/**
 * The app's single toast container. Admin screens show messages at the top
 * centre (where the eye already is on the Trade forms); the storefront keeps
 * them top-right.
 */
export default function AppToaster() {
    const pathname = usePathname() || '';
    const admin = pathname.startsWith('/admin');
    return (
        <Toaster
            position={admin ? 'top-center' : 'top-right'}
            toastOptions={{ duration: 3000 }}
            containerStyle={admin ? { top: 56 } : undefined}
        />
    );
}
