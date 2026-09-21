'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import './matrix.css';
import Abertura from './components/Abertura';
import Avatar from './components/Avatar';
import { useBeep } from './components/useBeep';
import { supabase } from './lib/db';

/**
 * As quatro forças corruptoras do império — nomes 100% originais,
 * já cadastrados como facções (ver sql/... desta mesma frente). Usar
 * uma estrutura de "quatro poderes" é a mesma ideia estrutural do Caos
 * de Warhammer 40K, mas sem tomar emprestado nome, deus ou texto de
 * ninguém: tudo aqui foi escrito para Terra Save.
 */
const FORCAS_CORRUPTORAS = [
  'Legião da Fúria Vermelha',
  'Culto da Podridão Eterna',
  'Conselho das Mil Máscaras',
  'Corte do Êxtase Infinito',
];

const GUIAS = [
  { href: '/faccoes', icone: '⌂', titulo: 'Facções', desc: 'as casas e cultos que disputam o poder' },
  { href: '/linha-do-tempo', icone: '⏱', titulo: 'Linha do tempo', desc: 'o que todo mundo está compartilhando' },
  { href: '/cronicas', icone: '📜', titulo: 'Crônicas', desc: 'os marcos que forjaram o império' },
  { href: '/glossario', icone: '◈', titulo: 'Glossário', desc: 'raças, magia, tecnologia e mais' },
  { href: '/personagens', icone: '◉', titulo: 'Personagens', desc: 'o arquivo de quem habita Drukale' },
  { href: '/eventos', icone: '✦', titulo: 'Eventos', desc: 'as novidades do grupo, em tempo real' },
  { href: '/cenas', icone: '▤', titulo: 'Cenas', desc: 'o que já foi vivido, em texto' },
  { href: '/mundo', icone: '◍', titulo: 'Mundo Terra Save', desc: 'o globo em 3D e o mapa político' },
  { href: '/chat', icone: '✉', titulo: 'Chat', desc: 'converse com a comunidade' },
];

