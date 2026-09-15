'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import '../matrix.css';
import { TIPOS } from '../lib/mundo';

/**
 * O globo é WebGL puro: só existe dentro do navegador. Carregar o
 * componente com ssr desligado evita que o servidor tente montá-lo
 * e garante que nada de canvas rode fora da máquina de quem visita.
 */
const Mundo = dynamic(() => import('../components/Mundo'), {
  ssr: false,
  loading: () => (
    <div className="mundo">
      <div className="palco">
        <div className="mundo-aviso">
          <div className="load"><span /><span /><span /></div>
          <p>abrindo o mundo...</p>
        </div>
      </div>
    </div>
  ),
});

export default function MundoPage() {
  return (
    <div className="term">
      <main className="wrap">
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">drukale://mundo/superficie</span>
            <div className="hd-act">
              <Link className="ico" href="/">◄ arquivo</Link>
            </div>
          </div>

          <h1 data-txt="O MUNDO DRUKALE">O MUNDO DRUKALE</h1>
          <p className="sub">
            &gt; arraste para girar · role para aproximar <span className="cur" />
          </p>
        </header>

        <Mundo />

        <div className="legenda">
          {TIPOS.map((t) => (
            <span className="legenda-item" key={t.id} title={t.dica}>
              <i style={{ background: t.cor }} />
              {t.rotulo}
            </span>
          ))}
        </div>

        <footer className="ft">
          <span>DRUKALE // CARTOGRAFIA</span>
          <span>entre pelo painel para cravar novos locais</span>
        </footer>
      </main>
    </div>
  );
}
