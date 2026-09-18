'use client';

import { embedSrc, ROTULO_PROVEDOR, type Musica } from '../lib/musica';

export default function MusicaEmbed({ musica }: { musica: Musica }) {
  const src = embedSrc(musica);
  if (!src) {
    return (
      <a href={musica.url} target="_blank" rel="noopener noreferrer" className="musica-link">
        ♪ ouvir no {ROTULO_PROVEDOR[musica.provedor]} ↗
      </a>
    );
  }
  const alto = musica.provedor === 'spotify' && /\/(album|playlist)\//.test(src);
  return (
    <div className="musica-embed">
      <iframe
        src={src}
        title={`música (${ROTULO_PROVEDOR[musica.provedor]})`}
        allow="autoplay; encrypted-media; picture-in-picture"
        loading="lazy"
        style={{ height: musica.provedor === 'youtube' ? 200 : alto ? 352 : 152 }}
      />
    </div>
  );
}
