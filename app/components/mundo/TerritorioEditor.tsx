'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/db';
import {
  FORMATOS, LIMITES_APRES, ARQUIVO_MAX_BYTES, ARQUIVO_TIPOS,
  apresentacaoVazia, completude, caminhosUsados, subirImagemApres, apagarImagensApres, mensagemApres,
  type Apresentacao, type Formato, type ImagemApres, type Especie,
} from '../../lib/apresentacao';
import type { Local } from '../../lib/mundo';
import CortadorImagem from './CortadorImagem';

type Props = {
  local: Local;
  userId: string;
  onPrevia: (ap: Apresentacao) => void;
  onSalvo: () => void;
  onFechar: () => void;
};

type Corte = { arquivo: File; formato: Formato; aplicar: (img: ImagemApres) => void };

/** Uma linha escrita no pergaminho, com o contador do limite. */
function Campo({ rotulo, valor, max, linhas, dica, onMudar }: {
  rotulo: string; valor: string; max: number; linhas?: number; dica?: string; onMudar: (v: string) => void;
}) {
  return (
    <label className="perg-campo">
      <span className="perg-rotulo">
        {rotulo}
        <em className={valor.length > max * 0.9 ? 'perto' : ''}>{valor.length}/{max}</em>
      </span>
      {linhas
        ? <textarea rows={linhas} value={valor} maxLength={max} onChange={(e) => onMudar(e.target.value)} />
        : <input value={valor} maxLength={max} onChange={(e) => onMudar(e.target.value)} />}
      {dica && <small className="perg-dica">{dica}</small>}
    </label>
  );
}

/**
 * O pergaminho onde se escreve a aba do território. Cada imagem passa
 * pelo recorte na proporção do seu lugar no painel e sobe na hora — assim
 * a pré-visualização já mostra o resultado real. O que foi enviado e não
 * chegou a ser salvo é apagado ao cancelar; o que foi trocado, ao salvar.
 */
