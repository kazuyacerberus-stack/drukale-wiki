'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../matrix.css';
import MatrixRain from '../components/MatrixRain';
import Avatar from '../components/Avatar';
import { supabase } from '../lib/db';
import { sair } from '../lib/auth';
import { garantirPerfil, salvarPerfil, validarAvatar, estaMudo, mensagemPerfil, type Perfil } from '../lib/perfil';

export default function PerfilPage() {
  const router = useRouter();
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [apelido, setApelido] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace('/admin/login'); return; }
      const p = await garantirPerfil();
      if (!vivo) return;
      setPerfil(p);
      setApelido(p?.apelido ?? '');
      setCarregandoPerfil(false);
    })();
    return () => { vivo = false; };
  }, [router]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const escolherAvatar = (file: File | null) => {
    setErro('');
    if (!file) { setAvatar(null); setPreview(''); return; }
    const problema = validarAvatar(file);
    if (problema) { setErro(problema); if (arquivoRef.current) arquivoRef.current.value = ''; return; }
    if (preview) URL.revokeObjectURL(preview);
    setAvatar(file);
    setPreview(URL.createObjectURL(file));
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(''); setAviso('');
    const apelidoLimpo = apelido.trim();
    if (apelidoLimpo.length < 2 || apelidoLimpo.length > 32) {
      setErro('O apelido precisa ter entre 2 e 32 caracteres.');
      return;
    }
    setSalvando(true);
    try {
      const atualizado = await salvarPerfil(apelidoLimpo, avatar);
      setPerfil(atualizado);
      setApelido(atualizado.apelido);
      if (preview) URL.revokeObjectURL(preview);
      setAvatar(null); setPreview('');
      if (arquivoRef.current) arquivoRef.current.value = '';
      setAviso('Perfil atualizado.');
    } catch (err) {
      setErro(err instanceof Error ? err.message : mensagemPerfil(err));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="term">
      <MatrixRain />
      <main className="wrap login-wrap">
        <div className="hd-bar">
          <span className="dot" /><span className="dot" /><span className="dot" />
          <span className="hd-path">drukale://minha-conta</span>
          <div className="hd-act">
            <Link className="ico" href="/">← arquivo</Link>
            <Link className="ico" href="/chat">chat</Link>
            <Link className="ico" href="/cenas">cenas</Link>
            <button className="ico dim" onClick={async () => { await sair(); router.replace('/'); }}>sair</button>
          </div>
        </div>

        {carregandoPerfil ? (
          <div className="load"><span /><span /><span /><p>carregando perfil...</p></div>
        ) : (
          <form className="panel login" onSubmit={salvar}>
            <h1 className="login-t">MEU PERFIL</h1>
            <p className="login-s">&gt; apelido e foto usados nas cenas e no chat</p>

            <div style={{ display: 'grid', justifyItems: 'center', gap: 8, margin: '4px 0 14px' }}>
              <Avatar url={preview || perfil?.avatar_url} nome={apelido} tamanho={72} />
              <label className="mini-btn" style={{ cursor: 'pointer' }}>
                trocar foto
                <input
                  ref={arquivoRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={(e) => escolherAvatar(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            {perfil && (perfil.banido || estaMudo(perfil)) && (
              <p className="stat bad">
                {perfil.banido ? 'Sua conta foi suspensa — você não consegue mais postar.' : `Você está silenciado até ${new Date(perfil.muted_until as string).toLocaleString('pt-BR')}.`}
              </p>
            )}

            <div className="field">
              <label>apelido</label>
              <input value={apelido} onChange={(e) => setApelido(e.target.value)} maxLength={32} required />
            </div>

            <button className="go" disabled={salvando}>{salvando ? '// salvando...' : 'SALVAR'}</button>

            {erro && <p className="stat bad">FALHA :: {erro}</p>}
            {aviso && <p className="stat ok">{aviso}</p>}
          </form>
        )}

        <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
      </main>
    </div>
  );
}
