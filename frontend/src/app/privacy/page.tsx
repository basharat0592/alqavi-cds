'use client';

import PolicyPage from '@/components/layout/PolicyPage';

export default function PrivacyPage() {
    return (
        <PolicyPage
            eyebrow="Legal"
            title="Privacy Notice"
            intro="We respect your privacy. This notice explains what information we collect, how we use it, and the choices you have."
            sections={[
                {
                    heading: 'Information We Collect',
                    body: [
                        'Account details you provide, such as your name, email, phone number, and shipping address.',
                        'Order and transaction information needed to process and deliver your purchases.',
                        'Technical data such as device and usage information collected automatically to improve our service.',
                    ],
                },
                {
                    heading: 'How We Use Your Information',
                    body: [
                        'To process orders, arrange delivery, and provide customer support.',
                        'To communicate order updates, including via WhatsApp and email where you have provided contact details.',
                        'To improve our products, website, and overall shopping experience.',
                    ],
                },
                {
                    heading: 'Sharing Your Information',
                    body: [
                        'We share data only with trusted partners required to fulfil your order, such as courier and payment providers.',
                        'We do not sell your personal information to third parties.',
                    ],
                },
                {
                    heading: 'Data Security & Your Rights',
                    body: [
                        'We apply reasonable technical and organizational measures to protect your data.',
                        'You may request access to, correction of, or deletion of your personal information by contacting us.',
                    ],
                },
            ]}
        />
    );
}
