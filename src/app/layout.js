import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { AppShell } from '@/components/layout/AppShell';

// Initialize the Inter font properly
const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Liquidity Sentinel',
  description: 'Multi-provider liquidity and anomaly decision support.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased min-h-screen selection:bg-cyan-500/30`}>
        <AppShell>{children}</AppShell>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}