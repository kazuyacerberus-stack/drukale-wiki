'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, BUCKET, BUCKET_FICHAS, caminhoDoStorage } from '../lib/db';
import { removerImagemReserva, urlImagemReserva } from '../lib/reservas';
import { apagarSimbolo } from '../lib/faccoes';
import { apagarAnexoEvento, type AnexoEvento } from '../lib/eventos';

type Alteracao = {
  id: string;
  tabela: 'characters' | 'reservas_imagens' | 'faccoes' | 'eventos';
  alvo_id: string;
  dados: Record<string, unknown>;
  user_id: string | null;
  created_at: string;
};

type Atual = Record<string, unknown> & { id: string };

const ROTULOS: Record<string, string> = {
  name: 'nome', epithet: 'epíteto', faction: 'facção', status: 'situação', race: 'raça',
  affiliation: 'afiliação', quote: 'citação', description: 'descrição', slug: 'endereço',
  image_url: 'imagem', sections: 'abas de história', sheet_url: 'ficha anexada', sheet_name: 'nome do anexo',
  // facções
  nome: 'nome', cor: 'cor', simbolo: 'símbolo', resumo: 'resumo', historia: 'história', territorio: 'território',
  // crônicas/eventos
  titulo: 'título', data: 'data', descricao: 'descrição', anexo: 'anexo',
};

const TIPO: Record<Alteracao['tabela'], string> = {
  characters: 'ficha', reservas_imagens: 'reserva', faccoes: 'facção', eventos: 'crônica',
};

const igual = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Faxina dos arquivos de uma troca: `sai` é a versão que deixou de ser
 * usada (a antiga ao aprovar, a proposta ao recusar), `fica` a que ficou.
 */
async function faxina(tabela: Alteracao['tabela'], sai: Record<string, unknown>, fica: Record<string, unknown>, mexeu: Record<string, unknown>) {
  if (tabela === 'characters') {
    for (const chave of ['image_url', 'sheet_url'] as const) {
      if (chave in mexeu && !igual(sai[chave], fica[chave])) await faxinaPersonagem(chave, sai[chave]);
    }
  } else if (tabela === 'reservas_imagens') {
    if (typeof sai.caminho === 'string' && sai.caminho !== fica.caminho) await removerImagemReserva(sai.caminho);
  } else if (tabela === 'faccoes') {
    if ('simbolo' in mexeu && typeof sai.simbolo === 'string' && sai.simbolo !== fica.simbolo) await apagarSimbolo(sai.simbolo);
  } else if (tabela === 'eventos') {
    const anexo = sai.anexo as AnexoEvento | null | undefined;
    if ('anexo' in mexeu && anexo && !igual(sai.anexo, fica.anexo)) await apagarAnexoEvento(anexo);
  }
}

/** Remove do Storage um arquivo de personagem que deixou de ser usado. Silencioso: é faxina. */
async function faxinaPersonagem(chave: 'image_url' | 'sheet_url', url: unknown) {
  if (typeof url !== 'string' || !url) return;
  const bucket = chave === 'image_url' ? BUCKET : BUCKET_FICHAS;
  const caminho = caminhoDoStorage(url, bucket);
  if (caminho) await supabase.storage.from(bucket).remove([caminho]);
}

/**
 * Fila do GM (sql/45-alteracoes-com-aprovacao.sql): edições de ficha e
 * trocas de imagem de reserva só entram no site depois de aprovadas
 * aqui. Só aparece para o GM real (drk_e_gm), não para qualquer sessão.
 */
