'use client';

import { useRef, useState } from 'react';
import { supabase } from '../lib/db';
import { mensagemRegra, subirMidiaRegra, validarMidiaRegra, type Regra } from '../lib/regras';
import GifPicker from './GifPicker';
import Icone from './Icone';
import RegraTexto from './RegraTexto';

const NOVO_GRUPO = '__novo__';

/**
 * Editor do moderador: cria ou edita uma regra. As imagens, GIFs e vídeos
 * entram no texto como uma linha de markdown, no ponto onde o cursor está.
 */
export default function RegraEditor({
  regra, docs, grupoInicial, onSalvo, onApagado, onCancelar,
}: {
  regra: Regra | null;
  docs: { doc_ordem: number; doc: string }[];
  grupoInicial?: number;
  onSalvo: (r: Regra) => void;
  onApagado: (id: string) => void;
  onCancelar: () => void;
}) {
  const [titulo, setTitulo] = useState(regra?.titulo ?? '');
  const [conteudo, setConteudo] = useState(regra?.conteudo ?? '');
  const [grupo, setGrupo] = useState<string>(String(grupoInicial ?? docs[0]?.doc_ordem ?? NOVO_GRUPO));
  const [grupoNovo, setGrupoNovo] = useState('');
  const [previa, setPrevia] = useState(false);
  const [gifAberto, setGifAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const inserir = (linha: string) => {
    const el = areaRef.current;
    const ini = el?.selectionStart ?? conteudo.length;
    const fim = el?.selectionEnd ?? conteudo.length;
    const antes = conteudo.slice(0, ini);
    const depois = conteudo.slice(fim);
    setConteudo(`${antes}${antes && !antes.endsWith('\n\n') ? '\n\n' : ''}${linha}\n\n${depois}`);
  };

  const enviarMidia = async (file: File | null) => {
    setErro('');
    if (!file) return;
    const problema = validarMidiaRegra(file);
    if (problema) { setErro(problema); return; }
    setEnviando(true);
    try {
      const m = await subirMidiaRegra(file);
      inserir(m.video ? `@[${m.nome}](${m.url})` : `![${m.nome}](${m.url})`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : mensagemRegra(e));
    } finally {
      setEnviando(false);
    }
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) { setErro('Dê um título à regra.'); return; }
    setSalvando(true); setErro('');
    try {
      const { data: auth } = await supabase.auth.getUser();
      const agora = new Date().toISOString();
      if (regra) {
        const { data, error } = await supabase.from('regras')
          .update({ titulo: titulo.trim(), conteudo, updated_at: agora, updated_by: auth.user?.id ?? null })
          .eq('id', regra.id).select().single();
        if (error) throw error;
        onSalvo(data as Regra);
      } else {
        let docOrdem: number;
        let docNome: string;
        if (grupo === NOVO_GRUPO) {
          if (!grupoNovo.trim()) { setErro('Escreva o nome do novo grupo.'); setSalvando(false); return; }
          docOrdem = Math.max(0, ...docs.map((d) => d.doc_ordem)) + 1;
          docNome = grupoNovo.trim();
        } else {
          docOrdem = Number(grupo);
          docNome = docs.find((d) => d.doc_ordem === docOrdem)?.doc ?? '';
        }
        const { data: ultima } = await supabase.from('regras').select('ordem').eq('doc_ordem', docOrdem).order('ordem', { ascending: false }).limit(1);
        const ordem = ((ultima?.[0] as { ordem: number } | undefined)?.ordem ?? -1) + 1;
        const { data, error } = await supabase.from('regras')
          .insert({ doc: docNome, doc_ordem: docOrdem, ordem, titulo: titulo.trim(), conteudo, updated_by: auth.user?.id ?? null })
          .select().single();
        if (error) throw error;
        onSalvo(data as Regra);
      }
    } catch (e2) {
      setErro(mensagemRegra(e2));
    } finally {
      setSalvando(false);
    }
  };

  const apagar = async () => {
    if (!regra || !confirm(`Apagar a regra "${regra.titulo}"? Os comentários dela também somem.`)) return;
    const { error } = await supabase.from('regras').delete().eq('id', regra.id);
    if (error) { setErro(mensagemRegra(error)); return; }
    onApagado(regra.id);
  };

  return (
    <form className="panel regra-editor" onSubmit={salvar}>
      <span className="grupo-t">{regra ? 'editar regra' : 'nova regra'}</span>

      {!regra && (
        <div className="field">
          <label>grupo</label>
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)}>
            {docs.map((d) => <option key={d.doc_ordem} value={d.doc_ordem}>{d.doc}</option>)}
            <option value={NOVO_GRUPO}>+ novo grupo…</option>
          </select>
          {grupo === NOVO_GRUPO && (
            <input style={{ marginTop: 8 }} value={grupoNovo} onChange={(e) => setGrupoNovo(e.target.value)} placeholder="nome do novo grupo" maxLength={200} />
          )}
        </div>
      )}

      <div className="field">
        <label>título</label>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} required />
      </div>

      <div className="field">
        <label>texto da regra</label>
        <div className="regra-barra">
          <label className="mini-btn" style={{ cursor: enviando ? 'wait' : 'pointer' }}>
            {enviando ? '// enviando...' : <><Icone nome="imagem" /> imagem ou vídeo</>}
            <input type="file" style={{ display: 'none' }} disabled={enviando} accept={'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm'}
              onChange={(e) => { void enviarMidia(e.target.files?.[0] ?? null); e.target.value = ''; }} />
          </label>
          <button type="button" className="mini-btn" onClick={() => setGifAberto((v) => !v)}>GIF</button>
          <button type="button" className={previa ? 'mini-btn on' : 'mini-btn'} onClick={() => setPrevia((v) => !v)}>
            {previa ? 'voltar a editar' : 'pré-visualizar'}
          </button>
        </div>
        {gifAberto && <GifPicker onEscolher={(a) => { inserir(`![gif](${a.url})`); setGifAberto(false); }} onFechar={() => setGifAberto(false)} />}
        {previa ? (
          <div className="regra-previa"><RegraTexto texto={conteudo} /></div>
        ) : (
          <textarea ref={areaRef} value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={18} maxLength={60000} spellCheck />
        )}
        <p className="dica">
          ## subtítulo · ### subtítulo menor · - item de lista · **negrito** · *itálico* · tabela com | coluna | coluna |
        </p>
      </div>

      {erro && <p className="stat bad">FALHA :: {erro}</p>}
      <div className="perfil-cartao-acoes" style={{ marginTop: 14 }}>
        <button className="go" style={{ width: 'auto' }} disabled={salvando || enviando}>{salvando ? '// salvando...' : 'SALVAR'}</button>
        <button type="button" className="mini-btn" onClick={onCancelar}>cancelar</button>
        {regra && <button type="button" className="mini-btn dim" onClick={apagar}>apagar regra</button>}
      </div>
    </form>
  );
}
