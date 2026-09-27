import './globals.css';
import { Inter, Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });
// The admin rail runs on its own face — a touch more geometric than Inter,
// which keeps the nav distinct from page content set in Inter.
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-jakarta' });

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
            <body className={`${inter.variable} ${playfair.variable} ${jakarta.variable} font-sans`} suppressHydrationWarning={true}>
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
