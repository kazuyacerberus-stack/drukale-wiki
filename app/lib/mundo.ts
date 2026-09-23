/**
 * O MUNDO DRUKALE — tipos e contas de coordenada
 *
 * Um local é guardado por latitude e longitude, como no mundo real:
 * é assim que ele continua no lugar certo quando o globo gira, e é
 * assim que você consegue mudar o desenho do planeta um dia sem perder
 * onde cada império estava.
 */

export type TipoLocal =
  | 'capital' | 'cidade' | 'base' | 'quartel' | 'ruina' | 'orbital' | 'serpente';

export const TIPOS: {
  id: TipoLocal;
  rotulo: string;
  cor: string;
  orbital?: boolean;
  serpente?: boolean;
  dica: string;
}[] = [
  { id: 'capital', rotulo: 'capital', cor: '#f4f0e2',
    dica: 'a sede do império — cidade grande com castelo' },
  { id: 'cidade', rotulo: 'cidade', cor: '#ffc978',
    dica: 'núcleo habitado' },
  { id: 'base', rotulo: 'base', cor: '#5fd0ff',
    dica: 'instalação militar ou de pesquisa' },
  { id: 'quartel', rotulo: 'quartel-general', cor: '#7ef0a8',
    dica: 'centro de comando' },
  { id: 'ruina', rotulo: 'ruína', cor: '#c07a5a',
    dica: 'o que sobrou de alguma coisa' },
  { id: 'orbital', rotulo: 'cidadela orbital', cor: '#dfe9f5', orbital: true,
    dica: 'não fica no chão: orbita o planeta' },
  { id: 'serpente', rotulo: 'serpente', cor: '#4fe0a6', serpente: true,
    dica: 'a criatura gigante que nada no oceano — crave em cima da água' },
];

export const tipoDe = (id: string) =>
  TIPOS.find((t) => t.id === id) ?? TIPOS[1];

export type StatusAprovacao = 'pendente' | 'aprovado' | 'reprovado';

export type Local = {
  id: string;
  nome: string;
  tipo: TipoLocal;
  resumo: string | null;
  lat: number;      // -90 (sul) a 90 (norte)
  lon: number;      // -180 a 180
  altitude: number; // 0 no chão; acima disso, em órbita
  imagem: string | null;   // endereço da foto do ambiente, no Storage
  faccao: string | null;   // nome da facção dona deste local, para o mapa político
  userId: string | null;           // quem propôs este território
  statusAprovacao: StatusAprovacao;
  motivoReprovacao: string | null;
  linksDominio: string[] | null;   // cenas provando domínio sobre o território — exigido do jogador, não do admin
};

export const LIMITES_LOCAL = { nome: 60, resumo: 600, total: 300, link: 500 };
export const MINIMO_LINKS_DOMINIO = 4;

/** O banco exige pelo menos 4 links não-vazios pra quem propõe um território — confere aqui antes de gastar a ida ao servidor. */
export function linksDominioValidos(links: string[]): boolean {
  const validos = links.map((l) => l.trim()).filter((l) => l.length > 0 && l.length <= LIMITES_LOCAL.link);
  return validos.length >= MINIMO_LINKS_DOMINIO;
}

export function mensagemLocal(erro: unknown): string {
  const e = erro as { message?: string; code?: string };
  if (e?.code === '42501') return 'Sua sessão não tem permissão para isto — confira se preencheu os 4 links de cena.';
  if (/fetch|network/i.test(e?.message ?? '')) return 'Não foi possível conectar. Tente novamente.';
  return e?.message || 'Não foi possível concluir. Tente novamente.';
}

/* ---------- a imagem do ambiente ---------- */

export const BUCKET_LOCAIS = 'locais';
export const IMAGEM_MAX_BYTES = 8 * 1024 * 1024;   // 8 MB
export const IMAGEM_TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Diz se o arquivo escolhido serve. Devolve a reclamação em português,
 * ou null quando está tudo certo.
 *
 * Esta é a trava da TELA, para avisar antes de gastar a subida. A trava
 * de verdade é a do Supabase, que recusa o arquivo mesmo que alguém
 * passe por cima daqui.
 */
