import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MIGMIG Concierge',
  description: 'Platforma franczyzowa usług osiedlowych — MIGMIG',
  manifest: '/manifest.json'
};

export const viewport: Viewport = {
  themeColor: '#FF5A1F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="min-h-screen antialiased">
        {/* TODO: wrap in <QueryClientProvider /> + <AuthProvider /> once those land. */}
        {children}
      </body>
    </html>
  );
}
