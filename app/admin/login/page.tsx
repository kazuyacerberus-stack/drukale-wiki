'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../../matrix.css';
import MatrixRain from '../../components/MatrixRain';
import { supabase } from '../../lib/db';
import { entrar } from '../../lib/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  // quem já está logado não precisa ver esta tela
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/admin');
    });
  }, [router]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');
    try {
      await entrar(email.trim(), senha);
      router.replace('/admin');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao entrar');
      setCarregando(false);
    }
  };

  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap login-wrap">
        <div className="hd-bar">
          <span className="dot" /><span className="dot" /><span className="dot" />
          <span className="hd-path">terrasave://acesso-restrito</span>
          <div className="hd-act">
            <Link className="ico" href="/">← arquivo</Link>
          </div>
        </div>

        <form className="panel login" onSubmit={enviar}>
          <div className="cadeado">[ ⌁ ]</div>
          <h1 className="login-t">ACESSO RESTRITO</h1>
          <p className="login-s">&gt; identifique-se para editar o arquivo</p>

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
              autoComplete="current-password"
              required
            />
          </div>

          <button className="go" disabled={carregando}>
            {carregando ? '// autenticando...' : 'ENTRAR'}
          </button>

          {erro && <p className="stat bad">FALHA :: {erro}</p>}

          <p className="login-s" style={{ marginTop: 18 }}>
            Ainda não tem conta? <Link href="/cadastro" style={{ color: 'var(--g)' }}>Cadastre-se</Link>
          </p>
        </form>

        <footer className="ft">terrasave_system v1.0 // canal criptografado</footer>
      </main>
    </div>
  );
}
