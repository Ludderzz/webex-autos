// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'WebEx Auto | Garage Management & Repair Terminal',
    template: 'WebEx Auto',
  },
  description: 'Streamlined garage management software for auto repair shops. Track active bay repairs, customer vehicles, job status, and workshop diagnostics in real time.',
  keywords: [
    'Garage Management Software',
    'Auto Repair Shop CRM',
    'Mechanic Workshop Software',
    'Vehicle Job Tracking',
    'Bay Repair Management',
    'Vehicle Service Software',
    'Garage Command System',
  ],
  authors: [{ name: 'WebEx Auto' }],
  creator: 'WebEx Auto',
  manifest: '/manifest.json', // Added PWA manifest link
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://garage.webcircuit.co.uk',
    title: 'WebEx Auto // Garage Management & Repair Terminal',
    description: 'Real-time vehicle repair tracking, bay diagnostics, and workshop management software.',
    siteName: 'WebEx Auto',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WebEx Auto // Garage Management & Repair Terminal',
    description: 'Real-time vehicle repair tracking, bay diagnostics, and workshop management software.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-neutral-950 text-neutral-100 min-h-screen">
        {children}
        <Analytics />

        {/* Service Worker Registration Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}