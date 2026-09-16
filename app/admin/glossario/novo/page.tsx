'use client';

import Link from 'next/link';
import '../../../matrix.css';
import MatrixRain from '../../../components/MatrixRain';
import Protegido from '../../../components/Protegido';
import GlossarioForm from '../../../components/GlossarioForm';

export default function NovoTermo() {
  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap narrow">
       <Protegido>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">drukale://admin/glossario/novo</span>
            <div className="hd-act">
              <Link className="ico" href="/admin/glossario">← glossário</Link>
            </div>
          </div>
          <h1 data-txt="NOVO TERMO">NOVO TERMO</h1>
          <p className="sub">&gt; mais uma entrada na enciclopédia <span className="cur" /></p>
        </header>

        <GlossarioForm />

        <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
       </Protegido>
      </main>
    </div>
  );
}
