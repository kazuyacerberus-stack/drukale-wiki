'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import '../matrix.css';
import PrecisaAprovacao from '../components/PrecisaAprovacao';

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

/**
 * Esta página não é verde.
 *
 * A classe `gotico` troca o terminal Matrix por um painel de máquina
 * velha: chapa escura, latão, rebites e a varredura de um tubo
 * cansado. Vale só aqui — a galeria e as fichas continuam como eram.
 */
export default function MundoPage() {
  return (
    <div className="term gotico">
      <main className="wrap">
       <PrecisaAprovacao>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terrasave://cartografia/superficie</span>
            <div className="hd-act">
              <Link className="ico" href="/faccoes">facções</Link>
              <Link className="ico" href="/linha-do-tempo">linha do tempo</Link>
              <Link className="ico" href="/cronicas">crônicas</Link>
              <Link className="ico" href="/eventos">eventos</Link>
              <Link className="ico" href="/glossario">glossário</Link>
              <Link className="ico" href="/cenas">▤ cenas</Link>
              <Link className="ico" href="/personagens">personagens</Link>
              <Link className="ico" href="/">◄ arquivo</Link>
            </div>
          </div>

          <h1 data-txt="MUNDO TERRA SAVE">MUNDO TERRA SAVE</h1>
          <p className="sub">
            &gt; arraste para girar · role para aproximar <span className="cur" />
          </p>
        </header>

        <Mundo />

        <footer className="ft">
          <span>TERRA SAVE // CARTOGRAFIA · CARTA DE SUPERFÍCIE</span>
        </footer>
       </PrecisaAprovacao>
      </main>
    </div>
  );
}
