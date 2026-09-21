'use client';

import { useId, useState, type ReactNode } from 'react';
import Realce from './Realce';

/**
 * Renderiza o texto de uma regra. O formato é um markdown enxuto — só o que
 * as regras usam — e tudo vira elemento React (nunca HTML cru), então não
 * há como injetar script pelo texto:
 *
 *   ## subtítulo        ### subtítulo menor
 *   - item de lista
 *   | tabela | com | colunas |   (a segunda linha é |---|---|---|)
 *   ![legenda](https://...)      imagem ou GIF
 *   @[legenda](https://...)      vídeo
 *   **negrito**  *itálico*  [texto](https://link)
 *   **2.1 Título** texto...      vira um cartão numerado
 *
 * Com `recolhivel`, cada "## subtítulo" vira uma seção que abre e fecha e
 * aparece um índice no topo. `destaque` grifa o que a busca encontrou.
 */

type Bloco =
  | { t: 'h4'; texto: string }
  | { t: 'p'; linhas: string[] }
  | { t: 'card'; num: string; titulo: string; corpo: string[] }
  | { t: 'ul'; itens: string[] }
  | { t: 'tabela'; cab: string[]; linhas: string[][] }
  | { t: 'midia'; alt: string; url: string; video: boolean };
type Secao = { titulo: string | null; blocos: Bloco[] };

const INLINE = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
const CARTAO = /^\*\*(\d+(?:\.\d+)+)\s+([^*]+?)\*\*\s*(.*)$/;

function celulas(linha: string): string[] {
  return linha.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
}

