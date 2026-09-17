'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/db';
import {
  mensagemEvento, proximaOrdem, validarAnexoEvento, subirAnexoEvento, apagarAnexoEvento, urlAnexoEvento,
  LIMITES_EVENTO, type Evento, type AnexoEvento,
} from '../lib/eventos';

export type CamposEvento = { titulo: string; data: string; resumo: string; descricao: string };

const VAZIO: CamposEvento = { titulo: '', data: '', resumo: '', descricao: '' };

function doEvento(e: Evento): CamposEvento {
  return { titulo: e.titulo, data: e.data ?? '', resumo: e.resumo ?? '', descricao: e.descricao ?? '' };
}

/** Formulário de evento, usado tanto para criar quanto para editar. */
export default function EventoForm({ inicial }: { inicial?: Evento | null }) {
  const editando = !!inicial;

  const [f, setF] = useState<CamposEvento>(inicial ? doEvento(inicial) : VAZIO);
  const set =
    (k: keyof CamposEvento) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF((s) => ({ ...s, [k]: e.target.value }));

  const [anexo, setAnexo] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [previewTipo, setPreviewTipo] = useState('');
  const [anexoAtual, setAnexoAtual] = useState<AnexoEvento | null>(inicial?.anexo ?? null);
  const [removerAnexo, setRemoverAnexo] = useState(false);
  const [erroAnexo, setErroAnexo] = useState('');

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [salvo, setSalvo] = useState(false);
  const [enviouPendente, setEnviouPendente] = useState(false);

  const escolherAnexo = (file: File | null) => {
    setErroAnexo('');
    if (!file) return;
    const problema = validarAnexoEvento(file);
    if (problema) { setErroAnexo(problema); return; }
    if (preview) URL.revokeObjectURL(preview);
    setAnexo(file);
    setPreview(URL.createObjectURL(file));
    setPreviewTipo(file.type);
    setRemoverAnexo(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(editando ? 'ATUALIZANDO...' : 'GRAVANDO...');
    setSalvo(false);

    let subiuAgora: AnexoEvento | null = null;
    try {
      let anexoLinha = removerAnexo ? null : anexoAtual;
      if (anexo) {
        setStatus('ENVIANDO ANEXO...');
        anexoLinha = await subirAnexoEvento(anexo, f.titulo || 'evento');
        subiuAgora = anexoLinha;
        setStatus(editando ? 'ATUALIZANDO...' : 'GRAVANDO...');
      }

      const linha: Record<string, unknown> = {
        titulo: f.titulo.trim().slice(0, LIMITES_EVENTO.titulo),
        data: f.data.trim() || null,
        resumo: f.resumo.trim().slice(0, LIMITES_EVENTO.resumo) || null,
        descricao: f.descricao.trim().slice(0, LIMITES_EVENTO.descricao) || null,
        anexo: anexoLinha,
      };

      // quem não é admin só grava como pendente e em nome de si mesmo —
      // a política do banco garante isso de qualquer jeito, mas decidir
      // aqui também evita uma ida a mais só para descobrir que foi recusado
      const { data: auth } = await supabase.auth.getUser();
      const { data: admin } = await supabase.rpc('drk_e_admin');
      const pendente = admin !== true;
      if (pendente) {
        linha.user_id = auth.user?.id ?? null;
        linha.status_aprovacao = 'pendente';
        linha.motivo_reprovacao = null;
      }

      if (editando && inicial) {
        const { error } = await supabase.from('eventos').update(linha).eq('id', inicial.id);
        if (error) throw error;
        if (anexo || removerAnexo) await apagarAnexoEvento(inicial.anexo);
        setStatus(pendente ? 'EVENTO REENVIADO PARA ANÁLISE' : 'EVENTO ATUALIZADO');
        setAnexoAtual(anexoLinha);
        setAnexo(null);
        setPreview('');
        setRemoverAnexo(false);
      } else {
        const { data: todos, error: erroBusca } = await supabase.from('eventos').select('ordem');
        if (erroBusca) throw erroBusca;
        const ordem = proximaOrdem((todos ?? []) as { ordem: number }[]);
        const { error } = await supabase.from('eventos').insert([{ ...linha, ordem }]);
        if (error) throw error;
        setStatus(pendente ? 'EVENTO ENVIADO PARA ANÁLISE DO ADMINISTRADOR' : 'EVENTO GRAVADO NO FIM DA LINHA DO TEMPO');
        setF(VAZIO);
        setAnexo(null);
        setPreview('');
        setAnexoAtual(null);
      }
      setSalvo(true);
      setEnviouPendente(pendente);
    } catch (err) {
      if (subiuAgora) await apagarAnexoEvento(subiuAgora);
      setStatus('FALHA :: ' + mensagemEvento(err));
    }
    setLoading(false);
  };

  const ruim = status.startsWith('FALHA');
  const mostrarAtual = editando && anexoAtual && !preview && !removerAnexo;

  return (
    <form className="panel" onSubmit={submit}>
      <div className="grupo">
        <span className="grupo-t">quando</span>
        <div className="field">
          <label>título *</label>
          <input value={f.titulo} onChange={set('titulo')} placeholder="A Queda de Castle del Las Noches" maxLength={LIMITES_EVENTO.titulo} required />
        </div>
        <div className="field">
          <label>data ou período</label>
          <input value={f.data} onChange={set('data')} placeholder="Ano 12 depois da Queda" />
          <p className="dica">texto livre — só o que aparece escrito na linha do tempo. A posição dela é ajustada depois, na lista, com os botões de subir/descer.</p>
        </div>
      </div>

      <div className="grupo">
        <span className="grupo-t">o que aconteceu</span>
        <div className="field">
          <label>resumo</label>
          <textarea value={f.resumo} onChange={set('resumo')} rows={3} maxLength={LIMITES_EVENTO.resumo}
            placeholder="Uma ou duas frases — é o que aparece direto na linha do tempo." />
        </div>
        <div className="field">
          <label>descrição completa</label>
          <textarea value={f.descricao} onChange={set('descricao')} rows={9} maxLength={LIMITES_EVENTO.descricao}
            placeholder="O relato completo do evento, para quem quiser ler mais." />
        </div>
      </div>

      <div className="grupo">
        <span className="grupo-t">anexo</span>

        {preview ? (
          <div className="done">
            {previewTipo.startsWith('video/')
              ? <video src={preview} className="sq" controls muted />
              /* eslint-disable-next-line @next/next/no-img-element */
              : <img src={preview} alt="" className="sq" />}
            <div className="done-txt">
              <strong>NOVO ANEXO PRONTO</strong>
              <span>{anexo?.name}</span>
              <button type="button" className="lnk dim" onClick={() => { if (preview) URL.revokeObjectURL(preview); setAnexo(null); setPreview(''); }}>
                descartar
              </button>
            </div>
          </div>
        ) : mostrarAtual ? (
          <div className="done">
            {anexoAtual!.tipo.startsWith('video/')
              ? <video src={urlAnexoEvento(anexoAtual!.caminho)} className="sq" controls muted />
              /* eslint-disable-next-line @next/next/no-img-element */
              : <img src={urlAnexoEvento(anexoAtual!.caminho)} alt="" className="sq" />}
            <div className="done-txt">
              <strong>ANEXO ATUAL</strong>
              <label className="lnk" style={{ cursor: 'pointer' }}>
                trocar anexo
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" style={{ display: 'none' }}
                  onChange={(e) => { escolherAnexo(e.target.files?.[0] ?? null); e.target.value = ''; }} />
              </label>
              <button type="button" className="lnk dim" onClick={() => setRemoverAnexo(true)}>remover anexo</button>
            </div>
          </div>
        ) : (
          <>
            <label className="drop">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                onChange={(e) => { escolherAnexo(e.target.files?.[0] ?? null); e.target.value = ''; }} />
              <div className="drop-ico">[ + ]</div>
              <div className="drop-t">clique para anexar foto, vídeo ou GIF (opcional)</div>
              <div className="drop-s">jpg · png · webp · gif · mp4 · webm · até 40 MB</div>
            </label>
            {removerAnexo && (
              <p className="dica" style={{ marginTop: 10, color: 'rgba(255,120,120,.75)' }}>
                o anexo atual será apagado ao salvar —{' '}
                <button type="button" className="lnk" onClick={() => setRemoverAnexo(false)}>cancelar</button>
              </p>
            )}
          </>
        )}
        {erroAnexo && <p className="erro" style={{ marginTop: 12 }}>{erroAnexo}</p>}
      </div>

      <button className="go" disabled={loading}>
        {loading ? '// salvando...' : editando ? 'SALVAR ALTERAÇÕES' : 'GRAVAR EVENTO'}
      </button>

      {status && (
        <p className={'stat ' + (ruim ? 'bad' : 'ok')}>
          {status}
          {salvo && (
            <>
              {' — '}
              <Link href="/linha-do-tempo">ver a linha do tempo</Link>
              {' · '}
              {enviouPendente
                ? <Link href="/perfil">ver meus envios</Link>
                : <Link href="/admin/linha-do-tempo">voltar à lista</Link>}
            </>
          )}
        </p>
      )}
    </form>
  );
}
