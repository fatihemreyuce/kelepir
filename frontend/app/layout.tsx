import type { Metadata } from 'next';
import './globals.css';
import { display, body, mono } from './fonts';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Kelepir — En ucuz oyun fiyatları',
  description: 'Oyunların mağaza fiyatlarını karşılaştır, kelepiri kaçırma.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="tr"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body className="min-h-screen bg-ink text-bone">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
