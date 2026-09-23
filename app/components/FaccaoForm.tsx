'use client';

import { useState } from 'react';
import Link from 'next/link';
import { slugify } from '../lib/db';
import {
  validarSimbolo, subirSimbolo, apagarSimbolo, slugLivre, mensagemFaccao,
  LIMITES_FACCAO, type Faccao,
} from '../lib/faccoes';
import { supabase } from '../lib/db';

export type CamposFaccao = {
  nome: string;
  cor: string;
  resumo: string;
  historia: string;
  territorio: string;
};

const VAZIO: CamposFaccao = {
  nome: '', cor: '#8affc0', resumo: '', historia: '', territorio: '',
};

function doFaccao(f: Faccao): CamposFaccao {
  return {
    nome: f.nome,
    cor: f.cor || '#8affc0',
    resumo: f.resumo ?? '',
    historia: f.historia ?? '',
    territorio: f.territorio ?? '',
  };
}

/** Formulário de facção, usado tanto para criar quanto para editar. */
export default function FaccaoForm({ inicial }: { inicial?: Faccao | null }) {
  const editando = !!inicial;

  const [f, setF] = useState<CamposFaccao>(inicial ? doFaccao(inicial) : VAZIO);
  const set =
    (k: keyof CamposFaccao) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF((s) => ({ ...s, [k]: e.target.value }));

  const [simbolo, setSimbolo] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [simboloAtual, setSimboloAtual] = useState<string | null>(inicial?.simbolo ?? null);
  const [removerSimbolo, setRemoverSimbolo] = useState(false);
  const [erroSimbolo, setErroSimbolo] = useState('');

  const [trocarSlug, setTrocarSlug] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [destino, setDestino] = useState<string | null>(null);
  const [enviouPendente, setEnviouPendente] = useState(false);

  const escolherSimbolo = (file: File | null) => {
    setErroSimbolo('');
    if (!file) return;
    const problema = validarSimbolo(file);
    if (problema) { setErroSimbolo(problema); return; }
    if (preview) URL.revokeObjectURL(preview);
    setSimbolo(file);
    setPreview(URL.createObjectURL(file));
    setRemoverSimbolo(false);
  };

  const novoSlug = slugify(f.nome || 'faccao');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(editando ? 'ATUALIZANDO...' : 'GRAVANDO...');
    setDestino(null);

    let subiuAgora: string | null = null;
    try {
      let imagem = removerSimbolo ? null : simboloAtual;
      if (simbolo) {
        setStatus('ENVIANDO SÍMBOLO...');
        imagem = await subirSimbolo(simbolo, f.nome || 'faccao');
        subiuAgora = imagem;
        setStatus(editando ? 'ATUALIZANDO...' : 'GRAVANDO...');
      }

      const linha: Record<string, unknown> = {
        nome: f.nome.trim().slice(0, LIMITES_FACCAO.nome),
        cor: f.cor || '#8affc0',
        resumo: f.resumo.trim().slice(0, LIMITES_FACCAO.resumo) || null,
        historia: f.historia.trim().slice(0, LIMITES_FACCAO.historia) || null,
        territorio: f.territorio.trim().slice(0, LIMITES_FACCAO.territorio) || null,
        simbolo: imagem,
      };

      // quem cria vira o dono/líder — inclusive um admin criando direto,
      // que só pula a fila de análise mas continua sendo o dono. Ao
      // editar não mexe no dono: só quem cria fica registrado.
      const { data: auth } = await supabase.auth.getUser();
      const { data: admin } = await supabase.rpc('drk_e_admin');
      const pendente = admin !== true;
      if (!editando) linha.user_id = auth.user?.id ?? null;
      if (pendente) {
        linha.status_aprovacao = 'pendente';
        linha.motivo_reprovacao = null;
      }

      if (editando && inicial) {
        const slug = trocarSlug ? await slugLivre(slugify(f.nome), inicial.slug) : inicial.slug;
        const { error } = await supabase.from('faccoes').update({ ...linha, slug }).eq('id', inicial.id);
        if (error) throw error;
        if (simbolo || removerSimbolo) await apagarSimbolo(inicial.simbolo);
        setStatus(pendente ? 'FACÇÃO REENVIADA PARA ANÁLISE' : 'FACÇÃO ATUALIZADA');
        setDestino(slug);
        setSimboloAtual(imagem);
        setSimbolo(null);
        setPreview('');
        setRemoverSimbolo(false);
        setTrocarSlug(false);
      } else {
        const slug = await slugLivre(novoSlug);
        const { error } = await supabase.from('faccoes').insert([{ ...linha, slug }]);
        if (error) throw error;
        setStatus(pendente ? 'FACÇÃO ENVIADA PARA ANÁLISE DO ADMINISTRADOR' : 'FACÇÃO GRAVADA');
        setDestino(slug);
        setF(VAZIO);
        setSimbolo(null);
        setPreview('');
        setSimboloAtual(null);
      }
      setEnviouPendente(pendente);
    } catch (err) {
      if (subiuAgora) await apagarSimbolo(subiuAgora);
      setStatus('FALHA :: ' + mensagemFaccao(err));
    }
    setLoading(false);
  };

  const ruim = status.startsWith('FALHA');
  const mostrarAtual = editando && simboloAtual && !preview && !removerSimbolo;

  return (
    <form className="panel" onSubmit={submit}>
      <div className="grupo">
        <span className="grupo-t">identificação</span>
        <div className="field">
          <label>nome *</label>
          <input value={f.nome} onChange={set('nome')} placeholder="Casa Drukale" maxLength={LIMITES_FACCAO.nome} required />
        </div>

        {editando && inicial && (
          <div className="field">
            <label>endereço da página</label>
            <div className="slugbox">
              <code>/faccoes/{trocarSlug ? novoSlug : inicial.slug}</code>
              {novoSlug !== inicial.slug && (
                <label className="check">
                  <input type="checkbox" checked={trocarSlug} onChange={(e) => setTrocarSlug(e.target.checked)} />
                  atualizar para <code>{novoSlug}</code>
                </label>
              )}
            </div>
            <p className="dica">trocar o endereço quebra links antigos que apontem para esta facção</p>
          </div>
        )}

        <div className="field">
          <label>cor de destaque</label>
          <input type="color" value={f.cor} onChange={set('cor')} />
          <p className="dica">usada como marca da facção na lista e na ficha dos membros</p>
        </div>
      </div>

      <div className="grupo">
        <span className="grupo-t">conteúdo</span>
        <div className="field">
          <label>resumo</label>
          <textarea value={f.resumo} onChange={set('resumo')} rows={3} maxLength={LIMITES_FACCAO.resumo}
            placeholder="Uma ou duas frases — é o que aparece na galeria de facções." />
        </div>
        <div className="field">
          <label>história</label>
          <textarea value={f.historia} onChange={set('historia')} rows={9} maxLength={LIMITES_FACCAO.historia}
            placeholder="Fundação, guerras, membros notáveis, o que marcou esta facção." />
        </div>
        <div className="field">
          <label>território</label>
          <textarea value={f.territorio} onChange={set('territorio')} rows={3} maxLength={LIMITES_FACCAO.territorio}
            placeholder="Que terras, cidades ou regiões ela domina." />
        </div>
      </div>

      <div className="grupo">
        <span className="grupo-t">símbolo</span>

        {preview ? (
          <div className="done">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="rd" />
            <div className="done-txt">
              <strong>NOVO SÍMBOLO PRONTO</strong>
              <span>{simbolo?.name}</span>
              <button type="button" className="lnk dim" onClick={() => { if (preview) URL.revokeObjectURL(preview); setSimbolo(null); setPreview(''); }}>
                descartar
              </button>
            </div>
          </div>
        ) : mostrarAtual ? (
          <div className="done">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={simboloAtual as string} alt="" className="rd" />
            <div className="done-txt">
              <strong>SÍMBOLO ATUAL</strong>
              <label className="lnk" style={{ cursor: 'pointer' }}>
                trocar símbolo
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }}
                  onChange={(e) => { escolherSimbolo(e.target.files?.[0] ?? null); e.target.value = ''; }} />
              </label>
              <button type="button" className="lnk dim" onClick={() => setRemoverSimbolo(true)}>remover símbolo</button>
            </div>
          </div>
        ) : (
          <>
            <label className="drop">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => { escolherSimbolo(e.target.files?.[0] ?? null); e.target.value = ''; }} />
              <div className="drop-ico">[ + ]</div>
              <div className="drop-t">clique para escolher uma imagem</div>
              <div className="drop-s">jpg · png · webp · gif · até 8 MB</div>
            </label>
            {removerSimbolo && (
              <p className="dica" style={{ marginTop: 10, color: 'rgba(255,120,120,.75)' }}>
                o símbolo atual será apagado ao salvar —{' '}
                <button type="button" className="lnk" onClick={() => setRemoverSimbolo(false)}>cancelar</button>
              </p>
            )}
          </>
        )}
        {erroSimbolo && <p className="erro" style={{ marginTop: 12 }}>{erroSimbolo}</p>}
      </div>

      <button className="go" disabled={loading}>
        {loading ? '// salvando...' : editando ? 'SALVAR ALTERAÇÕES' : 'GRAVAR FACÇÃO'}
      </button>

      {status && (
        <p className={'stat ' + (ruim ? 'bad' : 'ok')}>
          {status}
          {destino && (
            <>
              {' — '}
              <Link href={`/faccoes/${destino}`}>ver a página</Link>
              {' · '}
              {enviouPendente
                ? <Link href="/perfil">ver meus envios</Link>
                : <Link href="/admin/faccoes">voltar à lista</Link>}
            </>
          )}
        </p>
      )}
    </form>
  );
}
