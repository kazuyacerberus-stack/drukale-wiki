'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import './matrix.css';
import Abertura from './components/Abertura';
import { useBeep } from './components/useBeep';
import { supabase } from './lib/db';

/**
 * As quatro forças corruptoras do império — nomes 100% originais,
 * já cadastrados como facções (ver sql/... desta mesma frente). Usar
 * uma estrutura de "quatro poderes" é a mesma ideia estrutural do Caos
 * de Warhammer 40K, mas sem tomar emprestado nome, deus ou texto de
 * ninguém: tudo aqui foi escrito para o Império Drukale.
 */
const FORCAS_CORRUPTORAS = [
  'Legião da Fúria Vermelha',
  'Culto da Podridão Eterna',
  'Conselho das Mil Máscaras',
  'Corte do Êxtase Infinito',
];

const GUIAS = [
  { href: '/faccoes', icone: '⌂', titulo: 'Facções', desc: 'as casas e cultos que disputam o poder' },
  { href: '/linha-do-tempo', icone: '⏱', titulo: 'Linha do tempo', desc: 'os marcos que forjaram o império' },
  { href: '/glossario', icone: '◈', titulo: 'Glossário', desc: 'raças, magia, tecnologia e mais' },
  { href: '/personagens', icone: '◉', titulo: 'Personagens', desc: 'o arquivo de quem habita Drukale' },
  { href: '/cenas', icone: '▤', titulo: 'Cenas', desc: 'o que já foi vivido, em texto' },
  { href: '/mundo', icone: '◍', titulo: 'Mundo', desc: 'o globo em 3D e o mapa político' },
  { href: '/chat', icone: '✉', titulo: 'Chat', desc: 'converse com a comunidade' },
];

type Forca = { slug: string; nome: string; cor: string; resumo: string | null };
type Numeros = { personagens: number; faccoes: number; termos: number; locais: number; eventos: number };

/**
 * Selo oculto — um sigilo geométrico (estrela de oito pontas dentro de um
 * círculo), não a caveira "de Halloween" da primeira versão. É um símbolo
 * genérico de ocultismo/heráldica, sem ligação com nenhuma franquia.
 */
