'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '../../matrix.css';
import MatrixRain from '../../components/MatrixRain';
import PrecisaAprovacao from '../../components/PrecisaAprovacao';
import { useBeep } from '../../components/useBeep';
import { supabase, FICHA, lerSecoes, type Character } from '../../lib/db';
import { normalizarNome } from '../../lib/faccoes';

export default function PersonagemPage() {
  return (
    <div className="term">
      <MatrixRain />
      <main className="wrap">
        <PrecisaAprovacao>
          <PersonagemPageInterna />
        </PrecisaAprovacao>
      </main>
    </div>
  );
}

function PersonagemPageInterna() {
  const params = useParams<{ slug: string }>();
  const chave = decodeURIComponent(String(params?.slug ?? ''));

  const [alvo, setAlvo] = useState<Character | null>(null);
  const [vizinhos, setVizinhos] = useState<{ ant: Character | null; prox: Character | null }>({
    ant: null,
    prox: null,
  });
  const [loading, setLoading] = useState(true);
  const [quebrada, setQuebrada] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState(0);
  const [faccoes, setFaccoes] = useState<Map<string, string>>(new Map());
  const [ehAdmin, setEhAdmin] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [mostrarMotivo, setMostrarMotivo] = useState(false);
  const [avaliando, setAvaliando] = useState(false);
  const [erroAvaliacao, setErroAvaliacao] = useState('');
  const { beep, muted, setMuted } = useBeep();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { setEhAdmin(false); return; }
      supabase.rpc('drk_e_admin').then(({ data: admin }) => setEhAdmin(admin === true));
    });
  }, []);

  useEffect(() => {
    if (!chave) return;
    (async () => {
      setLoading(true);
      setAbaAtiva(0);   // trocou de personagem, volta para a primeira aba

      // busca todos e resolve localmente: funciona por slug ou por id,
      // e já entrega os vizinhos para a navegação do rodapé.
      // reprovado não aparece aqui — só para o autor (em /perfil) e o admin
      const [{ data }, { data: fac }] = await Promise.all([
        supabase.from('characters').select('*').neq('status_aprovacao', 'reprovado').order('name', { ascending: true }),
        supabase.from('faccoes').select('slug,nome'),
      ]);
      setFaccoes(new Map((fac ?? []).map((f: { slug: string; nome: string }) => [normalizarNome(f.nome), f.slug])));

      const todos = (data ?? []) as Character[];
      const idx = todos.findIndex(
        (c) => c.slug === chave || String(c.id) === chave
      );

      if (idx >= 0) {
        setAlvo(todos[idx]);
        // com um só personagem não faz sentido navegar para ele mesmo
        setVizinhos(
          todos.length < 2
            ? { ant: null, prox: null }
            : {
                ant: todos[(idx - 1 + todos.length) % todos.length],
                prox: todos[(idx + 1) % todos.length],
              }
        );
      } else {
        setAlvo(null);
      }
      setLoading(false);
    })();
  }, [chave]);

  // precisa ficar aqui em cima: hooks não podem vir depois dos returns abaixo
  const secoes = useMemo(() => lerSecoes(alvo?.sections), [alvo]);

  const inicial = (n: string | null) => (n?.trim()?.[0] ?? '?').toUpperCase();
  const rota = (c: Character) => `/personagem/${c.slug || c.id}`;

  const aprovar = async () => {
    if (!alvo) return;
    setAvaliando(true); setErroAvaliacao('');
    const { error } = await supabase.rpc('drk_aprovar_personagem', { alvo_id: alvo.id });
    setAvaliando(false);
    if (error) { setErroAvaliacao(error.message); return; }
    setAlvo({ ...alvo, status_aprovacao: 'aprovado', motivo_reprovacao: null });
  };

  const reprovar = async () => {
    if (!alvo) return;
    if (!motivo.trim()) { setErroAvaliacao('Escreva o motivo da reprovação.'); return; }
    setAvaliando(true); setErroAvaliacao('');
    const { error } = await supabase.rpc('drk_reprovar_personagem', { alvo_id: alvo.id, motivo: motivo.trim() });
    setAvaliando(false);
    if (error) { setErroAvaliacao(error.message); return; }
    setAlvo({ ...alvo, status_aprovacao: 'reprovado', motivo_reprovacao: motivo.trim() });
    setMostrarMotivo(false);
    setMotivo('');
  };

  /* ---------- carregando ---------- */
  if (loading) {
    return (
      <div className="load">
        <span /><span /><span />
        <p>acessando registro...</p>
      </div>
    );
  }

  /* ---------- não encontrado ---------- */
  if (!alvo) {
    return (
      <>
        <Link className="volta" href="/" onClick={() => beep('close')}>
          ← voltar ao arquivo
        </Link>
        <header className="hd">
          <h1 data-txt="REGISTRO NÃO ENCONTRADO">REGISTRO NÃO ENCONTRADO</h1>
          <p className="sub">&gt; nenhum personagem responde por &quot;{chave}&quot;</p>
        </header>
      </>
    );
  }

  /* ---------- ficha ---------- */
  // se alguém apagou abas no painel enquanto esta página estava aberta,
  // o índice guardado pode ter ficado grande demais — trava no último
  const ativa = secoes.length ? Math.min(abaAtiva, secoes.length - 1) : 0;

  const linhas = FICHA.map((f) => ({
    campo: f.campo,
    rotulo: f.rotulo,
    valor: (alvo[f.campo] as string | null) ?? null,
  })).filter((l) => l.valor);

  const temImagem = alvo.image_url && !quebrada;

  return (
    <>
        <div className="hd-bar">
          <span className="dot" /><span className="dot" /><span className="dot" />
          <span className="hd-path">
            drukale://arquivo/personagem/{alvo.slug || alvo.id}
          </span>
          <div className="hd-act">
            <button
              className="ico"
              onClick={() => { const n = !muted; setMuted(n); if (!n) beep('hover'); }}
            >
              {muted ? '♪ off' : '♪ on'}
            </button>
            <Link className="ico" href="/" onClick={() => beep('close')}>
              ← arquivo
            </Link>
          </div>
        </div>

        <div style={{ height: 26 }} />

        <div className="perfil">
          {/* ---------- coluna principal ---------- */}
          <div>
            <div className="pcab">
              <div className="retrato">
                <span className="halo" />
                <div className="orb">
                  {temImagem ? (
                    <img
                      src={alvo.image_url as string}
                      alt={alvo.name ?? ''}
                      onError={() => setQuebrada(true)}
                    />
                  ) : (
                    <span className="ini big">{inicial(alvo.name)}</span>
                  )}
                </div>
              </div>

              <div className="pnome">
                {alvo.epithet && <span className="epi">{alvo.epithet}</span>}
                <h1 data-txt={alvo.name ?? 'sem nome'}>{alvo.name ?? 'sem nome'}</h1>
                {alvo.status_aprovacao === 'pendente' && <span className="selo-pendente">em análise</span>}
              </div>
            </div>

            {ehAdmin && alvo.status_aprovacao === 'pendente' && (
              <div className="acoes-aprovacao">
                <button type="button" className="mini-btn" disabled={avaliando} onClick={aprovar}>✓ aprovar</button>
                <button type="button" className="mini-btn dim" disabled={avaliando} onClick={() => setMostrarMotivo((v) => !v)}>
                  ✕ reprovar
                </button>
                {mostrarMotivo && (
                  <div style={{ width: '100%' }}>
                    <textarea
                      rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)}
                      placeholder="explique o motivo — o autor vai ver isto para corrigir e reenviar"
                    />
                    <button type="button" className="mini-btn dim" disabled={avaliando} onClick={reprovar} style={{ marginTop: 8 }}>
                      confirmar reprovação
                    </button>
                  </div>
                )}
                {erroAvaliacao && <p className="erro">{erroAvaliacao}</p>}
              </div>
            )}

            {alvo.quote && <p className="cit">&ldquo;{alvo.quote}&rdquo;</p>}

            {alvo.description && (
              <section className="sec" style={{ animationDelay: '60ms' }}>
                <h2>resumo</h2>
                <p>{alvo.description}</p>
              </section>
            )}

            {secoes.length > 0 && (
              <div className="bloco-abas" style={{ animationDelay: '140ms' }}>
                <div className="abas abas-ficha">
                  {secoes.map((s, i) => (
                    <button
                      key={i}
                      className={`aba${i === ativa ? ' on' : ''}`}
                      onClick={() => { setAbaAtiva(i); beep('click'); }}
                      onMouseEnter={() => beep('hover')}
                    >
                      {s.titulo}
                    </button>
                  ))}
                </div>

                {/* a key faz o texto reaparecer com a animação a cada troca */}
                <section className="sec sec-aba" key={ativa}>
                  <p>{secoes[ativa].texto}</p>
                </section>
              </div>
            )}

            {!alvo.description && secoes.length === 0 && (
              <p className="vazio">nenhum conteúdo arquivado para este registro.</p>
            )}
          </div>

          {/* ---------- ficha lateral ---------- */}
          <aside className="ficha">
            <h3>ficha</h3>
            <dl>
              <div className="linha">
                <dt>registro</dt>
                <dd>#{String(alvo.id).replace(/-/g, '').slice(0, 8).toUpperCase()}</dd>
              </div>
              {linhas.map((l) => {
                const slugFaccao = l.campo === 'faction' && l.valor ? faccoes.get(normalizarNome(l.valor)) : undefined;
                return (
                  <div className="linha" key={l.rotulo}>
                    <dt>{l.rotulo}</dt>
                    <dd>
                      {slugFaccao ? (
                        <Link href={`/faccoes/${slugFaccao}`} onClick={() => beep('click')}>{l.valor}</Link>
                      ) : l.valor}
                    </dd>
                  </div>
                );
              })}
            </dl>

            {alvo.sheet_url && (
              <a
                className="baixar"
                href={alvo.sheet_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => beep('click')}
                onMouseEnter={() => beep('hover')}
              >
                <strong>ficha completa</strong>
                <span>{alvo.sheet_name || 'abrir arquivo'}</span>
              </a>
            )}
          </aside>
        </div>

        {/* ---------- navegação ---------- */}
        {(vizinhos.ant || vizinhos.prox) && (
          <nav className="naveg">
            {vizinhos.ant && (
              <Link href={rota(vizinhos.ant)} onClick={() => beep('click')}>
                <small>← anterior</small>
                {vizinhos.ant.name ?? 'sem nome'}
              </Link>
            )}
            {vizinhos.prox && (
              <Link
                href={rota(vizinhos.prox)}
                onClick={() => beep('click')}
                style={{ textAlign: 'right' }}
              >
                <small>próximo →</small>
                {vizinhos.prox.name ?? 'sem nome'}
              </Link>
            )}
          </nav>
        )}

        <footer className="ft">drukale_system v1.0 // conexão segura estabelecida</footer>
    </>
  );
}
