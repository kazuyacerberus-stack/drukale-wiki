'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/db';

/**
 * Navegação do celular: uma barra fixa no rodapé com o que mais se usa e um
 * painel "Mais" que sobe da base com todas as outras abas. Só aparece em
 * telas estreitas (o CSS esconde no desktop, onde cada página já tem o menu
 * no topo). A home, o login e o chat ficam de fora: a home tem o menu próprio,
 * o login não tem pra onde ir, e no chat o campo de mensagem fica colado no
 * rodapé.
 */

const SEM_BARRA = ['/', '/admin/login', '/cadastro', '/chat'];

const Icone = ({ d }: { d: string }) => (
  <svg viewBox="0 0 48 48" aria-hidden="true"><path d={d} /></svg>
);

const PRINCIPAIS = [
  { href: '/', rotulo: 'Início', casa: [] as string[], icone: 'M6 22L24 7l18 15M11 19v20h26V19M20 39V27h8v12' },
  { href: '/regras', rotulo: 'Regras', casa: ['/regras'], icone: 'M24 12c-4-3-10-4-16-3v27c6-1 12 0 16 3m0-27c4-3 10-4 16-3v27c-6-1-12 0-16 3m0-27v27' },
  { href: '/mundo', rotulo: 'Mapa', casa: ['/mundo'], icone: 'M6 12l12-4 12 4 12-4v28l-12 4-12-4-12 4V12zm12-4v28m12-24v28' },
  { href: '/personagens', rotulo: 'Fichas', casa: ['/personagens', '/personagem'], icone: 'M24 8a7 7 0 100 14 7 7 0 000-14zM10 40c0-8 6-12 14-12s14 4 14 12' },
];

const MAIS = [
  { href: '/faccoes', rotulo: 'Facções', glifo: '⌂' },
  { href: '/eventos', rotulo: 'Eventos', glifo: '✦' },
  { href: '/linha-do-tempo', rotulo: 'Linha do tempo', glifo: '⏱' },
  { href: '/cronicas', rotulo: 'Crônicas', glifo: '📜' },
  { href: '/cenas', rotulo: 'Cenas', glifo: '▤' },
  { href: '/glossario', rotulo: 'Glossário', glifo: '◈' },
  { href: '/chat', rotulo: 'Chat', glifo: '✉' },
];

const casa = (pathname: string, rotas: string[]) => rotas.some((r) => pathname === r || pathname.startsWith(`${r}/`));

export default function NavMobile() {
  const pathname = usePathname() ?? '/';
  const [aberto, setAberto] = useState(false);
  const [logado, setLogado] = useState(false);
  const [ehAdmin, setEhAdmin] = useState(false);

  useEffect(() => {
    let vivo = true;
    const verificar = async (temSessao: boolean) => {
      if (!vivo) return;
      setLogado(temSessao);
      if (!temSessao) { setEhAdmin(false); return; }
      const { data } = await supabase.rpc('drk_e_admin');
      if (vivo) setEhAdmin(data === true);
    };
    supabase.auth.getSession().then(({ data }) => { void verificar(Boolean(data.session)); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sessao) => { window.setTimeout(() => { void verificar(Boolean(sessao)); }, 0); });
    return () => { vivo = false; sub.subscription.unsubscribe(); };
  }, []);

  // trocar de página fecha o painel
  useEffect(() => { setAberto(false); }, [pathname]);

  // com o painel aberto, a página de trás não rola; Esc fecha
  useEffect(() => {
    if (!aberto) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const aoTecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('keydown', aoTecla);
    return () => { document.body.style.overflow = antes; document.removeEventListener('keydown', aoTecla); };
  }, [aberto]);

  if (SEM_BARRA.includes(pathname)) return null;

  const emMais = casa(pathname, [...MAIS.map((m) => m.href), '/perfil', '/jogador', '/admin']);

  return (
    <>
      <div className="navm-espaco" aria-hidden="true" />

      <nav className="navm" aria-label="Navegação principal">
        {PRINCIPAIS.map((p) => {
          const ativo = p.href === '/' ? false : casa(pathname, p.casa);
          return (
            <Link key={p.href} href={p.href} className={ativo ? 'navm-item on' : 'navm-item'} aria-current={ativo ? 'page' : undefined}>
              <Icone d={p.icone} />
              <span>{p.rotulo}</span>
            </Link>
          );
        })}
        <button type="button" className={aberto || emMais ? 'navm-item on' : 'navm-item'} onClick={() => setAberto((v) => !v)} aria-expanded={aberto} aria-haspopup="dialog">
          <Icone d="M10 14h28M10 24h28M10 34h28" />
          <span>Mais</span>
        </button>
      </nav>

      <div className={aberto ? 'navm-fundo aberto' : 'navm-fundo'} onClick={() => setAberto(false)} aria-hidden="true" />
      <div className={aberto ? 'navm-folha aberta' : 'navm-folha'} role="dialog" aria-modal="true" aria-label="Todas as abas" aria-hidden={!aberto}>
        <div className="navm-puxador" aria-hidden="true" />
        <div className="navm-folha-topo">
          <strong>Todas as abas</strong>
          <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" tabIndex={aberto ? 0 : -1}>×</button>
        </div>
        <div className="navm-grade">
          {MAIS.map((m, i) => (
            <Link key={m.href} href={m.href} className={casa(pathname, [m.href]) ? 'navm-tile on' : 'navm-tile'} style={{ animationDelay: `${i * 35}ms` }} tabIndex={aberto ? 0 : -1}>
              <span aria-hidden="true">{m.glifo}</span>
              {m.rotulo}
            </Link>
          ))}
          <Link href={logado ? '/perfil' : '/admin/login'} className="navm-tile destaque" style={{ animationDelay: `${MAIS.length * 35}ms` }} tabIndex={aberto ? 0 : -1}>
            <span aria-hidden="true">◉</span>
            {logado ? 'Meu perfil' : 'Entrar'}
          </Link>
          {ehAdmin && (
            <Link href="/admin" className="navm-tile destaque" style={{ animationDelay: `${(MAIS.length + 1) * 35}ms` }} tabIndex={aberto ? 0 : -1}>
              <span aria-hidden="true">★</span>
              Game master
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
