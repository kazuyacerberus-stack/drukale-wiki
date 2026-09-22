'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/db';
import { subirAnexoComentario, apagarAnexoComentario, validarAnexoComentario, urlAnexoComentario, type AnexoComentario } from '../lib/comentarios';
import { parseMusicaUrl, type Musica } from '../lib/musica';
import {
  publicarPost, mensagemPerfilPost, ROTULO_VISIBILIDADE, ICONE_VISIBILIDADE, type PerfilPost, type Visibilidade,
} from '../lib/perfilPosts';
import { buscarMinhasAmizades, type Amizade } from '../lib/amizades';
import GifPicker from './GifPicker';
import Icone from './Icone';
import MusicaEmbed from './MusicaEmbed';

type PerfilLeve = { apelido: string; avatar_url: string | null };

export default function PostComposer({
  visibilidadeFixa, onPublicado,
}: {
  visibilidadeFixa?: Visibilidade;
  onPublicado: (post: PerfilPost) => void;
}) {
  const [texto, setTexto] = useState('');
  const [anexoArquivo, setAnexoArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [gifEscolhido, setGifEscolhido] = useState<AnexoComentario | null>(null);
  const [gifAberto, setGifAberto] = useState(false);
  const [musica, setMusica] = useState<Musica | null>(null);
  const [musicaAberta, setMusicaAberta] = useState(false);
  const [musicaTexto, setMusicaTexto] = useState('');
  const [erroMusica, setErroMusica] = useState('');
  const [visibilidade, setVisibilidade] = useState<Visibilidade>(visibilidadeFixa ?? 'amigos');
  const [amigosComId, setAmigosComId] = useState<(PerfilLeve & { user_id: string })[]>([]);
  const [audienciaEscolhida, setAudienciaEscolhida] = useState<Set<string>>(new Set());
  const [publicando, setPublicando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const previewRef = useRef('');

  useEffect(() => {
    if (visibilidadeFixa) return;
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id;
      if (!uid) return;
      buscarMinhasAmizades().then((linhas: Amizade[]) => {
        const idsAmigos = linhas.filter((a) => a.solicitante === uid && a.status === 'aceita').map((a) => a.destinatario);
        if (!idsAmigos.length) return;
        supabase.from('profiles').select('user_id,apelido,avatar_url').in('user_id', idsAmigos).then(({ data }) => {
          if (data) setAmigosComId(data as (PerfilLeve & { user_id: string })[]);
        });
      }).catch(() => {});
    });
  }, [visibilidadeFixa]);

  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const escolherArquivo = (file: File | null) => {
    setErroForm('');
    if (!file) return;
    const problema = validarAnexoComentario(file);
    if (problema) { setErroForm(problema); return; }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setAnexoArquivo(file);
    setPreview(url);
    setGifEscolhido(null);
  };

  const descartarAnexo = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = '';
    setAnexoArquivo(null);
    setPreview('');
    setGifEscolhido(null);
  };

  const usarMusica = () => {
    const m = parseMusicaUrl(musicaTexto);
    if (!m) { setErroMusica('Link não reconhecido — use um link do YouTube ou do Spotify.'); return; }
    setMusica(m); setMusicaAberta(false); setMusicaTexto(''); setErroMusica('');
  };

  const publicar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim() && !anexoArquivo && !gifEscolhido && !musica) { setErroForm('Escreva algo, anexe uma mídia ou uma música.'); return; }
    setPublicando(true); setErroForm('');
    let subiuAgora: AnexoComentario | null = null;
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Entre novamente para postar.');
      let anexoLinha: AnexoComentario | null = gifEscolhido;
      if (anexoArquivo) { anexoLinha = await subirAnexoComentario(anexoArquivo, auth.user.id); subiuAgora = anexoLinha; }

      const novo = await publicarPost(texto, anexoLinha, musica, visibilidadeFixa ?? visibilidade, [...audienciaEscolhida]);
      onPublicado(novo);
      setTexto(''); descartarAnexo(); setMusica(null); setAudienciaEscolhida(new Set());
    } catch (e) {
      if (subiuAgora) await apagarAnexoComentario(subiuAgora);
      setErroForm(mensagemPerfilPost(e));
    } finally {
      setPublicando(false);
    }
  };

  return (
    <form className="panel" onSubmit={publicar} style={{ marginBottom: 24 }}>
      <div className="grupo">
        <span className="grupo-t">nova postagem</span>
        <div className="field">
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} maxLength={4000} placeholder="O que você quer contar?" />
        </div>
        {(preview || gifEscolhido) && (
          <div className="done">
            {preview
              ? <img src={preview} alt="" className="sq" />
              : gifEscolhido && <img src={urlAnexoComentario(gifEscolhido)} alt="" className="sq" />}
            <div className="done-txt"><button type="button" className="lnk dim" onClick={descartarAnexo}>remover anexo</button></div>
          </div>
        )}
        {musica && (
          <div className="post-comentario-anexo-preview">
            <MusicaEmbed musica={musica} />
            <button type="button" onClick={() => setMusica(null)}>remover música</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
          <label className="mini-btn" style={{ cursor: 'pointer' }}>
            <Icone nome="anexo" /> anexar
            <input type="file" style={{ display: 'none' }} accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
              onChange={(e) => { escolherArquivo(e.target.files?.[0] ?? null); e.target.value = ''; }} />
          </label>
          <button type="button" className="mini-btn" onClick={() => setGifAberto((v) => !v)}>GIF</button>
          {!musica && <button type="button" className="mini-btn" onClick={() => setMusicaAberta((v) => !v)}>♪ música</button>}
          {!visibilidadeFixa && (
            <select value={visibilidade} onChange={(e) => setVisibilidade(e.target.value as Visibilidade)}>
              {(Object.keys(ROTULO_VISIBILIDADE) as Visibilidade[]).map((v) => (
                <option key={v} value={v}>{ICONE_VISIBILIDADE[v]} {ROTULO_VISIBILIDADE[v]}</option>
              ))}
            </select>
          )}
        </div>
        {gifAberto && <GifPicker onEscolher={(a) => { setGifEscolhido(a); setAnexoArquivo(null); setPreview(''); setGifAberto(false); }} onFechar={() => setGifAberto(false)} />}
        {musicaAberta && !musica && (
          <div className="post-musica-campo">
            <input
              value={musicaTexto}
              onChange={(e) => { setMusicaTexto(e.target.value); setErroMusica(''); }}
              placeholder="cole um link do YouTube ou Spotify"
            />
            <button type="button" onClick={usarMusica}>usar</button>
            <button type="button" onClick={() => { setMusicaAberta(false); setMusicaTexto(''); setErroMusica(''); }}>cancelar</button>
            {erroMusica && <p className="stat bad">{erroMusica}</p>}
          </div>
        )}
        {!visibilidadeFixa && visibilidade === 'personalizado' && (
          <div className="field">
            <label>quem pode ver</label>
            {amigosComId.length === 0 ? (
              <p className="dica">você ainda não tem amigos pra marcar aqui.</p>
            ) : (
              amigosComId.map((a) => (
                <label key={a.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, textTransform: 'none', fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={audienciaEscolhida.has(a.user_id)}
                    onChange={(e) => setAudienciaEscolhida((prev) => { const n = new Set(prev); e.target.checked ? n.add(a.user_id) : n.delete(a.user_id); return n; })}
                  />
                  {a.apelido}
                </label>
              ))
            )}
          </div>
        )}
      </div>
      <button className="go" disabled={publicando}>{publicando ? '// publicando...' : 'PUBLICAR'}</button>
      {erroForm && <p className="stat bad">{erroForm}</p>}
    </form>
  );
}
