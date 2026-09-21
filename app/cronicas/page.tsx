'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import '../matrix.css';
import MatrixRain from '../components/MatrixRain';
import PrecisaAprovacao from '../components/PrecisaAprovacao';
import { useBeep } from '../components/useBeep';
import { supabase } from '../lib/db';
import { mensagemEvento, urlAnexoEvento, type Evento } from '../lib/eventos';

function Midia({ caminho, tipo, nome }: { caminho: string; tipo: string; nome: string }) {
  const [falhou, setFalhou] = useState(false);
  const url = urlAnexoEvento(caminho);
  if (falhou) return <p className="dica">Não foi possível exibir {nome}.</p>;
  return tipo.startsWith('video/')
    ? <video src={url} controls preload="metadata" playsInline aria-label={nome} onError={() => setFalhou(true)} />
    : <img src={url} alt={nome} loading="lazy" onError={() => setFalhou(true)} />;
}

export default function CronicasPage() {
  const [lista, setLista] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [avaliando, setAvaliando] = useState<string | null>(null);
  const [abrirMotivo, setAbrirMotivo] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [erroAvaliacao, setErroAvaliacao] = useState('');
  const { beep, muted, setMuted } = useBeep();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      if (!data.session) { setEhAdmin(false); return; }
      supabase.rpc('drk_e_admin').then(({ data: admin }) => setEhAdmin(admin === true));
    });
  }, []);

  useEffect(() => {
    (async () => {
      // reprovado não aparece aqui — só para o autor (em /perfil) e o admin
      const { data, error } = await supabase.from('eventos').select('*').neq('status_aprovacao', 'reprovado').order('ordem', { ascending: true });
      if (error) setErro(mensagemEvento(error));
      else setLista((data ?? []) as Evento[]);
      setLoading(false);
    })();
  }, []);

  const aprovar = async (id: string) => {
    setAvaliando(id); setErroAvaliacao('');
    const { error } = await supabase.rpc('drk_aprovar_evento', { alvo_id: id });
    setAvaliando(null);
    if (error) { setErroAvaliacao(error.message); return; }
    setLista((prev) => prev.map((e) => (e.id === id ? { ...e, status_aprovacao: 'aprovado', motivo_reprovacao: null } : e)));
  };

  const reprovar = async (id: string) => {
    if (!motivo.trim()) { setErroAvaliacao('Escreva o motivo da reprovação.'); return; }
    setAvaliando(id); setErroAvaliacao('');
    const { error } = await supabase.rpc('drk_reprovar_evento', { alvo_id: id, motivo: motivo.trim() });
    setAvaliando(null);
    if (error) { setErroAvaliacao(error.message); return; }
    setLista((prev) => prev.filter((e) => e.id !== id));
    setAbrirMotivo(null);
    setMotivo('');
  };

  return (
    <div className="term">
      <MatrixRain />

      <main className="wrap narrow">
       <PrecisaAprovacao>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terrasave://arquivo/cronicas</span>
            <div className="hd-act">
              <button className="ico" onClick={() => { const n = !muted; setMuted(n); if (!n) beep('hover'); }} title={muted ? 'ativar som' : 'silenciar'}>
                {muted ? '♪ off' : '♪ on'}
              </button>
              <Link className="ico" href="/">← arquivo</Link>
              <Link className="ico" href="/personagens">personagens</Link>
              <Link className="ico" href="/faccoes">facções</Link>
              <Link className="ico" href="/eventos">✦ eventos</Link>
              <Link className="ico" href="/glossario">glossário</Link>
              {userId && <Link className="ico" href="/cronicas/nova">+ enviar crônica</Link>}
              <Link className="ico" href="/admin/cronicas">+ novo</Link>
            </div>
          </div>

          <h1 data-txt="CRÔNICAS">CRÔNICAS</h1>
          <p className="sub">&gt; os grandes marcos do império, em ordem <span className="cur" /></p>
        </header>

        {erro && <p className="erro">FALHA :: {erro}</p>}

        {loading ? (
          <div className="load"><span /><span /><span /><p>decodificando arquivo...</p></div>
        ) : lista.length === 0 ? (
          <p className="vazio">nenhuma crônica cadastrada ainda</p>
        ) : (
          <div className="linha-tempo">
            {lista.map((ev, i) => (
              <article className="evento-tempo" key={ev.id} style={{ animationDelay: `${Math.min(i * 70, 700)}ms` }}>
                <span className="evento-marca" />
                {ev.data && <span className="evento-data">{ev.data}</span>}
                <h2>{ev.titulo}</h2>
                {ev.status_aprovacao === 'pendente' && <span className="selo-pendente">em análise</span>}
                {ehAdmin && ev.status_aprovacao === 'pendente' && (
                  <div className="acoes-aprovacao">
                    <button type="button" className="mini-btn" disabled={avaliando === ev.id} onClick={() => aprovar(ev.id)}>✓ aprovar</button>
                    <button type="button" className="mini-btn dim" disabled={avaliando === ev.id} onClick={() => setAbrirMotivo(abrirMotivo === ev.id ? null : ev.id)}>
                      ✕ reprovar
                    </button>
                    {abrirMotivo === ev.id && (
                      <div style={{ width: '100%' }}>
                        <textarea
                          rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)}
                          placeholder="explique o motivo — o autor vai ver isto para corrigir e reenviar"
                        />
                        <button type="button" className="mini-btn dim" disabled={avaliando === ev.id} onClick={() => reprovar(ev.id)} style={{ marginTop: 8 }}>
                          confirmar reprovação
                        </button>
                      </div>
                    )}
                    {erroAvaliacao && <p className="erro">{erroAvaliacao}</p>}
                  </div>
                )}
                {ev.anexo && (
                  <figure className="evento-midia">
                    <Midia caminho={ev.anexo.caminho} tipo={ev.anexo.tipo} nome={ev.anexo.nome} />
                  </figure>
                )}
                {ev.resumo && <p className="evento-resumo">{ev.resumo}</p>}
                {ev.descricao && <p className="evento-desc">{ev.descricao}</p>}
              </article>
            ))}
          </div>
        )}

        <footer className="ft">terrasave_system v1.0 // conexão segura estabelecida</footer>
       </PrecisaAprovacao>
      </main>
    </div>
  );
}
