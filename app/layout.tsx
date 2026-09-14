import type { Metadata } from 'next';
import './matrix.css';

export const metadata: Metadata = {
  title: 'Império Drukale',
  description: 'Arquivo central de personagens do Império Drukale',
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
