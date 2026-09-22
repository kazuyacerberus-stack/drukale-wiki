'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import './matrix.css';
import Abertura from './components/Abertura';
import Avatar from './components/Avatar';
import { useBeep } from './components/useBeep';
import BotaoSom from './components/BotaoSom';
import { supabase } from './lib/db';

/** Atalhos principais: o mesmo destino aparece no topo e nos cartões de baixo. */
const CARTOES = [
  {
    href: '/regras', titulo: 'Regras', desc: 'Entenda o funcionamento do nosso RPG.',
    icone: (
      <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 12c-4-3-10-4-16-3v27c6-1 12 0 16 3m0-27c4-3 10-4 16-3v27c-6-1-12 0-16 3m0-27v27" /></svg>
    ),
  },
  {
    href: '/mundo', titulo: 'Mapa', desc: 'Explore os territórios, cidades e regiões de Terra Save.',
    icone: (
      <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 12l12-4 12 4 12-4v28l-12 4-12-4-12 4V12zm12-4v28m12-24v28" /></svg>
    ),
  },
  {
    href: '/eventos', titulo: 'História', desc: 'Conheça o passado, o presente e o que está por vir.',
    icone: (
      <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 8h22a4 4 0 014 4v0a4 4 0 01-4 4H14m0-8a4 4 0 00-4 4v22a4 4 0 004 4h20a4 4 0 004-4V16M18 24h14M18 31h10" /></svg>
    ),
  },
  {
    href: '/personagens', titulo: 'Personagens', desc: 'Veja as fichas e encontre seu lugar na jornada.',
    icone: (
      <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="17" r="6" /><path d="M12 38c0-7 5-11 12-11s12 4 12 11" /><circle cx="10" cy="20" r="4" /><circle cx="38" cy="20" r="4" /></svg>
    ),
  },
];

const MAIS = [
  { href: '/faccoes', titulo: 'Facções' },
  { href: '/cenas', titulo: 'Cenas' },
  { href: '/linha-do-tempo', titulo: 'Linha do tempo' },
  { href: '/cronicas', titulo: 'Crônicas' },
  { href: '/reservas', titulo: 'Reserva de imagens' },
  { href: '/chat', titulo: 'Chat' },
];

export default function Home() {
  const [ehAdmin, setEhAdmin] = useState(false);
  const [meuPerfil, setMeuPerfil] = useState<{ apelido: string; avatar_url: string | null } | null>(null);
  const { beep, muted, setMuted } = useBeep();

  /**
   * A home é a única página pública: quem não tem conta vê o herói e os
   * atalhos (só texto e ícone, sem dado nenhum). Quem barra de verdade é
   * cada página de destino, que fica atrás de `PrecisaAprovacao`.
   */
  useEffect(() => {
    let vivo = true;
    const verificar = async (logado: boolean) => {
      if (!logado) { if (vivo) { setEhAdmin(false); setMeuPerfil(null); } return; }
      const { data: auth } = await supabase.auth.getUser();
      const [admin, perfil] = await Promise.all([
        supabase.rpc('drk_e_admin'),
        auth.user ? supabase.from('profiles').select('apelido,avatar_url').eq('user_id', auth.user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      if (vivo) {
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

  return (
    <div className="term tn">
      <Abertura />

      <header className="tn-topo">
        <Link href="/" className="tn-marca">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-compasso.png" alt="" />
          <span>TERRA SAVE</span>
        </Link>

        <nav className="tn-nav" aria-label="Navegação principal">
          <Link href="/" className="on" aria-current="page">Início</Link>
          <Link href="/regras" onClick={() => beep('click')}>Regras</Link>
          <Link href="/mundo" onClick={() => beep('click')}>Mapa</Link>
          <Link href="/eventos" onClick={() => beep('click')}>História</Link>
          <Link href="/personagens" onClick={() => beep('click')}>Personagens</Link>
          <details className="tn-mais">
            <summary>Mais</summary>
            <div>
              {MAIS.map((m) => <Link key={m.href} href={m.href}>{m.titulo}</Link>)}
            </div>
          </details>
        </nav>

        <div className="tn-conta">
          <BotaoSom muted={muted} setMuted={setMuted} beep={beep} className="tn-som" />
          {ehAdmin && <Link href="/admin">★ Game master</Link>}
          {meuPerfil ? (
            <Link href="/perfil" className="tn-perfil">
              <Avatar url={meuPerfil.avatar_url} nome={meuPerfil.apelido} tamanho={22} />
              Perfil
            </Link>
          ) : (
            <Link href="/admin/login">Entrar</Link>
          )}
        </div>
      </header>

      <section className="tn-hero">
        <div className="tn-hero-col">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="tn-logo" src="/logo-terra-save.png" alt="" />
          <h1 className="tn-sr">Terra Save</h1>
          <p className="tn-lema">
            <i>✦</i> ENTRE O PASSADO E O FUTURO,<br />A MESMA TERRA. <i>✦</i>
          </p>
          <p className="tn-texto">
            Em um mundo onde a magia e a tecnologia convivem, facções disputam o
            poder, antigas profecias se despertam e o destino da Terra está nas
            mãos de quem ousa sonhar.
          </p>
          <Link href="/mundo" className="tn-cta" onClick={() => beep('click')}>
            ENTRAR NO MUNDO <span>→</span>
          </Link>
        </div>
      </section>

      <footer className="tn-rodape">
        <nav className="tn-cartoes" aria-label="Atalhos">
          {CARTOES.map((c) => (
            <Link key={c.href} href={c.href} className="tn-cartao" onMouseEnter={() => beep('hover')} onClick={() => beep('click')}>
              {c.icone}
              <strong>{c.titulo}</strong>
              <span>{c.desc}</span>
              <em>→</em>
            </Link>
          ))}
        </nav>
        <p className="tn-assinatura"><b>TERRA SAVE</b> <i>✦</i> MAIS QUE UM MUNDO, UMA ESCOLHA.</p>
      </footer>
    </div>
  );
}
