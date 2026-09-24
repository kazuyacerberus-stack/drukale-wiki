'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  arquivo: File;
  proporcao: number;            // largura / altura da moldura
  largura: number;              // tamanho final, em pixels
  altura: number;
  rotulo: string;
  onPronto: (blob: Blob) => void;
  onCancelar: () => void;
};

/**
 * Recorte antes do envio.
 *
 * A imagem entra numa moldura com a proporção exata do lugar onde vai
 * aparecer no painel: o jogador arrasta para escolher o enquadramento e
 * aproxima com o controle. A foto sempre cobre a moldura inteira — não
 * sobra faixa preta — e o que sai é redimensionado e comprimido aqui
 * mesmo, no navegador, antes de subir.
 */
export default function CortadorImagem({ arquivo, proporcao, largura, altura, rotulo, onPronto, onCancelar }: Props) {
  const [imagem, setImagem] = useState<HTMLImageElement | null>(null);
  const [erro, setErro] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [molde, setMolde] = useState({ l: 600, a: 600 / proporcao });
  const [gerando, setGerando] = useState(false);
  const arrasto = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => { setErro(''); setImagem(img); };
    img.onerror = () => setErro('Não consegui abrir esta imagem.');
    img.src = url;
    // ao desmontar, a tentativa antiga não pode mais reclamar de nada
    return () => { img.onload = null; img.onerror = null; URL.revokeObjectURL(url); };
  }, [arquivo]);

  // a moldura cabe na tela: largura primeiro, depois a altura manda
  useEffect(() => {
    const ajustar = () => {
      let l = Math.min(760, window.innerWidth * 0.9);
      let a = l / proporcao;
      const maxA = window.innerHeight * 0.58;
      if (a > maxA) { a = maxA; l = a * proporcao; }
      setMolde({ l, a });
    };
    ajustar();
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, [proporcao]);

  // escala mínima: a que faz a foto cobrir a moldura toda
  const cobre = imagem ? Math.max(molde.l / imagem.naturalWidth, molde.a / imagem.naturalHeight) : 1;
  const escala = cobre * zoom;
  const larguraImg = imagem ? imagem.naturalWidth * escala : 0;
  const alturaImg = imagem ? imagem.naturalHeight * escala : 0;

  const prender = (x: number, y: number) => ({
    x: Math.min(0, Math.max(molde.l - larguraImg, x)),
    y: Math.min(0, Math.max(molde.a - alturaImg, y)),
  });

  // ao abrir (e ao trocar de tamanho), centraliza
  useEffect(() => {
    if (!imagem) return;
    setPos({ x: (molde.l - imagem.naturalWidth * cobre) / 2, y: (molde.a - imagem.naturalHeight * cobre) / 2 });
    setZoom(1);
  }, [imagem, molde.l, molde.a, cobre]);

  /** Aproxima mantendo o centro da moldura no mesmo ponto da foto. */
  const mudarZoom = (novo: number) => {
    const z = Math.min(4, Math.max(1, novo));
    const cx = molde.l / 2, cy = molde.a / 2;
    const fator = z / zoom;
    const nx = cx - (cx - pos.x) * fator;
    const ny = cy - (cy - pos.y) * fator;
    setZoom(z);
    // a prisão usa a escala nova
    const li = imagem ? imagem.naturalWidth * cobre * z : 0;
    const ai = imagem ? imagem.naturalHeight * cobre * z : 0;
    setPos({ x: Math.min(0, Math.max(molde.l - li, nx)), y: Math.min(0, Math.max(molde.a - ai, ny)) });
  };

  const descer = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* segue sem captura */ }
    arrasto.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  };
  const mover = (e: React.PointerEvent) => {
    const a = arrasto.current;
    if (!a) return;
    setPos(prender(a.px + e.clientX - a.x, a.py + e.clientY - a.y));
  };
  const subir = () => { arrasto.current = null; };

  // quantos pixels da foto original caem dentro da moldura
  const origemL = molde.l / escala;
  const pequena = imagem ? origemL < largura * 0.6 : false;

  const confirmar = async () => {
    if (!imagem) return;
    setGerando(true);
    const cv = document.createElement('canvas');
    cv.width = largura; cv.height = altura;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imagem, -pos.x / escala, -pos.y / escala, molde.l / escala, molde.a / escala, 0, 0, largura, altura);
    const emFormato = (tipo: string, q: number) => new Promise<Blob | null>((ok) => cv.toBlob(ok, tipo, q));
    // WebP é bem menor; o Safari não sabe gerar e devolve PNG — aí vai JPEG
    let blob = await emFormato('image/webp', 0.86);
    if (!blob || blob.type !== 'image/webp') blob = await emFormato('image/jpeg', 0.88);
    setGerando(false);
    if (!blob) { setErro('Não consegui gerar o recorte.'); return; }
    onPronto(blob);
  };

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancelar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCancelar]);

  return (
    <div className="cortador" role="dialog" aria-modal="true" aria-label="Recortar imagem">
      <div className="cortador-caixa">
        <p className="cortador-t">enquadre a imagem · <span>{rotulo}</span></p>
        {erro && <p className="erro">{erro}</p>}
        <div
          className="cortador-molde"
          style={{ width: molde.l, height: molde.a }}
          onPointerDown={descer}
          onPointerMove={mover}
          onPointerUp={subir}
          onPointerCancel={subir}
          onWheel={(e) => mudarZoom(zoom * Math.exp(-e.deltaY * 0.0015))}
        >
          {imagem && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagem.src}
              alt=""
              draggable={false}
              style={{ width: larguraImg, height: alturaImg, transform: `translate(${pos.x}px, ${pos.y}px)` }}
            />
          )}
          <div className="cortador-grade" aria-hidden="true" />
        </div>
        <div className="cortador-controles">
          <label>
            aproximar
            <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => mudarZoom(Number(e.target.value))} />
          </label>
          <span className="dica">arraste a foto para escolher o enquadramento</span>
        </div>
        {pequena && (
          <p className="cortador-aviso">
            esta imagem é pequena para este espaço e pode ficar borrada — se tiver uma versão maior, prefira ela
          </p>
        )}
        <div className="cortador-acoes">
          <button type="button" className="mini-btn perigo" disabled={!imagem || gerando} onClick={confirmar}>
            {gerando ? 'recortando...' : 'usar este recorte'}
          </button>
          <button type="button" className="mini-btn" onClick={onCancelar}>cancelar</button>
        </div>
      </div>
    </div>
  );
}
