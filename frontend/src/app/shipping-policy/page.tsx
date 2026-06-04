'use client';

import PolicyPage from '@/components/layout/PolicyPage';

export default function ShippingPolicyPage() {
    return (
        <PolicyPage
            eyebrow="Logistics"
            title="Shipping & Delivery"
            intro="We deliver premium cosmetics and skincare across Pakistan, with dedicated logistics reaching even the most remote areas of Gilgit-Baltistan."
            sections={[
                {
                    heading: 'Delivery Coverage',
                    body: [
                        'We ship nationwide across Pakistan, including major cities and remote northern regions such as Gilgit, Skardu, Hunza, and surrounding valleys.',
                        'Remote and mountainous destinations may require additional transit time depending on weather and road conditions.',
                    ],
                },
                {
                    heading: 'Delivery Timeframes',
                    body: [
                        'Major cities: typically 2–4 business days after dispatch.',
                        'Gilgit-Baltistan and remote areas: typically 4–8 business days, subject to seasonal accessibility.',
                        'Orders are processed within 1–2 business days of confirmation.',
                    ],
                },
                {
                    heading: 'Shipping Charges',
                    body: [
                        'Shipping rates are calculated at checkout based on order weight and destination.',
                        'Cash on Delivery (COD) is available on eligible orders. Any applicable COD handling fees are shown before you confirm your order.',
                    ],
                },
                {
                    heading: 'Order Tracking',
                    body: [
                        'Once your order is dispatched, you will receive a tracking ID.',
                        'You can track your parcel at any time using the Track Parcel page with your order or tracking ID.',
                    ],
                },
            ]}
        />
    );
}
