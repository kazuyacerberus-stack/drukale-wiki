'use client';

import Link from 'next/link';
import '../matrix.css';
import PrecisaAprovacao from '../components/PrecisaAprovacao';
import { useBeep } from '../components/useBeep';

export default function RegrasPage() {
  const { beep, muted, setMuted } = useBeep();

  return (
    <div className="term drukale">
      <main className="wrap narrow">
       <PrecisaAprovacao>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terrasave://arquivo/regras</span>
            <div className="hd-act">
              <button className="ico" onClick={() => { const n = !muted; setMuted(n); if (!n) beep('hover'); }} title={muted ? 'ativar som' : 'silenciar'}>
                {muted ? '♪ off' : '♪ on'}
              </button>
              <Link className="ico" href="/">← início</Link>
              <Link className="ico" href="/mundo">mapa</Link>
              <Link className="ico" href="/personagens">personagens</Link>
              <Link className="ico" href="/eventos">história</Link>
            </div>
          </div>

          <h1 data-txt="REGRAS">REGRAS</h1>
          <p className="sub">&gt; o funcionamento do nosso RPG <span className="cur" /></p>
        </header>

        <p className="vazio">as regras de Terra Save ainda serão publicadas aqui</p>

        <footer className="ft">terrasave_system v1.0 // conexão segura estabelecida</footer>
       </PrecisaAprovacao>
      </main>
    </div>
  );
}
