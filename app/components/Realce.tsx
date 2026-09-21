import { grifar } from '../lib/regras';

/** Escreve o texto grifando o que bate com a busca (comparação sem acento e sem maiúscula). */
export default function Realce({ texto, agulhas }: { texto: string; agulhas: string[] }) {
  if (!agulhas.length) return <>{texto}</>;
  return (
    <>
      {grifar(texto, agulhas).map((p, i) => (p.marca ? <mark className="regra-marca" key={i}>{p.t}</mark> : <span key={i}>{p.t}</span>))}
    </>
  );
}
