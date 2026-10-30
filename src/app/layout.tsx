import { assetPath } from '@/lib/paths';
import type { CSSProperties } from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Iris — Emerald Tide',
  description: 'Perjalanan kecil, kekuatan besar. Sistem quest, latihan, dan progres pribadi Iris.',
  manifest: assetPath('/manifest.webmanifest'),
  icons: {
    icon: assetPath('/assets/brand/iris-crystal-emblem.png'),
    apple: assetPath('/assets/brand/iris-crystal-emblem.png'),
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Iris' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#071421' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body
        style={
          {
            '--iris-background': `url("${assetPath('/assets/backgrounds/app-water-depths.png')}")`,
          } as CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
