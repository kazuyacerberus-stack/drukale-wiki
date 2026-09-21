'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import '../../matrix.css';
import Protegido from '../../components/Protegido';
import Avatar from '../../components/Avatar';
import { supabase } from '../../lib/db';
import { sair } from '../../lib/auth';
import { estaMudo } from '../../lib/perfil';
import { useRouter } from 'next/navigation';

type ContaAdmin = {
  user_id: string;
  email: string;
  apelido: string;
  avatar_url: string | null;
  muted_until: string | null;
  banido: boolean;
  created_at: string;
};

const DURACOES: { rotulo: string; ms: number | null }[] = [
  { rotulo: '15 minutos', ms: 15 * 60 * 1000 },
  { rotulo: '1 hora', ms: 60 * 60 * 1000 },
  { rotulo: '1 dia', ms: 24 * 60 * 60 * 1000 },
  { rotulo: '1 semana', ms: 7 * 24 * 60 * 60 * 1000 },
  { rotulo: 'permanente', ms: null },
];

export default function ComunidadeAdmin() {
  const router = useRouter();
  const [contas, setContas] = useState<ContaAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [duracao, setDuracao] = useState<Record<string, number>>({});
  const [agindo, setAgindo] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true); setErro('');
    const { data, error } = await supabase.rpc('drk_admin_listar_perfis');
    if (error) setErro(error.message);
    else setContas((data ?? []) as ContaAdmin[]);
    setCarregando(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const q = busca.trim().toLowerCase();
  const lista = q ? contas.filter((c) => c.email.toLowerCase().includes(q) || c.apelido.toLowerCase().includes(q)) : contas;

  const silenciar = async (uid: string) => {
    const idx = duracao[uid] ?? 1;
    const ms = DURACOES[idx].ms;
    const ate = ms === null ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString() : new Date(Date.now() + ms).toISOString();
    setAgindo(uid);
    const { error } = await supabase.rpc('drk_silenciar_usuario', { alvo: uid, ate });
    if (error) setAviso('FALHA :: ' + error.message);
    else { setAviso(`Conta silenciada por ${DURACOES[idx].rotulo}.`); await carregar(); }
    setAgindo(null);
  };

  const removerSilencio = async (uid: string) => {
    setAgindo(uid);
    const { error } = await supabase.rpc('drk_silenciar_usuario', { alvo: uid, ate: null });
    if (error) setAviso('FALHA :: ' + error.message);
    else { setAviso('Silêncio removido.'); await carregar(); }
    setAgindo(null);
  };

  const alternarExpulsao = async (uid: string, expulsar: boolean) => {
    setAgindo(uid);
    const { error } = await supabase.rpc('drk_expulsar_usuario', { alvo: uid, expulso: expulsar });
    if (error) setAviso('FALHA :: ' + error.message);
    else { setAviso(expulsar ? 'Conta expulsa.' : 'Conta reintegrada.'); await carregar(); }
    setAgindo(null);
  };

  const ruim = aviso.startsWith('FALHA');

  return (
    <div className="term">
      <main className="wrap">
        <Protegido>
          <header className="hd">
            <div className="hd-bar">
              <span className="dot" /><span className="dot" /><span className="dot" />
              <span className="hd-path">terrasave://admin/comunidade</span>
              <div className="hd-act">
                <Link className="ico" href="/admin">← painel</Link>
                <Link className="ico" href="/chat">chat</Link>
                <button className="ico dim" onClick={async () => { await sair(); router.replace('/admin/login'); }}>sair</button>
              </div>
            </div>
            <h1 data-txt="COMUNIDADE">COMUNIDADE</h1>
            <p className="sub">&gt; contas, apelidos e moderação <span className="cur" /></p>
          </header>

          <div className="bar">
            <input className="srch" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="filtrar por e-mail ou apelido..." />
            <span className="count">{carregando ? 'CARREGANDO' : `${lista.length} DE ${contas.length}`}</span>
          </div>

          {erro && <p className="erro">FALHA :: {erro}</p>}
          {aviso && <p className={'stat ' + (ruim ? 'bad' : 'ok')} style={{ textAlign: 'left', margin: '0 0 20px' }}>{aviso}</p>}

          {carregando ? (
            <div className="load"><span /><span /><span /><p>lendo contas...</p></div>
          ) : lista.length === 0 ? (
            <p className="vazio">{q ? 'nenhuma conta corresponde ao filtro' : 'nenhuma conta cadastrada ainda'}</p>
          ) : (
            <div className="lista">
              {lista.map((c) => {
                const mudo = estaMudo(c);
                return (
                  <div className="item" key={c.user_id}>
                    <div className="mini"><Avatar url={c.avatar_url} nome={c.apelido} tamanho={52} /></div>
                    <div className="info">
                      <strong>{c.apelido}</strong>
                      <span className="meta">{c.email}</span>
                      <span className="slug">
                        {c.banido ? 'expulso' : mudo ? `silenciado até ${new Date(c.muted_until as string).toLocaleString('pt-BR')}` : 'ativo'}
                      </span>
                    </div>
                    <div className="acoes" style={{ alignItems: 'center' }}>
                      <select
                        className="mini-btn"
                        value={duracao[c.user_id] ?? 1}
                        onChange={(e) => setDuracao((d) => ({ ...d, [c.user_id]: Number(e.target.value) }))}
                        disabled={agindo === c.user_id}
                      >
                        {DURACOES.map((d, i) => <option key={d.rotulo} value={i}>{d.rotulo}</option>)}
                      </select>
                      <button className="mini-btn" disabled={agindo === c.user_id} onClick={() => silenciar(c.user_id)}>silenciar</button>
                      {mudo && <button className="mini-btn" disabled={agindo === c.user_id} onClick={() => removerSilencio(c.user_id)}>remover silêncio</button>}
                      <button className="mini-btn dim" disabled={agindo === c.user_id} onClick={() => alternarExpulsao(c.user_id, !c.banido)}>
                        {c.banido ? 'reintegrar' : 'expulsar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <footer className="ft">terrasave_system v1.0 // conexão segura estabelecida</footer>
        </Protegido>
      </main>
    </div>
  );
}
