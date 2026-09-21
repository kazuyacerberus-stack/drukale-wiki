'use client';

import Link from 'next/link';
import '../../matrix.css';
import MatrixRain from '../../components/MatrixRain';
import Protegido from '../../components/Protegido';
import FichaForm from '../../components/FichaForm';

export default function NovoRegistro() {
  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap narrow">
       <Protegido>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terrasave://admin/novo-registro</span>
            <div className="hd-act">
              <Link className="ico" href="/admin">← painel</Link>
            </div>
          </div>
          <h1 data-txt="NOVO REGISTRO">NOVO REGISTRO</h1>
          <p className="sub">&gt; ficha de personagem <span className="cur" /></p>
        </header>

        <FichaForm />

        <footer className="ft">terrasave_system v1.0 // conexão segura estabelecida</footer>
       </Protegido>
      </main>
    </div>
  );
}
