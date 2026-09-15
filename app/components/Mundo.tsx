'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { supabase } from '../lib/db';
import { gerarMundo } from './mundo/textura';
import { criarGlobo, criarCidadela, pintarEspaco, rotacao3 } from './mundo/globo';
import {
  TIPOS, tipoDe, paraVetor, paraLatLon, coordenadaLegivel, lerLocais,
  LIMITES_LOCAL, type Local, type TipoLocal,
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

  const [locais, setLocais] = useState<Local[]>([]);
  const [fase, setFase] = useState<'gerando' | 'pronto' | 'sem-webgl'>('gerando');
  const [erro, setErro] = useState('');
  const [logado, setLogado] = useState(false);
  const [selecionado, setSelecionado] = useState<Local | null>(null);
  const [cravando, setCravando] = useState(false);
  const [rascunho, setRascunho] = useState<Local | null>(null);
  const [salvando, setSalvando] = useState(false);

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
        const cidadela = criarCidadela(tela.getContext('webgl')!);
        setFase('pronto');

        const quadro = (t: number) => {
          if (!vivo) return;
          raf = requestAnimationFrame(quadro);

          // gira sozinho quando ninguém está mexendo nem lendo uma ficha
          if (!arrasto.current.ativo && !pausado.current) cam.current.giro += 0.0011;

          const { giro, inclina, dist } = cam.current;
          const cena = globo.desenhar(giro, inclina, dist, 1);

          // as cidadelas orbitais são desenhadas por cima do planeta
          for (const l of locaisRef.current) {
            if (tipoDe(l.tipo).orbital !== true) continue;
            const p = paraVetor(l.lat, l.lon, 1 + (l.altitude || 0.55));
            cidadela.desenhar(cena.proj, cena.vista, cena.r3, p, 0.085, t / 2600);
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
  const aoDescer = (e: React.PointerEvent) => {
    arrasto.current = { ativo: true, x: e.clientX, y: e.clientY, andou: 0 };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
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
    const fator = Math.exp(e.deltaY * 0.0013);
    cam.current.dist = Math.max(PERTO, Math.min(LONGE, cam.current.dist * fator));
  };

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
    setRascunho({ id: '', nome: '', tipo: 'cidade', resumo: '', lat, lon, altitude: 0 });
    pausado.current = true;
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
    const linha = {
      nome: nome.slice(0, LIMITES_LOCAL.nome),
      tipo: rascunho.tipo,
      resumo: (rascunho.resumo ?? '').trim().slice(0, LIMITES_LOCAL.resumo) || null,
      lat: rascunho.lat,
      lon: rascunho.lon,
      altitude: tipoDe(rascunho.tipo).orbital ? (rascunho.altitude || 0.55) : 0,
    };

    const { error } = rascunho.id
      ? await supabase.from('locais').update(linha).eq('id', rascunho.id)
      : await supabase.from('locais').insert([linha]);

    setSalvando(false);
    if (error) { setErro(error.message); return; }
    setRascunho(null);
    setCravando(false);
    pausado.current = false;
    await carregar();
  }

  async function remover(l: Local) {
    const { error } = await supabase.from('locais').delete().eq('id', l.id);
    if (error) { setErro(error.message); return; }
    setSelecionado(null);
    setRascunho(null);
    pausado.current = false;
    await carregar();
  }

  const fechar = () => {
    setSelecionado(null);
    setRascunho(null);
    setErro('');
    pausado.current = false;
  };

  /* ============================================================
     TELA
     ============================================================ */
  const emEdicao = rascunho !== null;

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
      </div>

      {/* ---------- barra de controle ---------- */}
      <div className="mundo-barra">
        <span className="mundo-conta">
          {locais.length} {locais.length === 1 ? 'local' : 'locais'}
        </span>
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

      {/* ---------- painel lateral ---------- */}
      {(selecionado || rascunho) && (
        <aside className="painel">
          <button type="button" className="painel-x" onClick={fechar}>✕</button>

          {selecionado && !rascunho && (
            <>
              <span className="painel-tipo" style={{ color: tipoDe(selecionado.tipo).cor }}>
                {tipoDe(selecionado.tipo).rotulo}
              </span>
              <h2>{selecionado.nome}</h2>
              <p className="painel-coord">
                {coordenadaLegivel(selecionado.lat, selecionado.lon)}
                {tipoDe(selecionado.tipo).orbital && ' · em órbita'}
              </p>
              {selecionado.resumo
                ? <p className="painel-txt">{selecionado.resumo}</p>
                : <p className="painel-vazio">sem descrição ainda.</p>}

              {logado && (
                <div className="painel-acoes">
                  <button type="button" className="mini-btn"
                    onClick={() => setRascunho({ ...selecionado })}>editar</button>
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
