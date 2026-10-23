import type { Metadata } from 'next';
import './matrix.css';
import NavMobile from './components/NavMobile';
import Ajudante from './components/Ajudante';
import SessaoAnonima from './components/SessaoAnonima';

export const metadata: Metadata = {
  title: 'Terra Save',
  description: 'Explore o mundo de Terra Save, consulte as regras do RPG e acompanhe personagens, cenas e eventos da comunidade.',
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
        <Ajudante />
        <SessaoAnonima />
      </body>
    </html>
  );
}
