'use client';

import Link from 'next/link';
import '../../matrix.css';
import MatrixRain from '../../components/MatrixRain';
import PrecisaAprovacao from '../../components/PrecisaAprovacao';
import EventoForm from '../../components/EventoForm';

export default function NovaCronicaPublica() {
  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap narrow">
       <PrecisaAprovacao>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">drukale://arquivo/cronicas/nova</span>
            <div className="hd-act">
              <Link className="ico" href="/cronicas">← crônicas</Link>
              <Link className="ico" href="/perfil">meus envios</Link>
            </div>
          </div>
          <h1 data-txt="ENVIAR CRÔNICA">ENVIAR CRÔNICA</h1>
          <p className="sub">&gt; a crônica entra em análise antes de aparecer aprovada <span className="cur" /></p>
        </header>

        <EventoForm />

        <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
       </PrecisaAprovacao>
      </main>
    </div>
  );
}
