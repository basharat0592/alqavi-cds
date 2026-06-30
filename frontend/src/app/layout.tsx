import './globals.css';
import { Inter, Playfair_Display } from 'next/font/google';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata = {
    title: 'Al-Qavi Cosmetics - Premium Beauty Wholesale',
    description: 'The #1 Platform for Wholesale Cosmetics and Beauty Products by Al-Qavi',
};

import { Toaster } from 'react-hot-toast';
import WhatsAppButton from '@/components/ui/WhatsAppButton';
import CartDrawer from '@/components/layout/CartDrawer';
import SiteIdentityManager from '@/components/layout/SiteIdentityManager';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning={true}>
            <body className={`${inter.variable} ${playfair.variable} font-sans`} suppressHydrationWarning={true}>
                <SiteIdentityManager />
                <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
                <WhatsAppButton />
                <CartProvider>
                    <WishlistProvider>
                        <CartDrawer />
                        {children}
                    </WishlistProvider>
                </CartProvider>
            </body>
        </html>
    );
}
