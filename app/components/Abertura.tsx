'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Abertura do arquivo: a cascata se organiza numa caveira, o sistema
 * dispara o alerta e depois libera a entrada.
 *
 * A caveira não é uma imagem. Desenho a silhueta num canvas invisível,
 * pergunto casa por casa da grade se aquele ponto cai dentro do desenho,
 * e acendo um caractere em cada casa que cair. É por isso que ela é feita
 * dos mesmos símbolos da chuva do fundo, e não colada por cima.
 */

const FONT = 18;   // a cascata, igual à do fundo do site
const CEL = 11;    // a caveira: grade mais fina, senão o formato vira borrão

/** Linha do tempo, em milissegundos desde o primeiro quadro. */
const T = {
  CHUVA: 800,    // só a cascata, ninguém desconfia de nada
  FORMA: 2500,   // a caveira se monta
  PERIGO: 4100,  // alerta
  ACESSO: 5300,  // liberado
  FIM: 5900,     // apaga
};

const G = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:=*+-<>¦｜ΔΨΩ';
const sorteia = () => G[(Math.random() * G.length) | 0];

type Fase = 'chuva' | 'forma' | 'perigo' | 'acesso' | 'saindo';

/**
 * Pinta a silhueta da caveira. Tudo em proporção de uma caixa 100x120,
 * para o desenho ser o mesmo em qualquer tamanho de tela.
 *
 * Só traço grosso aqui de propósito: na hora que isso virar uma grade de
 * caracteres de 18px, detalhe fino vira borrão. O que precisa sobreviver
 * é o formato geral, as duas órbitas, o nariz e a fileira de dentes.
 */
function pintarCaveira(x: CanvasRenderingContext2D, L: number, A: number) {
  const h = (v: number) => (v / 100) * L;
  const v = (n: number) => (n / 120) * A;

  x.clearRect(0, 0, L, A);
  x.fillStyle = '#fff';

  // crânio
  x.beginPath();
  x.ellipse(h(50), v(40), h(34), v(34), 0, 0, Math.PI * 2);
  x.fill();

  // maxilar: começa dentro do crânio e desce até o queixo
  x.beginPath();
  x.moveTo(h(27), v(56));
  x.lineTo(h(73), v(56));
  x.lineTo(h(69), v(94));
  x.quadraticCurveTo(h(50), v(106), h(31), v(94));
  x.closePath();
  x.fill();

  // ---- recortes ----
  x.globalCompositeOperation = 'destination-out';

  // órbitas, levemente inclinadas para dar cara de caveira e não de boneco
  x.beginPath();
  x.ellipse(h(33), v(40), h(13.5), v(14), -0.15, 0, Math.PI * 2);
  x.fill();
  x.beginPath();
  x.ellipse(h(67), v(40), h(13.5), v(14), 0.15, 0, Math.PI * 2);
  x.fill();

  // nariz
  x.beginPath();
  x.moveTo(h(50), v(52));
  x.lineTo(h(42), v(68));
  x.lineTo(h(58), v(68));
  x.closePath();
  x.fill();

  // as maçãs do rosto: duas mordidas laterais que estreitam a cara
  x.beginPath();
  x.ellipse(h(18), v(64), h(11), v(13), 0, 0, Math.PI * 2);
  x.fill();
  x.beginPath();
  x.ellipse(h(82), v(64), h(11), v(13), 0, 0, Math.PI * 2);
  x.fill();

  // vão da boca — deixa queixo sobrando embaixo
  x.fillRect(h(32), v(75), h(36), v(13));

  // ---- os dentes voltam por cima do vão ----
  // três e grossos de propósito: com a grade de caracteres, a FENDA entre
  // os dentes é que precisa ser larga — fenda estreita some e a boca vira
  // um bloco sólido, que não lê como caveira
  x.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 4; i++) {
    x.fillRect(h(31 + i * 10.5), v(75), h(6.5), v(13));
  }
}

