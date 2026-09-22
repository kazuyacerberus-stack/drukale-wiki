'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const LINK = 'https://terrasaverpg.com.br/?fbclid=IwY2xjawUexbNwZG9mBGV4dG4DYWVtAjExAHNydGMGYXBwX2lkDzQzNzYyNjMxNjk3Mzc4OAABHtNbX9Uzx1EgYCypt1rbwatJSVjAeyZTx1MI8rFFcvljW3htw0ibDGGcT5hb_aem_rQRZh3epfWJbig7dhMQ-og';

const SEM_AJUDANTE = ['/chat'];
const CHAVE_POS = 'ajudante-pos';
const TAMANHO = 66;
const LIMIAR_ARRASTO = 8;

type Fase = 'parado' | 'arrastando' | 'caindo' | 'levantando' | 'sacudindo';

/**
 * O druida-mascote: fica flutuando sobre a página (computador ou celular),
 * pode ser arrastado pra fora do caminho (com uma animaçãozinha de "pego
 * pela gola, se debatendo" e depois "caiu, levanta bravo, sacode a
 * poeira") e, se só for tocado sem arrastar, abre o site oficial na
 * mesma aba.
 */
export default function Ajudante() {
  const pathname = usePathname() ?? '/';
  const raiz = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [fase, setFase] = useState<Fase>('parado');
  const arrasto = useRef<{ offX: number; offY: number; moveu: boolean; iniX: number; iniY: number } | null>(null);
  const timers = useRef<number[]>([]);
  const posRef = useRef<{ x: number; y: number } | null>(null);

  // definido antes dos efeitos: o componente pode retornar cedo (pos ainda
  // nulo) antes de chegar numa const declarada mais abaixo, e um efeito com
  // deps [] guarda o closure da primeira renderização pra sempre
  const clamp = (x: number, y: number) => ({
    x: Math.min(Math.max(x, 6), window.innerWidth - TAMANHO - 6),
    y: Math.min(Math.max(y, 6), window.innerHeight - TAMANHO - 6),
  });

  // posição salva (ou o canto inferior direito, acima da barra do celular, na primeira vez)
  useEffect(() => {
    const calcular = () => {
      // a janela às vezes ainda não tem tamanho no instante em que este
      // efeito roda (0x0) — calcular a posição com isso daria um canto
      // inválido e o druida nasceria praticamente colado no cabeçalho
      if (window.innerWidth <= 0 || window.innerHeight <= 0) return null;
      let salva: { x: number; y: number } | null = null;
      try {
        const bruto = window.localStorage.getItem(CHAVE_POS);
        if (bruto) salva = JSON.parse(bruto);
      } catch { /* sem armazenamento: usa o padrão */ }
      const padrao = { x: window.innerWidth - TAMANHO - 14, y: window.innerHeight - TAMANHO - 96 };
      return salva && Number.isFinite(salva.x) && Number.isFinite(salva.y) ? salva : padrao;
    };

    const aplicar = (p: { x: number; y: number }) => { posRef.current = p; setPos(p); };

    const inicial = calcular();
    if (inicial) { aplicar(inicial); return; }
    // janela sem tamanho ainda: tenta de novo assim que o navegador terminar o layout
    const id = requestAnimationFrame(() => aplicar(calcular() ?? { x: 14, y: 14 }));
    return () => cancelAnimationFrame(id);
  }, []);

  // a janela pode mudar de tamanho (girar o celular) — não deixa o druida ficar preso fora da tela
  useEffect(() => {
    const aoRedimensionar = () => setPos((p) => {
      if (!p) return p;
      const n = clamp(p.x, p.y);
      posRef.current = n;
      return n;
    });
    window.addEventListener('resize', aoRedimensionar);
    return () => window.removeEventListener('resize', aoRedimensionar);
  }, []);

  useEffect(() => () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    window.removeEventListener('pointermove', aoMoverJanela);
    window.removeEventListener('pointerup', aoSoltarJanela);
    window.removeEventListener('pointercancel', aoSoltarJanela);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (SEM_AJUDANTE.includes(pathname) || !pos) return null;

  // arrasto tratado no window (não só no botão): um arrasto rápido pode
  // tirar o ponteiro da área do druida antes do próximo evento, e a
  // captura de ponteiro sozinha nem sempre segura isso a tempo
  const aoMoverJanela = (ev: PointerEvent) => {
    const a = arrasto.current;
    if (!a) return;
    const dx = ev.clientX - a.iniX;
    const dy = ev.clientY - a.iniY;
    if (!a.moveu && Math.hypot(dx, dy) > LIMIAR_ARRASTO) { a.moveu = true; setFase('arrastando'); }
    if (a.moveu) {
      const novo = clamp(ev.clientX - a.offX, ev.clientY - a.offY);
      posRef.current = novo;
      setPos(novo);
    }
  };

  const aoSoltarJanela = () => {
    window.removeEventListener('pointermove', aoMoverJanela);
    window.removeEventListener('pointerup', aoSoltarJanela);
    window.removeEventListener('pointercancel', aoSoltarJanela);
    const a = arrasto.current;
    arrasto.current = null;
    if (!a) return;
    if (!a.moveu) { setFase('parado'); window.location.href = LINK; return; } // foi só um toque — abre o site
    // solta onde caiu — a próxima visita já lembra o lugar
    try { if (posRef.current) window.localStorage.setItem(CHAVE_POS, JSON.stringify(posRef.current)); } catch { /* sem armazenamento: só não lembra da próxima vez */ }
    // caiu, se levanta bravo, sacode a poeira e se acalma
    setFase('caindo');
    timers.current.push(window.setTimeout(() => setFase('levantando'), 260));
    timers.current.push(window.setTimeout(() => setFase('sacudindo'), 700));
    timers.current.push(window.setTimeout(() => setFase('parado'), 1350));
  };

  const aoPressionar = (e: React.PointerEvent) => {
    if (fase !== 'parado') return;
    const el = raiz.current;
    if (!el) return;
    try { el.setPointerCapture(e.pointerId); } catch { /* segue só com os listeners do window */ }
    const r = el.getBoundingClientRect();
    arrasto.current = { offX: e.clientX - r.left, offY: e.clientY - r.top, moveu: false, iniX: e.clientX, iniY: e.clientY };
    window.addEventListener('pointermove', aoMoverJanela);
    window.addEventListener('pointerup', aoSoltarJanela);
    window.addEventListener('pointercancel', aoSoltarJanela);
  };

  const aoClicar: React.MouseEventHandler = (e) => {
    // clique de mouse/toque real já foi tratado no soltar; isto aqui só sobra
    // pra quem ativa por teclado (Enter/Espaço), que dispara onClick sem
    // pointerdown/up antes — detail 0 identifica esse caso
    if (e.detail !== 0) return;
    window.location.href = LINK;
  };

  return (
    <button
      ref={raiz}
      type="button"
      className={`ajudante fase-${fase}`}
      style={{ left: pos.x, top: pos.y, width: TAMANHO, height: TAMANHO }}
      onPointerDown={aoPressionar}
      onClick={aoClicar}
      title="visite o site oficial de Terra Save — arraste pra tirar do caminho"
      aria-label="Abrir o site oficial de Terra Save"
    >
      <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
        <ellipse className="ajudante-sombra" cx="32" cy="58" rx="16" ry="3.4" />
        <g className="ajudante-corpo">
          <line x1="46" y1="16" x2="52" y2="52" stroke="#8a5a30" strokeWidth="3" strokeLinecap="round" />
          <circle cx="46" cy="14" r="3.4" fill="#d8bd88" stroke="#8a5a30" strokeWidth="1.4" />
          <path d="M18 58c-1-14 -2-24 6-30l-3-9a3 3 0 013-3.6h16a3 3 0 013 3.6l-3 9c8 6 7 16 6 30z" fill="#4a5c3c" stroke="#2c3524" strokeWidth="1.6" />
          <path d="M22 58c1-11 2-19 3-24M42 58c-1-11 -2-19 -3-24" stroke="#2c3524" strokeWidth="1.2" fill="none" opacity=".6" />
          <path d="M17 39c3 4 3 12 1 19M47 39c-3 4 -3 12 -1 19" fill="none" stroke="#3c4a30" strokeWidth="5" strokeLinecap="round" />
          <path d="M20 22c-6 3-9 10-8 15M44 22c6 3 9 10 8 15" fill="none" stroke="#2c3524" strokeWidth="1.2" opacity=".5" />
          <path d="M17 20a15 15 0 0130 0c0 7-4 10-15 10s-15-3-15-10z" fill="#3a4830" stroke="#20281a" strokeWidth="1.6" />
          <path d="M32 5c-9 0-14 7-14 15 2-6 6-9 14-9s12 3 14 9c0-8-5-15-14-15z" fill="#2c3524" stroke="#20281a" strokeWidth="1.4" />
          <ellipse cx="32" cy="24" rx="8" ry="7" fill="#e8c79a" />
          <path d="M25 27c2 5 12 5 14 0" fill="none" stroke="#c9a86a" strokeWidth="1.4" />
          <path d="M24 29c1 6 4 10 8 10s7-4 8-10c-3 3-13 3-16 0z" fill="#d9d2c2" />
          <circle cx="28.5" cy="23" r="1.3" fill="#20281a" />
          <circle cx="35.5" cy="23" r="1.3" fill="#20281a" />
          <path d="M27 19c1.4-1.2 3.4-1.2 4 0M33 19c1.4-1.2 3.4-1.2 4 0" stroke="#20281a" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        </g>
      </svg>
    </button>
  );
}
