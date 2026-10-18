'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import '../matrix.css';
import ReservaForm from '../components/ReservaForm';
import Avatar from '../components/Avatar';
import { useBeep } from '../components/useBeep';
import BotaoSom from '../components/BotaoSom';
import { supabase } from '../lib/db';
import { garantirSessao } from '../lib/auth';
import { garantirPerfil } from '../lib/perfil';
import { normalizarBusca } from '../lib/regras';
import { hashDaImagem, mensagemReserva, removerImagemReserva, urlImagemReserva, validarImagemReserva, type Reserva } from '../lib/reservas';

type PerfilLeve = { user_id: string; apelido: string; avatar_url: string | null };

export default function ReservasPage() {
  const { beep, muted, setMuted } = useBeep();

  return (
    <div className="term drukale">
      <main className="wrap">
       <>
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
       </>
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
  const [abrindo, setAbrindo] = useState(false);
  const [pedirApelido, setPedirApelido] = useState(false);
  const [trocasPendentes, setTrocasPendentes] = useState<Set<string>>(new Set());
  const [trocando, setTrocando] = useState<string | null>(null);
  const [avisoTroca, setAvisoTroca] = useState('');

  /**
   * Trocar a imagem de uma reserva não troca na hora: a imagem nova sobe
   * para a pasta do dono e vira uma proposta que o GM aprova no painel
   * (sql/45-alteracoes-com-aprovacao.sql). Até lá, a antiga continua.
   */
  const pedirTrocaImagem = async (r: Reserva, arquivo: File | null) => {
    if (!arquivo || !userId) return;
    setErro(''); setAvisoTroca('');
    const problema = validarImagemReserva(arquivo);
    if (problema) { setErro(problema); return; }
    setTrocando(r.id);
    let caminho = '';
    try {
      const hash = await hashDaImagem(arquivo);
      const { data: igual } = await supabase.from('reservas_imagens').select('id').eq('imagem_hash', hash).limit(1);
      if ((igual ?? []).length) throw new Error('Essa imagem (o mesmo arquivo) já foi reservada por alguém.');
      const ext = arquivo.type.split('/')[1].replace('jpeg', 'jpg');
      caminho = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: erroUpload } = await supabase.storage.from('reservas').upload(caminho, arquivo, {
        contentType: arquivo.type, cacheControl: '3600', upsert: false,
      });
      if (erroUpload) throw new Error(`Não consegui enviar a imagem: ${erroUpload.message}`);
      const { error } = await supabase.from('alteracoes_pendentes').insert({
        tabela: 'reservas_imagens', alvo_id: r.id, dados: { caminho, imagem_hash: hash }, user_id: userId,
      });
      if (error) throw error;
      setTrocasPendentes((prev) => new Set(prev).add(r.id));
      setAvisoTroca(`Troca de imagem de "${r.titulo}" enviada — a imagem muda quando o GM aprovar.`);
    } catch (e) {
      if (caminho) await removerImagemReserva(caminho);
      const ee = e as { code?: string };
      setErro(['42P01', 'PGRST205'].includes(ee?.code ?? '')
        ? 'A aprovação de trocas ainda não foi ativada. Aplique o sql/45-alteracoes-com-aprovacao.sql.'
        : e instanceof Error ? e.message : mensagemReserva(e));
    } finally {
      setTrocando(null);
    }
  };

  // qualquer pessoa reserva: sem conta, a sessão de visitante nasce no clique
  const abrirFormulario = async () => {
    setAbrindo(true); setErro('');
    try {
      const uid = await garantirSessao();
      // visitante ainda com nome automático: o formulário pede como ele quer aparecer
      try { const p = await garantirPerfil(); setPedirApelido(!p || p.apelido.startsWith('visitante_')); } catch { setPedirApelido(true); }
      setUserId(uid);
      setFormAberto(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível abrir o formulário.');
    } finally {
      setAbrindo(false);
    }
  };

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
        // liberar reserva alheia é só do GM real (sql/45)
        supabase.rpc('drk_e_gm'),
        supabase.from('reservas_imagens').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('faccoes').select('nome').neq('status_aprovacao', 'reprovado').order('nome'),
      ]);
      setUserId(auth.user?.id ?? null);
      setEhAdmin(admin === true);
      setFaccoes(((fac ?? []) as { nome: string }[]).map((f) => f.nome));
      if (error) { setErro(mensagemReserva(error)); setCarregando(false); return; }
      const lista = (data ?? []) as Reserva[];
      setReservas(lista);
      if (auth.user) {
        const { data: minhas } = await supabase.from('alteracoes_pendentes').select('alvo_id')
          .eq('tabela', 'reservas_imagens').eq('status', 'pendente').eq('user_id', auth.user.id);
        setTrocasPendentes(new Set(((minhas ?? []) as { alvo_id: string }[]).map((m) => m.alvo_id)));
      }
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
        {!formAberto && <button type="button" className="mini-btn on" disabled={abrindo} onClick={abrirFormulario}>{abrindo ? 'abrindo...' : '+ RESERVAR IMAGEM'}</button>}
      </div>

      {formAberto && userId && (
        <ReservaForm
          userId={userId}
          pedirApelido={pedirApelido}
          faccoes={faccoes}
          onCancelar={() => setFormAberto(false)}
          onCriada={(nova) => { setReservas((prev) => [nova, ...prev]); void carregarPerfis([nova.user_id]); setFormAberto(false); }}
        />
      )}

      {erro && <p className="erro">FALHA :: {erro}</p>}
      {avisoTroca && <p className="stat ok" style={{ textAlign: 'left' }}>{avisoTroca}</p>}

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
                  {trocasPendentes.has(r.id) && <p className="dica">troca de imagem aguardando o GM</p>}
                  {r.user_id === userId && (
                    <label className="mini-btn" style={{ cursor: 'pointer' }}>
                      {trocando === r.id ? 'enviando...' : 'trocar imagem'}
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }}
                        disabled={trocando !== null}
                        onChange={(e) => { void pedirTrocaImagem(r, e.target.files?.[0] ?? null); e.target.value = ''; }} />
                    </label>
                  )}
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
