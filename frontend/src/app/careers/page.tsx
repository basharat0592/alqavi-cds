'use client';

import PolicyPage from '@/components/layout/PolicyPage';

export default function CareersPage() {
    return (
        <PolicyPage
            light
            eyebrow="Join Us"
            title="Careers"
            intro="We're building Gilgit-Baltistan's leading destination for premium beauty. If you're passionate about cosmetics, customer experience, and growth, we'd love to hear from you."
            sections={[
                {
                    heading: 'Why Work With Us',
                    body: [
                        'Be part of a fast-growing beauty and skincare distributor connecting global brands with the northern regions.',
                        'We value initiative, craftsmanship, and a genuine care for our customers and partners.',
                        'Enjoy a collaborative culture, room to grow, and the chance to shape a brand from the ground up.',
                    ],
                },
                {
                    heading: 'Open Areas',
                    body: [
                        'Retail & Customer Experience — help customers discover the right products and deliver standout service.',
                        'Operations & Logistics — keep our supply chain, inventory, and deliveries running smoothly.',
                        'Marketing & Content — tell our story across social media, photography, and campaigns.',
                        'Technology — build and improve the platform that powers our storefront.',
                    ],
                },
                {
                    heading: 'How to Apply',
                    body: [
                        'Send your CV and a short note about the role you are interested in to our team.',
                        'We review every application and will reach out if there is a good fit. Even if there is no current opening, we keep promising candidates on file.',
                    ],
                },
            ]}
        />
    );
}
