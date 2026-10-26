'use client';

import { useEffect, useRef, useState } from 'react';
import { avancarClima, fenomenosNoInstante, TIPOS_CLIMA, type EstadoClima, type Fenomeno, type PontoClima, type TipoClima } from './clima';

export function useClima(pontos: PontoClima[]) {
  const [semente, setSemente] = useState(20261026);
  const [ativo, setAtivo] = useState(true);
  const [pausado, setPausado] = useState(false);
  const [raios, setRaios] = useState(false);
  const [intensidade, setIntensidade] = useState(0.85);
  const [tipos, setTipos] = useState<TipoClima[]>([...TIPOS_CLIMA]);
  const [eventos, setEventos] = useState<Fenomeno[]>([]);
  const quadro = useRef<EstadoClima>({ eventos: [], tempo: 0, raios: false });
  const sementeAnterior = useRef(semente);

  useEffect(() => {
    setSemente(Math.floor(Math.random() * 0xffffffff));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPausado(true);
  }, []);

  useEffect(() => {
    if (sementeAnterior.current !== semente) {
      quadro.current.tempo = 0;
      sementeAnterior.current = semente;
    }
    if (!ativo || !pontos.length) {
      quadro.current.eventos = [];
      setEventos([]);
      return;
    }
    let raf = 0, anterior = 0, ultimaUI = -Infinity;
    const atualizar = (agora: number) => {
      const delta = anterior ? (agora - anterior) / 1000 : 0;
      anterior = agora;
      quadro.current.tempo = avancarClima(quadro.current.tempo, delta, pausado, document.visibilityState !== 'hidden');
      quadro.current.raios = raios;
      quadro.current.eventos = fenomenosNoInstante(semente, quadro.current.tempo, pontos, tipos, intensidade);
      if (agora - ultimaUI > 700 || pausado) {
        setEventos(quadro.current.eventos);
        ultimaUI = agora;
      }
      if (!pausado) raf = requestAnimationFrame(atualizar);
    };
    raf = requestAnimationFrame(atualizar);
    return () => cancelAnimationFrame(raf);
  }, [ativo, pausado, raios, intensidade, pontos, semente, tipos]);

  return { quadro, eventos, ativo, setAtivo, pausado, setPausado, raios, setRaios, intensidade, setIntensidade, tipos,
    alternarTipo: (tipo: TipoClima) => setTipos(prev => prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]),
    sortear: () => setSemente(prev => (prev + 0x9e3779b9) >>> 0),
  };
}