type Forca = { slug: string; nome: string; cor: string; resumo: string | null };
type Numeros = { personagens: number; faccoes: number; termos: number; locais: number; linhaDoTempo: number; novidades: number };

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
  const [podeVerConteudo, setPodeVerConteudo] = useState(false);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [meuPerfil, setMeuPerfil] = useState<{ apelido: string; avatar_url: string | null } | null>(null);
  const { beep, muted, setMuted } = useBeep();
  const heroRef = useRef<HTMLElement>(null);

  /**
   * A home é a única página pública — quem não tem conta aprovada
   * ainda vê o herói, a faixa de navegação (é só ícone e texto, sem
   * dado nenhum) e o CTA, mas não os números nem a prévia das facções.
   * Cada link da faixa é quem barra de verdade: leva a uma página
   * fechada atrás de `PrecisaAprovacao`, que pede login ou mostra o
   * aviso de conta pendente.
   */
  useEffect(() => {
    let vivo = true;
    const verificar = async (logado: boolean) => {
      if (!logado) { if (vivo) { setPodeVerConteudo(false); setEhAdmin(false); setMeuPerfil(null); } return; }
      const { data: auth } = await supabase.auth.getUser();
      const [admin, aprovada, perfil] = await Promise.all([
        supabase.rpc('drk_e_admin'),
        supabase.rpc('drk_conta_aprovada'),
        auth.user ? supabase.from('profiles').select('apelido,avatar_url').eq('user_id', auth.user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      if (vivo) {
        setPodeVerConteudo(admin.data === true || aprovada.data === true);
        setEhAdmin(admin.data === true);
        setMeuPerfil(perfil.data as { apelido: string; avatar_url: string | null } | null);
      }
    };
    supabase.auth.getSession().then(({ data }) => { if (vivo) void verificar(Boolean(data.session)); });
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      window.setTimeout(() => { if (vivo) void verificar(Boolean(sessao)); }, 0);
    });
    return () => { vivo = false; sub.subscription.unsubscribe(); };
  }, []);

  /**
   * O fundo do herói acompanha o cursor devagar — um paralaxe sutil, não um
   * arrasto de imagem. Mexe direto no style via ref (sem useState) porque
   * isto dispararia dezenas de renders por segundo se fosse estado do React.
   */
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const aoMover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      el.style.setProperty('--mx', mx.toFixed(3));
      el.style.setProperty('--my', my.toFixed(3));
    };
    const aoSair = () => { el.style.setProperty('--mx', '0'); el.style.setProperty('--my', '0'); };
    el.addEventListener('pointermove', aoMover);
    el.addEventListener('pointerleave', aoSair);
    return () => {
      el.removeEventListener('pointermove', aoMover);
      el.removeEventListener('pointerleave', aoSair);
    };
  }, []);

  useEffect(() => {
    if (!podeVerConteudo) return;
    (async () => {
      const { data } = await supabase.from('faccoes').select('slug,nome,cor,resumo').in('nome', FORCAS_CORRUPTORAS);
      const encontradas = (data ?? []) as Forca[];
      const ordenadas = FORCAS_CORRUPTORAS
        .map((nome) => encontradas.find((f) => f.nome === nome))
        .filter((f): f is Forca => Boolean(f));
      setForcas(ordenadas);
    })();
  }, [podeVerConteudo]);

  useEffect(() => {
    if (!podeVerConteudo) return;
    (async () => {
      const contar = (tabela: string) => supabase.from(tabela).select('id', { count: 'exact', head: true });
      const [personagens, faccoes, termos, locais, linhaDoTempo, novidades] = await Promise.all([
        contar('characters'), contar('faccoes'), contar('glossario'), contar('locais'), contar('eventos'), contar('novidades'),
      ]);
      setNumeros({
        personagens: personagens.count ?? 0,
        faccoes: faccoes.count ?? 0,
        termos: termos.count ?? 0,
        locais: locais.count ?? 0,
        linhaDoTempo: linhaDoTempo.count ?? 0,
        novidades: novidades.count ?? 0,
      });
    })();
  }, [podeVerConteudo]);

  return (
    <div className="term imperio">
      <Abertura />

      <main className="wrap">
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terrasave://imperio</span>
            <div className="hd-act">
              <button
                className="ico"
                onClick={() => { const n = !muted; setMuted(n); if (!n) beep('hover'); }}
                title={muted ? 'ativar som' : 'silenciar'}
              >
                {muted ? '♪ off' : '♪ on'}
              </button>
              {ehAdmin && <Link className="ico" href="/admin">★ game master</Link>}
              {meuPerfil && (
                <Link className="ico" href="/perfil" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Avatar url={meuPerfil.avatar_url} nome={meuPerfil.apelido} tamanho={18} />
                  perfil
                </Link>
              )}
            </div>
          </div>
        </header>

        <section className="imp-hero" ref={heroRef}>
          <div className="imp-hero-fundo" />
          <div className="imp-hero-veu" />
          <div className="imp-hero-conteudo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="imp-hero-selo" src="/emblema-drukale.webp" alt="Emblema de Terra Save" />
            <h1 className="imp-titulo">TERRA SAVE</h1>
            <p className="imp-sub">forjado na corrupção · governado pela anarquia</p>
            <p className="imp-lead">
              No trono de <strong>Tenebris Civitaten</strong> governa{' '}
              <strong>Elsharion Drukale</strong>, o Hierarca da Anarquia — nascido
              da corrupção e forjado na violência, sua vontade é a única lei que a
              Casa Drukale reconhece.
            </p>
            <Link href="/mundo" className="imp-cta" onClick={() => beep('click')}>
              ENTRAR NO IMPÉRIO →
            </Link>
          </div>
        </section>

        <nav className="imp-faixa" aria-label="Navegação principal">
          {GUIAS.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className="imp-faixa-item"
              onMouseEnter={() => beep('hover')}
              onClick={() => beep('click')}
            >
              <span className="imp-faixa-icone">{g.icone}</span>
              <strong>{g.titulo}</strong>
              <span>{g.desc}</span>
              <span className="imp-faixa-seta">→</span>
            </Link>
          ))}
        </nav>

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

        {numeros && (
          <div className="imp-numeros">
            <div className="imp-numero"><strong>{numeros.personagens}</strong><span>personagens</span></div>
            <div className="imp-numero"><strong>{numeros.faccoes}</strong><span>facções</span></div>
            <div className="imp-numero"><strong>{numeros.linhaDoTempo}</strong><span>crônicas</span></div>
            <div className="imp-numero"><strong>{numeros.novidades}</strong><span>eventos</span></div>
            <div className="imp-numero"><strong>{numeros.termos}</strong><span>termos</span></div>
            <div className="imp-numero"><strong>{numeros.locais}</strong><span>locais</span></div>
          </div>
        )}

        <footer className="ft">terrasave_system v1.0 // conexão segura estabelecida</footer>
      </main>
    </div>
  );
}
