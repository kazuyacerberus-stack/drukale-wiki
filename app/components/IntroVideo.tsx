'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Abertura em vídeo da página inicial (substitui a abertura Matrix).
 *
 * - Tenta tocar COM som. Se o navegador bloquear (Chrome, Safari e Firefox
 *   bloqueiam áudio que começa sem um clique da pessoa), mostra a tela
 *   "▶ ENTRAR": esse clique é o que libera o som, e o vídeo começa do zero.
 * - "pular" fecha na hora, a qualquer momento.
 * - O vídeo é mantido inteiro, com os créditos originais. Quando ele
 *   termina, entra o cartão de Terra Save, que é nosso, e o site abre.
 */
type Fase = 'checando' | 'portao' | 'video' | 'cartao' | 'saindo' | 'fim';

const SAIDA_MS = 700;

/**
 * Uma vez por sessão: depois de assistida (ou pulada), a abertura não
 * volta até a pessoa fechar o navegador/aba. Marca só ao terminar — se a
 * página recarregar no meio (1ª visita), a abertura recomeça.
 */
const CHAVE_VISTA = 'drk-intro-vista';
function jaViu(): boolean {
  try { return window.sessionStorage.getItem(CHAVE_VISTA) === '1'; } catch { return false; }
}
function marcarVista() {
  try { window.sessionStorage.setItem(CHAVE_VISTA, '1'); } catch { /* sem armazenamento: volta a tocar, sem prejuízo */ }
}
const CARTAO_MS = 3200;

export default function IntroVideo() {
  const [fase, setFase] = useState<Fase>('checando');
  const iniciado = useRef(false);
  const [mudo, setMudo] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const timers = useRef<number[]>([]);

  const agenda = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const fechar = () => {
    marcarVista();
    video.current?.pause();
    setFase('saindo');
    agenda(() => setFase('fim'), SAIDA_MS);
  };

  const mostrarCartao = () => {
    setFase('cartao');
    agenda(fechar, CARTAO_MS);
  };

  // primeiro decide se toca (antes disso a tela fica preta, sem baixar o vídeo)
  useEffect(() => {
    setFase(jaViu() ? 'fim' : 'video');
    const aoTecla = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('keydown', aoTecla);
    return () => {
      window.removeEventListener('keydown', aoTecla);
      timers.current.forEach(clearTimeout);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (fase !== 'video' || iniciado.current) return;
    iniciado.current = true;
    document.body.style.overflow = 'hidden';
    const v = video.current;
    if (v) {
      v.muted = false;
      v.volume = 1;
      v.play().catch(() => {
        // som bloqueado pelo navegador: pede o clique que libera o áudio
        v.pause();
        v.currentTime = 0;
        setFase('portao');
      });
    }
  }, [fase]);

  useEffect(() => { if (fase === 'fim') document.body.style.overflow = ''; }, [fase]);

  if (fase === 'fim') return null;
  if (fase === 'checando') return <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000' }} />;

  /** O clique em "entrar" é o gesto que o navegador exige para liberar o som. */
  const entrar = () => {
    const v = video.current;
    if (!v) return;
    v.muted = false;
    v.volume = 1;
    v.currentTime = 0;
    setMudo(false);
    setFase('video');
    v.play().catch(() => {
      // nem com clique (raro: aba sem permissão de áudio): toca mudo para não travar
      v.muted = true;
      setMudo(true);
      v.play().catch(() => {});
    });
  };

  const alternarSom = () => {
    const v = video.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted && v.paused) v.play().catch(() => {});
    setMudo(v.muted);
  };

  const botao: React.CSSProperties = {
    background: 'rgba(0,0,0,.55)', color: '#e9e4da', border: '1px solid rgba(233,228,218,.35)',
    borderRadius: 4, padding: '8px 16px', fontFamily: 'inherit', fontSize: 14, letterSpacing: '.12em',
    cursor: 'pointer', backdropFilter: 'blur(4px)',
  };

  return (
    <div
      role="dialog"
      aria-label="Abertura de Terra Save"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: '#000',
        opacity: fase === 'saindo' ? 0 : 1, transition: `opacity ${SAIDA_MS}ms ease`,
      }}
    >
      <video
        ref={video}
        src="/intro/terra-save-intro.mp4"
        poster="/intro/terra-save-intro.jpg"
        playsInline
        preload="auto"
        onEnded={mostrarCartao}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain',
          opacity: fase === 'video' || fase === 'portao' ? 1 : 0, transition: 'opacity 900ms ease',
        }}
      />

      {fase === 'portao' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 22, background: 'rgba(0,0,0,.55)', padding: 24, textAlign: 'center',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-terra-save.png" alt="Terra Save" style={{ width: 'min(320px, 60vw)', height: 'auto' }} />
          <button type="button" onClick={entrar} autoFocus style={{
            ...botao, fontSize: 18, padding: '14px 34px', letterSpacing: '.3em',
            border: '1px solid rgba(233,228,218,.7)', background: 'rgba(20,16,43,.75)',
          }}>▶ ENTRAR</button>
          <p style={{ margin: 0, color: 'rgba(233,228,218,.6)', fontSize: 12, letterSpacing: '.15em' }}>🔊 com som</p>
        </div>
      )}

      {/* cartão final: a marca de Terra Save, depois do vídeo */}
      <div
        aria-hidden={fase !== 'cartao'}
        style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, textAlign: 'center',
          background: 'radial-gradient(ellipse at center, #14102b 0%, #000 75%)',
          opacity: fase === 'cartao' || fase === 'saindo' ? 1 : 0, transition: 'opacity 900ms ease',
          pointerEvents: 'none',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-terra-save.png" alt="Terra Save" style={{ width: 'min(420px, 70vw)', height: 'auto' }} />
        <p style={{ margin: 0, color: '#e9e4da', letterSpacing: '.3em', fontSize: 'clamp(12px, 2vw, 16px)' }}>
          ✦ ENTRE O PASSADO E O FUTURO, A MESMA TERRA. ✦
        </p>
        <p style={{ margin: 0, color: 'rgba(233,228,218,.6)', letterSpacing: '.2em', fontSize: 'clamp(10px, 1.6vw, 13px)' }}>
          MAIS QUE UM MUNDO, UMA ESCOLHA.
        </p>
      </div>

      <div style={{ position: 'absolute', right: 20, bottom: 20, display: 'flex', gap: 10 }}>
        {fase === 'video' && (
          <button type="button" style={botao} onClick={alternarSom}>{mudo ? '🔊 ativar som' : '🔇 sem som'}</button>
        )}
        <button type="button" style={botao} onClick={fechar}>pular ›</button>
      </div>
    </div>
  );
}
