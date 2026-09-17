'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '../../matrix.css';
import MatrixRain from '../../components/MatrixRain';
import PrecisaAprovacao from '../../components/PrecisaAprovacao';
import PerfilTimeline from '../../components/PerfilTimeline';
import Avatar from '../../components/Avatar';
import { supabase } from '../../lib/db';
import { pedirAmizade, aceitarAmizade, recusarAmizade, desfazerAmizade, estadoAmizade, buscarMinhasAmizades, mensagemAmizade, type EstadoAmizade } from '../../lib/amizades';

export default function JogadorPage() {
  return (
    <div className="term">
      <MatrixRain />
      <main className="wrap">
        <PrecisaAprovacao>
          <JogadorPageInterna />
        </PrecisaAprovacao>
      </main>
    </div>
  );
}

function JogadorPageInterna() {
  const params = useParams<{ id: string }>();
  const alvo = decodeURIComponent(String(params?.id ?? ''));

  const [userId, setUserId] = useState<string | null>(null);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [perfil, setPerfil] = useState<{ apelido: string; avatar_url: string | null } | null>(null);
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
        supabase.from('profiles').select('apelido,avatar_url').eq('user_id', alvo).maybeSingle(),
      ]);
      setEhAdmin(admin === true);
      setPerfil(p as { apelido: string; avatar_url: string | null } | null);
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

  const agir = async (chamada: () => ReturnType<typeof pedirAmizade>) => {
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
        <span className="hd-path">drukale://jogador/{alvo}</span>
        <div className="hd-act">
          <Link className="ico" href="/">← arquivo</Link>
          <Link className="ico" href="/perfil">meu perfil</Link>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '26px 0' }}>
        <Avatar url={perfil.avatar_url} nome={perfil.apelido} tamanho={64} />
        <h1 data-txt={perfil.apelido} style={{ margin: 0 }}>{perfil.apelido}</h1>
        {userId && userId !== alvo && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {estado === 'nenhum' && <button type="button" className="mini-btn" disabled={agindo} onClick={() => agir(() => pedirAmizade(alvo))}>+ adicionar amigo</button>}
            {estado === 'pedido_enviado' && <button type="button" className="mini-btn dim" disabled={agindo} onClick={() => agir(() => desfazerAmizade(alvo))}>pedido enviado — cancelar</button>}
            {estado === 'pedido_recebido' && (
              <>
                <button type="button" className="mini-btn" disabled={agindo} onClick={() => agir(() => aceitarAmizade(alvo))}>✓ aceitar</button>
                <button type="button" className="mini-btn dim" disabled={agindo} onClick={() => agir(() => recusarAmizade(alvo))}>✕ recusar</button>
              </>
            )}
            {estado === 'amigos' && <button type="button" className="mini-btn dim" disabled={agindo} onClick={() => agir(() => desfazerAmizade(alvo))}>✓ amigos — desfazer</button>}
          </div>
        )}
      </div>

      {erro && <p className="erro">FALHA :: {erro}</p>}

      <PerfilTimeline alvo={alvo} ehProprioPerfil={userId === alvo} ehAdmin={ehAdmin} />

      <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
    </>
  );
}
