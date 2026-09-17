'use client';

import Link from 'next/link';
import '../../matrix.css';
import MatrixRain from '../../components/MatrixRain';
import PrecisaAprovacao from '../../components/PrecisaAprovacao';
import EventoForm from '../../components/EventoForm';

export default function NovoEventoPublico() {
  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap narrow">
       <PrecisaAprovacao>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">drukale://arquivo/linha-do-tempo/nova</span>
            <div className="hd-act">
              <Link className="ico" href="/linha-do-tempo">← linha do tempo</Link>
              <Link className="ico" href="/perfil">meus envios</Link>
            </div>
          </div>
          <h1 data-txt="ENVIAR EVENTO">ENVIAR EVENTO</h1>
          <p className="sub">&gt; o evento entra em análise antes de aparecer aprovado <span className="cur" /></p>
        </header>

        <EventoForm />

        <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
       </PrecisaAprovacao>
      </main>
    </div>
  );
}
