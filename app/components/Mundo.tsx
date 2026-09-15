'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { supabase } from '../lib/db';
import { gerarMundo } from './mundo/textura';
import { criarGlobo, criarCidadela, criarSerpente, pintarEspaco, rotacao3 } from './mundo/globo';
import {
  TIPOS, tipoDe, paraVetor, paraLatLon, coordenadaLegivel, lerLocais,
  LIMITES_LOCAL, BUCKET_LOCAIS, conferirImagem, caminhoDaImagem,
  type Local, type TipoLocal,
} from '../lib/mundo';

const FOV = 38;
const PERTO = 1.6;    // aproximação máxima
const LONGE = 6.5;    // afastamento máximo

/** Multiplica a matriz 3x3 (coluna-primeiro) por um vetor. */
function aplicar3(m: Float32Array, v: number[]): [number, number, number] {
  return [
    m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
    m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
    m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
  ];
}

/** E a volta: como a matriz é de rotação pura, a inversa é a transposta. */
function aplicar3T(m: Float32Array, v: number[]): [number, number, number] {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/**
 * Acha o giro/inclinação da câmera que deixam um ponto (lat, lon) bem de
 * frente, no centro da tela — é a matemática inversa do desenho: em vez
 * de girar o mundo e ver onde o ponto cai, parte de "quero este ponto no
 * centro" e resolve os dois ângulos que fazem isso acontecer.
 */
function mirarPara(lat: number, lon: number): { giro: number; inclina: number } {
  const v = paraVetor(lat, lon, 1);
  let giro = Math.atan2(-v[0], v[2]);
  const uz = -v[0] * Math.sin(giro) + v[2] * Math.cos(giro);
  const uy = v[1];
  let inclina = Math.atan2(-uy, -uz);
  // duas soluções existem (giradas 180° uma da outra); esta fica com o
  // planeta na posição natural, polo norte para cima, em vez de de cabeça
  // para baixo
  if (inclina > Math.PI / 2) { inclina -= Math.PI; giro += Math.PI; }
  else if (inclina < -Math.PI / 2) { inclina += Math.PI; giro += Math.PI; }
  return { giro, inclina: Math.max(-1.35, Math.min(1.35, inclina)) };
}

export default function Mundo() {
  const telaRef = useRef<HTMLCanvasElement>(null);
  const fundoRef = useRef<HTMLCanvasElement>(null);
  const palcoRef = useRef<HTMLDivElement>(null);
  const marcosRef = useRef<Map<string, HTMLElement>>(new Map());

  // a câmera vive em ref, não em estado: ela muda a cada quadro e
  // redesenhar o React 60 vezes por segundo seria desperdício puro
  const cam = useRef({ giro: 2.2, inclina: 0.15, dist: 3.6 });
  const arrasto = useRef({ ativo: false, x: 0, y: 0, andou: 0 });
  const pausado = useRef(false);
  const locaisRef = useRef<Local[]>([]);
  // o laço de desenho nasce uma vez só e não enxerga o estado do React;
  // por isso a vontade de girar mora aqui, num espelho que ele lê
  const giraSozinho = useRef(true);
  // qual botão de zoom/giro está sendo segurado agora, se algum
  const segurando = useRef<null | 'zoomMais' | 'zoomMenos' | 'giroEsq' | 'giroDir' | 'inclinaCima' | 'inclinaBaixo'>(null);
  // para onde a câmera está viajando sozinha, quando alguém clica um local na lista
  const alvoCam = useRef<{ giro: number; inclina: number } | null>(null);

  const [locais, setLocais] = useState<Local[]>([]);
  const [mostrarLista, setMostrarLista] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<Set<TipoLocal>>(new Set());
  const [buscaLocal, setBuscaLocal] = useState('');
  const [fase, setFase] = useState<'gerando' | 'pronto' | 'sem-webgl'>('gerando');
  const [erro, setErro] = useState('');
  const [logado, setLogado] = useState(false);
  const [selecionado, setSelecionado] = useState<Local | null>(null);
  const [cravando, setCravando] = useState(false);
  const [rascunho, setRascunho] = useState<Local | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [girando, setGirando] = useState(true);
  // a imagem do ambiente, enquanto o formulário está aberto
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState('');
  const [erroFoto, setErroFoto] = useState('');
  const [tirarFoto, setTirarFoto] = useState(false);

  /* ---------- quem está logado pode editar ---------- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLogado(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setLogado(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  /* ---------- os locais ---------- */
  const carregar = async () => {
    const { data, error } = await supabase
      .from('locais').select('*').order('nome', { ascending: true });
    if (error) { setErro(error.message); return; }
    const lista = lerLocais(data);
    locaisRef.current = lista;
    setLocais(lista);
  };
  useEffect(() => { carregar(); }, []);

  /* ============================================================
     O GLOBO
     ============================================================ */
  useEffect(() => {
    const tela = telaRef.current, palco = palcoRef.current;
    if (!tela || !palco) return;

    let raf = 0;
    let vivo = true;

    // gerar a textura trava a aba por cerca de um segundo. O quadro
    // seguinte garante que a tela de "gerando" apareça antes disso.
    const inicia = requestAnimationFrame(() => {
      if (!vivo) return;
      try {
        const largo = palco.clientWidth;
        // no celular a textura grande custa caro e nem se enxerga
        const TAM = largo < 700 ? 1024 : 2048;
        const mapas = gerarMundo(TAM, TAM / 2, {});

        const fundo = fundoRef.current;
        if (fundo) {
          let a = 7;
          const rnd = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
          const fc = fundo.getContext('2d');
          if (fc) pintarEspaco(fc, fundo.width, fundo.height, rnd);
        }

        const globo = criarGlobo(tela, mapas);
        if (!globo) { setFase('sem-webgl'); return; }
        setFase('pronto');

        // A cidadela só nasce quando existe alguma em órbita. Ela usa
        // outro programa na placa de vídeo, e criar peça que ninguém
        // pediu é abrir porta para o desenho de um atrapalhar o do
        // outro — foi exatamente isso que deixou o planeta invisível
        // da primeira vez.
        let cidadela: ReturnType<typeof criarCidadela> | null = null;
        let serpente: ReturnType<typeof criarSerpente> | null = null;

        let n = 0;
        const quadro = (t: number) => {
          if (!vivo) return;
          raf = requestAnimationFrame(quadro);

          // gira sozinho quando ninguém está mexendo nem lendo uma ficha
          if (giraSozinho.current && !arrasto.current.ativo && !pausado.current) {
            cam.current.giro += 0.0011;
          }

          // segurando um botão de zoom ou de giro: ajusta a câmera a cada quadro
          if (segurando.current) {
            const s = segurando.current;
            if (s === 'zoomMais') cam.current.dist = Math.max(PERTO, cam.current.dist * 0.985);
            else if (s === 'zoomMenos') cam.current.dist = Math.min(LONGE, cam.current.dist * 1.015);
            else if (s === 'giroEsq') cam.current.giro -= 0.022;
            else if (s === 'giroDir') cam.current.giro += 0.022;
            else if (s === 'inclinaCima') cam.current.inclina = Math.max(-1.35, cam.current.inclina - 0.016);
            else if (s === 'inclinaBaixo') cam.current.inclina = Math.min(1.35, cam.current.inclina + 0.016);
          }

          // viajando sozinha até o local que alguém escolheu na lista
          if (alvoCam.current) {
            const a = alvoCam.current;
            cam.current.giro += (a.giro - cam.current.giro) * 0.08;
            cam.current.inclina += (a.inclina - cam.current.inclina) * 0.08;
            if (Math.abs(a.giro - cam.current.giro) < 0.002 && Math.abs(a.inclina - cam.current.inclina) < 0.002) {
              cam.current.giro = a.giro;
              cam.current.inclina = a.inclina;
              alvoCam.current = null;
            }
          }

          const { giro, inclina, dist } = cam.current;
          const cena = globo.desenhar(giro, inclina, dist, 1);

          // as cidadelas orbitais são desenhadas por cima do planeta
          const orbitais = locaisRef.current.filter((l) => tipoDe(l.tipo).orbital === true);
          if (orbitais.length > 0) {
            const cid = cidadela ?? (cidadela = criarCidadela(cena.gl));
            for (const l of orbitais) {
              const p = paraVetor(l.lat, l.lon, 1 + (l.altitude || 0.55));
              cid.desenhar(cena.proj, cena.vista, cena.r3, p, 0.085, t / 2600);
            }
          }

          // e as serpentes, nadando rente à água
          const bichos = locaisRef.current.filter((l) => tipoDe(l.tipo).serpente === true);
          if (bichos.length > 0) {
            const s = serpente ?? (serpente = criarSerpente(cena.gl));
            for (const l of bichos) {
              s.desenhar(cena.proj, cena.vista, cena.r3, l.lat, l.lon, t / 1400);
            }
          }

          // depois de meio segundo, conferir se saiu alguma coisa na
          // tela. Se não saiu, dizer POR QUE em vez de ficar preto.
          if (++n === 30) {
            const d = globo.conferir();
            if (d.acesos === 0) {
              setErro(`o planeta não desenhou (erro ${d.erro} · ${d.tela} · ${d.placa})`);
            }
          }

          posicionarMarcos(giro, inclina, dist);
        };
        raf = requestAnimationFrame(quadro);
      } catch (e) {
        console.error('mundo:', e);
        setFase('sem-webgl');
      }
    });

    return () => { vivo = false; cancelAnimationFrame(inicia); cancelAnimationFrame(raf); };
  }, []);

  /* ---------- redimensionar ---------- */
  useEffect(() => {
    const ajustar = () => {
      const palco = palcoRef.current;
      if (!palco) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const cv of [telaRef.current, fundoRef.current]) {
        if (!cv) continue;
        cv.width = palco.clientWidth * dpr;
        cv.height = palco.clientHeight * dpr;
        cv.style.width = palco.clientWidth + 'px';
        cv.style.height = palco.clientHeight + 'px';
      }
    };
    ajustar();
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, []);

  /**
   * Põe cada marcador no lugar certo da tela.
   *
   * Mexe no style direto, sem passar pelo React: são dezenas de
   * elementos mudando 60 vezes por segundo, e reconstruir a árvore
   * nesse ritmo derrubaria a taxa de quadros.
   */
  function posicionarMarcos(giro: number, inclina: number, dist: number) {
    const palco = palcoRef.current;
    if (!palco) return;
    const L = palco.clientWidth, A = palco.clientHeight;
    const r3 = rotacao3(giro, inclina);
    const f = 1 / Math.tan((FOV * Math.PI) / 360);
    const prop = L / A;

    for (const l of locaisRef.current) {
      const el = marcosRef.current.get(l.id);
      if (!el) continue;

      const raio = tipoDe(l.tipo).orbital ? 1 + (l.altitude || 0.55) : 1.005;
      const mundo = aplicar3(r3, paraVetor(l.lat, l.lon, raio));
      const vz = mundo[2] - dist;

      if (vz > -0.05) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; continue; }

      // o ponto some quando passa para o outro lado do planeta
      const camDir = [-mundo[0], -mundo[1], dist - mundo[2]];
      const nc = Math.hypot(camDir[0], camDir[1], camDir[2]) || 1;
      const nm = Math.hypot(mundo[0], mundo[1], mundo[2]) || 1;
      const frente =
        (mundo[0] * camDir[0] + mundo[1] * camDir[1] + mundo[2] * camDir[2]) / (nm * nc);

      const x = ((f / prop) * mundo[0] / -vz * 0.5 + 0.5) * L;
      const y = (1 - (f * mundo[1] / -vz * 0.5 + 0.5)) * A;

      const vis = Math.max(0, Math.min(1, (frente - 0.02) * 9));
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.opacity = String(vis);
      el.style.pointerEvents = vis > 0.4 ? 'auto' : 'none';
    }
  }

  /* ============================================================
     MOUSE E DEDO
     ============================================================ */
  /** Trava ou solta o giro automático. */
  const mudarGiro = (ligar: boolean) => {
    giraSozinho.current = ligar;
    setGirando(ligar);
  };

  const aoDescer = (e: React.PointerEvent) => {
    arrasto.current = { ativo: true, x: e.clientX, y: e.clientY, andou: 0 };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    // quem pegou o planeta com a mão quer olhar, não ver passar:
    // o giro automático para sozinho e só volta se for pedido
    if (girando) mudarGiro(false);
    alvoCam.current = null;
  };

  const aoMover = (e: React.PointerEvent) => {
    if (!arrasto.current.ativo) return;
    const dx = e.clientX - arrasto.current.x;
    const dy = e.clientY - arrasto.current.y;
    arrasto.current.x = e.clientX;
    arrasto.current.y = e.clientY;
    arrasto.current.andou += Math.abs(dx) + Math.abs(dy);

    // quanto mais perto, mais devagar gira — senão a aproximação vira um borrão
    const passo = 0.0052 * (cam.current.dist / 3.6);
    cam.current.giro -= dx * passo;
    cam.current.inclina = Math.max(-1.35, Math.min(1.35, cam.current.inclina + dy * passo));
  };

  const aoSubir = (e: React.PointerEvent) => {
    const eraClique = arrasto.current.andou < 6;
    arrasto.current.ativo = false;
    // clicou em cima de um marcador: quem responde é o marcador, não o chão
    if ((e.target as HTMLElement).closest?.('.marco')) return;
    if (eraClique && cravando && logado) cravarAqui(e);
  };

  const aoRolar = (e: React.WheelEvent) => {
    // rolar é só para aproximar — sem isto, o planeta continuava girando
    // sozinho embaixo de quem só queria dar zoom num ponto parado
    if (girando) mudarGiro(false);
    alvoCam.current = null;
    const fator = Math.exp(e.deltaY * 0.0013);
    cam.current.dist = Math.max(PERTO, Math.min(LONGE, cam.current.dist * fator));
  };

  /** Segura um botão de zoom ou de giro: o laço de desenho lê isto a cada quadro. */
  const segurar = (tipo: NonNullable<typeof segurando.current>) => (e: React.PointerEvent) => {
    e.stopPropagation();
    if (girando) mudarGiro(false);
    alvoCam.current = null;
    segurando.current = tipo;
  };
  const soltar = (e: React.PointerEvent) => { e.stopPropagation(); segurando.current = null; };

  /** Gira a câmera sozinha até deixar o local de frente, pelo caminho mais curto. */
  function focarLocal(l: Local) {
    if (girando) mudarGiro(false);
    const alvo = mirarPara(l.lat, l.lon);
    let giro = alvo.giro;
    while (giro - cam.current.giro > Math.PI) giro -= Math.PI * 2;
    while (giro - cam.current.giro < -Math.PI) giro += Math.PI * 2;
    alvoCam.current = { giro, inclina: alvo.inclina };
  }

  /**
   * Descobre em que ponto do planeta o clique caiu.
   *
   * Lança um raio da câmera pelo pixel clicado e vê onde ele fura a
   * esfera. Se passar de raspão sem tocar, não há o que cravar.
   */
  function cravarAqui(e: React.PointerEvent) {
    const palco = palcoRef.current;
    if (!palco) return;
    const r = palco.getBoundingClientRect();
    const L = r.width, A = r.height;
    const ndcX = ((e.clientX - r.left) / L) * 2 - 1;
    const ndcY = 1 - ((e.clientY - r.top) / A) * 2;

    const t = Math.tan((FOV * Math.PI) / 360);
    const d = [ndcX * t * (L / A), ndcY * t, -1];
    const nd = Math.hypot(d[0], d[1], d[2]);
    d[0] /= nd; d[1] /= nd; d[2] /= nd;

    // esfera de raio 1 centrada em (0,0,-dist) a partir da câmera
    const oc = [0, 0, cam.current.dist];
    const b = 2 * (d[0] * oc[0] + d[1] * oc[1] + d[2] * oc[2]);
    const c = oc[0] * oc[0] + oc[1] * oc[1] + oc[2] * oc[2] - 1;
    const disc = b * b - 4 * c;
    if (disc < 0) return;                      // o raio passou ao largo

    const s = (-b - Math.sqrt(disc)) / 2;
    const mundo = [d[0] * s, d[1] * s, d[2] * s + cam.current.dist];
    const local = aplicar3T(rotacao3(cam.current.giro, cam.current.inclina), mundo);
    const { lat, lon } = paraLatLon(local[0], local[1], local[2]);

    setSelecionado(null);
    limparFoto();
    setRascunho({
      id: '', nome: '', tipo: 'cidade', resumo: '', lat, lon, altitude: 0, imagem: null,
    });
    pausado.current = true;
  }

  /* ============================================================
     A IMAGEM DO AMBIENTE
     ============================================================ */
  const limparFoto = () => {
    setFoto(null);
    setFotoPreview((v) => { if (v) URL.revokeObjectURL(v); return ''; });
    setErroFoto('');
    setTirarFoto(false);
  };

  function escolherFoto(f: File | null) {
    if (!f) { limparFoto(); return; }
    const reclamacao = conferirImagem(f);
    if (reclamacao) { setErroFoto(reclamacao); setFoto(null); return; }
    setErroFoto('');
    setFoto(f);
    setTirarFoto(false);
    setFotoPreview((v) => { if (v) URL.revokeObjectURL(v); return URL.createObjectURL(f); });
  }

  /**
   * Manda a imagem para o Storage e devolve o endereço público.
   *
   * Vai do navegador DIRETO para o Supabase, sem passar pelo servidor
   * do site: a Vercel corta requisição acima de 4,5 MB, e uma foto de
   * ambiente passa disso com facilidade.
   */
  async function subirFoto(f: File) {
    const ext = (/\.([^.]+)$/.exec(f.name)?.[1] ?? 'jpg').toLowerCase();
    const nome = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET_LOCAIS).upload(nome, f, { upsert: false });
    if (error) throw new Error(error.message);
    return supabase.storage.from(BUCKET_LOCAIS).getPublicUrl(nome).data.publicUrl;
  }

  /** Apaga do Storage a imagem que não é mais de ninguém. */
  async function apagarFoto(url: string | null) {
    const caminho = caminhoDaImagem(url);
    if (!caminho) return;
    await supabase.storage.from(BUCKET_LOCAIS).remove([caminho]);
  }

  /* ============================================================
     GRAVAR
     ============================================================ */
  async function salvar() {
    if (!rascunho) return;
    const nome = rascunho.nome.trim();
    if (!nome) { setErro('O local precisa de um nome.'); return; }

    setSalvando(true);
    setErro('');

    const antiga = rascunho.imagem;
    let imagem = antiga;
    let subiuAgora: string | null = null;
    try {
      if (foto) { imagem = await subirFoto(foto); subiuAgora = imagem; }
      else if (tirarFoto) imagem = null;
    } catch (e) {
      setSalvando(false);
      setErro(e instanceof Error ? e.message : 'não consegui enviar a imagem');
      return;
    }

    const linha = {
      nome: nome.slice(0, LIMITES_LOCAL.nome),
      tipo: rascunho.tipo,
      resumo: (rascunho.resumo ?? '').trim().slice(0, LIMITES_LOCAL.resumo) || null,
      lat: rascunho.lat,
      lon: rascunho.lon,
      altitude: tipoDe(rascunho.tipo).orbital ? (rascunho.altitude || 0.55) : 0,
      imagem,
    };

    const { error } = rascunho.id
      ? await supabase.from('locais').update(linha).eq('id', rascunho.id)
      : await supabase.from('locais').insert([linha]);

    setSalvando(false);
    if (error) {
      // a gravação falhou depois do envio: a imagem ficaria órfã no
      // balde para sempre, então ela volta atrás junto
      if (subiuAgora) await apagarFoto(subiuAgora);
      setErro(error.message);
      return;
    }
    // deu certo: agora sim a imagem velha pode ir embora
    if (antiga && antiga !== imagem) await apagarFoto(antiga);

    setRascunho(null);
    setCravando(false);
    limparFoto();
    pausado.current = false;
    await carregar();
  }

  async function remover(l: Local) {
    const { error } = await supabase.from('locais').delete().eq('id', l.id);
    if (error) { setErro(error.message); return; }
    await apagarFoto(l.imagem);
    setSelecionado(null);
    setRascunho(null);
    limparFoto();
    pausado.current = false;
    await carregar();
  }

  const fechar = () => {
    setSelecionado(null);
    setRascunho(null);
    setErro('');
    limparFoto();
    pausado.current = false;
  };

  /** Abre o formulário já com o que o local tem hoje. */
  const editar = (l: Local) => {
    limparFoto();
    setRascunho({ ...l });
  };

  /* ============================================================
     TELA
     ============================================================ */
  const emEdicao = rascunho !== null;

  const locaisFiltrados = useMemo(() => {
    const q = buscaLocal.trim().toLowerCase();
    return locais
      .filter((l) => (filtroTipo.size === 0 || filtroTipo.has(l.tipo)) && (!q || l.nome.toLowerCase().includes(q)))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [locais, filtroTipo, buscaLocal]);

  return (
    <div className="mundo">
      <div
        className={`palco${cravando ? ' cravando' : ''}`}
        ref={palcoRef}
        onPointerDown={aoDescer}
        onPointerMove={aoMover}
        onPointerUp={aoSubir}
        onPointerLeave={() => { arrasto.current.ativo = false; }}
        onWheel={aoRolar}
      >
        <canvas ref={fundoRef} className="ceu" />
        <canvas ref={telaRef} className="globo" />

        {/* os marcadores: o React cria, o laço de desenho posiciona */}
        {fase === 'pronto' && locais.map((l) => (
          <button
            key={l.id}
            type="button"
            ref={(el) => {
              if (el) marcosRef.current.set(l.id, el);
              else marcosRef.current.delete(l.id);
            }}
            className={`marco${selecionado?.id === l.id ? ' on' : ''}`}
            style={{ opacity: 0, '--cor': tipoDe(l.tipo).cor } as CSSProperties}
            onClick={(ev) => {
              ev.stopPropagation();
              setRascunho(null);
              setSelecionado(l);
              pausado.current = true;
              focarLocal(l);
            }}
          >
            <span className="marco-ponto" />
            <span className="marco-nome">{l.nome}</span>
          </button>
        ))}

        {fase === 'gerando' && (
          <div className="mundo-aviso">
            <div className="load"><span /><span /><span /></div>
            <p>gerando o mundo...</p>
            <small>rocha, relevo e atmosfera são calculados na hora</small>
          </div>
        )}

        {fase === 'sem-webgl' && (
          <div className="mundo-aviso">
            <p>este navegador não consegue desenhar o globo</p>
            <small>o 3D precisa de WebGL, que está desligado ou indisponível aqui</small>
          </div>
        )}

        {fase === 'pronto' && cravando && !emEdicao && (
          <div className="mundo-dica">clique no planeta para cravar o ponto</div>
        )}

        {/* ---------- zoom e giro por botão ---------- */}
        {fase === 'pronto' && (
          <div className="mundo-controles" aria-label="Controles de zoom e giro">
            <div className="giro-pad">
              <button type="button" className="giro-cima" title="inclinar para cima"
                onPointerDown={segurar('inclinaCima')} onPointerUp={soltar} onPointerLeave={soltar}>▲</button>
              <button type="button" className="giro-esq" title="girar para a esquerda"
                onPointerDown={segurar('giroEsq')} onPointerUp={soltar} onPointerLeave={soltar}>◀</button>
              <button type="button" className="giro-dir" title="girar para a direita"
                onPointerDown={segurar('giroDir')} onPointerUp={soltar} onPointerLeave={soltar}>▶</button>
              <button type="button" className="giro-baixo" title="inclinar para baixo"
                onPointerDown={segurar('inclinaBaixo')} onPointerUp={soltar} onPointerLeave={soltar}>▼</button>
            </div>
            <div className="zoom-pad">
              <button type="button" title="aproximar"
                onPointerDown={segurar('zoomMais')} onPointerUp={soltar} onPointerLeave={soltar}>＋</button>
              <button type="button" title="afastar"
                onPointerDown={segurar('zoomMenos')} onPointerUp={soltar} onPointerLeave={soltar}>－</button>
            </div>
          </div>
        )}
      </div>

      {/* ---------- barra de controle ---------- */}
      <div className="mundo-barra">
        <span className="mundo-conta">
          {locais.length} {locais.length === 1 ? 'local' : 'locais'}
        </span>
        {/* a falha aparece aqui mesmo quando nenhum painel está aberto:
            uma tela preta sem explicação não ajuda ninguém */}
        {erro && !selecionado && !rascunho && (
          <span className="erro mundo-erro">FALHA :: {erro}</span>
        )}

        <button
          type="button"
          className={`mini-btn${mostrarLista ? ' on' : ''}`}
          onClick={() => setMostrarLista((v) => !v)}
        >
          ▤ locais
        </button>
        <button
          type="button"
          className={`mini-btn${girando ? '' : ' on'}`}
          onClick={() => mudarGiro(!girando)}
          title={girando ? 'travar o planeta para olhar com calma' : 'deixar o planeta girar de novo'}
        >
          {girando ? '❚❚ parar o giro' : '▶ girar de novo'}
        </button>
        {logado && (
          <button
            type="button"
            className={`mini-btn${cravando ? ' perigo' : ''}`}
            onClick={() => { setCravando(!cravando); fechar(); }}
          >
            {cravando ? 'cancelar' : '+ novo local'}
          </button>
        )}
      </div>

      {/* ---------- lista e filtro de locais ---------- */}
      {mostrarLista && (
        <aside className="painel painel-locais" aria-label="Lista de locais">
          <button type="button" className="painel-x" onClick={() => setMostrarLista(false)}>✕</button>
          <span className="painel-tipo">buscar no mapa</span>
          <h2>Locais</h2>

          <input
            className="lista-busca"
            type="search"
            value={buscaLocal}
            onChange={(e) => setBuscaLocal(e.target.value)}
            placeholder="buscar pelo nome..."
          />

          <div className="tipos">
            {TIPOS.map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.dica}
                className={`aba${filtroTipo.has(t.id) ? ' on' : ''}`}
                onClick={() => setFiltroTipo((prev) => {
                  const novo = new Set(prev);
                  if (novo.has(t.id)) novo.delete(t.id); else novo.add(t.id);
                  return novo;
                })}
              >{t.rotulo}</button>
            ))}
            {filtroTipo.size > 0 && (
              <button type="button" className="aba" onClick={() => setFiltroTipo(new Set())}>limpar</button>
            )}
          </div>

          <ul className="lista-locais">
            {locaisFiltrados.length === 0 && <li className="lista-vazia">nenhum local encontrado</li>}
            {locaisFiltrados.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  className={selecionado?.id === l.id ? 'on' : ''}
                  onClick={() => {
                    setRascunho(null);
                    setSelecionado(l);
                    pausado.current = true;
                    focarLocal(l);
                    setMostrarLista(false);
                  }}
                >
                  <i style={{ background: tipoDe(l.tipo).cor }} />
                  <span className="lista-nome">{l.nome}</span>
                  <span className="lista-tipo">{tipoDe(l.tipo).rotulo}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}

      {/* ---------- painel lateral ---------- */}
      {(selecionado || rascunho) && (
        <aside className="painel">
          <button type="button" className="painel-x" onClick={fechar}>✕</button>

          {selecionado && !rascunho && (
            <>
              {/* a imagem do ambiente abre o painel, como a gravura de
                  um diário de viagem — depois é que vem o texto */}
              {selecionado.imagem && (
                <figure className="painel-foto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selecionado.imagem} alt={`o ambiente de ${selecionado.nome}`} />
                </figure>
              )}

              <span className="painel-tipo" style={{ color: tipoDe(selecionado.tipo).cor }}>
                {tipoDe(selecionado.tipo).rotulo}
              </span>
              <h2>{selecionado.nome}</h2>
              <p className="painel-coord">
                {coordenadaLegivel(selecionado.lat, selecionado.lon)}
                {tipoDe(selecionado.tipo).orbital && ' · em órbita'}
                {tipoDe(selecionado.tipo).serpente && ' · nas águas'}
              </p>

              <span className="painel-fio" aria-hidden="true" />

              {selecionado.resumo
                ? <p className="painel-txt">{selecionado.resumo}</p>
                : <p className="painel-vazio">sem descrição ainda.</p>}

              {logado && (
                <div className="painel-acoes">
                  <button type="button" className="mini-btn"
                    onClick={() => editar(selecionado)}>editar</button>
                  <button type="button" className="mini-btn dim"
                    onClick={() => remover(selecionado)}>remover</button>
                </div>
              )}
            </>
          )}

          {rascunho && (
            <>
              <span className="painel-tipo">{rascunho.id ? 'editando' : 'novo local'}</span>
              <p className="painel-coord">{coordenadaLegivel(rascunho.lat, rascunho.lon)}</p>

              <div className="field">
                <label>nome</label>
                <input
                  value={rascunho.nome}
                  maxLength={LIMITES_LOCAL.nome}
                  autoFocus
                  onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })}
                  placeholder="Cidadela de Marfim"
                />
              </div>

              <div className="field">
                <label>tipo</label>
                <div className="tipos">
                  {TIPOS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      title={t.dica}
                      className={`aba${rascunho.tipo === t.id ? ' on' : ''}`}
                      onClick={() => setRascunho({ ...rascunho, tipo: t.id as TipoLocal })}
                    >{t.rotulo}</button>
                  ))}
                </div>
                <p className="dica">{tipoDe(rascunho.tipo).dica}</p>
              </div>

              <div className="field">
                <label>resumo</label>
                <textarea
                  rows={5}
                  value={rascunho.resumo ?? ''}
                  maxLength={LIMITES_LOCAL.resumo}
                  onChange={(e) => setRascunho({ ...rascunho, resumo: e.target.value })}
                  placeholder="O que é este lugar, em duas ou três frases."
                />
              </div>

              <div className="field">
                <label>imagem do ambiente</label>
                {(fotoPreview || (rascunho.imagem && !tirarFoto)) && (
                  <figure className="painel-foto previa">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fotoPreview || rascunho.imagem || ''} alt="prévia do ambiente" />
                  </figure>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => escolherFoto(e.target.files?.[0] ?? null)}
                />
                {(rascunho.imagem || foto) && (
                  <button
                    type="button"
                    className="mini-btn dim"
                    onClick={() => { limparFoto(); setTirarFoto(true); }}
                  >tirar a imagem</button>
                )}
                {erroFoto
                  ? <p className="erro">{erroFoto}</p>
                  : <p className="dica">JPG, PNG, WEBP ou GIF, até 8 MB.</p>}
              </div>

              <div className="painel-acoes">
                <button type="button" className="mini-btn perigo"
                  disabled={salvando} onClick={salvar}>
                  {salvando ? 'gravando...' : 'gravar'}
                </button>
                <button type="button" className="mini-btn" onClick={fechar}>cancelar</button>
              </div>
            </>
          )}

          {erro && <p className="erro">FALHA :: {erro}</p>}
        </aside>
      )}
    </div>
  );
}
