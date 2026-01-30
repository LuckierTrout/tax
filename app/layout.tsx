import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Corporate Affairs Taxonomy',
  description: 'Manage your communications hierarchy',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
