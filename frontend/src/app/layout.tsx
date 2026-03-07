import './globals.css';
import { Inter, Playfair_Display } from 'next/font/google';
import { CartProvider } from '@/context/CartContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata = {
    title: 'Al-Qavi Cosmetics - Premium Beauty Wholesale',
    description: 'The #1 Platform for Wholesale Cosmetics and Beauty Products by Al-Qavi',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${playfair.variable} font-sans`}>
                <CartProvider>
                    {children}
                </CartProvider>
            </body>
        </html>
    );
}
