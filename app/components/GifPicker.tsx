'use client';

import { useEffect, useState } from 'react';
import { buscarGiphy, giphyConfigurado, type AbaGiphy, type ResultadoGiphy } from '../lib/chat';
import s from '../chat/chat.module.css';

type Props = {
  onEscolher: (anexo: { tipo: 'gif' | 'figurinha'; url: string; nome: string }) => void;
  onFechar: () => void;
};

export default function GifPicker({ onEscolher, onFechar }: Props) {
  const [aba, setAba] = useState<AbaGiphy>('gifs');
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<ResultadoGiphy[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const configurado = giphyConfigurado();

  useEffect(() => {
    if (!configurado) return;
    let vivo = true;
    setCarregando(true);
    setErro('');
    const timer = window.setTimeout(async () => {
      try {
        const r = await buscarGiphy(termo, aba);
        if (vivo) setResultados(r);
      } catch (e) {
        if (vivo) setErro(e instanceof Error ? e.message : 'Falha ao buscar.');
      } finally {
        if (vivo) setCarregando(false);
      }
    }, 350);
    return () => { vivo = false; window.clearTimeout(timer); };
  }, [termo, aba, configurado]);

  return (
    <div className={s.gifPicker} role="dialog" aria-label="Buscar GIF ou figurinha">
      <div className={s.gifTopo}>
        <button type="button" className={aba === 'gifs' ? s.abaOn : ''} onClick={() => setAba('gifs')}>GIFs</button>
        <button type="button" className={aba === 'figurinhas' ? s.abaOn : ''} onClick={() => setAba('figurinhas')}>Figurinhas</button>
        <button type="button" className={s.fechar} onClick={onFechar} aria-label="Fechar busca">✕</button>
      </div>

      {!configurado ? (
        <p className={s.gifStatus}>Busca de GIFs/figurinhas ainda não configurada nesta conta (falta a chave NEXT_PUBLIC_GIPHY_API_KEY).</p>
      ) : (
        <>
          <input type="text" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder={`Buscar ${aba}...`} autoFocus />
          {erro && <p className={s.gifStatus}>{erro}</p>}
          <div className={s.gifGrade} aria-busy={carregando}>
            {resultados.map((r) => (
              <button
                type="button"
                key={r.id}
                title={r.nome}
                onClick={() => onEscolher({ tipo: aba === 'figurinhas' ? 'figurinha' : 'gif', url: r.url, nome: r.nome })}
              >
                <img src={r.preview} alt={r.nome} loading="lazy" />
              </button>
            ))}
          </div>
          {carregando && <p className={s.gifStatus}>buscando…</p>}
          {!carregando && !erro && resultados.length === 0 && <p className={s.gifStatus}>nenhum resultado</p>}
        </>
      )}
    </div>
  );
}