export default function AlteracoesPendentes() {
  const [souGm, setSouGm] = useState(false);
  const [lista, setLista] = useState<Alteracao[]>([]);
  const [atuais, setAtuais] = useState<Map<string, Atual>>(new Map());
  const [apelidos, setApelidos] = useState<Map<string, string>>(new Map());
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    const { data: gm } = await supabase.rpc('drk_e_gm');
    if (gm !== true) { setSouGm(false); return; }
    setSouGm(true);
    const { data, error } = await supabase.from('alteracoes_pendentes').select('*')
      .eq('status', 'pendente').order('created_at', { ascending: true });
    if (error) {
      setErro(['42P01', 'PGRST205'].includes(error.code ?? '') ? 'Aplique o sql/45-alteracoes-com-aprovacao.sql para ativar a fila.' : error.message);
      return;
    }
    const alts = (data ?? []) as Alteracao[];
    setLista(alts);

    const ids = (t: Alteracao['tabela']) => alts.filter((a) => a.tabela === t).map((a) => a.alvo_id);
    const idsFicha = ids('characters');
    const idsReserva = ids('reservas_imagens');
    const idsFaccao = ids('faccoes');
    const idsEvento = ids('eventos');
    const idsGente = [...new Set(alts.map((a) => a.user_id).filter((x): x is string => !!x))];
    const [fichas, reservas, perfis, faccoesAtuais, eventosAtuais] = await Promise.all([
      idsFicha.length ? supabase.from('characters').select('*').in('id', idsFicha) : Promise.resolve({ data: [] }),
      idsReserva.length ? supabase.from('reservas_imagens').select('*').in('id', idsReserva) : Promise.resolve({ data: [] }),
      idsGente.length ? supabase.from('profiles').select('user_id,apelido').in('user_id', idsGente) : Promise.resolve({ data: [] }),
      idsFaccao.length ? supabase.from('faccoes').select('*').in('id', idsFaccao) : Promise.resolve({ data: [] }),
      idsEvento.length ? supabase.from('eventos').select('*').in('id', idsEvento) : Promise.resolve({ data: [] }),
    ]);
    const m = new Map<string, Atual>();
    [fichas, reservas, faccoesAtuais, eventosAtuais].forEach((r) => ((r.data ?? []) as Atual[]).forEach((x) => m.set(x.id, x)));
    setAtuais(m);
    setApelidos(new Map(((perfis.data ?? []) as { user_id: string; apelido: string }[]).map((p) => [p.user_id, p.apelido])));
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const aprovar = async (a: Alteracao) => {
    setOcupado(a.id); setErro('');
    const { data: antigo, error } = await supabase.rpc('drk_aprovar_alteracao', { alvo: a.id });
    setOcupado(null);
    if (error) { setErro(error.message); return; }
    // arquivos da versão antiga que a nova substituiu não servem a mais ninguém
    const velho = (antigo ?? {}) as Record<string, unknown>;
    await faxina(a.tabela, velho, a.dados, a.dados);
    setLista((l) => l.filter((x) => x.id !== a.id));
  };

  const recusar = async (a: Alteracao) => {
    const motivo = prompt('Motivo da recusa (opcional):') ?? '';
    setOcupado(a.id); setErro('');
    const { error } = await supabase.rpc('drk_recusar_alteracao', { alvo: a.id, motivo });
    setOcupado(null);
    if (error) { setErro(error.message); return; }
    // a proposta morreu: arquivos que subiram só para ela vão embora
    const atual: Record<string, unknown> = atuais.get(a.alvo_id) ?? {};
    await faxina(a.tabela, a.dados, atual, a.dados);
    setLista((l) => l.filter((x) => x.id !== a.id));
  };

  if (!souGm || (lista.length === 0 && !erro)) return null;

  return (
    <section style={{ marginBottom: 34 }}>
      <h2 style={{ margin: '0 0 14px', fontSize: 16 }}>alterações aguardando aprovação ({lista.length})</h2>
      {erro && <p className="erro">FALHA :: {erro}</p>}
      {lista.map((a) => {
        const atual = atuais.get(a.alvo_id);
        const imagemNova = typeof a.dados.image_url === 'string' ? a.dados.image_url : null;
        const caminhoAtual = typeof atual?.caminho === 'string' ? atual.caminho : null;
        const caminhoNovo = typeof a.dados.caminho === 'string' ? a.dados.caminho : null;
        const quem = (a.user_id && apelidos.get(a.user_id)) || 'visitante';
        const quando = new Date(a.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        const ehFicha = a.tabela !== 'reservas_imagens';
        const nomeItem = String(atual?.name ?? atual?.nome ?? atual?.titulo ?? '(item removido)');
        const link = !atual ? null
          : a.tabela === 'characters' && atual.slug ? `/personagem/${String(atual.slug)}`
          : a.tabela === 'faccoes' && atual.slug ? `/faccoes/${String(atual.slug)}`
          : a.tabela === 'eventos' ? '/cronicas' : null;
        const mudou = ehFicha && atual
          ? Object.keys(a.dados).filter((k) => k in ROTULOS && !igual(a.dados[k], atual[k]))
          : [];
        return (
          <div key={a.id} className="linha" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '12px 0', gap: 8 }}>
            <div>
              <strong>{TIPO[a.tabela]}: {nomeItem}</strong>
              <span className="dica" style={{ marginLeft: 8 }}>por {quem} · {quando}</span>
            </div>

            {ehFicha ? (
              <>
                <p className="dica" style={{ margin: 0 }}>
                  {mudou.length ? `muda: ${mudou.map((k) => ROTULOS[k]).join(', ')}` : 'nenhuma diferença em relação à ficha publicada'}
                </p>
                {mudou.includes('image_url') && imagemNova && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagemNova} alt="imagem nova" style={{ maxHeight: 140, borderRadius: 6 }} />
                )}
                {link ? <Link href={link} className="dica">ver a versão publicada →</Link> : null}
              </>
            ) : (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {caminhoAtual && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlImagemReserva(caminhoAtual)} alt="imagem atual" style={{ maxHeight: 120, borderRadius: 6, opacity: 0.6 }} />
                )}
                <span>→</span>
                {caminhoNovo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlImagemReserva(caminhoNovo)} alt="imagem nova" style={{ maxHeight: 120, borderRadius: 6 }} />
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="mini-btn" disabled={ocupado === a.id || !atual} onClick={() => aprovar(a)}>✓ aprovar</button>
              <button type="button" className="mini-btn dim" disabled={ocupado === a.id} onClick={() => recusar(a)}>✕ recusar</button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
