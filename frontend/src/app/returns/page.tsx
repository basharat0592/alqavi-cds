'use client';

import PolicyPage from '@/components/layout/PolicyPage';

export default function ReturnsPage() {
    return (
        <PolicyPage
            eyebrow="Customer Care"
            title="Returns & Refunds"
            intro="Your satisfaction matters to us. If something isn't right with your order, we're here to make it right."
            sections={[
                {
                    heading: 'Return Eligibility',
                    body: [
                        'Returns are accepted within 7 days of delivery for items that are unused, unopened, and in their original packaging.',
                        'For hygiene and safety reasons, opened cosmetics and skincare products cannot be returned unless they arrived damaged, defective, or incorrect.',
                    ],
                },
                {
                    heading: 'How to Request a Return',
                    body: [
                        'Log in to your account and open the order from your dashboard to submit a return request.',
                        'Provide the reason for the return and, where relevant, a photo of the product so our team can assist you faster.',
                        'Our team will review your request and respond with the next steps.',
                    ],
                },
                {
                    heading: 'Damaged or Incorrect Items',
                    body: [
                        'If you received a damaged, defective, or wrong item, please contact us within 48 hours of delivery.',
                        'We will arrange a replacement or full refund at no extra cost to you.',
                    ],
                },
                {
                    heading: 'Refunds',
                    body: [
                        'Once your returned item is received and inspected, approved refunds are processed promptly.',
                        'Refunds are issued to the original payment method, or as store credit where applicable.',
                    ],
                },
            ]}
        />
    );
}
