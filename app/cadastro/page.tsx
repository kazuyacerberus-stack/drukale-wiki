'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../matrix.css';
import MatrixRain from '../components/MatrixRain';
import Avatar from '../components/Avatar';
import { supabase } from '../lib/db';
import { cadastrar } from '../lib/auth';
import { criarPerfilInicial, validarAvatar, mensagemPerfil } from '../lib/perfil';

export default function Cadastro() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [apelido, setApelido] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [carregando, setCarregando] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/perfil');
    });
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

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setAviso('');

    const apelidoLimpo = apelido.trim();
    if (apelidoLimpo.length < 2 || apelidoLimpo.length > 32) {
      setErro('O apelido precisa ter entre 2 e 32 caracteres.');
      return;
    }
    if (senha !== confirmar) {
      setErro('As senhas não são iguais.');
      return;
    }

    setCarregando(true);
    try {
      const logadoJa = await cadastrar(email.trim(), senha, apelidoLimpo);
      if (!logadoJa) {
        setAviso('Conta criada! Verifique seu e-mail para confirmar o acesso. Depois disso, seu cadastro ainda espera aprovação do game master antes de liberar o site.');
        setCarregando(false);
        return;
      }
      await criarPerfilInicial(apelidoLimpo, avatar);
      setAviso('Cadastro enviado! Sua conta está aguardando aprovação do game master — acompanhe em /perfil.');
      setCarregando(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : mensagemPerfil(err));
      setCarregando(false);
    }
  };

  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap login-wrap">
        <div className="hd-bar">
          <span className="dot" /><span className="dot" /><span className="dot" />
          <span className="hd-path">terranova://novo-membro</span>
          <div className="hd-act">
            <Link className="ico" href="/">← arquivo</Link>
            <Link className="ico" href="/admin/login">já tenho conta</Link>
          </div>
        </div>

        <form className="panel login" onSubmit={enviar}>
          <div className="cadeado">[ ⌁ ]</div>
          <h1 className="login-t">NOVO MEMBRO</h1>
          <p className="login-s">&gt; crie sua conta para postar cenas e usar o chat</p>

          <div style={{ display: 'grid', justifyItems: 'center', gap: 8, margin: '4px 0 14px' }}>
            <Avatar url={preview} nome={apelido} tamanho={64} />
            <label className="mini-btn" style={{ cursor: 'pointer' }}>
              {avatar ? 'trocar foto' : 'escolher foto (opcional)'}
              <input
                ref={arquivoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={(e) => escolherAvatar(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="field">
            <label>apelido</label>
            <input
              value={apelido}
              onChange={(e) => setApelido(e.target.value)}
              placeholder="como quer ser chamado"
              maxLength={32}
              required
            />
          </div>

          <div className="field">
            <label>e-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              autoComplete="username"
              required
            />
          </div>

          <div className="field">
            <label>senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <div className="field">
            <label>confirmar senha</label>
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <button className="go" disabled={carregando}>
            {carregando ? '// criando conta...' : 'CRIAR CONTA'}
          </button>

          {erro && <p className="stat bad">FALHA :: {erro}</p>}
          {aviso && <p className="stat ok">{aviso}</p>}
        </form>

        <footer className="ft">terranova_system v1.0 // canal criptografado</footer>
      </main>
    </div>
  );
}