function Selo({ className }: { className: string }) {
  return (
    <svg className={`imp-selo ${className}`} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <circle cx="50" cy="50" r="47" stroke="currentColor" strokeWidth="1.4" opacity=".55" />
      <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="1" opacity=".35" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <line x1="50" y1="6" x2="50" y2="94" />
        <line x1="6" y1="50" x2="94" y2="50" />
        <line x1="19" y1="19" x2="81" y2="81" />
        <line x1="81" y1="19" x2="19" y2="81" />
      </g>
      <circle cx="50" cy="50" r="9" fill="currentColor" opacity=".85" />
      <circle cx="50" cy="50" r="9" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/**
 * Divisória orgânica: um veio de corrupção se ramificando, em vez de uma
 * linha reta ou um zigue-zague geométrico. Os nós pulsam devagar, como se
 * algo ainda estivesse vivo por baixo da pele do desenho.
 */
function VeioCorrupcao() {
  return (
    <svg className="imp-veio" viewBox="0 0 1000 70" preserveAspectRatio="none" aria-hidden="true">
      <path
        className="imp-veio-tronco"
        d="M0,35 C80,15 140,55 220,32 C300,10 360,50 440,28 C520,8 580,48 660,30 C740,14 800,52 880,34 C930,22 970,40 1000,32"
      />
      <path className="imp-veio-ramo" d="M220,32 C210,50 200,60 185,66" />
      <path className="imp-veio-ramo" d="M440,28 C450,10 465,2 480,4" />
      <path className="imp-veio-ramo" d="M660,30 C670,50 685,60 705,64" />
      <path className="imp-veio-ramo" d="M880,34 C870,14 858,6 840,8" />
      <circle className="imp-veio-no" style={{ animationDelay: '0s' }} cx="220" cy="32" r="3" />
      <circle className="imp-veio-no" style={{ animationDelay: '.6s' }} cx="440" cy="28" r="3" />
      <circle className="imp-veio-no" style={{ animationDelay: '1.2s' }} cx="660" cy="30" r="3" />
      <circle className="imp-veio-no" style={{ animationDelay: '1.8s' }} cx="880" cy="34" r="3" />
    </svg>
  );
}

export default function Home() {
  const [forcas, setForcas] = useState<Forca[]>([]);
  const [numeros, setNumeros] = useState<Numeros | null>(null);
  const { beep, muted, setMuted } = useBeep();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('faccoes').select('slug,nome,cor,resumo').in('nome', FORCAS_CORRUPTORAS);
      const encontradas = (data ?? []) as Forca[];
      const ordenadas = FORCAS_CORRUPTORAS
        .map((nome) => encontradas.find((f) => f.nome === nome))
        .filter((f): f is Forca => Boolean(f));
      setForcas(ordenadas);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const contar = (tabela: string) => supabase.from(tabela).select('id', { count: 'exact', head: true });
      const [personagens, faccoes, termos, locais, eventos] = await Promise.all([
        contar('characters'), contar('faccoes'), contar('glossario'), contar('locais'), contar('eventos'),
      ]);
      setNumeros({
        personagens: personagens.count ?? 0,
        faccoes: faccoes.count ?? 0,
        termos: termos.count ?? 0,
        locais: locais.count ?? 0,
        eventos: eventos.count ?? 0,
      });
    })();
  }, []);

  return (
    <div className="term imperio">
      <Abertura />

      <main className="wrap">
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">drukale://imperio</span>
            <div className="hd-act">
              <button
                className="ico"
                onClick={() => { const n = !muted; setMuted(n); if (!n) beep('hover'); }}
                title={muted ? 'ativar som' : 'silenciar'}
              >
                {muted ? '♪ off' : '♪ on'}
              </button>
              <Link className="ico" href="/admin">+ novo</Link>
            </div>
          </div>
        </header>

        <section className="imp-hero">
          <Selo className="imp-selo-esq" />
          <Selo className="imp-selo-dir" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="imp-medalhao" src="/emblema-drukale.webp" alt="Emblema do Império Drukale" />
          <h1 className="imp-titulo">IMPÉRIO DRUKALE</h1>
          <p className="imp-sub">forjado na corrupção · governado pela anarquia</p>
          <p className="imp-lead">
            No trono de <strong>Tenebris Civitaten</strong> governa{' '}
            <strong>Elsharion Drukale</strong>, o Hierarca da Anarquia — nascido
            da corrupção e forjado na violência, sua vontade é a única lei que a
            Casa Drukale reconhece. Este arquivo reúne tudo o que se sabe sobre
            o império: suas casas, seus mundos, sua gente e o que os corrompeu.
          </p>
        </section>

        <VeioCorrupcao />

        <section className="imp-secao">
          <h2>o que é o império</h2>
          <p>
            Drukale não nasceu de uma conquista — nasceu de uma ruptura. Onde a
            realidade se rasga, uma energia sem forma escorre para dentro do
            mundo material e se agarra às paixões de quem a toca: fúria vira
            guerra sem fim, ambição vira intriga sem fundo, desejo vira excesso
            sem limite, e a própria morte vira um culto. O império é o que resta
            de pé quando essa força encontra um povo disposto a servi-la.
          </p>
          <p>
            Elsharion Drukale não impôs ordem a esse caos — ele o organizou.
            Sob seu trono, cada facção que canaliza uma faceta dessa corrupção
            tem seu lugar, contanto que sirva à Casa Drukale antes de servir a
            si mesma. É um equilíbrio instável, mantido tanto pelo medo quanto
            pela lealdade — e é esse equilíbrio que este arquivo documenta.
          </p>
        </section>

        {forcas.length > 0 && (
          <section className="imp-secao">
            <h2>as quatro forças</h2>
            <div className="imp-forcas">
              {forcas.map((f) => (
                <Link
                  key={f.slug}
                  href={`/faccoes/${f.slug}`}
                  className="imp-forca"
                  style={{ '--forca-cor': f.cor } as React.CSSProperties}
                  onMouseEnter={() => beep('hover')}
                  onClick={() => beep('click')}
                >
                  <strong>{f.nome}</strong>
                  {f.resumo && <span>{f.resumo}</span>}
                </Link>
              ))}
            </div>
          </section>
        )}

        <VeioCorrupcao />

        <section className="imp-secao">
          <h2>explore o arquivo</h2>
          <div className="imp-hub">
            {GUIAS.map((g, i) => (
              <Link
                key={g.href}
                href={g.href}
                className="imp-hub-card"
                style={{ animationDelay: `${i * 60}ms` }}
                onMouseEnter={() => beep('hover')}
                onClick={() => beep('click')}
              >
                <span className="imp-hub-icone">{g.icone}</span>
                <strong>{g.titulo}</strong>
                <span>{g.desc}</span>
              </Link>
            ))}
          </div>
        </section>

        {numeros && (
          <div className="imp-numeros">
            <div className="imp-numero"><strong>{numeros.personagens}</strong><span>personagens</span></div>
            <div className="imp-numero"><strong>{numeros.faccoes}</strong><span>facções</span></div>
            <div className="imp-numero"><strong>{numeros.eventos}</strong><span>eventos</span></div>
            <div className="imp-numero"><strong>{numeros.termos}</strong><span>termos</span></div>
            <div className="imp-numero"><strong>{numeros.locais}</strong><span>locais</span></div>
          </div>
        )}

        <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
      </main>
    </div>
  );
}
