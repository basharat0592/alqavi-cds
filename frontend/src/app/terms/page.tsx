'use client';

import PolicyPage from '@/components/layout/PolicyPage';

export default function TermsPage() {
    return (
        <PolicyPage
            eyebrow="Legal"
            title="Conditions of Use"
            intro="By accessing and using our website and services, you agree to the following terms and conditions."
            sections={[
                {
                    heading: 'Use of the Website',
                    body: [
                        'You agree to use this website for lawful purposes only and not to misuse, disrupt, or attempt unauthorized access to our systems.',
                        'You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.',
                    ],
                },
                {
                    heading: 'Products & Pricing',
                    body: [
                        'We strive to display accurate product information, pricing, and availability, but errors may occasionally occur.',
                        'We reserve the right to correct any errors and to update prices and availability without prior notice.',
                        'All products are genuine and sourced from verified brands and authorized channels.',
                    ],
                },
                {
                    heading: 'Orders & Payment',
                    body: [
                        'Placing an order constitutes an offer to purchase, which is confirmed once we accept and process it.',
                        'We accept Cash on Delivery and other payment methods shown at checkout, subject to availability in your region.',
                        'We reserve the right to refuse or cancel any order in cases of suspected fraud or pricing errors.',
                    ],
                },
                {
                    heading: 'Limitation of Liability',
                    body: [
                        'Our liability is limited to the value of the products purchased.',
                        'These terms are governed by the laws of Pakistan. We may update these conditions from time to time, and continued use of the site constitutes acceptance of any changes.',
                    ],
                },
            ]}
        />
    );
}
