'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  slugify, lerSecoes, LIMITES, conferirFicha, subirFicha,
  apagarFichaDoNavegador, FICHA_MAX_ROTULO,
  type Character, type Secao,
} from '../lib/db';
import { cabecalhoAuth } from '../lib/auth';

/** 350000 -> "342 KB" ; 5300000 -> "5.1 MB" */
function tamanhoLegivel(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const CANVAS = 520;   // palco de edição
const CROP = 380;     // janela de corte
const OUTPUT = 900;   // resolução exportada

const STATUS = ['', 'Vivo', 'Morto', 'Desaparecido', 'Selado', 'Ascendido', 'Desconhecido'];

export type Campos = {
  name: string;
  epithet: string;
  faction: string;
  status: string;
  race: string;
  affiliation: string;
  quote: string;
  description: string;
};

const VAZIO: Campos = {
  name: '', epithet: '', faction: '', status: '', race: '',
  affiliation: '', quote: '', description: '',
};

function doPersonagem(c: Character): Campos {
  return {
    name: c.name ?? '',
    epithet: c.epithet ?? '',
    faction: c.faction ?? '',
    status: c.status ?? '',
    race: c.race ?? '',
    affiliation: c.affiliation ?? '',
    quote: c.quote ?? '',
    description: c.description ?? '',
  };
}

/**
 * Formulário da ficha, usado tanto para criar quanto para editar.
 * Sem `inicial` cria um registro novo; com `inicial` atualiza aquele.
 */
export default function FichaForm({ inicial }: { inicial?: Character | null }) {
  const editando = !!inicial;

  const [f, setF] = useState<Campos>(inicial ? doPersonagem(inicial) : VAZIO);
  const set =
    (k: keyof Campos) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setF((s) => ({ ...s, [k]: e.target.value }));

  /* ---------- abas da história ---------- */
  const [secoes, setSecoes] = useState<Secao[]>(() => lerSecoes(inicial?.sections));
  const [confirmarAba, setConfirmarAba] = useState<number | null>(null);

  const novaAba = () =>
    setSecoes((s) => (s.length >= LIMITES.abas ? s : [...s, { titulo: '', texto: '' }]));

  const mudarAba = (i: number, campo: keyof Secao, valor: string) =>
    setSecoes((s) => s.map((a, j) => (j === i ? { ...a, [campo]: valor } : a)));

  const moverAba = (i: number, direcao: -1 | 1) =>
    setSecoes((s) => {
      const j = i + direcao;
      if (j < 0 || j >= s.length) return s;
      const copia = [...s];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });

  const removerAba = (i: number) => {
    setSecoes((s) => s.filter((_, j) => j !== i));
    setConfirmarAba(null);
  };

  const [image, setImage] = useState<File | null>(null);
  const [finalPreview, setFinalPreview] = useState('');
  const [imagemAtual, setImagemAtual] = useState<string | null>(inicial?.image_url ?? null);
  const [removerImagem, setRemoverImagem] = useState(false);

  /* ---------- arquivo da ficha ---------- */
  const [ficha, setFicha] = useState<File | null>(null);
  const [fichaAtual, setFichaAtual] = useState<string | null>(inicial?.sheet_url ?? null);
  const [fichaNome, setFichaNome] = useState<string | null>(inicial?.sheet_name ?? null);
  const [removerFicha, setRemoverFicha] = useState(false);
  const [erroFicha, setErroFicha] = useState('');

  const escolherFicha = (e: React.ChangeEvent<HTMLInputElement>) => {
    const escolhido = e.target.files?.[0] ?? null;
    e.target.value = '';   // permite reescolher o mesmo arquivo depois
    if (!escolhido) return;

    const problema = conferirFicha(escolhido);
    if (problema) {
      setErroFicha(problema);
      setFicha(null);
      return;
    }
    setErroFicha('');
    setFicha(escolhido);
    setRemoverFicha(false);
  };

  const [trocarSlug, setTrocarSlug] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [destino, setDestino] = useState<string | null>(null);
  const [enviouPendente, setEnviouPendente] = useState(false);

  /* ---------- editor ---------- */
  const [showEditor, setShowEditor] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [shape, setShape] = useState<'circle' | 'square'>('circle');
  const [dragging, setDragging] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const baseScaleRef = useRef(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const fileNameRef = useRef('personagem.png');

  /* ============================================================
     DESENHO
     ============================================================ */
  const renderPreview = useCallback(() => {
    const pv = previewRef.current;
    const img = imgRef.current;
    if (!pv || !img) return;
    const ctx = pv.getContext('2d');
    if (!ctx) return;

    const S = 112;
    const dpr = window.devicePixelRatio || 1;
    pv.width = S * dpr;
    pv.height = S * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath();
    if (shape === 'circle') ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
    else roundRectPath(ctx, 0, 0, S, S, 8, false);
    ctx.clip();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, S, S);

    const k = S / CROP;
    const s = baseScaleRef.current * (zoom / 100);
    const w = img.width * s;
    const h = img.height * s;
    const x = (CANVAS - w) / 2 + offset.x - (CANVAS - CROP) / 2;
    const y = (CANVAS - h) / 2 + offset.y - (CANVAS - CROP) / 2;
    ctx.drawImage(img, x * k, y * k, w * k, h * k);
    ctx.restore();
  }, [shape, zoom, offset]);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    const img = imgRef.current;
    if (!cv || !img) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (cv.width !== CANVAS * dpr) {
      cv.width = CANVAS * dpr;
      cv.height = CANVAS * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CANVAS, CANVAS);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS, CANVAS);

    const s = baseScaleRef.current * (zoom / 100);
    const w = img.width * s;
    const h = img.height * s;
    const x = (CANVAS - w) / 2 + offset.x;
    const y = (CANVAS - h) / 2 + offset.y;

    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, x, y, w, h);

    const c = CANVAS / 2;
    const r = CROP / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.74)';
    ctx.beginPath();
    ctx.rect(0, 0, CANVAS, CANVAS);
    if (shape === 'circle') ctx.arc(c, c, r, 0, Math.PI * 2, true);
    else roundRectPath(ctx, c - r, c - r, CROP, CROP, 18, true);
    ctx.fill('evenodd');
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(0,255,102,0.9)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0,255,102,0.9)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    if (shape === 'circle') ctx.arc(c, c, r, 0, Math.PI * 2);
    else roundRectPath(ctx, c - r, c - r, CROP, CROP, 18, false);
    ctx.stroke();
    ctx.restore();

    if (dragging) {
      ctx.save();
      ctx.beginPath();
      if (shape === 'circle') ctx.arc(c, c, r, 0, Math.PI * 2);
      else roundRectPath(ctx, c - r, c - r, CROP, CROP, 18, false);
      ctx.clip();
      ctx.strokeStyle = 'rgba(0,255,102,0.22)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        const p = c - r + (CROP / 3) * i;
        ctx.beginPath(); ctx.moveTo(p, c - r); ctx.lineTo(p, c + r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(c - r, p); ctx.lineTo(c + r, p); ctx.stroke();
      }
      ctx.restore();
    }

    const b = r + 14;
    const len = 26;
    ctx.strokeStyle = 'rgba(0,255,102,0.75)';
    ctx.lineWidth = 2;
    const cantos: [number, number, number, number][] = [
      [c - b, c - b, 1, 1], [c + b, c - b, -1, 1],
      [c - b, c + b, 1, -1], [c + b, c + b, -1, -1],
    ];
    cantos.forEach(([px, py, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(px + dx * len, py);
      ctx.lineTo(px, py);
      ctx.lineTo(px, py + dy * len);
      ctx.stroke();
    });

    renderPreview();
  }, [zoom, offset, shape, dragging, renderPreview]);

  useEffect(() => { if (showEditor) draw(); }, [draw, showEditor]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !showEditor) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => clamp(z - e.deltaY * 0.12, 100, 400));
    };
    cv.addEventListener('wheel', onWheel, { passive: false });
    return () => cv.removeEventListener('wheel', onWheel);
  }, [showEditor]);

  /* ---------- carregar arquivo ---------- */
  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    fileNameRef.current = slugify(file.name.replace(/\.[^.]+$/, '')) + '.png';
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        baseScaleRef.current = Math.max(CROP / img.width, CROP / img.height);
        setZoom(100);
        setOffset({ x: 0, y: 0 });
        setShowEditor(true);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  /* ---------- arraste ---------- */
  const startDrag = (cx: number, cy: number) => {
    setDragging(true);
    dragRef.current = { x: cx, y: cy, ox: offset.x, oy: offset.y };
  };
  const moveDrag = (cx: number, cy: number) => {
    if (!dragging) return;
    const img = imgRef.current;
    if (!img) return;
    const s = baseScaleRef.current * (zoom / 100);
    const lim = (v: number, size: number) => {
      const max = Math.max(0, (size * s - CROP) / 2);
      return clamp(v, -max, max);
    };
    setOffset({
      x: lim(dragRef.current.ox + (cx - dragRef.current.x), img.width),
      y: lim(dragRef.current.oy + (cy - dragRef.current.y), img.height),
    });
  };

  /* ---------- aplicar corte ---------- */
  const applyCrop = () => {
    const img = imgRef.current;
    if (!img) return;
    const out = document.createElement('canvas');
    out.width = OUTPUT;
    out.height = OUTPUT;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingQuality = 'high';
    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    const k = OUTPUT / CROP;
    const s = baseScaleRef.current * (zoom / 100);
    const w = img.width * s;
    const h = img.height * s;
    const x = (CANVAS - w) / 2 + offset.x - (CANVAS - CROP) / 2;
    const y = (CANVAS - h) / 2 + offset.y - (CANVAS - CROP) / 2;
    ctx.drawImage(img, x * k, y * k, w * k, h * k);

    out.toBlob((blob) => {
      if (!blob) return;
      setImage(new File([blob], fileNameRef.current, { type: 'image/png' }));
      setFinalPreview(out.toDataURL('image/png'));
      setRemoverImagem(false);
      setShowEditor(false);
    }, 'image/png');
  };

  /* ---------- envio ---------- */

  /**
   * O arquivo sobe antes do registro ser salvo. Se o salvamento falhar,
   * o arquivo ficaria no Storage sem ninguém apontando para ele — some
   * com ele. Nunca reclama: é faxina, não pode virar um segundo erro
   * na cara de quem já está vendo o primeiro.
   */
  const desfazerUpload = async (url: string | null) => {
    if (!url) return;
    try {
      await apagarFichaDoNavegador(url);
    } catch {
      /* ignora de propósito */
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(editando ? 'ATUALIZANDO...' : 'TRANSMITINDO...');
    setDestino(null);
    setErroFicha('');

    // se o arquivo subir e o salvamento falhar depois, este endereço
    // serve para desfazer o upload em vez de deixar lixo no Storage
    let subiuAgora: string | null = null;

    try {
      let enderecoFicha = removerFicha ? null : fichaAtual;
      let nomeFicha = removerFicha ? null : fichaNome;

      if (ficha) {
        setStatus('ENVIANDO ARQUIVO...');
        enderecoFicha = await subirFicha(ficha, slugify(f.name || 'personagem'));
        nomeFicha = ficha.name;
        subiuAgora = enderecoFicha;
        setStatus(editando ? 'ATUALIZANDO...' : 'TRANSMITINDO...');
      }

      const fd = new FormData();
      (Object.keys(f) as (keyof Campos)[]).forEach((k) => fd.append(k, f[k]));
      fd.append('sections', JSON.stringify(secoes));
      fd.append('sheet_url', enderecoFicha ?? '');
      fd.append('sheet_name', nomeFicha ?? '');
      if (image) fd.append('file', image);

      if (editando && inicial) {
        fd.append('id', String(inicial.id));
        fd.append('trocarSlug', trocarSlug ? '1' : '0');
        fd.append('removerImagem', removerImagem ? '1' : '0');
      }

      const res = await fetch('/api/characters', {
        method: editando ? 'PUT' : 'POST',
        headers: await cabecalhoAuth(),
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus('FALHA :: ' + (data.error ?? 'desconhecida'));
        await desfazerUpload(subiuAgora);
      } else {
        setEnviouPendente(Boolean(data.pendente));
        setStatus(data.pendente
          ? (editando ? 'FICHA REENVIADA PARA ANÁLISE' : 'FICHA ENVIADA PARA ANÁLISE')
          : (editando ? 'REGISTRO ATUALIZADO' : 'REGISTRO GRAVADO'));
        setDestino(data.slug ?? null);
        setFicha(null);
        setRemoverFicha(false);
        if (editando) {
          if (data.imageUrl !== undefined) setImagemAtual(data.imageUrl);
          setFichaAtual(enderecoFicha);
          setFichaNome(nomeFicha);
          setImage(null);
          setFinalPreview('');
          setRemoverImagem(false);
          setTrocarSlug(false);
        } else {
          // criou: o formulário volta em branco para o próximo personagem
          setF(VAZIO);
          setSecoes([]);
          setConfirmarAba(null);
          setFichaAtual(null);
          setFichaNome(null);
          setImage(null);
          setFinalPreview('');
          imgRef.current = null;
        }
      }
    } catch (err) {
      setStatus('FALHA :: ' + (err instanceof Error ? err.message : 'desconhecida'));
      await desfazerUpload(subiuAgora);
    }
    setLoading(false);
  };

  const ruim = status.startsWith('FALHA') || status.startsWith('ERRO');
  const novoSlug = slugify(f.name || 'personagem');
  const mostrarAtual = editando && imagemAtual && !finalPreview && !removerImagem;

  /* ============================================================
     EDITOR EM TELA CHEIA
     ============================================================ */
  if (showEditor) {
    return (
      <div className="panel">
        <div className="etitle">
          <span>&gt; editor_de_imagem</span>
          <div className="shapes">
            <button type="button" className={shape === 'circle' ? 'on' : ''} onClick={() => setShape('circle')}>● círculo</button>
            <button type="button" className={shape === 'square' ? 'on' : ''} onClick={() => setShape('square')}>■ quadrado</button>
          </div>
        </div>

        <div className="stage">
          <canvas
            ref={canvasRef}
            style={{ width: CANVAS, height: CANVAS }}
            className={dragging ? 'grab' : ''}
            onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
            onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
            onMouseUp={() => setDragging(false)}
            onMouseLeave={() => setDragging(false)}
            onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => moveDrag(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={() => setDragging(false)}
          />
          <aside className="side">
            <div className="pvbox">
              <canvas ref={previewRef} style={{ width: 112, height: 112 }} />
              <span>resultado</span>
            </div>
            <div className="hint">
              <p><b>arraste</b> para reposicionar</p>
              <p><b>roda do mouse</b> para zoom</p>
              <p>a área clara é o que fica</p>
            </div>
          </aside>
        </div>

        <div className="zoom">
          <button type="button" onClick={() => setZoom((z) => clamp(z - 15, 100, 400))}>−</button>
          <input type="range" min={100} max={400} step={1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          <button type="button" onClick={() => setZoom((z) => clamp(z + 15, 100, 400))}>+</button>
          <span className="zval">{zoom}%</span>
          <button type="button" className="rst" onClick={() => { setZoom(100); setOffset({ x: 0, y: 0 }); }}>reset</button>
        </div>

        <div className="acts">
          <button type="button" className="go" onClick={applyCrop}>APLICAR CORTE</button>
          <button type="button" className="ghost" onClick={() => setShowEditor(false)}>CANCELAR</button>
        </div>
      </div>
    );
  }

  /* ============================================================
     FORMULÁRIO
     ============================================================ */
  return (
    <form className="panel" onSubmit={submit}>
      <div className="grupo">
        <span className="grupo-t">identificação</span>
        <div className="field">
          <label>nome *</label>
          <input value={f.name} onChange={set('name')} placeholder="Elsharion Drukale" required />
        </div>
        <div className="field">
          <label>epíteto</label>
          <input value={f.epithet} onChange={set('epithet')} placeholder="Hierarca da Anarquia" />
          <p className="dica">o título pelo qual ele é conhecido</p>
        </div>

        {editando && inicial && (
          <div className="field">
            <label>endereço da página</label>
            <div className="slugbox">
              <code>/personagem/{trocarSlug ? novoSlug : inicial.slug}</code>
              {novoSlug !== inicial.slug && (
                <label className="check">
                  <input
                    type="checkbox"
                    checked={trocarSlug}
                    onChange={(e) => setTrocarSlug(e.target.checked)}
                  />
                  atualizar para <code>{novoSlug}</code>
                </label>
              )}
            </div>
            <p className="dica">
              trocar o endereço quebra links antigos que apontem para este personagem
            </p>
          </div>
        )}
      </div>

      <div className="grupo">
        <span className="grupo-t">classificação</span>
        <div className="dupla">
          <div className="field">
            <label>facção</label>
            <input value={f.faction} onChange={set('faction')} placeholder="Casa Drukale" />
          </div>
          <div className="field">
            <label>status</label>
            <select value={f.status} onChange={set('status')}>
              {STATUS.map((s) => (
                <option key={s || 'indef'} value={s}>{s || '— indefinido —'}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>raça / origem</label>
            <input value={f.race} onChange={set('race')} placeholder="Sangue-Antigo" />
          </div>
          <div className="field">
            <label>afiliações</label>
            <input value={f.affiliation} onChange={set('affiliation')} placeholder="Conselho Sombrio" />
          </div>
        </div>
      </div>

      <div className="grupo">
        <span className="grupo-t">conteúdo</span>
        <div className="field">
          <label>citação</label>
          <input value={f.quote} onChange={set('quote')} placeholder="A ordem é só o caos que ainda não acordou." />
          <p className="dica">aparece em destaque no topo da página dele</p>
        </div>
        <div className="field">
          <label>resumo *</label>
          <textarea value={f.description} onChange={set('description')} rows={3}
            placeholder="Uma ou duas frases — é o que aparece na galeria." required />
        </div>
      </div>

      <div className="grupo">
        <span className="grupo-t">abas da história</span>

        <p className="dica" style={{ marginTop: 0, marginBottom: 18 }}>
          cada aba vira um botão na página do personagem — uma por capítulo:
          origem, ascensão, guerra, poderes, relações... quebras de linha
          são preservadas.
        </p>

        {secoes.length === 0 && (
          <p className="vazio-abas">nenhuma aba ainda — este personagem só terá o resumo.</p>
        )}

        {secoes.map((a, i) => (
          <div className="aba-edit" key={i}>
            <div className="aba-edit-topo">
              <span className="aba-num">{i + 1}</span>
              <input
                value={a.titulo}
                maxLength={LIMITES.titulo}
                onChange={(e) => mudarAba(i, 'titulo', e.target.value)}
                placeholder="nome da aba — ex: Origem"
              />
              <button
                type="button" className="mini-btn" title="subir"
                onClick={() => moverAba(i, -1)} disabled={i === 0}
              >↑</button>
              <button
                type="button" className="mini-btn" title="descer"
                onClick={() => moverAba(i, 1)} disabled={i === secoes.length - 1}
              >↓</button>
              {confirmarAba === i ? (
                <>
                  <button type="button" className="mini-btn dim" onClick={() => removerAba(i)}>
                    apagar mesmo
                  </button>
                  <button type="button" className="mini-btn" onClick={() => setConfirmarAba(null)}>
                    cancelar
                  </button>
                </>
              ) : (
                <button type="button" className="mini-btn dim" onClick={() => setConfirmarAba(i)}>
                  remover
                </button>
              )}
            </div>
            <textarea
              value={a.texto}
              rows={7}
              maxLength={LIMITES.texto}
              onChange={(e) => mudarAba(i, 'texto', e.target.value)}
              placeholder="O que acontece nesta parte da história dele."
            />
          </div>
        ))}

        {secoes.length < LIMITES.abas ? (
          <button type="button" className="mini-btn add-aba" onClick={novaAba}>
            + nova aba
          </button>
        ) : (
          <p className="dica">limite de {LIMITES.abas} abas atingido.</p>
        )}
      </div>

      <div className="grupo">
        <span className="grupo-t">retrato</span>

        {finalPreview ? (
          <div className="done">
            <img src={finalPreview} alt="" className={shape === 'circle' ? 'rd' : 'sq'} />
            <div className="done-txt">
              <strong>{editando ? 'NOVA IMAGEM PRONTA' : 'IMAGEM PROCESSADA'}</strong>
              <span>{OUTPUT}×{OUTPUT}px · png</span>
              <button type="button" className="lnk" onClick={() => setShowEditor(true)}>reabrir editor</button>
              <button
                type="button" className="lnk dim"
                onClick={() => { setImage(null); setFinalPreview(''); imgRef.current = null; }}
              >descartar</button>
            </div>
          </div>
        ) : mostrarAtual ? (
          <div className="done">
            <img src={imagemAtual as string} alt="" className="rd" />
            <div className="done-txt">
              <strong>IMAGEM ATUAL</strong>
              <label className="lnk" style={{ cursor: 'pointer' }}>
                trocar imagem
                <input
                  type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) loadFile(file); e.target.value = ''; }}
                />
              </label>
              <button type="button" className="lnk dim" onClick={() => setRemoverImagem(true)}>
                remover imagem
              </button>
            </div>
          </div>
        ) : (
          <>
            <label
              className="drop"
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('over'); }}
              onDragLeave={(e) => e.currentTarget.classList.remove('over')}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('over');
                const file = e.dataTransfer.files?.[0];
                if (file) loadFile(file);
              }}
            >
              <input
                type="file" accept="image/*"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) loadFile(file); e.target.value = ''; }}
              />
              <div className="drop-ico">[ + ]</div>
              <div className="drop-t">arraste uma imagem ou clique para carregar</div>
              <div className="drop-s">jpg · png · webp</div>
            </label>
            {removerImagem && (
              <p className="dica" style={{ marginTop: 10, color: 'rgba(255,120,120,.75)' }}>
                a imagem atual será apagada ao salvar —{' '}
                <button type="button" className="lnk" onClick={() => setRemoverImagem(false)}>cancelar</button>
              </p>
            )}
          </>
        )}
      </div>

      <div className="grupo">
        <span className="grupo-t">arquivo da ficha</span>

        <p className="dica" style={{ marginTop: 0, marginBottom: 14 }}>
          PDF ou Word (.pdf, .doc, .docx), até {FICHA_MAX_ROTULO}. Vira um
          botão na página do personagem. PDF abre numa aba; Word baixa.
        </p>

        {ficha ? (
          <div className="arq">
            <span className="arq-sel">NOVO</span>
            <div className="arq-txt">
              <strong>{ficha.name}</strong>
              <span>{tamanhoLegivel(ficha.size)} · sobe quando você salvar</span>
            </div>
            <button type="button" className="mini-btn dim" onClick={() => setFicha(null)}>
              descartar
            </button>
          </div>
        ) : fichaAtual && !removerFicha ? (
          <div className="arq">
            <span className="arq-sel">ATUAL</span>
            <div className="arq-txt">
              <strong>{fichaNome || 'ficha anexada'}</strong>
              <a href={fichaAtual} target="_blank" rel="noopener noreferrer">abrir para conferir</a>
            </div>
            <label className="mini-btn" style={{ cursor: 'pointer' }}>
              trocar
              <input
                type="file" accept=".pdf,.doc,.docx"
                style={{ display: 'none' }} onChange={escolherFicha}
              />
            </label>
            <button
              type="button" className="mini-btn dim"
              onClick={() => { setFicha(null); setRemoverFicha(true); }}
            >remover</button>
          </div>
        ) : (
          <label className="arq-vazio">
            <input
              type="file" accept=".pdf,.doc,.docx"
              style={{ display: 'none' }} onChange={escolherFicha}
            />
            <strong>escolher arquivo</strong>
            <span>
              {removerFicha
                ? 'a ficha atual será apagada quando você salvar'
                : 'nenhum arquivo anexado'}
            </span>
          </label>
        )}

        {removerFicha && !ficha && (
          <p className="dica" style={{ marginTop: 12 }}>
            <button type="button" className="lnk" onClick={() => setRemoverFicha(false)}>
              desfazer remoção
            </button>
          </p>
        )}

        {erroFicha && <p className="erro" style={{ marginTop: 12 }}>{erroFicha}</p>}
      </div>

      <button className="go" disabled={loading}>
        {loading
          ? '// salvando...'
          : editando ? 'SALVAR ALTERAÇÕES' : 'GRAVAR PERSONAGEM'}
      </button>

      {status && (
        <p className={'stat ' + (ruim ? 'bad' : 'ok')}>
          {status}
          {destino && (
            <>
              {' — '}
              <Link href={`/personagem/${destino}`}>ver a página</Link>
              {' · '}
              {enviouPendente
                ? <Link href="/perfil">ver meus envios</Link>
                : <Link href="/admin">voltar ao painel</Link>}
            </>
          )}
        </p>
      )}
    </form>
  );
}

/* ============================================================
   UTILITÁRIOS
   ============================================================ */
function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v));
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number, ccw: boolean
) {
  ctx.moveTo(x + r, y);
  if (!ccw) {
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
  } else {
    ctx.arcTo(x, y, x, y + h, r);
    ctx.arcTo(x, y + h, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x + w, y, r);
    ctx.arcTo(x + w, y, x, y, r);
  }
}
