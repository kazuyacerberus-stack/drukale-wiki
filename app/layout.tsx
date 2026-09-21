import type { Metadata } from 'next';
import './matrix.css';
import NavMobile from './components/NavMobile';

export const metadata: Metadata = {
  title: 'Terra Save',
  description: 'Arquivo central de personagens de Terra Save',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="fundo-site" aria-hidden="true" />
        {children}
        <NavMobile />
      </body>
    </html>
  );
}
