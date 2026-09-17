'use client';

import { useState } from 'react';
import Link from 'next/link';
import { slugify } from '../lib/db';
import { supabase } from '../lib/db';
import {
  CATEGORIAS_GLOSSARIO, slugLivre, mensagemGlossario, LIMITES_GLOSSARIO,
  validarImagemGlossario, subirImagemGlossario, apagarImagemGlossario, type Termo,
} from '../lib/glossario';

export type CamposTermo = { termo: string; categoria: string; resumo: string; definicao: string };

const VAZIO: CamposTermo = { termo: '', categoria: CATEGORIAS_GLOSSARIO[0], resumo: '', definicao: '' };

function doTermo(t: Termo): CamposTermo {
  return { termo: t.termo, categoria: t.categoria, resumo: t.resumo ?? '', definicao: t.definicao ?? '' };
}

/** Formulário de termo do glossário, usado tanto para criar quanto para editar. */
export default function GlossarioForm({ inicial }: { inicial?: Termo | null }) {
  const editando = !!inicial;

  const [f, setF] = useState<CamposTermo>(inicial ? doTermo(inicial) : VAZIO);
  const set =
    (k: keyof CamposTermo) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setF((s) => ({ ...s, [k]: e.target.value }));

  const [imagem, setImagem] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [imagemAtual, setImagemAtual] = useState<string | null>(inicial?.imagem ?? null);
  const [removerImagem, setRemoverImagem] = useState(false);
  const [erroImagem, setErroImagem] = useState('');

  const [trocarSlug, setTrocarSlug] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [destino, setDestino] = useState<string | null>(null);

  const escolherImagem = (file: File | null) => {
    setErroImagem('');
    if (!file) return;
    const problema = validarImagemGlossario(file);
    if (problema) { setErroImagem(problema); return; }
    if (preview) URL.revokeObjectURL(preview);
    setImagem(file);
    setPreview(URL.createObjectURL(file));
    setRemoverImagem(false);
  };

  const novoSlug = slugify(f.termo || 'termo');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(editando ? 'ATUALIZANDO...' : 'GRAVANDO...');
    setDestino(null);

    let subiuAgora: string | null = null;
    try {
      let imagemUrl = removerImagem ? null : imagemAtual;
      if (imagem) {
        setStatus('ENVIANDO IMAGEM...');
        imagemUrl = await subirImagemGlossario(imagem, f.termo || 'termo');
        subiuAgora = imagemUrl;
        setStatus(editando ? 'ATUALIZANDO...' : 'GRAVANDO...');
      }

      const linha = {
        termo: f.termo.trim().slice(0, LIMITES_GLOSSARIO.termo),
        categoria: f.categoria,
        resumo: f.resumo.trim().slice(0, LIMITES_GLOSSARIO.resumo) || null,
        definicao: f.definicao.trim().slice(0, LIMITES_GLOSSARIO.definicao) || null,
        imagem: imagemUrl,
      };

      if (editando && inicial) {
        const slug = trocarSlug ? await slugLivre(slugify(f.termo), inicial.slug) : inicial.slug;
        const { error } = await supabase.from('glossario').update({ ...linha, slug }).eq('id', inicial.id);
        if (error) throw error;
        if (imagem || removerImagem) await apagarImagemGlossario(inicial.imagem);
        setStatus('TERMO ATUALIZADO');
        setDestino(slug);
        setImagemAtual(imagemUrl);
        setImagem(null);
        setPreview('');
        setRemoverImagem(false);
        setTrocarSlug(false);
      } else {
        const slug = await slugLivre(novoSlug);
        const { error } = await supabase.from('glossario').insert([{ ...linha, slug }]);
        if (error) throw error;
        setStatus('TERMO GRAVADO');
        setDestino(slug);
        setF(VAZIO);
        setImagem(null);
        setPreview('');
        setImagemAtual(null);
      }
    } catch (err) {
      if (subiuAgora) await apagarImagemGlossario(subiuAgora);
      setStatus('FALHA :: ' + mensagemGlossario(err));
    }
    setLoading(false);
  };

  const ruim = status.startsWith('FALHA');
  const mostrarAtual = editando && imagemAtual && !preview && !removerImagem;

  return (
    <form className="panel" onSubmit={submit}>
      <div className="grupo">
        <span className="grupo-t">identificação</span>
        <div className="field">
          <label>termo *</label>
          <input value={f.termo} onChange={set('termo')} placeholder="Sangue-Antigo" maxLength={LIMITES_GLOSSARIO.termo} required />
        </div>

        {editando && inicial && (
          <div className="field">
            <label>endereço da página</label>
            <div className="slugbox">
              <code>/glossario/{trocarSlug ? novoSlug : inicial.slug}</code>
              {novoSlug !== inicial.slug && (
                <label className="check">
                  <input type="checkbox" checked={trocarSlug} onChange={(e) => setTrocarSlug(e.target.checked)} />
                  atualizar para <code>{novoSlug}</code>
                </label>
              )}
            </div>
            <p className="dica">trocar o endereço quebra links antigos que apontem para este termo</p>
          </div>
        )}

        <div className="field">
          <label>categoria</label>
          <select value={f.categoria} onChange={set('categoria')}>
            {CATEGORIAS_GLOSSARIO.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grupo">
        <span className="grupo-t">conteúdo</span>
        <div className="field">
          <label>resumo</label>
          <textarea value={f.resumo} onChange={set('resumo')} rows={3} maxLength={LIMITES_GLOSSARIO.resumo}
            placeholder="Uma ou duas frases — é o que aparece na lista do glossário." />
        </div>
        <div className="field">
          <label>definição completa</label>
          <textarea value={f.definicao} onChange={set('definicao')} rows={9} maxLength={LIMITES_GLOSSARIO.definicao}
            placeholder="O que é, de onde vem, como funciona no mundo Drukale." />
        </div>
      </div>

      <div className="grupo">
        <span className="grupo-t">imagem</span>

        {preview ? (
          <div className="done">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="rd" />
            <div className="done-txt">
              <strong>NOVA IMAGEM PRONTA</strong>
              <span>{imagem?.name}</span>
              <button type="button" className="lnk dim" onClick={() => { if (preview) URL.revokeObjectURL(preview); setImagem(null); setPreview(''); }}>
                descartar
              </button>
            </div>
          </div>
        ) : mostrarAtual ? (
          <div className="done">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagemAtual as string} alt="" className="rd" />
            <div className="done-txt">
              <strong>IMAGEM ATUAL</strong>
              <label className="lnk" style={{ cursor: 'pointer' }}>
                trocar imagem
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }}
                  onChange={(e) => { escolherImagem(e.target.files?.[0] ?? null); e.target.value = ''; }} />
              </label>
              <button type="button" className="lnk dim" onClick={() => setRemoverImagem(true)}>remover imagem</button>
            </div>
          </div>
        ) : (
          <>
            <label className="drop">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => { escolherImagem(e.target.files?.[0] ?? null); e.target.value = ''; }} />
              <div className="drop-ico">[ + ]</div>
              <div className="drop-t">clique para escolher uma imagem (opcional)</div>
              <div className="drop-s">jpg · png · webp · gif · até 8 MB</div>
            </label>
            {removerImagem && (
              <p className="dica" style={{ marginTop: 10, color: 'rgba(255,120,120,.75)' }}>
                a imagem atual será apagada ao salvar —{' '}
                <button type="button" className="lnk" onClick={() => setRemoverImagem(false)}>cancelar</button>
              </p>
            )}
          </>
        )}
        {erroImagem && <p className="erro" style={{ marginTop: 12 }}>{erroImagem}</p>}
      </div>

      <button className="go" disabled={loading}>
        {loading ? '// salvando...' : editando ? 'SALVAR ALTERAÇÕES' : 'GRAVAR TERMO'}
      </button>

      {status && (
        <p className={'stat ' + (ruim ? 'bad' : 'ok')}>
          {status}
          {destino && (
            <>
              {' — '}
              <Link href={`/glossario/${destino}`}>ver a página</Link>
              {' · '}
              <Link href="/admin/glossario">voltar à lista</Link>
            </>
          )}
        </p>
      )}
    </form>
  );
}
