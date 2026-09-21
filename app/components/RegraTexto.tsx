import type { ReactNode } from 'react';

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
 */

const SEGURA = /^https?:\/\//i;
const INLINE = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;

function inline(texto: string, chave: string): ReactNode[] {
  return texto.split(INLINE).map((parte, i) => {
    const k = `${chave}-${i}`;
    if (/^\*\*\*[^*]+\*\*\*$/.test(parte)) return <strong key={k}><em>{parte.slice(3, -3)}</em></strong>;
    if (/^\*\*[^*]+\*\*$/.test(parte)) return <strong key={k}>{parte.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(parte)) return <em key={k}>{parte.slice(1, -1)}</em>;
    const link = parte.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link) return <a key={k} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
    return parte;
  });
}

function celulas(linha: string): string[] {
  return linha.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
}

function Midia({ alt, url, video }: { alt: string; url: string; video: boolean }) {
  if (!SEGURA.test(url)) return null;
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

export default function RegraTexto({ texto }: { texto: string }) {
  const linhas = texto.replace(/\r/g, '').split('\n');
  const saida: ReactNode[] = [];
  let i = 0;
  let n = 0;
  const chave = () => `b${n++}`;

  while (i < linhas.length) {
    const l = linhas[i];
    if (!l.trim()) { i++; continue; }

    if (l.startsWith('### ')) { saida.push(<h4 key={chave()}>{inline(l.slice(4), `h${n}`)}</h4>); i++; continue; }
    if (l.startsWith('## ')) { saida.push(<h3 key={chave()}>{inline(l.slice(3), `h${n}`)}</h3>); i++; continue; }

    const img = l.trim().match(/^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/);
    if (img) {
      const video = /\.(mp4|webm)(\?.*)?$/i.test(img[2]);
      saida.push(<Midia key={chave()} alt={img[1]} url={img[2]} video={video} />);
      i++; continue;
    }
    const vid = l.trim().match(/^@\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/);
    if (vid) { saida.push(<Midia key={chave()} alt={vid[1]} url={vid[2]} video />); i++; continue; }

    if (l.startsWith('- ')) {
      const itens: string[] = [];
      while (i < linhas.length && linhas[i].startsWith('- ')) { itens.push(linhas[i].slice(2)); i++; }
      const k = chave();
      saida.push(<ul key={k}>{itens.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}</ul>);
      continue;
    }

    if (l.trimStart().startsWith('|')) {
      const bloco: string[] = [];
      while (i < linhas.length && linhas[i].trimStart().startsWith('|')) { bloco.push(linhas[i]); i++; }
      const corpo = bloco.filter((b) => !/^\s*\|[\s:|-]+\|\s*$/.test(b));
      const [cab, ...resto] = corpo.map(celulas);
      const k = chave();
      saida.push(
        <div className="regra-tabela" key={k}>
          <table>
            <thead><tr>{cab.map((c, j) => <th key={j}>{inline(c, `${k}-h${j}`)}</th>)}</tr></thead>
            <tbody>{resto.map((r, j) => <tr key={j}>{r.map((c, m) => <td key={m}>{inline(c, `${k}-${j}-${m}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    const par: string[] = [];
    while (i < linhas.length && linhas[i].trim() && !/^(#{2,3} |- |\||!\[|@\[)/.test(linhas[i].trimStart())) { par.push(linhas[i]); i++; }
    if (!par.length) { par.push(l); i++; }
    const k = chave();
    saida.push(
      <p key={k}>
        {par.map((p, j) => <span key={j}>{j > 0 && <br />}{inline(p, `${k}-${j}`)}</span>)}
      </p>,
    );
  }

  return <div className="regra-texto">{saida}</div>;
}