/** Quais casas da grade caem dentro do desenho. */
function moldeDaCaveira(
  colunas: number,
  linhas: number,
  caixa: { x: number; y: number; L: number; A: number },
  cel: number
): boolean[][] {
  const molde: boolean[][] = Array.from({ length: linhas }, () =>
    Array.from({ length: colunas }, () => false)
  );

  const off = document.createElement('canvas');
  const L = Math.max(1, Math.round(caixa.L));
  const A = Math.max(1, Math.round(caixa.A));
  off.width = L;
  off.height = A;
  const ox = off.getContext('2d');
  if (!ox) return molde;

  try {
    pintarCaveira(ox, L, A);
    const pixels = ox.getImageData(0, 0, L, A).data;

    for (let lin = 0; lin < linhas; lin++) {
      for (let col = 0; col < colunas; col++) {
        // centro da casa, convertido para dentro da caixa do desenho
        const px = Math.round(col * cel + cel / 2 - caixa.x);
        const py = Math.round(lin * cel + cel / 2 - caixa.y);
        if (px < 0 || py < 0 || px >= L || py >= A) continue;
        molde[lin][col] = pixels[(py * L + px) * 4 + 3] > 128;
      }
    }
  } catch (e) {
    // sem molde a abertura roda sem caveira, o que é bem melhor
    // do que a página inicial não abrir
    console.error('molde da caveira:', e);
  }
  return molde;
}