export function conferirImagem(f: { type: string; size: number; name: string }) {
  const tipo = f.type || '';
  const ext = (/\.([^.]+)$/.exec(f.name)?.[1] ?? '').toLowerCase();
  const extOk = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
  if (!IMAGEM_TIPOS.includes(tipo) && !extOk) {
    return 'A imagem precisa ser JPG, PNG, WEBP ou GIF.';
  }
  if (f.size > IMAGEM_MAX_BYTES) {
    return `A imagem tem ${(f.size / 1024 / 1024).toFixed(1)} MB e o limite é 8 MB.`;
  }
  return null;
}

/** O caminho do arquivo dentro do balde, a partir do endereço público. */
export function caminhoDaImagem(url: string | null) {
  if (!url) return null;
  const marca = `/${BUCKET_LOCAIS}/`;
  const i = url.indexOf(marca);
  if (i < 0) return null;
  return decodeURIComponent(url.slice(i + marca.length).split('?')[0]) || null;
}

/**
 * Latitude/longitude para um ponto na esfera de raio 1.
 *
 * A esfera do globo é construída com o polo norte em +Y e a longitude
 * correndo no plano XZ. Estas duas funções são a ponte entre o jeito
 * humano de dizer "onde" e o jeito que a placa de vídeo entende.
 */
export function paraVetor(lat: number, lon: number, raio = 1): [number, number, number] {
  const fi = ((90 - lat) * Math.PI) / 180;
  const teta = (((lon + 180) / 360) * 2 * Math.PI);
  const sf = Math.sin(fi);
  return [sf * Math.cos(teta) * raio, Math.cos(fi) * raio, sf * Math.sin(teta) * raio];
}

/** O caminho de volta: do ponto na esfera para latitude/longitude. */
export function paraLatLon(x: number, y: number, z: number) {
  const n = Math.hypot(x, y, z) || 1;
  const fi = Math.acos(Math.min(1, Math.max(-1, y / n)));
  let teta = Math.atan2(z / n, x / n);
  if (teta < 0) teta += Math.PI * 2;
  return {
    lat: 90 - (fi * 180) / Math.PI,
    lon: (teta / (Math.PI * 2)) * 360 - 180,
  };
}

/** "12.34° S, 56.78° O" — como o painel mostra a coordenada. */
export function coordenadaLegivel(lat: number, lon: number) {
  const ns = lat >= 0 ? 'N' : 'S';
  const lo = lon >= 0 ? 'L' : 'O';
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lon).toFixed(2)}° ${lo}`;
}

/** Lê a lista vinda do banco sem confiar no formato. */
export function lerLocais(valor: unknown): Local[] {
  if (!Array.isArray(valor)) return [];
  const out: Local[] = [];
  for (const item of valor) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const lat = Number(o.lat), lon = Number(o.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    out.push({
      id: String(o.id ?? ''),
      nome: typeof o.nome === 'string' && o.nome.trim() ? o.nome.trim() : 'sem nome',
      tipo: (TIPOS.some((t) => t.id === o.tipo) ? o.tipo : 'cidade') as TipoLocal,
      resumo: typeof o.resumo === 'string' ? o.resumo : null,
      lat: Math.min(90, Math.max(-90, lat)),
      lon: ((((lon + 180) % 360) + 360) % 360) - 180,
      altitude: Number.isFinite(Number(o.altitude)) ? Number(o.altitude) : 0,
      imagem: typeof o.imagem === 'string' && o.imagem.trim() ? o.imagem : null,
      faccao: typeof o.faccao === 'string' && o.faccao.trim() ? o.faccao : null,
      userId: typeof o.user_id === 'string' ? o.user_id : null,
      statusAprovacao: (['pendente', 'aprovado', 'reprovado'].includes(o.status_aprovacao as string)
        ? o.status_aprovacao : 'aprovado') as StatusAprovacao,
      motivoReprovacao: typeof o.motivo_reprovacao === 'string' ? o.motivo_reprovacao : null,
      linksDominio: Array.isArray(o.links_dominio)
        ? (o.links_dominio as unknown[]).filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        : null,
    });
    if (out.length >= LIMITES_LOCAL.total) break;
  }
  return out;
}