export default function TerritorioEditor({ local, userId, onPrevia, onSalvo, onFechar }: Props) {
  const inicial = useRef(local.apresentacao ?? apresentacaoVazia());
  const [ap, setAp] = useState<Apresentacao>(() => structuredClone(inicial.current));
  const [corte, setCorte] = useState<Corte | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const novos = useRef<Set<string>>(new Set());
  const seletor = useRef<HTMLInputElement>(null);
  const pendente = useRef<{ formato: Formato; aplicar: (img: ImagemApres) => void } | null>(null);

  const comp = completude(ap);

  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = antes; };
  }, []);

  /** Abre o seletor de arquivo para uma vaga de imagem. */
  const escolher = (formato: Formato, aplicar: (img: ImagemApres) => void) => {
    pendente.current = { formato, aplicar };
    if (seletor.current) { seletor.current.value = ''; seletor.current.click(); }
  };

  const arquivoEscolhido = (f: File | null) => {
    const p = pendente.current;
    if (!f || !p) return;
    if (!ARQUIVO_TIPOS.includes(f.type)) { setErro('Use JPG, PNG, WEBP ou GIF.'); return; }
    if (f.size > ARQUIVO_MAX_BYTES) { setErro('A imagem passa de 20 MB.'); return; }
    setErro('');
    setCorte({ arquivo: f, formato: p.formato, aplicar: p.aplicar });
  };

  const recortado = async (blob: Blob) => {
    const c = corte;
    setCorte(null);
    if (!c) return;
    setEnviando(true);
    try {
      const img = await subirImagemApres(blob, userId);
      if (img) novos.current.add(img.caminho);
      c.aplicar(img);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui enviar a imagem.');
    } finally {
      setEnviando(false);
    }
  };

  const salvar = async () => {
    setSalvando(true); setErro('');
    const { error } = await supabase.rpc('drk_salvar_apresentacao', { alvo: local.id, dados: ap });
    setSalvando(false);
    if (error) { setErro(mensagemApres(error)); return; }
    // faxina: tudo o que existia (antes ou enviado agora) e não ficou em uso
    const usados = caminhosUsados(ap);
    const sobras = [...caminhosUsados(inicial.current), ...novos.current].filter((c) => !usados.has(c));
    void apagarImagensApres(sobras);
    novos.current.clear();
    onSalvo();
  };

  const fechar = () => {
    // o que subiu nesta sessão e não foi salvo não é de ninguém
    const salvos = caminhosUsados(inicial.current);
    void apagarImagensApres([...novos.current].filter((c) => !salvos.has(c)));
    onFechar();
  };

  const mudar = (parcial: Partial<Apresentacao>) => setAp((a) => ({ ...a, ...parcial }));

  /** Moldura de gravura com a proporção real do painel. */
  const Vaga = ({ imagem, formato, onPor, onTirar }: {
    imagem: ImagemApres; formato: Formato; onPor: () => void; onTirar: () => void;
  }) => (
    <div className={`perg-vaga perg-vaga-${formato}`}>
      <button
        type="button"
        className="perg-gravura"
        style={{ aspectRatio: String(FORMATOS[formato].proporcao) }}
        disabled={enviando}
        onClick={onPor}
        title={imagem ? 'trocar a imagem' : 'escolher uma imagem'}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {imagem ? <img src={imagem.url} alt="" /> : (
          <span>
            <b>+</b>
            {FORMATOS[formato].rotulo}
          </span>
        )}
      </button>
      {/* a linha existe sempre (vazia sem imagem), para as colunas não desalinharem */}
      <div className="perg-vaga-acoes">
        {imagem && (
          <>
            <button type="button" className="perg-link" disabled={enviando} onClick={onPor}>trocar</button>
            <button type="button" className="perg-link" onClick={onTirar}>tirar</button>
          </>
        )}
      </div>
    </div>
  );

  const listaEspecies = (qual: 'fauna' | 'flora') => {
    const lista = ap[qual];
    const trocar = (i: number, e: Partial<Especie>) =>
      mudar({ [qual]: lista.map((x, j) => (j === i ? { ...x, ...e } : x)) } as Partial<Apresentacao>);
    return (
      <div className="perg-especies">
        {lista.map((e, i) => (
          <div className="perg-especie" key={i}>
            <Vaga
              imagem={e.imagem}
              formato="especie"
              onPor={() => escolher('especie', (img) => setAp((a) => ({ ...a, [qual]: a[qual].map((x, j) => (j === i ? { ...x, imagem: img } : x)) })))}
              onTirar={() => trocar(i, { imagem: null })}
            />
            <input className="perg-linha" value={e.nome} maxLength={LIMITES_APRES.especieNome} placeholder="nome" onChange={(ev) => trocar(i, { nome: ev.target.value })} />
            <button type="button" className="perg-link" onClick={() => mudar({ [qual]: lista.filter((_, j) => j !== i) } as Partial<Apresentacao>)}>riscar do registro</button>
          </div>
        ))}
        {lista.length < LIMITES_APRES.especies && (
          <button
            type="button"
            className="perg-novo"
            onClick={() => mudar({ [qual]: [...lista, { nome: '', imagem: null }] } as Partial<Apresentacao>)}
          >
            <b>+</b>
            {qual === 'fauna' ? 'registrar criatura' : 'registrar planta'}
          </button>
        )}
      </div>
    );
  };

  // direto no <body>, pelo mesmo motivo da aba: dentro da página do mapa
  // a sobreposição ficava presa num contêiner e cortava
  return createPortal(
    <div className="ted" role="dialog" aria-modal="true" aria-label={`Montar a apresentação de ${local.nome}`}>
      <input ref={seletor} type="file" accept={ARQUIVO_TIPOS.join(',')} hidden onChange={(e) => arquivoEscolhido(e.target.files?.[0] ?? null)} />

      <div className="perg">
        <div className="perg-rolo perg-rolo-topo" aria-hidden="true" />

        <header className="perg-cab">
          <p className="perg-sobre">registro de território</p>
          <h2>{local.nome}</h2>
          <div className="perg-orn" aria-hidden="true">❦</div>
          <p className="perg-intro">
            Escreva aqui a página que se abre quando alguém toca o seu território no mapa. Cada gravura é recortada na medida
            do espaço onde vai aparecer: prefira imagens grandes e escolha bem o enquadramento.
          </p>
        </header>

        <div className="perg-grade">
          <div className="perg-form">
            <section className="perg-cap">
              <h3><span>I</span> abertura</h3>
              <Campo rotulo="subtítulo" valor={ap.subtitulo} max={LIMITES_APRES.subtitulo} dica="uma linha curta sob o nome — ex.: o reino sob o gelo" onMudar={(v) => mudar({ subtitulo: v })} />
              <Campo rotulo="introdução" valor={ap.introducao} max={LIMITES_APRES.introducao} linhas={4} dica="onde fica, o que é, por que importa" onMudar={(v) => mudar({ introducao: v })} />
              <Campo rotulo="citação" valor={ap.citacao} max={LIMITES_APRES.citacao} linhas={3} dica="uma frase em itálico, de alguém do lugar ou sobre ele — aparece no alto, à direita" onMudar={(v) => mudar({ citacao: v })} />
              <div className="perg-campo">
                <span className="perg-rotulo">gravura de capa</span>
                <Vaga imagem={ap.capa} formato="capa" onPor={() => escolher('capa', (img) => setAp((a) => ({ ...a, capa: img })))} onTirar={() => mudar({ capa: null })} />
                <small className="perg-dica">a paisagem principal, larga — o nome e a introdução ficam por cima do lado esquerdo, então deixe o assunto mais para o centro</small>
              </div>
            </section>

            <section className="perg-cap">
              <h3><span>II</span> o destaque</h3>
              <Campo rotulo="título" valor={ap.destaque.titulo} max={LIMITES_APRES.destaqueTitulo} dica="ex.: a dualidade de halnaker" onMudar={(v) => mudar({ destaque: { ...ap.destaque, titulo: v } })} />
              <Campo rotulo="texto" valor={ap.destaque.texto} max={LIMITES_APRES.destaqueTexto} linhas={6} dica="fica sobre o canto inferior direito da capa; deixe uma linha em branco para separar parágrafos" onMudar={(v) => mudar({ destaque: { ...ap.destaque, texto: v } })} />
            </section>

            <section className="perg-cap">
              <h3><span>III</span> três janelas</h3>
              <p className="perg-dica">três vistas do território — a superfície, o que se esconde, um lugar marcante…</p>
              <div className="perg-janelas">
                {ap.secoes.map((s, i) => (
                  <div className="perg-janela" key={i}>
                    <Vaga
                      imagem={s.imagem}
                      formato="secao"
                      onPor={() => escolher('secao', (img) => setAp((a) => ({ ...a, secoes: a.secoes.map((x, j) => (j === i ? { ...x, imagem: img } : x)) })))}
                      onTirar={() => mudar({ secoes: ap.secoes.map((x, j) => (j === i ? { ...x, imagem: null } : x)) })}
                    />
                    <input className="perg-linha" value={s.titulo} maxLength={LIMITES_APRES.secaoTitulo} placeholder={`título da ${['primeira', 'segunda', 'terceira'][i]}`} onChange={(e) => mudar({ secoes: ap.secoes.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)) })} />
                    <textarea className="perg-pauta" rows={4} value={s.texto} maxLength={LIMITES_APRES.secaoTexto} placeholder="duas ou três linhas" onChange={(e) => mudar({ secoes: ap.secoes.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)) })} />
                    <em className="perg-conta">{s.texto.length}/{LIMITES_APRES.secaoTexto}</em>
                  </div>
                ))}
              </div>
            </section>

            <section className="perg-cap">
              <h3><span>IV</span> fauna</h3>
              {listaEspecies('fauna')}
            </section>

            <section className="perg-cap">
              <h3><span>V</span> flora</h3>
              {listaEspecies('flora')}
            </section>

            <section className="perg-cap">
              <h3><span>VI</span> o rodapé</h3>
              <Campo rotulo="localização" valor={ap.localizacao} max={LIMITES_APRES.localizacao} linhas={2} dica="vai ao lado do globinho, que marca sozinho o ponto do território no mundo" onMudar={(v) => mudar({ localizacao: v })} />
              <Campo rotulo="frase de fechamento" valor={ap.fechamento} max={LIMITES_APRES.fechamento} linhas={3} dica="centralizada, em itálico, fechando a página" onMudar={(v) => mudar({ fechamento: v })} />
            </section>
          </div>

          <aside className="perg-margem">
            <div className="perg-nota">
              <p className="perg-nota-t">o registro está <strong>{comp.pct}%</strong> completo</p>
              <div className="perg-tinta"><span style={{ width: `${comp.pct}%` }} /></div>
              <ul>
                {comp.itens.map((it) => (
                  <li key={it.rotulo} className={it.ok ? 'ok' : ''}>
                    <i aria-hidden="true">{it.ok ? '✓' : '·'}</i>{it.rotulo}
                  </li>
                ))}
              </ul>
            </div>
            {enviando && <p className="perg-aviso">a gravura está sendo enviada…</p>}
            {erro && <p className="perg-erro">{erro}</p>}
            <div className="perg-acoes">
              <button type="button" className="perg-selo" disabled={salvando || enviando} onClick={salvar}>
                <span>{salvando ? '…' : '✦'}</span>
                {salvando ? 'selando' : 'selar e salvar'}
              </button>
              <button type="button" className="perg-botao" onClick={() => onPrevia(ap)}>ver como vai ficar</button>
              <button type="button" className="perg-link" onClick={fechar}>fechar sem salvar</button>
            </div>
          </aside>
        </div>

        <div className="perg-rolo perg-rolo-base" aria-hidden="true" />
      </div>

      {corte && (
        <CortadorImagem
          arquivo={corte.arquivo}
          proporcao={FORMATOS[corte.formato].proporcao}
          largura={FORMATOS[corte.formato].largura}
          altura={FORMATOS[corte.formato].altura}
          rotulo={FORMATOS[corte.formato].rotulo}
          onPronto={recortado}
          onCancelar={() => setCorte(null)}
        />
      )}
    </div>,
    document.body,
  );
}
