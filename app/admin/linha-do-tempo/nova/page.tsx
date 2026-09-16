'use client';

import Link from 'next/link';
import '../../../matrix.css';
import MatrixRain from '../../../components/MatrixRain';
import Protegido from '../../../components/Protegido';
import EventoForm from '../../../components/EventoForm';

export default function NovoEvento() {
  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap narrow">
       <Protegido>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">drukale://admin/linha-do-tempo/novo</span>
            <div className="hd-act">
              <Link className="ico" href="/admin/linha-do-tempo">← linha do tempo</Link>
            </div>
          </div>
          <h1 data-txt="NOVO EVENTO">NOVO EVENTO</h1>
          <p className="sub">&gt; mais um marco na história do império <span className="cur" /></p>
        </header>

        <EventoForm />

        <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
       </Protegido>
      </main>
    </div>
  );
}
