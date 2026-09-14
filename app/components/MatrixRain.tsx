'use client';

import { useEffect, useRef } from 'react';

/**
 * Fundo do site: a cascata de código, as scanlines e a vinheta.
 * Usado por todas as páginas — mexer aqui muda o site inteiro.
 */
export default function MatrixRain() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const FONT = 18;
    const TAIL = 9; // comprimento do rastro
    let w = 0, h = 0, cols = 0;
    let drops: number[] = [];
    let speeds: number[] = [];

    const G =
      'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:=*+-<>¦｜ΔΨΩ';
    const rnd = () => G[(Math.random() * G.length) | 0];

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      cv.style.width = w + 'px';
      cv.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      cols = Math.ceil(w / FONT) + 1;
      drops = Array.from({ length: cols }, () => Math.random() * -70);
      speeds = Array.from({ length: cols }, () => 0.5 + Math.random() * 0.9);
    };
    setup();
    window.addEventListener('resize', setup);

    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 42) return;
      last = t;

      // desbota o quadro anterior — é isso que cria o rastro
      ctx.fillStyle = 'rgba(0,0,0,0.085)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${FONT}px 'Share Tech Mono', monospace`;
      ctx.textBaseline = 'top';
      ctx.shadowBlur = 0;

      for (let i = 0; i < cols; i++) {
        const x = i * FONT;
        const y = drops[i] * FONT;
        for (let k = 1; k <= TAIL; k++) {
          const ty = y - k * FONT;
          if (ty < -FONT || ty > h) continue;
          ctx.fillStyle = `rgba(0,255,102,${(0.62 * (1 - k / TAIL)).toFixed(3)})`;
          ctx.fillText(rnd(), x, ty);
        }
      }

      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#e2fff0';
      for (let i = 0; i < cols; i++) {
        const y = drops[i] * FONT;
        if (y >= -FONT && y <= h) ctx.fillText(rnd(), i * FONT, y);
      }
      ctx.shadowBlur = 0;

      for (let i = 0; i < cols; i++) {
        drops[i] += speeds[i];
        if (drops[i] * FONT > h + TAIL * FONT && Math.random() > 0.955) {
          drops[i] = -2;
          speeds[i] = 0.5 + Math.random() * 0.9;
        }
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', setup);
    };
  }, []);

  return (
    <>
      <canvas ref={ref} className="rain" />
      <div className="scan" />
      <div className="vig" />
    </>
  );
}
