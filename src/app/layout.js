import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { AppShell } from '@/components/layout/AppShell';

export const metadata = {
  title: 'Liquidity Sentinel',
  description: 'Multi-provider liquidity and anomaly decision support.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-ink font-sans text-white antialiased">
        <AppShell>{children}</AppShell>
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
