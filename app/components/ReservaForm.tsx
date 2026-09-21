'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/db';
import {
  UNIVERSO_AUTORAL, chaveDaReserva, hashDaImagem, mensagemReserva, removerImagemReserva, validarImagemReserva, type Reserva,
} from '../lib/reservas';

type Ocupada = { nome: string; quem: string; quando: string };

/**
 * Formulário de reserva. Antes de enviar, confere na hora se aquele
 * personagem daquele universo já foi reservado, e no envio confere se a
 * mesma imagem (o arquivo) já não está reservada por outra pessoa.
 */
export default function ReservaForm({
  userId, faccoes, onCriada, onCancelar,
}: { userId: string; faccoes: string[]; onCriada: (r: Reserva) => void; onCancelar: () => void }) {
  const [nome, setNome] = useState('');
  const [faccao, setFaccao] = useState('');
  const [raca, setRaca] = useState('');
  const [classe, setClasse] = useState('');
  const [subclasse, setSubclasse] = useState('');
  const [personagem, setPersonagem] = useState('');
  const [universo, setUniverso] = useState('');
  const [autoral, setAutoral] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [ocupada, setOcupada] = useState<Ocupada | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const previewRef = useRef('');

  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  // confere a disponibilidade do personagem enquanto a pessoa digita
  useEffect(() => {
    setOcupada(null);
    if (autoral || !personagem.trim() || !universo.trim()) { setVerificando(false); return; }
    let vivo = true;
    setVerificando(true);
    const timer = window.setTimeout(async () => {
      const { data } = await supabase.from('reservas_imagens').select('nome,user_id,created_at')
        .eq('chave', chaveDaReserva(personagem, universo)).eq('autoral', false).limit(1);
      const r = (data ?? [])[0] as { nome: string; user_id: string; created_at: string } | undefined;
      if (!vivo) return;
      if (!r) { setOcupada(null); setVerificando(false); return; }
      const { data: p } = await supabase.from('profiles').select('apelido').eq('user_id', r.user_id).maybeSingle();
      if (!vivo) return;
      setOcupada({ nome: r.nome, quem: (p as { apelido: string } | null)?.apelido ?? 'outro jogador', quando: r.created_at });
      setVerificando(false);
    }, 400);
    return () => { vivo = false; window.clearTimeout(timer); };
  }, [personagem, universo, autoral]);

  const escolherArquivo = (file: File | null) => {
    setErro('');
    if (!file) return;
    const problema = validarImagemReserva(file);
    if (problema) { setErro(problema); return; }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setArquivo(file);
    setPreview(url);
  };

  const reservar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivo) { setErro('Anexe a imagem do personagem.'); return; }
    if (ocupada) { setErro('Esse personagem já está reservado.'); return; }
    setEnviando(true); setErro('');
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

      const limpo = (v: string) => v.trim() || null;
      const { data, error } = await supabase.from('reservas_imagens').insert({
        user_id: userId, nome: nome.trim(), faccao: limpo(faccao), raca: limpo(raca), classe: limpo(classe), subclasse: limpo(subclasse),
        personagem: personagem.trim(), universo: autoral ? UNIVERSO_AUTORAL : universo.trim(), autoral,
        titulo: titulo.trim(), caminho, imagem_hash: hash,
      }).select().single();
      if (error) throw error;
      onCriada(data as Reserva);
    } catch (e2) {
      if (caminho) await removerImagemReserva(caminho);
      setErro(e2 instanceof Error && !('code' in e2) ? e2.message : mensagemReserva(e2));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="panel reserva-form" onSubmit={reservar}>
      <span className="grupo-t">nova reserva de imagem</span>

      <div className="grupo">
        <p className="dica" style={{ marginTop: 0 }}>o personagem do RPG que vai usar a imagem</p>
        <div className="dupla">
          <div className="field">
            <label>nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} required />
          </div>
          <div className="field">
            <label>facção</label>
            <input value={faccao} onChange={(e) => setFaccao(e.target.value)} maxLength={120} list="reserva-faccoes" />
            <datalist id="reserva-faccoes">{faccoes.map((f) => <option key={f} value={f} />)}</datalist>
          </div>
        </div>
        <div className="dupla">
          <div className="field">
            <label>raça</label>
            <input value={raca} onChange={(e) => setRaca(e.target.value)} maxLength={120} />
          </div>
          <div className="field">
            <label>classe</label>
            <input value={classe} onChange={(e) => setClasse(e.target.value)} maxLength={120} />
          </div>
        </div>
        <div className="field">
          <label>sub-classe</label>
          <input value={subclasse} onChange={(e) => setSubclasse(e.target.value)} maxLength={120} />
        </div>
      </div>

      <div className="grupo">
        <p className="dica" style={{ marginTop: 0 }}>a imagem: quem aparece nela e de onde vem</p>
        <div className="dupla">
          <div className="field">
            <label>personagem da imagem</label>
            <input value={personagem} onChange={(e) => setPersonagem(e.target.value)} maxLength={120} required />
          </div>
          <div className="field">
            <label>universo</label>
            <input value={autoral ? UNIVERSO_AUTORAL : universo} onChange={(e) => setUniverso(e.target.value)} maxLength={120} required disabled={autoral} placeholder="ex.: nome do anime, jogo ou filme" />
          </div>
        </div>
        <label className="reserva-autoral">
          <input type="checkbox" checked={autoral} onChange={(e) => setAutoral(e.target.checked)} />
          é de minha própria autoria
        </label>

        {!autoral && personagem.trim() && universo.trim() && (
          verificando ? (
            <p className="reserva-status">verificando disponibilidade…</p>
          ) : ocupada ? (
            <p className="reserva-status ocupada">
              ✕ já reservado por <strong>{ocupada.quem}</strong> (para “{ocupada.nome}”) em {new Date(ocupada.quando).toLocaleDateString('pt-BR')}
            </p>
          ) : (
            <p className="reserva-status livre">✓ disponível — ninguém reservou {personagem.trim().replace(/\s+/g, ' ')} de {universo.trim().replace(/\s+/g, ' ')} ainda</p>
          )
        )}
      </div>

      <div className="field">
        <label>título</label>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={160} required />
      </div>

      <div className="field">
        <label>imagem do personagem</label>
        <div className="reserva-arquivo">
          <label className="mini-btn" style={{ cursor: 'pointer' }}>
            {arquivo ? 'trocar imagem' : '🖼 escolher imagem'}
            <input type="file" style={{ display: 'none' }} accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => { escolherArquivo(e.target.files?.[0] ?? null); e.target.value = ''; }} />
          </label>
          <span className="dica" style={{ margin: 0 }}>JPG, PNG, WebP ou GIF · até 8 MB</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview && <img className="reserva-previa" src={preview} alt="prévia da imagem" />}
      </div>

      {erro && <p className="stat bad">FALHA :: {erro}</p>}
      <div className="perfil-cartao-acoes" style={{ marginTop: 14 }}>
        <button className="go" style={{ width: 'auto' }} disabled={enviando || Boolean(ocupada)}>{enviando ? '// reservando...' : 'RESERVAR IMAGEM'}</button>
        <button type="button" className="mini-btn" onClick={onCancelar}>cancelar</button>
      </div>
    </form>
  );
}
