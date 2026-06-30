'use client';

import { useEffect, useState } from 'react';
import cmsService, { SiteSettings } from '@/services/cms.service';
import { getImageUrl } from '@/lib/utils';

export default function SiteIdentityManager() {
    const [settings, setSettings] = useState<SiteSettings | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const state = await cmsService.getFullState();
                if (state.settings) {
                    setSettings(state.settings);
                    applySettings(state.settings);
                }
            } catch (error) {
                console.error("Failed to load site identity", error);
            }
        };

        loadSettings();
        
        // Polling for changes every 30 seconds to keep it "real"
        const interval = setInterval(loadSettings, 30000);
        return () => clearInterval(interval);
    }, []);

    const applySettings = (s: SiteSettings) => {
        // 1. Update Document Title
        if (s.meta_title) {
            document.title = s.meta_title;
        }

        // 2. Update Favicon
        if (s.favicon) {
            const faviconUrl = getImageUrl(s.favicon);
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(link);
            }
            link.href = faviconUrl || '/favicon.ico';
        }

        // 3. Update Theme Colors (CSS Variables)
        if (s.primary_color) {
            document.documentElement.style.setProperty('--primary-color', s.primary_color);
        }
        if (s.secondary_color) {
            document.documentElement.style.setProperty('--secondary-color', s.secondary_color);
        }

        // 4. Update Meta Tags for SEO/Social
        updateMetaTag('description', s.meta_description || '');
        updateMetaTag('keywords', s.meta_keywords || '');
        updateMetaTag('og:title', s.meta_title || s.site_name);
        updateMetaTag('og:description', s.meta_description || '');
        if (s.og_image) {
            updateMetaTag('og:image', getImageUrl(s.og_image) || '');
        }
    };

    const updateMetaTag = (name: string, content: string) => {
        if (!content) return;
        const selector = name.startsWith('og:') ? `meta[property='${name}']` : `meta[name='${name}']`;
        let el = document.querySelector(selector) as HTMLMetaElement;
        if (!el) {
            el = document.createElement('meta');
            if (name.startsWith('og:')) el.setAttribute('property', name);
            else el.name = name;
            document.getElementsByTagName('head')[0].appendChild(el);
        }
        el.content = content;
    };

    // This component doesn't render anything visible
    return null;
}
