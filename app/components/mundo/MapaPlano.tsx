'use client';

import { useEffect, useRef } from 'react';
import { projetarMapaPlano } from '../../lib/cartografia';
import { coordenadaLegivel, tipoDe, type Local } from '../../lib/mundo';

export default function MapaPlano({ mapa, locais, selecionado, onSelecionar }: {
  mapa: HTMLCanvasElement | null;
  locais: Local[];
  selecionado: string | null;
  onSelecionar: (local: Local) => void;
}) {
  const tela = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = tela.current;
    if (!canvas || !mapa) return;
    canvas.width = mapa.width;
    canvas.height = mapa.height;
    canvas.getContext('2d')?.drawImage(mapa, 0, 0);
  }, [mapa]);

  return (
    <section className="mapa-plano" aria-label="Mapa 2D dos locais de Terra Save">
      <div className="mapa-plano-superficie">
        <canvas ref={tela} aria-hidden="true" />
        {locais.map((local) => {
          const ponto = projetarMapaPlano(local.lat, local.lon);
          if (!ponto) return null;
          const tipo = tipoDe(local.tipo);
          return (
            <button key={local.id} type="button" className={`mapa-plano-local${local.id === selecionado ? ' on' : ''}`}
              style={{ left: `${ponto.x}%`, top: `${ponto.y}%`, color: tipo.cor }}
              aria-label={`${local.nome}, ${tipo.rotulo}, ${coordenadaLegivel(local.lat, local.lon)}`}
              aria-pressed={local.id === selecionado}
              title={`${local.nome} · ${tipo.rotulo}`}
              onClick={() => onSelecionar(local)}>
              <span aria-hidden="true">●</span>
              <span className="mapa-plano-local-nome" aria-hidden="true">{local.nome}</span>
            </button>
          );
        })}
      </div>
      <p>Mapa 2D: selecione um marcador ou use a lista de locais. Locais em órbita são projetados sobre a superfície.</p>
      {!mapa && <p role="status">A imagem do mapa não ficou disponível. A lista de locais continua acessível.</p>}
    </section>
  );
}
