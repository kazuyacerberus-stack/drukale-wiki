'use client';

import { useEffect } from 'react';
import type { Apresentacao, ImagemApres } from '../../lib/apresentacao';
import type { Local } from '../../lib/mundo';

type Props = {
  local: Local;
  ap: Apresentacao;
  globo: string | null;           // imagem do minimapa, já desenhada
  simboloFaccao: string | null;   // o selo no canto do rodapé, se houver
  podeEditar: boolean;
  onEditar: () => void;
  onFechar: () => void;
  rascunho?: boolean;             // aberto como pré-visualização do editor
};

const cheio = (s: string) => s.trim().length > 0;

/** Moldura de imagem: se ainda não tem foto, fica um vazio escuro — sem ícone quebrado. */
function Quadro({ imagem, alt, className }: { imagem: ImagemApres; alt: string; className?: string }) {
  return (
    <div className={`ter-quadro${imagem ? '' : ' vazio'}${className ? ` ${className}` : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {imagem && <img src={imagem.url} alt={alt} loading="lazy" />}
    </div>
  );
}

/**
 * A aba do território, no desenho de um códice: capa panorâmica com o
 * nome em cima, um bloco de destaque, três janelas (superfície, o que se
 * esconde, a cidade…), fauna e flora ao lado e, no rodapé, onde ele fica
 * no mundo e uma frase de fechamento.
 */
export default function TerritorioApresentacao({
  local, ap, globo, simboloFaccao, podeEditar, onEditar, onFechar, rascunho,
}: Props) {
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', tecla);
    return () => { document.body.style.overflow = antes; window.removeEventListener('keydown', tecla); };
  }, [onFechar]);

  // sem capa própria, a foto do ambiente do local serve de capa
  const capa: ImagemApres = ap.capa ?? (local.imagem ? { url: local.imagem, caminho: '' } : null);
  const temDestaque = cheio(ap.destaque.titulo) || cheio(ap.destaque.texto);
  const secoes = ap.secoes.filter((s) => cheio(s.titulo) || cheio(s.texto) || s.imagem);
  const fauna = ap.fauna.filter((e) => e.imagem || cheio(e.nome));
  const flora = ap.flora.filter((e) => e.imagem || cheio(e.nome));

  return (
    <div className="ter" role="dialog" aria-modal="true" aria-label={`Apresentação de ${local.nome}`}>
      <div className="ter-barra">
        {rascunho && <span className="ter-selo">pré-visualização</span>}
        {podeEditar && !rascunho && <button type="button" className="ter-botao" onClick={onEditar}>editar apresentação</button>}
        <button type="button" className="ter-botao" onClick={onFechar} aria-label="Fechar">✕</button>
      </div>

      <article className="ter-folha">
        {/* ---------- capa ---------- */}
        <header className="ter-hero">
          <Quadro imagem={capa} alt={`Paisagem de ${local.nome}`} className="ter-capa" />
          <div className="ter-cab">
            <h1 className="ter-titulo">{local.nome}</h1>
            <div className="ter-orn" aria-hidden="true"><span /></div>
            {cheio(ap.subtitulo) && <p className="ter-sub">{ap.subtitulo}</p>}
            {cheio(ap.introducao) && <p className="ter-intro">{ap.introducao}</p>}
          </div>
          {cheio(ap.citacao) && <blockquote className="ter-citacao">{ap.citacao}</blockquote>}
          {temDestaque && (
            <section className="ter-destaque">
              {cheio(ap.destaque.titulo) && <h2>{ap.destaque.titulo}</h2>}
              {ap.destaque.texto.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
              <div className="ter-orn curto" aria-hidden="true"><span /></div>
            </section>
          )}
        </header>

        {/* ---------- as três janelas + fauna e flora ---------- */}
        {(secoes.length > 0 || fauna.length > 0 || flora.length > 0) && (
          <div className="ter-meio">
            {secoes.map((s, i) => (
              <section className="ter-secao" key={i}>
                <Quadro imagem={s.imagem} alt={s.titulo || `Seção ${i + 1}`} />
                <div className="ter-secao-txt">
                  {cheio(s.titulo) && <h3>{s.titulo}</h3>}
                  {cheio(s.texto) && <p>{s.texto}</p>}
                </div>
              </section>
            ))}
            {(fauna.length > 0 || flora.length > 0) && (
              <aside className="ter-bestiario">
                {fauna.length > 0 && (
                  <>
                    <h3>Fauna</h3>
                    <div className="ter-grade">
                      {fauna.map((e, i) => (
                        <figure key={i}>
                          <Quadro imagem={e.imagem} alt={e.nome || 'fauna'} />
                          {cheio(e.nome) && <figcaption>{e.nome}</figcaption>}
                        </figure>
                      ))}
                    </div>
                  </>
                )}
                {flora.length > 0 && (
                  <>
                    <h3>Flora</h3>
                    <div className="ter-grade">
                      {flora.map((e, i) => (
                        <figure key={i}>
                          <Quadro imagem={e.imagem} alt={e.nome || 'flora'} />
                          {cheio(e.nome) && <figcaption>{e.nome}</figcaption>}
                        </figure>
                      ))}
                    </div>
                  </>
                )}
              </aside>
            )}
          </div>
        )}

        {/* ---------- rodapé ---------- */}
        <footer className="ter-pe">
          <div className="ter-local">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {globo ? <img className="ter-globo" src={globo} alt={`Onde fica ${local.nome}`} /> : <div className="ter-globo" />}
            <div>
              <h4>{local.nome}</h4>
              {cheio(ap.localizacao) && <p>{ap.localizacao}</p>}
            </div>
          </div>
          {cheio(ap.fechamento) && <p className="ter-fecho">{ap.fechamento}</p>}
          <div className="ter-marca" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {simboloFaccao ? <img src={simboloFaccao} alt="" /> : <span>✦</span>}
          </div>
        </footer>
      </article>
    </div>
  );
}
