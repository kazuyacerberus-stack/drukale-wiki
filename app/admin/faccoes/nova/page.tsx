'use client';

import Link from 'next/link';
import '../../../matrix.css';
import MatrixRain from '../../../components/MatrixRain';
import Protegido from '../../../components/Protegido';
import FaccaoForm from '../../../components/FaccaoForm';

export default function NovaFaccao() {
  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap narrow">
       <Protegido>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terrasave://admin/faccoes/nova</span>
            <div className="hd-act">
              <Link className="ico" href="/admin/faccoes">← facções</Link>
            </div>
          </div>
          <h1 data-txt="NOVA FACÇÃO">NOVA FACÇÃO</h1>
          <p className="sub">&gt; casa, ordem ou organização <span className="cur" /></p>
        </header>

        <FaccaoForm />

        <footer className="ft">terrasave_system v1.0 // conexão segura estabelecida</footer>
       </Protegido>
      </main>
    </div>
  );
}
