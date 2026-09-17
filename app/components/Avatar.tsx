'use client';

import { useState } from 'react';

type Props = { url?: string | null; nome?: string | null; tamanho?: number };

/** Círculo pequeno com a foto da conta, ou a inicial do apelido se não tiver foto. */
export default function Avatar({ url, nome, tamanho = 32 }: Props) {
  // guarda QUAL endereço falhou, não só "falhou algum" — assim, quando o
  // avatar troca (ex.: gravou uma foto nova), o componente tenta a nova
  // imagem em vez de continuar preso na inicial por causa da falha antiga
  const [urlComFalha, setUrlComFalha] = useState('');
  const inicial = (nome?.trim()?.[0] ?? '?').toUpperCase();
  const estilo = { width: tamanho, height: tamanho, fontSize: Math.max(10, Math.round(tamanho * 0.42)) };

  if (url && url !== urlComFalha) {
    return <img className="drk-avatar" style={estilo} src={url} alt={nome ?? ''} onError={() => setUrlComFalha(url)} />;
  }
  return <span className="drk-avatar drk-avatar-ini" style={estilo} aria-hidden="true">{inicial}</span>;
}
