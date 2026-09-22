'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/db';
import Icone from '../components/Icone';
import Avatar from '../components/Avatar';
import GifPicker from '../components/GifPicker';
import {
  montarArvoreComentarios, urlAnexoComentario, validarAnexoComentario, subirAnexoComentario, apagarAnexoComentario, mensagemComentario,
  type Comentario, type ComentarioComRespostas, type AnexoComentario,
} from '../lib/comentarios';
import s from './cenas.module.css';

type PerfilLeve = { apelido: string; avatar_url: string | null };

function Midia({ anexo }: { anexo: AnexoComentario }) {
  const [falhou, setFalhou] = useState(false);
  const url = urlAnexoComentario(anexo);
  const video = anexo.tipo === 'video/mp4' || anexo.tipo === 'video/webm';
  if (falhou) return <p>Não foi possível exibir {anexo.nome}.</p>;
  return video
    ? <video src={url} controls preload="metadata" playsInline aria-label={anexo.nome} onError={() => setFalhou(true)} />
    : <img src={url} alt={anexo.nome} loading="lazy" onError={() => setFalhou(true)} />;
}

function Compositor({
  cenaId, parentId, onPublicado, onCancelar, autoFoco,
}: {
  cenaId: string; parentId: string | null; onPublicado: (c: Comentario) => void; onCancelar?: () => void; autoFoco?: boolean;
}) {
  const [texto, setTexto] = useState('');
  const [anexo, setAnexo] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [gifEscolhido, setGifEscolhido] = useState<AnexoComentario | null>(null);
  const [gifAberto, setGifAberto] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState('');
  const previewRef = useRef('');
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (autoFoco) areaRef.current?.focus(); }, [autoFoco]);
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const limparUpload = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = '';
    setAnexo(null);
    setPreview('');
  };

  const escolherArquivo = (file: File | null) => {
    setErro('');
    if (!file) return;
    const problema = validarAnexoComentario(file);
    if (problema) { setErro(problema); return; }
    limparUpload();
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setAnexo(file);
    setPreview(url);
    setGifEscolhido(null);
  };

  const escolherGif = (a: AnexoComentario) => {
    limparUpload();
    setGifEscolhido(a);
    setGifAberto(false);
  };

  const descartarAnexo = () => {
    limparUpload();
    setGifEscolhido(null);
  };

  const publicar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim() && !anexo && !gifEscolhido) { setErro('Escreva algo ou anexe uma foto, vídeo ou GIF.'); return; }
    setPublicando(true); setErro('');
    let subiuAgora: AnexoComentario | null = null;
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Entre novamente para comentar.');

      let anexoLinha: AnexoComentario | null = gifEscolhido;
      if (anexo) { anexoLinha = await subirAnexoComentario(anexo, auth.user.id); subiuAgora = anexoLinha; }

      const { data: novo, error } = await supabase
        .from('cena_comentarios')
        .insert({ cena_id: cenaId, parent_id: parentId, user_id: auth.user.id, texto: texto.trim() || null, anexo: anexoLinha })
        .select()
        .single();
      if (error) throw error;

      onPublicado(novo as Comentario);
      setTexto(''); descartarAnexo();
      onCancelar?.();
    } catch (e) {
      if (subiuAgora) await apagarAnexoComentario(subiuAgora);
      setErro(mensagemComentario(e));
    } finally {
      setPublicando(false);
    }
  };

  return (
    <form className={s.comentarioForm} onSubmit={publicar}>
      <textarea
        ref={areaRef}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        maxLength={4000}
        placeholder={parentId ? 'Escreva uma resposta...' : 'Escreva um comentário...'}
      />
      {(preview || gifEscolhido) && (
        <div className={s.comentarioAnexoPreview}>
          {preview ? <img src={preview} alt="" /> : gifEscolhido && <img src={urlAnexoComentario(gifEscolhido)} alt="" />}
          <button type="button" onClick={descartarAnexo}>remover</button>
        </div>
      )}
      <div className={s.comentarioAcoes}>
        <label className={s.comentarioAnexoBtn}>
          <Icone nome="anexo" />
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
            onChange={(e) => { escolherArquivo(e.target.files?.[0] ?? null); e.target.value = ''; }} />
        </label>
        <button type="button" className={s.comentarioAnexoBtn} onClick={() => setGifAberto((v) => !v)}>GIF</button>
        {onCancelar && <button type="button" onClick={onCancelar}>cancelar</button>}
        <button type="submit" className={s.primario} disabled={publicando}>{publicando ? '...' : 'Publicar'}</button>
      </div>
      {gifAberto && <GifPicker onEscolher={escolherGif} onFechar={() => setGifAberto(false)} />}
      {erro && <p role="alert" className={s.erro}>{erro}</p>}
    </form>
  );
}

