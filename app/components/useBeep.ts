'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type Bip = 'hover' | 'click' | 'close';

/**
 * Bips sintetizados na hora com Web Audio — não precisa de arquivo de som.
 * A preferência de silenciar fica salva no navegador.
 */
export function useBeep() {
  const ac = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  useEffect(() => {
    try {
      setMuted(localStorage.getItem('drk-mute') === '1');
    } catch {
      /* navegador sem localStorage */
    }
  }, []);

  useEffect(() => {
    mutedRef.current = muted;
    try {
      localStorage.setItem('drk-mute', muted ? '1' : '0');
    } catch {
      /* ignora */
    }
  }, [muted]);

  const ctx = () => {
    if (!ac.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ac.current = new Ctor();
    }
    if (ac.current.state === 'suspended') void ac.current.resume();
    return ac.current;
  };

  const beep = useCallback((kind: Bip) => {
    if (mutedRef.current) return;
    try {
      const c = ctx();
      const t = c.currentTime;
      const out = c.createGain();
      out.connect(c.destination);

      // bandpass dá o corpo "de interface", tira a aspereza da onda quadrada
      const flt = c.createBiquadFilter();
      flt.type = 'bandpass';
      flt.Q.value = 1.4;
      flt.connect(out);

      if (kind === 'hover') {
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(1500, t);
        o.frequency.exponentialRampToValueAtTime(2100, t + 0.05);
        flt.frequency.value = 1800;
        out.gain.setValueAtTime(0.0001, t);
        out.gain.exponentialRampToValueAtTime(0.04, t + 0.006);
        out.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        o.connect(flt);
        o.start(t);
        o.stop(t + 0.09);
        return;
      }

      const sobe = kind === 'click';
      const f0 = sobe ? 620 : 900;
      const f1 = sobe ? 1900 : 300;

      const a = c.createOscillator();
      const b = c.createOscillator();
      a.type = 'square';
      b.type = 'sine';
      a.frequency.setValueAtTime(f0, t);
      a.frequency.exponentialRampToValueAtTime(f1, t + 0.11);
      b.frequency.setValueAtTime(f0 * 2, t);
      b.frequency.exponentialRampToValueAtTime(f1 * 2, t + 0.11);

      flt.frequency.setValueAtTime(f0 * 1.6, t);
      flt.frequency.exponentialRampToValueAtTime(f1 * 1.6, t + 0.11);

      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(0.13, t + 0.012);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

      a.connect(flt);
      b.connect(flt);
      a.start(t); b.start(t);
      a.stop(t + 0.24); b.stop(t + 0.24);
    } catch {
      /* navegador sem WebAudio — segue sem som */
    }
  }, []);

  return { beep, muted, setMuted };
}
