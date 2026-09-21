import type { ReactNode } from 'react';
import Realce from './Realce';
import { normalizarBusca, textoPuro } from '../lib/regras';

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
 *
 * O texto inteiro da regra sai num bloco corrido. Com `soTrechos` (busca
 * ativa), sai só o que contém o que foi buscado: parágrafos, itens de lista
 * e linhas de tabela, cada um sob o subtítulo a que pertence, grifados.
 */

type Bloco =
  | { t: 'h4'; texto: string }
  | { t: 'p'; linhas: string[] }
  | { t: 'ul'; itens: string[] }
  | { t: 'tabela'; cab: string[]; linhas: string[][] }
  | { t: 'midia'; alt: string; url: string; video: boolean };
type Secao = { titulo: string | null; blocos: Bloco[] };

const INLINE = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;

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
    blocos().push({ t: 'p', linhas: par });
  }
  return secoes;
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

const bate = (texto: string, dest: string[]): boolean => {
  const n = normalizarBusca(textoPuro(texto));
  return dest.some((a) => n.includes(a));
};

/** Só o que contém a busca, mantendo o subtítulo de cada trecho. */
function filtrar(secoes: Secao[], dest: string[]): Secao[] {
  const saida: Secao[] = [];
  for (const s of secoes) {
    const achados: Bloco[] = [];
    for (const b of s.blocos) {
      if (b.t === 'h4' && bate(b.texto, dest)) achados.push(b);
      else if (b.t === 'p' && bate(b.linhas.join(' '), dest)) achados.push(b);
      else if (b.t === 'ul') {
        const itens = b.itens.filter((it) => bate(it, dest));
        if (itens.length) achados.push({ t: 'ul', itens });
      } else if (b.t === 'tabela') {
        const linhas = b.linhas.filter((r) => bate(r.join(' '), dest));
        if (linhas.length || bate(b.cab.join(' '), dest)) achados.push({ t: 'tabela', cab: b.cab, linhas });
      }
    }
    if (achados.length || (s.titulo && bate(s.titulo, dest))) saida.push({ titulo: s.titulo, blocos: achados });
  }
  return saida;
}

export default function RegraTexto({ texto, destaque = [], soTrechos = false }: { texto: string; destaque?: string[]; soTrechos?: boolean }) {
  let secoes = parse(texto);
  let recortado = false;
  if (soTrechos && destaque.length) {
    const f = filtrar(secoes, destaque);
    if (f.some((s) => s.blocos.length)) { secoes = f; recortado = true; }
  }

  return (
    <div className={recortado ? 'regra-texto so-trechos' : 'regra-texto'}>
      {secoes.map((s, si) => (
        <div key={si} className={recortado ? 'regra-trecho' : undefined}>
          {s.titulo && <h3><Realce texto={s.titulo} agulhas={destaque} /></h3>}
          {s.blocos.map((b, bi) => <BlocoView key={bi} b={b} k={`s${si}b${bi}`} dest={destaque} />)}
        </div>
      ))}
    </div>
  );
}