function Item({
  no, perfis, userId, ehAdmin, onApagar, onResposta,
}: {
  no: ComentarioComRespostas; perfis: Map<string, PerfilLeve>; userId: string | null; ehAdmin: boolean;
  onApagar: (id: string) => void; onResposta: (c: Comentario) => void;
}) {
  const [respondendo, setRespondendo] = useState(false);
  const [mostrarRespostas, setMostrarRespostas] = useState(false);
  const perfil = perfis.get(no.user_id);

  return (
    <div className={s.comentario}>
      <Avatar url={perfil?.avatar_url} nome={perfil?.apelido} tamanho={26} />
      <div className={s.comentarioCorpo}>
        <div className={s.comentarioBalao}>
          <Link href={`/jogador/${no.user_id}`}><strong>{perfil?.apelido ?? 'membro'}</strong></Link>
          {no.texto && <p>{no.texto}</p>}
        </div>
        {no.anexo && <div className={s.comentarioMidia}><Midia anexo={no.anexo} /></div>}
        <div className={s.comentarioMeta}>
          <time dateTime={no.created_at}>{new Date(no.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time>
          <button type="button" onClick={() => setRespondendo((v) => !v)}>responder</button>
          {(no.user_id === userId || ehAdmin) && <button type="button" onClick={() => onApagar(no.id)}>apagar</button>}
        </div>

        {respondendo && (
          <Compositor
            cenaId={no.cena_id}
            parentId={no.id}
            autoFoco
            onCancelar={() => setRespondendo(false)}
            onPublicado={(c) => { onResposta(c); setRespondendo(false); setMostrarRespostas(true); }}
          />
        )}

        {no.respostas.length > 0 && (
          <>
            <button type="button" className={s.comentarioRetratil} onClick={() => setMostrarRespostas((v) => !v)}>
              {mostrarRespostas ? '▾' : '▸'} {no.respostas.length} {no.respostas.length === 1 ? 'resposta' : 'respostas'}
            </button>
            {mostrarRespostas && (
              <div className={s.comentarioFilhos}>
                {no.respostas.map((r) => (
                  <Item key={r.id} no={r} perfis={perfis} userId={userId} ehAdmin={ehAdmin} onApagar={onApagar} onResposta={onResposta} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Comentarios({ cenaId, userId, ehAdmin }: { cenaId: string; userId: string | null; ehAdmin: boolean }) {
  const [lista, setLista] = useState<Comentario[]>([]);
  const [perfis, setPerfis] = useState<Map<string, PerfilLeve>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data, error } = await supabase.from('cena_comentarios').select('*').eq('cena_id', cenaId).order('created_at', { ascending: true });
      if (!vivo) return;
      if (error) { setErro(mensagemComentario(error)); setCarregando(false); return; }
      const linhas = (data ?? []) as Comentario[];
      setLista(linhas);
      const ids = [...new Set(linhas.map((c) => c.user_id))];
      if (ids.length) {
        const { data: perfisData } = await supabase.from('profiles').select('user_id,apelido,avatar_url').in('user_id', ids);
        if (vivo && perfisData) setPerfis(new Map((perfisData as (PerfilLeve & { user_id: string })[]).map((p) => [p.user_id, p])));
      }
      setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [cenaId]);

  const adicionar = (c: Comentario) => {
    setLista((prev) => [...prev, c]);
    if (c.user_id && !perfis.has(c.user_id)) {
      supabase.from('profiles').select('user_id,apelido,avatar_url').eq('user_id', c.user_id).maybeSingle().then(({ data }) => {
        if (data) setPerfis((prev) => new Map(prev).set(c.user_id, data as PerfilLeve));
      });
    }
  };

  const apagar = async (id: string) => {
    if (!confirm('Apagar este comentário? Respostas dele também somem.')) return;
    const alvo = lista.find((c) => c.id === id);
    const { error } = await supabase.from('cena_comentarios').delete().eq('id', id);
    if (error) { setErro(mensagemComentario(error)); return; }
    // remove o comentário e qualquer descendente (cascade no banco; aqui é só a tela)
    const apagarIds = new Set<string>([id]);
    let mudou = true;
    while (mudou) {
      mudou = false;
      for (const c of lista) if (c.parent_id && apagarIds.has(c.parent_id) && !apagarIds.has(c.id)) { apagarIds.add(c.id); mudou = true; }
    }
    setLista((prev) => prev.filter((c) => !apagarIds.has(c.id)));
    if (alvo?.anexo) await apagarAnexoComentario(alvo.anexo);
  };

  const arvore = montarArvoreComentarios(lista);

  return (
    <div className={s.comentarios}>
      <Compositor cenaId={cenaId} parentId={null} onPublicado={adicionar} />
      {erro && <p role="alert" className={s.erro}>{erro}</p>}
      {carregando ? (
        <p>carregando comentários…</p>
      ) : arvore.length === 0 ? (
        <p className={s.comentarioVazio}>seja o primeiro a comentar</p>
      ) : (
        arvore.map((no) => (
          <Item key={no.id} no={no} perfis={perfis} userId={userId} ehAdmin={ehAdmin} onApagar={apagar} onResposta={adicionar} />
        ))
      )}
    </div>
  );
}
