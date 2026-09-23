'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import { supabase } from '../lib/db';
import { salvarPerfil, validarAvatar, validarCapa, mensagemPerfil, LIMITE_BIO, type Perfil } from '../lib/perfil';
import type { EstadoAmizade } from '../lib/amizades';
import type { Faccao } from '../lib/faccoes';

type Resumo = { contas_pendentes: number; contas_aprovadas: number; fichas_pendentes: number; eventos_pendentes: number; territorios_pendentes: number; banidos: number };

type Props = {
  perfil: Perfil;
  ehProprioPerfil: boolean;
  ehAdmin: boolean;
  resumo?: Resumo | null;
  onPerfilAtualizado?: (p: Perfil) => void;
  estadoAmizade?: EstadoAmizade;
  agindoAmizade?: boolean;
  onAcaoAmizade?: (acao: 'adicionar' | 'aceitar' | 'recusar' | 'desfazer') => void;
};

export default function PerfilCard({ perfil, ehProprioPerfil, ehAdmin, resumo, onPerfilAtualizado, estadoAmizade, agindoAmizade, onAcaoAmizade }: Props) {
  const [editando, setEditando] = useState(false);
  const [apelido, setApelido] = useState(perfil.apelido);
  const [bio, setBio] = useState(perfil.bio ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState('');
  const [capaFile, setCapaFile] = useState<File | null>(null);
  const [previewCapa, setPreviewCapa] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const avatarRef = useRef<HTMLInputElement>(null);
  const capaRef = useRef<HTMLInputElement>(null);
  const [faccao, setFaccao] = useState<Faccao | null>(null);

  useEffect(() => {
    (async () => {
      const { data: membro } = await supabase
        .from('faccao_membros')
        .select('faccao_id')
        .eq('user_id', perfil.user_id)
        .eq('status', 'aceito')
        .maybeSingle();
      let faccaoId = membro?.faccao_id ?? null;
      if (!faccaoId) {
        // quem criou a facção é o líder dela mesmo sem um convite/pedido
        // aceito em faccao_membros — conta como filiado também
        const { data: criada } = await supabase
          .from('faccoes')
          .select('id')
          .eq('user_id', perfil.user_id)
          .eq('status_aprovacao', 'aprovado')
          .order('created_at', { ascending: false })
          .limit(1);
        faccaoId = criada?.[0]?.id ?? null;
      }
      if (!faccaoId) { setFaccao(null); return; }
      const { data: f } = await supabase.from('faccoes').select('*').eq('id', faccaoId).maybeSingle();
      setFaccao((f as Faccao) ?? null);
    })();
  }, [perfil.user_id]);

  const escolherAvatar = (file: File | null) => {
    setErro('');
    if (!file) return;
    const problema = validarAvatar(file);
    if (problema) { setErro(problema); return; }
    setAvatarFile(file);
    setPreviewAvatar(URL.createObjectURL(file));
  };

  const escolherCapa = (file: File | null) => {
    setErro('');
    if (!file) return;
    const problema = validarCapa(file);
    if (problema) { setErro(problema); return; }
    setCapaFile(file);
    setPreviewCapa(URL.createObjectURL(file));
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const apelidoLimpo = apelido.trim();
    if (apelidoLimpo.length < 2 || apelidoLimpo.length > 32) { setErro('O apelido precisa ter entre 2 e 32 caracteres.'); return; }
    setSalvando(true); setErro('');
    try {
      const atualizado = await salvarPerfil(apelidoLimpo, avatarFile, capaFile, bio);
      onPerfilAtualizado?.(atualizado);
      setAvatarFile(null); setPreviewAvatar('');
      setCapaFile(null); setPreviewCapa('');
      if (avatarRef.current) avatarRef.current.value = '';
      if (capaRef.current) capaRef.current.value = '';
      setEditando(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : mensagemPerfil(err));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className={`perfil-cartao${faccao ? ' tem-faccao' : ''}`} style={faccao ? ({ '--faccao-cor': faccao.cor } as React.CSSProperties) : undefined}>
      <div className="perfil-capa" style={previewCapa || perfil.capa_url ? { backgroundImage: `url(${previewCapa || perfil.capa_url})` } : undefined} />
      <div className="perfil-avatar-sobre">
        <Avatar url={previewAvatar || perfil.avatar_url} nome={perfil.apelido} tamanho={84} />
        {faccao && (
          <Link href={`/faccoes/${faccao.slug}`} className="perfil-bandeira" title={`Membro de ${faccao.nome}`}>
            {faccao.simbolo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={faccao.simbolo} alt="" />
            ) : (
              <span className="perfil-bandeira-ini">{(faccao.nome.trim()[0] ?? '?').toUpperCase()}</span>
            )}
          </Link>
        )}
      </div>
      {faccao && (
        <p className="perfil-faccao-nome"><Link href={`/faccoes/${faccao.slug}`}>{faccao.nome}</Link></p>
      )}
      <div className="perfil-cartao-corpo">
        {editando ? (
          <form onSubmit={salvar}>
            <div className="field">
              <label>apelido</label>
              <input value={apelido} onChange={(e) => setApelido(e.target.value)} maxLength={32} required />
            </div>
            <div className="field">
              <label>biografia ({bio.length}/{LIMITE_BIO})</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, LIMITE_BIO))} rows={3} placeholder="conte um pouco sobre você ou seu personagem..." />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <label className="mini-btn" style={{ cursor: 'pointer' }}>
                trocar foto
                <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={(e) => escolherAvatar(e.target.files?.[0] ?? null)} />
              </label>
              <label className="mini-btn" style={{ cursor: 'pointer' }}>
                trocar capa
                <input ref={capaRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={(e) => escolherCapa(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <p className="dica" style={{ marginBottom: 14 }}>foto até 5 MB · capa até 8 MB</p>
            <div className="perfil-cartao-acoes">
              <button className="go" disabled={salvando}>{salvando ? '// salvando...' : 'SALVAR'}</button>
              <button type="button" className="mini-btn dim" onClick={() => { setEditando(false); setApelido(perfil.apelido); setBio(perfil.bio ?? ''); setErro(''); }}>cancelar</button>
            </div>
            {erro && <p className="stat bad" style={{ marginTop: 10 }}>FALHA :: {erro}</p>}
          </form>
        ) : (
          <>
            <h1 data-txt={perfil.apelido}>{perfil.apelido}</h1>
            {perfil.bio ? <p className="perfil-bio">{perfil.bio}</p> : <p className="perfil-bio vazia">sem biografia ainda</p>}

            {ehProprioPerfil && (
              <div className="perfil-cartao-acoes">
                <button type="button" className="mini-btn" onClick={() => setEditando(true)}>editar perfil</button>
              </div>
            )}

            {!ehProprioPerfil && onAcaoAmizade && (
              <div className="perfil-cartao-acoes">
                {estadoAmizade === 'nenhum' && <button type="button" className="mini-btn" disabled={agindoAmizade} onClick={() => onAcaoAmizade('adicionar')}>+ adicionar amigo</button>}
                {estadoAmizade === 'pedido_enviado' && <button type="button" className="mini-btn dim" disabled={agindoAmizade} onClick={() => onAcaoAmizade('desfazer')}>pedido enviado — cancelar</button>}
                {estadoAmizade === 'pedido_recebido' && (
                  <>
                    <button type="button" className="mini-btn" disabled={agindoAmizade} onClick={() => onAcaoAmizade('aceitar')}>✓ aceitar pedido</button>
                    <button type="button" className="mini-btn dim" disabled={agindoAmizade} onClick={() => onAcaoAmizade('recusar')}>✕ recusar</button>
                  </>
                )}
                {estadoAmizade === 'amigos' && <button type="button" className="mini-btn dim" disabled={agindoAmizade} onClick={() => onAcaoAmizade('desfazer')}>✓ amigos — desfazer</button>}
              </div>
            )}

            {ehProprioPerfil && ehAdmin && resumo && (
              <>
                <div className="perfil-mini-resumo">
                  <div><strong>{resumo.contas_pendentes}</strong><span>contas</span></div>
                  <div><strong>{resumo.fichas_pendentes + resumo.eventos_pendentes + resumo.territorios_pendentes}</strong><span>pendências</span></div>
                </div>
                <Link href="/admin" className="mini-btn" style={{ display: 'block', textAlign: 'center' }}>★ painel completo</Link>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
