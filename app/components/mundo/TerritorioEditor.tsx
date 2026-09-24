'use client';

import { useEffect, useRef, useState } from 'react';
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

/** Um campo de texto com o contador do limite. */
function Campo({ rotulo, valor, max, linhas, dica, onMudar }: {
  rotulo: string; valor: string; max: number; linhas?: number; dica?: string; onMudar: (v: string) => void;
}) {
  return (
    <div className="field">
      <label>{rotulo} <span className="ted-conta">{valor.length}/{max}</span></label>
      {linhas
        ? <textarea rows={linhas} value={valor} maxLength={max} onChange={(e) => onMudar(e.target.value)} />
        : <input value={valor} maxLength={max} onChange={(e) => onMudar(e.target.value)} />}
      {dica && <p className="dica">{dica}</p>}
    </div>
  );
}

/**
 * O formulário da aba do território. Cada imagem passa pelo recorte na
 * proporção do seu lugar no painel e sobe na hora — assim a
 * pré-visualização já mostra o resultado real. O que foi enviado e não
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

  /** Vaga de imagem com a proporção real do painel. */
  const Vaga = ({ imagem, formato, onPor, onTirar }: {
    imagem: ImagemApres; formato: Formato; onPor: () => void; onTirar: () => void;
  }) => (
    <div className="ted-vaga">
      <div className="ted-vaga-moldura" style={{ aspectRatio: String(FORMATOS[formato].proporcao) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {imagem ? <img src={imagem.url} alt="" /> : <span>{FORMATOS[formato].rotulo}</span>}
      </div>
      <div className="ted-vaga-acoes">
        <button type="button" className="mini-btn" disabled={enviando} onClick={onPor}>{imagem ? 'trocar' : 'escolher imagem'}</button>
        {imagem && <button type="button" className="mini-btn dim" onClick={onTirar}>tirar</button>}
      </div>
    </div>
  );

  const listaEspecies = (qual: 'fauna' | 'flora') => {
    const lista = ap[qual];
    const trocar = (i: number, e: Partial<Especie>) =>
      mudar({ [qual]: lista.map((x, j) => (j === i ? { ...x, ...e } : x)) } as Partial<Apresentacao>);
    return (
      <div className="ted-especies">
        {lista.map((e, i) => (
          <div className="ted-especie" key={i}>
            <Vaga
              imagem={e.imagem}
              formato="especie"
              onPor={() => escolher('especie', (img) => setAp((a) => ({ ...a, [qual]: a[qual].map((x, j) => (j === i ? { ...x, imagem: img } : x)) })))}
              onTirar={() => trocar(i, { imagem: null })}
            />
            <input value={e.nome} maxLength={LIMITES_APRES.especieNome} placeholder="nome" onChange={(ev) => trocar(i, { nome: ev.target.value })} />
            <button type="button" className="mini-btn dim" onClick={() => mudar({ [qual]: lista.filter((_, j) => j !== i) } as Partial<Apresentacao>)}>remover</button>
          </div>
        ))}
        {lista.length < LIMITES_APRES.especies && (
          <button type="button" className="mini-btn" onClick={() => mudar({ [qual]: [...lista, { nome: '', imagem: null }] } as Partial<Apresentacao>)}>
            + adicionar {qual === 'fauna' ? 'criatura' : 'planta'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="ted" role="dialog" aria-modal="true" aria-label={`Montar a apresentação de ${local.nome}`}>
      <input ref={seletor} type="file" accept={ARQUIVO_TIPOS.join(',')} hidden onChange={(e) => arquivoEscolhido(e.target.files?.[0] ?? null)} />

      <div className="ted-corpo">
        <div className="ted-form">
          <p className="ted-sobre">aba do território</p>
          <h2 className="ted-titulo">{local.nome}</h2>
          <p className="dica">
            Monte a página que abre quando alguém clica no seu território. Cada imagem é recortada no formato do espaço onde vai
            aparecer — use fotos grandes e escolha o enquadramento. O nome do território vem do cadastro no mapa.
          </p>

          <fieldset className="ted-bloco">
            <legend>abertura</legend>
            <Campo rotulo="subtítulo" valor={ap.subtitulo} max={LIMITES_APRES.subtitulo} dica="uma linha curta sob o nome — ex.: o reino sob o gelo" onMudar={(v) => mudar({ subtitulo: v })} />
            <Campo rotulo="introdução" valor={ap.introducao} max={LIMITES_APRES.introducao} linhas={4} dica="onde fica, o que é, por que importa" onMudar={(v) => mudar({ introducao: v })} />
            <Campo rotulo="citação (canto superior direito)" valor={ap.citacao} max={LIMITES_APRES.citacao} linhas={2} dica="uma frase em itálico, de alguém do lugar ou sobre ele" onMudar={(v) => mudar({ citacao: v })} />
            <div className="field">
              <label>imagem de capa</label>
              <Vaga imagem={ap.capa} formato="capa" onPor={() => escolher('capa', (img) => setAp((a) => ({ ...a, capa: img })))} onTirar={() => mudar({ capa: null })} />
              <p className="dica">a paisagem principal, larga — o nome e a introdução ficam por cima do lado esquerdo, então evite o assunto principal ali</p>
            </div>
          </fieldset>

          <fieldset className="ted-bloco">
            <legend>destaque</legend>
            <Campo rotulo="título do destaque" valor={ap.destaque.titulo} max={LIMITES_APRES.destaqueTitulo} dica="ex.: a dualidade de halnaker" onMudar={(v) => mudar({ destaque: { ...ap.destaque, titulo: v } })} />
            <Campo rotulo="texto do destaque" valor={ap.destaque.texto} max={LIMITES_APRES.destaqueTexto} linhas={6} dica="aparece sobre o canto inferior direito da capa; deixe uma linha em branco para separar parágrafos" onMudar={(v) => mudar({ destaque: { ...ap.destaque, texto: v } })} />
          </fieldset>

          <fieldset className="ted-bloco">
            <legend>três janelas</legend>
            <p className="dica">três recortes do território — a superfície, o que se esconde, um lugar marcante…</p>
            <div className="ted-secoes">
              {ap.secoes.map((s, i) => (
                <div className="ted-secao" key={i}>
                  <Vaga
                    imagem={s.imagem}
                    formato="secao"
                    onPor={() => escolher('secao', (img) => setAp((a) => ({ ...a, secoes: a.secoes.map((x, j) => (j === i ? { ...x, imagem: img } : x)) })))}
                    onTirar={() => mudar({ secoes: ap.secoes.map((x, j) => (j === i ? { ...x, imagem: null } : x)) })}
                  />
                  <input value={s.titulo} maxLength={LIMITES_APRES.secaoTitulo} placeholder={`título ${i + 1}`} onChange={(e) => mudar({ secoes: ap.secoes.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)) })} />
                  <textarea rows={4} value={s.texto} maxLength={LIMITES_APRES.secaoTexto} placeholder="duas ou três linhas" onChange={(e) => mudar({ secoes: ap.secoes.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)) })} />
                  <span className="ted-conta">{s.texto.length}/{LIMITES_APRES.secaoTexto}</span>
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset className="ted-bloco">
            <legend>fauna</legend>
            {listaEspecies('fauna')}
          </fieldset>
          <fieldset className="ted-bloco">
            <legend>flora</legend>
            {listaEspecies('flora')}
          </fieldset>

          <fieldset className="ted-bloco">
            <legend>rodapé</legend>
            <Campo rotulo="localização" valor={ap.localizacao} max={LIMITES_APRES.localizacao} linhas={2} dica="ao lado do globinho, que marca sozinho o ponto do território no mundo" onMudar={(v) => mudar({ localizacao: v })} />
            <Campo rotulo="frase de fechamento" valor={ap.fechamento} max={LIMITES_APRES.fechamento} linhas={3} dica="centralizada, em itálico, fechando a página" onMudar={(v) => mudar({ fechamento: v })} />
          </fieldset>
        </div>

        <aside className="ted-lado">
          <div className="ted-comp">
            <p className="ted-comp-t">painel completo em <strong>{comp.pct}%</strong></p>
            <div className="ted-barra"><span style={{ width: `${comp.pct}%` }} /></div>
            <ul>
              {comp.itens.map((it) => (
                <li key={it.rotulo} className={it.ok ? 'ok' : ''}>{it.ok ? '✓' : '○'} {it.rotulo}</li>
              ))}
            </ul>
          </div>
          {enviando && <p className="dica">enviando imagem...</p>}
          {erro && <p className="erro">FALHA :: {erro}</p>}
          <div className="ted-acoes">
            <button type="button" className="mini-btn" onClick={() => onPrevia(ap)}>pré-visualizar</button>
            <button type="button" className="mini-btn perigo" disabled={salvando || enviando} onClick={salvar}>
              {salvando ? 'salvando...' : 'salvar apresentação'}
            </button>
            <button type="button" className="mini-btn dim" onClick={fechar}>cancelar</button>
          </div>
        </aside>
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
    </div>
  );
}
