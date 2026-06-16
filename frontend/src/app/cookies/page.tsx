'use client';

import PolicyPage from '@/components/layout/PolicyPage';

export default function CookiesPage() {
    return (
        <PolicyPage
            light
            eyebrow="Legal"
            title="Cookie Policy"
            intro="This Cookie Policy explains how we use cookies and similar technologies to recognize you when you visit our website and how you can control them."
            sections={[
                {
                    heading: 'What Are Cookies',
                    body: [
                        'Cookies are small text files stored on your device when you visit a website. They help the site remember your actions and preferences over time.',
                        'We use both session cookies, which expire when you close your browser, and persistent cookies, which remain until they expire or you delete them.',
                    ],
                },
                {
                    heading: 'How We Use Cookies',
                    body: [
                        'Essential cookies keep the site working — they remember your cart, keep you signed in, and secure your session.',
                        'Performance and analytics cookies help us understand how visitors use the site so we can improve the experience.',
                        'Preference cookies remember choices such as your region and display settings.',
                    ],
                },
                {
                    heading: 'Managing Cookies',
                    body: [
                        'You can control and delete cookies through your browser settings at any time.',
                        'Please note that disabling essential cookies may affect core features such as checkout and account access.',
                    ],
                },
                {
                    heading: 'Updates to This Policy',
                    body: [
                        'We may update this Cookie Policy from time to time to reflect changes in technology or regulation.',
                        'Continued use of our website after any changes constitutes acceptance of the updated policy.',
                    ],
                },
            ]}
        />
    );
}
