'use client';

import Link from 'next/link';
import '../../matrix.css';
import MatrixRain from '../../components/MatrixRain';
import PrecisaAprovacao from '../../components/PrecisaAprovacao';
import FichaForm from '../../components/FichaForm';

export default function NovoPersonagemPublico() {
  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap narrow">
       <PrecisaAprovacao>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terrasave://arquivo/personagens/nova</span>
            <div className="hd-act">
              <Link className="ico" href="/personagens">← personagens</Link>
              <Link className="ico" href="/perfil">meus envios</Link>
            </div>
          </div>
          <h1 data-txt="ENVIAR PERSONAGEM">ENVIAR PERSONAGEM</h1>
          <p className="sub">&gt; a ficha entra em análise antes de aparecer aprovada <span className="cur" /></p>
        </header>

        <FichaForm />

        <footer className="ft">terrasave_system v1.0 // conexão segura estabelecida</footer>
       </PrecisaAprovacao>
      </main>
    </div>
  );
}
