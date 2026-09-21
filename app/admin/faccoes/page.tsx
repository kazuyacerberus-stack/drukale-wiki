'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import '../../matrix.css';
import Protegido from '../../components/Protegido';
import { supabase } from '../../lib/db';
import { apagarSimbolo, mensagemFaccao, type Faccao } from '../../lib/faccoes';

export default function PainelFaccoes() {
  const [lista, setLista] = useState<Faccao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [query, setQuery] = useState('');
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [apagando, setApagando] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('faccoes').select('*').order('nome', { ascending: true });
    if (error) setErro(mensagemFaccao(error));
    else setLista((data ?? []) as Faccao[]);
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const excluir = async (fac: Faccao) => {
    setApagando(fac.id);
    setAviso('');
    const { error } = await supabase.from('faccoes').delete().eq('id', fac.id);
    if (error) {
      setAviso('FALHA :: ' + mensagemFaccao(error));
    } else {
      await apagarSimbolo(fac.simbolo);
      setLista((l) => l.filter((x) => x.id !== fac.id));
      setAviso(`FACÇÃO "${fac.nome}" REMOVIDA`);
    }
    setApagando(null);
    setConfirmar(null);
  };

  const q = query.trim().toLowerCase();
  const filtrada = q ? lista.filter((f) => f.nome.toLowerCase().includes(q)) : lista;
  const ruim = aviso.startsWith('FALHA');

  return (
    <div className="term">
      <main className="wrap">
       <Protegido>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terrasave://admin/faccoes</span>
            <div className="hd-act">
              <Link className="ico" href="/admin">← painel</Link>
              <Link className="ico" href="/admin/faccoes/nova">+ nova facção</Link>
            </div>
          </div>
          <h1 data-txt="FACÇÕES">FACÇÕES</h1>
          <p className="sub">&gt; casas e organizações do império <span className="cur" /></p>
        </header>

        <div className="bar">
          <input className="srch" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="filtrar facções..." />
          <span className="count">{loading ? 'CARREGANDO' : `${filtrada.length} DE ${lista.length}`}</span>
        </div>

        {erro && <p className="erro">FALHA :: {erro}</p>}
        {aviso && <p className={'stat ' + (ruim ? 'bad' : 'ok')} style={{ textAlign: 'left', margin: '0 0 20px' }}>{aviso}</p>}

        {loading ? (
          <div className="load"><span /><span /><span /><p>lendo facções...</p></div>
        ) : filtrada.length === 0 ? (
          <p className="vazio">{q ? 'nenhuma facção corresponde ao filtro' : 'nenhuma facção cadastrada ainda'}</p>
        ) : (
          <div className="lista">
            {filtrada.map((f) => {
              const emConfirmacao = confirmar === f.id;
              return (
                <div className={'item' + (emConfirmacao ? ' perigo' : '')} key={f.id}>
                  <div className="mini">
                    {f.simbolo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.simbolo} alt="" />
                    ) : (
                      <span className="ini" style={{ fontSize: 22, color: f.cor }}>{f.nome.trim()[0]?.toUpperCase() ?? '?'}</span>
                    )}
                  </div>
                  <div className="info">
                    <strong>{f.nome}</strong>
                    <span className="meta">{f.resumo || <em>sem resumo</em>}</span>
                    <span className="slug">/faccoes/{f.slug}</span>
                  </div>
                  {emConfirmacao ? (
                    <div className="acoes">
                      <button className="mini-btn perigo" disabled={apagando === f.id} onClick={() => excluir(f)}>
                        {apagando === f.id ? '...' : 'confirmar'}
                      </button>
                      <button className="mini-btn" onClick={() => setConfirmar(null)}>cancelar</button>
                    </div>
                  ) : (
                    <div className="acoes">
                      <Link className="mini-btn" href={`/faccoes/${f.slug}`}>ver</Link>
                      <Link className="mini-btn" href={`/admin/faccoes/editar/${f.slug}`}>editar</Link>
                      <button className="mini-btn dim" onClick={() => { setConfirmar(f.id); setAviso(''); }}>excluir</button>
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
