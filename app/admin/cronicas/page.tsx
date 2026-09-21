'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import '../../matrix.css';
import MatrixRain from '../../components/MatrixRain';
import Protegido from '../../components/Protegido';
import { supabase } from '../../lib/db';
import { mensagemEvento, type Evento } from '../../lib/eventos';

export default function PainelCronicas() {
  const [lista, setLista] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('eventos').select('*').order('ordem', { ascending: true });
    if (error) setErro(mensagemEvento(error));
    else setLista((data ?? []) as Evento[]);
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const mover = async (i: number, direcao: -1 | 1) => {
    const j = i + direcao;
    if (j < 0 || j >= lista.length) return;
    const a = lista[i], b = lista[j];
    setOcupado(a.id);
    setAviso('');
    const [r1, r2] = await Promise.all([
      supabase.from('eventos').update({ ordem: b.ordem }).eq('id', a.id),
      supabase.from('eventos').update({ ordem: a.ordem }).eq('id', b.id),
    ]);
    const erro = r1.error || r2.error;
    if (erro) {
      setAviso('FALHA :: ' + mensagemEvento(erro));
    } else {
      const nova = [...lista];
      nova[i] = { ...b, ordem: a.ordem };
      nova[j] = { ...a, ordem: b.ordem };
      setLista(nova);
    }
    setOcupado(null);
  };

  const excluir = async (ev: Evento) => {
    setOcupado(ev.id);
    setAviso('');
    const { error } = await supabase.from('eventos').delete().eq('id', ev.id);
    if (error) {
      setAviso('FALHA :: ' + mensagemEvento(error));
    } else {
      setLista((l) => l.filter((x) => x.id !== ev.id));
      setAviso(`CRÔNICA "${ev.titulo}" REMOVIDA`);
    }
    setOcupado(null);
    setConfirmar(null);
  };

  const ruim = aviso.startsWith('FALHA');

  return (
    <div className="term">
      <MatrixRain />
      <main className="wrap">
       <Protegido>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terrasave://admin/cronicas</span>
            <div className="hd-act">
              <Link className="ico" href="/admin">← painel</Link>
              <Link className="ico" href="/admin/cronicas/nova">+ nova crônica</Link>
            </div>
          </div>
          <h1 data-txt="CRÔNICAS">CRÔNICAS</h1>
          <p className="sub">&gt; a ordem aqui é a ordem que aparece no site — use ↑/↓ pra ajustar <span className="cur" /></p>
        </header>

        {erro && <p className="erro">FALHA :: {erro}</p>}
        {aviso && <p className={'stat ' + (ruim ? 'bad' : 'ok')} style={{ textAlign: 'left', margin: '0 0 20px' }}>{aviso}</p>}

        {loading ? (
          <div className="load"><span /><span /><span /><p>lendo as crônicas...</p></div>
        ) : lista.length === 0 ? (
          <p className="vazio">nenhuma crônica cadastrada ainda</p>
        ) : (
          <div className="lista">
            {lista.map((ev, i) => {
              const emConfirmacao = confirmar === ev.id;
              return (
                <div className={'item' + (emConfirmacao ? ' perigo' : '')} key={ev.id}>
                  <div className="acoes">
                    <button className="mini-btn" title="subir" disabled={i === 0 || ocupado === ev.id} onClick={() => mover(i, -1)}>↑</button>
                    <button className="mini-btn" title="descer" disabled={i === lista.length - 1 || ocupado === ev.id} onClick={() => mover(i, 1)}>↓</button>
                  </div>
                  <div className="info">
                    <strong>{ev.titulo}</strong>
                    <span className="meta">{ev.data || <em>sem data</em>}</span>
                    <span className="slug">{ev.resumo || 'sem resumo'}</span>
                  </div>
                  {emConfirmacao ? (
                    <div className="acoes">
                      <button className="mini-btn perigo" disabled={ocupado === ev.id} onClick={() => excluir(ev)}>
                        {ocupado === ev.id ? '...' : 'confirmar'}
                      </button>
                      <button className="mini-btn" onClick={() => setConfirmar(null)}>cancelar</button>
                    </div>
                  ) : (
                    <div className="acoes">
                      <Link className="mini-btn" href={`/admin/cronicas/editar/${ev.id}`}>editar</Link>
                      <button className="mini-btn dim" onClick={() => { setConfirmar(ev.id); setAviso(''); }}>excluir</button>
                    </div>
                  )}
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
