'use client';

import { useEffect, useState } from 'react';
import { tipoDocumento } from '../../lib/mundo';

/**
 * Visualizador do documento de um local do mapa, em tela cheia.
 *
 * - PDF: o próprio leitor de PDF do navegador, dentro da página.
 * - Word (.doc/.docx): navegador nenhum abre Word sozinho, então o
 *   arquivo é mostrado pelo visualizador gratuito do Office Online
 *   (só lê; o arquivo já é público no Storage).
 * Sempre há "abrir em nova aba" e "baixar" — no celular, alguns
 *   navegadores não mostram PDF embutido e só oferecem baixar.
 */
export default function DocumentoViewer({
  url, nome, titulo, onFechar,
}: { url: string; nome: string | null; titulo: string; onFechar: () => void }) {
  const tipo = tipoDocumento(nome || url);
  const [carregou, setCarregou] = useState(false);

  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', aoTecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', aoTecla); document.body.style.overflow = antes; };
  }, [onFechar]);

  const fonte = tipo === 'word'
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
    : `${url}#view=FitH`;
  const baixar = `${url}${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(nome || 'documento')}`;

  const botao: React.CSSProperties = {
    background: 'rgba(0,0,0,.5)', color: '#e9e4da', border: '1px solid rgba(233,228,218,.35)',
    borderRadius: 4, padding: '6px 12px', fontSize: 13, letterSpacing: '.08em', textDecoration: 'none',
    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Documento de ${titulo}`}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(5,4,12,.92)',
        display: 'flex', flexDirection: 'column', padding: 'clamp(8px, 2vw, 24px)', gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <strong style={{ color: '#e9e4da', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          📄 {titulo}{nome ? ` — ${nome}` : ''}
        </strong>
        <a style={botao} href={url} target="_blank" rel="noopener noreferrer">abrir em nova aba</a>
        <a style={botao} href={baixar}>baixar</a>
        <button type="button" style={botao} onClick={onFechar} autoFocus>✕ fechar</button>
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 0, borderRadius: 6, overflow: 'hidden', background: '#1a1826' }}>
        {!carregou && (
          <p style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, color: 'rgba(233,228,218,.6)' }}>
            abrindo o documento…
          </p>
        )}
        <iframe
          src={fonte}
          title={`Documento de ${titulo}`}
          onLoad={() => setCarregou(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, background: '#fff' }}
        />
      </div>
    </div>
  );
}
