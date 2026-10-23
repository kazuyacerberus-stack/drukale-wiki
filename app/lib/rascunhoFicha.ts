import type { Secao } from './db';

const CAMPOS = ['name', 'epithet', 'faction', 'status', 'race', 'affiliation', 'quote', 'description'] as const;
export type CamposFicha = Record<typeof CAMPOS[number], string>;
export type RascunhoFicha = { versao: 1; campos: CamposFicha; secoes: Secao[] };

/** Dados locais também podem estar desatualizados ou corrompidos. */
export function lerRascunhoFicha(bruto: string | null): RascunhoFicha | null {
  if (!bruto) return null;
  try {
    const valor: unknown = JSON.parse(bruto);
    if (!valor || typeof valor !== 'object') return null;
    const r = valor as Partial<RascunhoFicha>;
    if (r.versao !== 1 || !r.campos || typeof r.campos !== 'object' || !Array.isArray(r.secoes)) return null;
    if (!CAMPOS.every((campo) => typeof r.campos?.[campo] === 'string')) return null;
    if (r.secoes.length > 20 || !r.secoes.every((s) => s && typeof s.titulo === 'string' && typeof s.texto === 'string')) return null;
    return {
      versao: 1,
      campos: Object.fromEntries(CAMPOS.map((campo) => [campo, r.campos![campo]])) as CamposFicha,
      secoes: r.secoes.map((s) => ({ titulo: s.titulo, texto: s.texto })),
    };
  } catch {
    return null;
  }
}
