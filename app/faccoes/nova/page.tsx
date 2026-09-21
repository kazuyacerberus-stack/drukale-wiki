'use client';

import Link from 'next/link';
import '../../matrix.css';
import MatrixRain from '../../components/MatrixRain';
import PrecisaAprovacao from '../../components/PrecisaAprovacao';
import FaccaoForm from '../../components/FaccaoForm';

export default function NovaFaccaoPublica() {
  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap narrow">
       <PrecisaAprovacao>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terranova://arquivo/faccoes/nova</span>
            <div className="hd-act">
              <Link className="ico" href="/faccoes">← facções</Link>
              <Link className="ico" href="/perfil">meus envios</Link>
            </div>
          </div>
          <h1 data-txt="PROPOR FACÇÃO">PROPOR FACÇÃO</h1>
          <p className="sub">&gt; a facção entra em análise antes de aparecer aprovada <span className="cur" /></p>
        </header>

        <FaccaoForm />

        <footer className="ft">terranova_system v1.0 // conexão segura estabelecida</footer>
       </PrecisaAprovacao>
      </main>
    </div>
  );
}
