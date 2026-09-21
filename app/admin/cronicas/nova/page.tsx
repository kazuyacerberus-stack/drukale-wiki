'use client';

import Link from 'next/link';
import '../../../matrix.css';
import MatrixRain from '../../../components/MatrixRain';
import Protegido from '../../../components/Protegido';
import EventoForm from '../../../components/EventoForm';

export default function NovaCronica() {
  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap narrow">
       <Protegido>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terranova://admin/cronicas/nova</span>
            <div className="hd-act">
              <Link className="ico" href="/admin/cronicas">← crônicas</Link>
            </div>
          </div>
          <h1 data-txt="NOVA CRÔNICA">NOVA CRÔNICA</h1>
          <p className="sub">&gt; mais um marco na história do império <span className="cur" /></p>
        </header>

        <EventoForm />

        <footer className="ft">terranova_system v1.0 // conexão segura estabelecida</footer>
       </Protegido>
      </main>
    </div>
  );
}
