'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '../../matrix.css';
import PerfilCard from '../../components/PerfilCard';
import PerfilTimeline from '../../components/PerfilTimeline';
import { supabase } from '../../lib/db';
import { pedirAmizade, aceitarAmizade, recusarAmizade, desfazerAmizade, estadoAmizade, buscarMinhasAmizades, mensagemAmizade, type EstadoAmizade } from '../../lib/amizades';
import type { Perfil } from '../../lib/perfil';

const COLUNAS_PUBLICAS_PERFIL = 'user_id,apelido,avatar_url,bio,capa_url,banido,created_at';

export default function JogadorPage() {
  return (
    <div className="term drukale">
      <main className="wrap">
        <>
          <JogadorPageInterna />
        </>
      </main>
    </div>
  );
}

function JogadorPageInterna() {
  const params = useParams<{ id: string }>();
  const alvo = decodeURIComponent(String(params?.id ?? ''));

  const [userId, setUserId] = useState<string | null>(null);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [estado, setEstado] = useState<EstadoAmizade>('nenhum');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [agindo, setAgindo] = useState(false);

  const carregar = async () => {
    setCarregando(true); setErro('');
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);
      const [{ data: admin }, { data: p }] = await Promise.all([
        supabase.rpc('drk_e_admin'),
        // sem conta, só as colunas públicas do perfil (sql/42-site-aberto.sql)
        supabase.from('profiles').select(uid ? '*' : COLUNAS_PUBLICAS_PERFIL).eq('user_id', alvo).maybeSingle(),
      ]);
      setEhAdmin(admin === true);
      setPerfil(p as unknown as Perfil | null);
      if (uid && uid !== alvo) {
        const linhas = await buscarMinhasAmizades();
        setEstado(estadoAmizade(linhas, uid, alvo));
      }
    } catch (e) {
      setErro(mensagemAmizade(e));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { if (alvo) void carregar(); }, [alvo]);

  const agir = async (acao: 'adicionar' | 'aceitar' | 'recusar' | 'desfazer') => {
    const chamada = acao === 'adicionar' ? () => pedirAmizade(alvo)
      : acao === 'aceitar' ? () => aceitarAmizade(alvo)
      : acao === 'recusar' ? () => recusarAmizade(alvo)
      : () => desfazerAmizade(alvo);
    setAgindo(true); setErro('');
    const { error } = await chamada();
    setAgindo(false);
    if (error) { setErro(mensagemAmizade(error)); return; }
    void carregar();
  };

  if (carregando) {
    return <div className="load"><span /><span /><span /><p>acessando perfil...</p></div>;
  }

  if (!perfil) {
    return (
      <>
        <header className="hd">
          <h1 data-txt="JOGADOR NÃO ENCONTRADO">JOGADOR NÃO ENCONTRADO</h1>
          <p className="sub">&gt; nenhuma conta responde por este endereço</p>
        </header>
      </>
    );
  }

  return (
    <>
      <div className="hd-bar">
        <span className="dot" /><span className="dot" /><span className="dot" />
        <span className="hd-path">terrasave://jogador/{alvo}</span>
        <div className="hd-act">
          <Link className="ico" href="/">← arquivo</Link>
          {userId ? <Link className="ico" href="/perfil">meu perfil</Link> : <Link className="ico" href="/admin/login">entrar</Link>}
        </div>
      </div>

      {erro && <p className="erro">FALHA :: {erro}</p>}

      <div className="drukale-layout" style={{ marginTop: 20 }}>
        <aside className="drukale-lateral">
          <PerfilCard
            perfil={perfil}
            ehProprioPerfil={userId === alvo}
            ehAdmin={ehAdmin}
            estadoAmizade={estado}
            agindoAmizade={agindo}
            onAcaoAmizade={userId ? agir : undefined}
          />
        </aside>
        <div className="drukale-principal">
          <PerfilTimeline alvo={alvo} ehProprioPerfil={userId === alvo} ehAdmin={ehAdmin} />
        </div>
      </div>

      <footer className="ft">terrasave_system v1.0 // conexão segura estabelecida</footer>
    </>
  );
}