function parse(texto: string): Secao[] {
  const linhas = texto.replace(/\r/g, '').split('\n');
  const secoes: Secao[] = [{ titulo: null, blocos: [] }];
  const blocos = () => secoes[secoes.length - 1].blocos;
  let i = 0;

  while (i < linhas.length) {
    const l = linhas[i];
    if (!l.trim()) { i++; continue; }

    if (l.startsWith('## ')) { secoes.push({ titulo: l.slice(3).replace(/\*/g, ''), blocos: [] }); i++; continue; }
    if (l.startsWith('### ')) { blocos().push({ t: 'h4', texto: l.slice(4) }); i++; continue; }

    const img = l.trim().match(/^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/);
    if (img) { blocos().push({ t: 'midia', alt: img[1], url: img[2], video: /\.(mp4|webm)(\?.*)?$/i.test(img[2]) }); i++; continue; }
    const vid = l.trim().match(/^@\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/);
    if (vid) { blocos().push({ t: 'midia', alt: vid[1], url: vid[2], video: true }); i++; continue; }

    if (l.startsWith('- ')) {
      const itens: string[] = [];
      while (i < linhas.length && linhas[i].startsWith('- ')) { itens.push(linhas[i].slice(2)); i++; }
      blocos().push({ t: 'ul', itens });
      continue;
    }

    if (l.trimStart().startsWith('|')) {
      const bloco: string[] = [];
      while (i < linhas.length && linhas[i].trimStart().startsWith('|')) { bloco.push(linhas[i]); i++; }
      const corpo = bloco.filter((b) => !/^\s*\|[\s:|-]+\|\s*$/.test(b)).map(celulas);
      if (corpo.length) blocos().push({ t: 'tabela', cab: corpo[0], linhas: corpo.slice(1) });
      continue;
    }

    const par: string[] = [];
    while (i < linhas.length && linhas[i].trim() && !/^(#{2,3} |- |\||!\[|@\[)/.test(linhas[i].trimStart())) { par.push(linhas[i]); i++; }
    if (!par.length) { par.push(l); i++; }
    const card = par[0].match(CARTAO);
    if (card) blocos().push({ t: 'card', num: card[1], titulo: card[2].trim(), corpo: [card[3], ...par.slice(1)].filter((x) => x.trim()) });
    else blocos().push({ t: 'p', linhas: par });
  }
  return secoes;
}

/** Títulos dos "## subtítulos" de um texto (usado pelo índice). */
export function listarSecoes(texto: string): string[] {
  return parse(texto).slice(1).map((s) => s.titulo ?? '');
}

function inline(texto: string, chave: string, dest: string[]): ReactNode[] {
  return texto.split(INLINE).map((parte, i) => {
    const k = `${chave}-${i}`;
    if (/^\*\*\*[^*]+\*\*\*$/.test(parte)) return <strong key={k}><em><Realce texto={parte.slice(3, -3)} agulhas={dest} /></em></strong>;
    if (/^\*\*[^*]+\*\*$/.test(parte)) return <strong key={k}><Realce texto={parte.slice(2, -2)} agulhas={dest} /></strong>;
    if (/^\*[^*]+\*$/.test(parte)) return <em key={k}><Realce texto={parte.slice(1, -1)} agulhas={dest} /></em>;
    const link = parte.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link) return <a key={k} href={link[2]} target="_blank" rel="noopener noreferrer"><Realce texto={link[1]} agulhas={dest} /></a>;
    return <Realce key={k} texto={parte} agulhas={dest} />;
  });
}

function Midia({ alt, url, video }: { alt: string; url: string; video: boolean }) {
  return (
    <figure className="regra-midia">
      {video
        // eslint-disable-next-line jsx-a11y/media-has-caption
        ? <video src={url} controls preload="metadata" playsInline aria-label={alt} />
        // eslint-disable-next-line @next/next/no-img-element
        : <img src={url} alt={alt} loading="lazy" />}
      {alt && <figcaption>{alt}</figcaption>}
    </figure>
  );
}

function BlocoView({ b, k, dest }: { b: Bloco; k: string; dest: string[] }) {
  switch (b.t) {
    case 'h4': return <h4>{inline(b.texto, k, dest)}</h4>;
    case 'midia': return <Midia alt={b.alt} url={b.url} video={b.video} />;
    case 'ul': return <ul>{b.itens.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`, dest)}</li>)}</ul>;
    case 'card':
      return (
        <div className="regra-cartao">
          <span className="regra-cartao-num">{b.num}</span>
          <div>
            <strong className="regra-cartao-titulo"><Realce texto={b.titulo} agulhas={dest} /></strong>
            {b.corpo.map((c, j) => <p key={j}>{inline(c, `${k}-${j}`, dest)}</p>)}
          </div>
        </div>
      );
    case 'tabela':
      return (
        <div className="regra-tabela">
          <table>
            <thead><tr>{b.cab.map((c, j) => <th key={j}>{inline(c, `${k}-h${j}`, dest)}</th>)}</tr></thead>
            <tbody>{b.linhas.map((r, j) => <tr key={j}>{r.map((c, m) => <td key={m}>{inline(c, `${k}-${j}-${m}`, dest)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    default:
      return <p>{b.linhas.map((p, j) => <span key={j}>{j > 0 && <br />}{inline(p, `${k}-${j}`, dest)}</span>)}</p>;
  }
}

export default function RegraTexto({ texto, destaque = [], recolhivel = false }: { texto: string; destaque?: string[]; recolhivel?: boolean }) {
  const base = useId();
  const secoes = parse(texto);
  const comTitulo = secoes.length - 1;
  const [fechadas, setFechadas] = useState<Set<number>>(new Set());

  const alternar = (i: number) => setFechadas((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const irPara = (i: number) => {
    setFechadas((prev) => { const n = new Set(prev); n.delete(i); return n; });
    window.setTimeout(() => document.getElementById(`${base}-s${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  };

  return (
    <div className="regra-texto">
      {recolhivel && comTitulo >= 2 && (
        <nav className="regra-indice" aria-label="Nesta regra">
          <span>nesta regra</span>
          {secoes.slice(1).map((s, j) => (
            <button type="button" key={j} onClick={() => irPara(j + 1)}>{s.titulo}</button>
          ))}
          <button type="button" className="regra-indice-tudo" onClick={() => setFechadas(fechadas.size ? new Set() : new Set(secoes.slice(1).map((_, j) => j + 1)))}>
            {fechadas.size ? 'expandir tudo' : 'recolher tudo'}
          </button>
        </nav>
      )}

      {secoes.map((s, si) => {
        const corpo = s.blocos.map((b, bi) => <BlocoView key={bi} b={b} k={`s${si}b${bi}`} dest={destaque} />);
        if (si === 0) return <div key={si}>{corpo}</div>;
        if (!recolhivel) return <div key={si}><h3><Realce texto={s.titulo ?? ''} agulhas={destaque} /></h3>{corpo}</div>;
        const aberta = !fechadas.has(si);
        return (
          <section className="regra-secao" key={si} id={`${base}-s${si}`}>
            <h3 className="regra-secao-titulo">
              <button type="button" onClick={() => alternar(si)} aria-expanded={aberta}>
                <span aria-hidden="true">{aberta ? '▾' : '▸'}</span>
                <Realce texto={s.titulo ?? ''} agulhas={destaque} />
              </button>
            </h3>
            <div className="regra-secao-corpo" hidden={!aberta}>{corpo}</div>
          </section>
        );
      })}
    </div>
  );
}
