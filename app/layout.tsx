import type { Metadata } from 'next';
import './matrix.css';

export const metadata: Metadata = {
  title: 'Terra Nova',
  description: 'Arquivo central de personagens de Terra Nova',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
