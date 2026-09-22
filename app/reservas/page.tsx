'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import '../matrix.css';
import PrecisaAprovacao from '../components/PrecisaAprovacao';
import ReservaForm from '../components/ReservaForm';
import Avatar from '../components/Avatar';
import { useBeep } from '../components/useBeep';
import BotaoSom from '../components/BotaoSom';
import { supabase } from '../lib/db';
import { normalizarBusca } from '../lib/regras';
import { mensagemReserva, removerImagemReserva, urlImagemReserva, type Reserva } from '../lib/reservas';

type PerfilLeve = { user_id: string; apelido: string; avatar_url: string | null };

export default function ReservasPage() {
  const { beep, muted, setMuted } = useBeep();

  return (
    <div className="term drukale">
      <main className="wrap">
       <PrecisaAprovacao>
        <header className="hd">
          <div className="hd-bar">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="hd-path">terrasave://arquivo/reserva-de-imagens</span>
            <div className="hd-act">
              <BotaoSom muted={muted} setMuted={setMuted} beep={beep} />
              <Link className="ico" href="/">← início</Link>
              <Link className="ico" href="/personagens">personagens</Link>
              <Link className="ico" href="/faccoes">facções</Link>
              <Link className="ico" href="/regras">regras</Link>
            </div>
          </div>

          <h1 data-txt="RESERVA DE IMAGENS">RESERVA DE IMAGENS</h1>
          <p className="sub">&gt; cada imagem, um único personagem — reserve a sua antes que outra pessoa use <span className="cur" /></p>
        </header>

        <ReservasConteudo />

        <footer className="ft">terrasave_system v1.0 // conexão segura estabelecida</footer>
       </PrecisaAprovacao>
      </main>
    </div>
  );
}

function ReservasConteudo() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [perfis, setPerfis] = useState<Map<string, PerfilLeve>>(new Map());
  const [faccoes, setFaccoes] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [busca, setBusca] = useState('');
  const [soMinhas, setSoMinhas] = useState(false);
  const [formAberto, setFormAberto] = useState(false);

  const carregarPerfis = async (ids: string[]) => {
    const novos = [...new Set(ids)];
    if (!novos.length) return;
    const { data } = await supabase.from('profiles').select('user_id,apelido,avatar_url').in('user_id', novos);
    if (data) setPerfis((prev) => { const n = new Map(prev); (data as PerfilLeve[]).forEach((p) => n.set(p.user_id, p)); return n; });
  };

  useEffect(() => {
    (async () => {
      const [{ data: auth }, { data: admin }, { data, error }, { data: fac }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc('drk_e_admin'),
        supabase.from('reservas_imagens').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('faccoes').select('nome').neq('status_aprovacao', 'reprovado').order('nome'),
      ]);
      setUserId(auth.user?.id ?? null);
      setEhAdmin(admin === true);
      setFaccoes(((fac ?? []) as { nome: string }[]).map((f) => f.nome));
      if (error) { setErro(mensagemReserva(error)); setCarregando(false); return; }
      const lista = (data ?? []) as Reserva[];
      setReservas(lista);
      await carregarPerfis(lista.map((r) => r.user_id));
      setCarregando(false);
    })();
  }, []);

  const termo = normalizarBusca(busca.trim());
  const visiveis = useMemo(() => reservas.filter((r) => {
    if (soMinhas && r.user_id !== userId) return false;
    if (!termo) return true;
    const texto = normalizarBusca([r.titulo, r.nome, r.personagem, r.universo, r.faccao, r.raca, r.classe, r.subclasse, perfis.get(r.user_id)?.apelido].filter(Boolean).join(' '));
    return texto.includes(termo);
  }), [reservas, termo, soMinhas, userId, perfis]);

  const liberar = async (r: Reserva) => {
    if (!confirm(`Liberar a reserva de "${r.personagem}"? A imagem sai daqui e outro jogador poderá reservá-la.`)) return;
    const { error } = await supabase.from('reservas_imagens').delete().eq('id', r.id);
    if (error) { setErro(mensagemReserva(error)); return; }
    setReservas((prev) => prev.filter((x) => x.id !== r.id));
    await removerImagemReserva(r.caminho);
  };

  if (carregando) return <div className="load"><span /><span /><span /><p>abrindo o arquivo de imagens...</p></div>;

  return (
    <>
      <div className="reservas-barra">
        <input
          className="regras-busca"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="buscar personagem, universo, jogador… (veja se já foi reservado)"
          aria-label="Buscar reservas"
        />
        <button type="button" className={soMinhas ? 'mini-btn on' : 'mini-btn'} onClick={() => setSoMinhas((v) => !v)}>só as minhas</button>
        {userId && !formAberto && <button type="button" className="mini-btn" onClick={() => setFormAberto(true)}>+ reservar imagem</button>}
      </div>

      {formAberto && userId && (
        <ReservaForm
          userId={userId}
          faccoes={faccoes}
          onCancelar={() => setFormAberto(false)}
          onCriada={(nova) => { setReservas((prev) => [nova, ...prev]); void carregarPerfis([nova.user_id]); setFormAberto(false); }}
        />
      )}

      {erro && <p className="erro">FALHA :: {erro}</p>}

      <p className="regras-contagem" style={{ margin: '4px 2px 14px' }}>
        {termo || soMinhas ? `${visiveis.length} de ${reservas.length} reservas` : `${reservas.length} ${reservas.length === 1 ? 'reserva' : 'reservas'}`}
      </p>

      {visiveis.length === 0 ? (
        <p className="vazio">
          {reservas.length === 0 ? 'nenhuma imagem reservada ainda — seja o primeiro' : 'nenhuma reserva corresponde à busca'}
        </p>
      ) : (
        <section className="reservas-grade">
          {visiveis.map((r) => {
            const dono = perfis.get(r.user_id);
            const detalhes = [r.faccao, r.raca, r.classe, r.subclasse].filter(Boolean) as string[];
            return (
              <article className="reserva-cartao" key={r.id}>
                <a href={urlImagemReserva(r.caminho)} target="_blank" rel="noopener noreferrer" className="reserva-imagem" title="abrir a imagem inteira">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urlImagemReserva(r.caminho)} alt={r.titulo} loading="lazy" />
                </a>
                <div className="reserva-corpo">
                  <h3>{r.titulo}</h3>
                  <p className="reserva-origem">
                    {r.personagem} <span>· {r.autoral ? 'autoria própria' : r.universo}</span>
                  </p>
                  <p className="reserva-nome">para <strong>{r.nome}</strong></p>
                  {detalhes.length > 0 && <p className="reserva-chips">{detalhes.map((d, i) => <span key={i}>{d}</span>)}</p>}
                  <div className="reserva-rodape">
                    <Link href={`/jogador/${r.user_id}`} className="reserva-dono">
                      <Avatar url={dono?.avatar_url} nome={dono?.apelido} tamanho={20} />
                      {dono?.apelido ?? 'membro'}
                    </Link>
                    <time dateTime={r.created_at}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</time>
                  </div>
                  {(r.user_id === userId || ehAdmin) && (
                    <button type="button" className="mini-btn dim" onClick={() => liberar(r)}>liberar reserva</button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
