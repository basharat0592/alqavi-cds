'use client';

import PolicyPage from '@/components/layout/PolicyPage';

export default function FaqPage() {
    return (
        <PolicyPage
            light
            eyebrow="Help Center"
            title="Frequently Asked Questions"
            intro="Everything you need to know about ordering, shipping, returns, and our products. Can't find your answer? Reach out to our support team any time."
            sections={[
                {
                    heading: 'Orders & Payment',
                    body: [
                        'You can place an order by adding items to your cart and completing checkout. No account is required, though signing in lets you track orders easily.',
                        'We accept Cash on Delivery across Gilgit-Baltistan, along with other payment methods shown at checkout depending on your region.',
                        'Once an order is placed you will receive a confirmation with your order number, which you can use to track its status.',
                    ],
                },
                {
                    heading: 'Shipping & Delivery',
                    body: [
                        'Orders are typically processed within 1-2 business days. Delivery times vary by location, usually 3-7 business days.',
                        'Free delivery is available on all orders over Rs. 5,000. Standard shipping rates apply below that threshold.',
                        'You can track your parcel any time from the Track Parcel page using your order number.',
                    ],
                },
                {
                    heading: 'Returns & Refunds',
                    body: [
                        'Unopened products in their original packaging can be returned within 7 days of delivery.',
                        'For hygiene reasons, opened cosmetics and skincare cannot be returned unless the item is damaged or defective.',
                        'Approved refunds are processed to your original payment method within 5-10 business days.',
                    ],
                },
                {
                    heading: 'Product Authenticity',
                    body: [
                        'Every product we sell is 100% genuine and sourced directly from authorized brands and verified suppliers.',
                        'If you ever have concerns about a product, contact our team and we will resolve it promptly.',
                    ],
                },
                {
                    heading: 'Accounts & Support',
                    body: [
                        'Creating an account lets you save addresses, track orders, manage wishlists, and check out faster.',
                        'For any other questions, our customer service team is available through the Help Center and contact page.',
                    ],
                },
            ]}
        />
    );
}
