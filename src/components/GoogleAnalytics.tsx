/// <reference types="vite/client" />

import { useEffect } from 'react';

// Extend Window type for GA4 globals
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

/**
 * Google Analytics 4 component.
 * Loads GA4 from the VITE_GA_MEASUREMENT_ID environment variable.
 * Only loads in production mode.
 */
export default function GoogleAnalytics() {
  useEffect(() => {
    // Only load in production
    if (import.meta.env.PROD === false) return;

    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID as string;
    if (!measurementId || measurementId === 'G-XXXXXXXXXX') return;

    // Skip if already loaded
    if (window.gtag) return;

    // Add inline script that defines the gtag dataLayer
    const scriptInline = document.createElement('script');
    scriptInline.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}', {
        send_page_view: true,
        cookie_flags: 'SameSite=None;Secure'
      });
    `;
    document.head.appendChild(scriptInline);

    // Load the GA4 script
    const scriptExternal = document.createElement('script');
    scriptExternal.async = true;
    scriptExternal.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(scriptExternal);

    // Track page views for SPA navigation
    const trackPageView = () => {
      if (window.gtag) {
        window.gtag('event', 'page_view', {
          page_title: document.title,
          page_location: window.location.href,
          page_path: window.location.pathname,
        });
      }
    };

    // Listen for popstate (browser back/forward)
    window.addEventListener('popstate', trackPageView);

    // Override pushState to track SPA navigation
    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args) {
      originalPushState.apply(this, args);
      trackPageView();
    };

    return () => {
      window.removeEventListener('popstate', trackPageView);
      window.history.pushState = originalPushState;
    };
  }, []);

  return null;
}