export default function Abertura() {
  const [vivo, setVivo] = useState(true);
  const [fase, setFase] = useState<Fase>('chuva');
  const [calmo, setCalmo] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pularRef = useRef<() => void>(() => {});

  useEffect(() => {
    /**
     * Quem pediu menos movimento no sistema continua vendo a abertura —
     * só que sem o que incomoda: nada de tremor, nada de piscar. Sumir
     * por completo era pior: a pessoa só via um botão relampejar na tela
     * e achava que o site estava quebrado.
     */
    const reduzido = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    setCalmo(reduzido);

    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let encerrado = false;

    const pular = () => {
      if (encerrado) return;
      encerrado = true;
      cancelAnimationFrame(raf);
      setVivo(false);
    };
    pularRef.current = pular;

    /* ---------- montagem ---------- */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    cv.width = w * dpr;
    cv.height = h * dpr;
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // duas grades independentes: a cascata é grossa, a caveira é fina
    const colunas = Math.ceil(w / FONT) + 1;
    const colunasC = Math.ceil(w / CEL) + 1;
    const linhasC = Math.ceil(h / CEL) + 1;

    // a caveira ocupa a parte de cima da tela; o texto entra embaixo dela
    // o desenho não preenche a caixa toda (o crânio ocupa ~68% da largura
    // dela), por isso o fator de largura é maior que 1: sem isso a caveira
    // fica minúscula em tela de celular
    const alturaCaveira = Math.min(h * 0.6, w * 1.35);
    const larguraCaveira = alturaCaveira * (100 / 120);
    const caixa = {
      x: (w - larguraCaveira) / 2,
      y: h * 0.38 - alturaCaveira / 2,
      L: larguraCaveira,
      A: alturaCaveira,
    };

    const molde = moldeDaCaveira(colunasC, linhasC, caixa, CEL);

    // cada casa da caveira acende numa hora diferente: a ordem é sorteada,
    // então ela se materializa em pedaços espalhados em vez de varrer reto
    type Casa = { col: number; lin: number; ordem: number; letra: string; proxima: number };
    const casas: Casa[] = [];
    for (let lin = 0; lin < linhasC; lin++) {
      for (let col = 0; col < colunasC; col++) {
        if (!molde[lin][col]) continue;
        casas.push({
          col, lin,
          ordem: Math.random(),
          letra: sorteia(),
          proxima: Math.random() * 400,
        });
      }
    }

    const quedas = Array.from({ length: colunas }, () => Math.random() * -70);
    const velocidades = Array.from({ length: colunas }, () => 0.5 + Math.random() * 0.9);

    /* ---------- laço ---------- */
    const inicio = performance.now();
    let faseAtual: Fase = 'chuva';

    const loop = (agora: number) => {
      try {
        desenhar(agora);
      } catch (e) {
        // uma abertura quebrada não pode segurar a porta do arquivo:
        // se algo der errado aqui, ela some e o site abre normalmente
        console.error('abertura:', e);
        pular();
      }
    };

    const desenhar = (agora: number) => {
      raf = requestAnimationFrame(loop);
      const t = agora - inicio;

      const nova: Fase =
        t < T.CHUVA ? 'chuva'
        : t < T.FORMA ? 'forma'
        : t < T.PERIGO ? 'perigo'
        : t < T.ACESSO ? 'acesso'
        : 'saindo';

      if (nova !== faseAtual) {
        faseAtual = nova;
        setFase(nova);
      }
      if (t > T.FIM) { pular(); return; }

      /* rastro */
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${FONT}px 'Share Tech Mono', monospace`;
      ctx.textBaseline = 'top';

      /* a cascata some aos poucos para a caveira ganhar a tela */
      const forcaChuva =
        faseAtual === 'chuva' ? 1
        : faseAtual === 'forma' ? 1 - (t - T.CHUVA) / (T.FORMA - T.CHUVA) * 0.75
        : 0.22;

      ctx.shadowBlur = 0;
      for (let i = 0; i < colunas; i++) {
        const x = i * FONT;
        const y = quedas[i] * FONT;
        for (let k = 1; k <= 9; k++) {
          const ty = y - k * FONT;
          if (ty < -FONT || ty > h) continue;
          const a = 0.6 * (1 - k / 9) * forcaChuva;
          if (a < 0.02) continue;
          ctx.fillStyle = `rgba(0,255,102,${a.toFixed(3)})`;
          ctx.fillText(sorteia(), x, ty);
        }
        quedas[i] += velocidades[i];
        if (quedas[i] * FONT > h + 9 * FONT && Math.random() > 0.955) {
          quedas[i] = -2;
          velocidades[i] = 0.5 + Math.random() * 0.9;
        }
      }

      /* a caveira */
      if (faseAtual !== 'chuva') {
        const progresso =
          faseAtual === 'forma'
            ? (t - T.CHUVA) / (T.FORMA - T.CHUVA)
            : 1;

        const vermelho = faseAtual === 'perigo';
        // no alerta a caveira treme; na liberação ela se acalma
        const tremor = vermelho && !reduzido ? (Math.random() - 0.5) * 3 : 0;
        const sumindo = faseAtual === 'saindo'
          ? Math.max(0, 1 - (t - T.ACESSO) / (T.FIM - T.ACESSO))
          : 1;

        ctx.font = `${CEL}px 'Share Tech Mono', monospace`;
        ctx.shadowColor = vermelho ? '#ff2b2b' : '#00ff66';
        ctx.shadowBlur = vermelho ? 18 : 14;

        for (const casa of casas) {
          if (casa.ordem > progresso) continue;

          if (t > casa.proxima) {
            casa.letra = sorteia();
            casa.proxima = t + 90 + Math.random() * 500;
          }

          const brilho = (vermelho && !reduzido && Math.random() < 0.08) ? 1 : 0.86;
          ctx.fillStyle = vermelho
            ? `rgba(255,90,90,${(brilho * sumindo).toFixed(3)})`
            : `rgba(190,255,215,${(brilho * sumindo).toFixed(3)})`;
          ctx.fillText(casa.letra, casa.col * CEL + tremor, casa.lin * CEL);
        }
        ctx.shadowBlur = 0;
      }
    };

    raf = requestAnimationFrame(loop);

    /* ---------- pular ---------- */
    /**
     * Quem recarrega com Ctrl+Shift+R ainda está com essas teclas
     * afundadas quando a página nova nasce, e o navegador repete o
     * evento. Sem este filtro a abertura se mata antes do primeiro
     * quadro: aparece o botão de pular e some tudo junto.
     */
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta') return;
      pular();
    };
    window.addEventListener('keydown', tecla);
    const travado = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', tecla);
      document.body.style.overflow = travado;
    };
  }, []);

  if (!vivo) return null;

  return (
    <div
      className={`abertura${fase === 'saindo' ? ' indo' : ''}${calmo ? ' calma' : ''}`}
      onClick={() => pularRef.current()}
      role="presentation"
    >
      <canvas ref={canvasRef} className="abertura-tela" />

      <div className="abertura-txt">
        {fase === 'perigo' && (
          <div className="alerta">
            <strong>:: ATENÇÃO ::</strong>
            <span>ÁREA RESTRITA — PERIGO</span>
          </div>
        )}
        {(fase === 'acesso' || fase === 'saindo') && (
          <div className="liberado">
            <strong>ACESSO PERMITIDO</strong>
            <span>arquivo central do Império Drukale</span>
          </div>
        )}
      </div>

      <button
        type="button"
        className="abertura-pular"
        onClick={(e) => { e.stopPropagation(); pularRef.current(); }}
      >
        pular ›
      </button>
    </div>
  );
}
