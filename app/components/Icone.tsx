const CAMINHOS: Record<string, string> = {
  'som-on': 'M6 20v8h7l11 8V12l-11 8H6z M31 16c3 3 3 13 0 16 M36 11c6 6 6 20 0 26',
  'som-off': 'M6 20v8h7l11 8V12l-11 8H6z M31 17l11 14 M42 17L31 31',
  anexo: 'M32 12L15 29a7 7 0 0010 10l17-17a11 11 0 00-16-16L9 23a15 15 0 0021 21',
  imagem: 'M6 8h36v32H6z M6 32l10-10 8 7 8-9 12 14 M16 18a3 3 0 100-6 3 3 0 000 6z',
  comentario: 'M6 8h36v24H20l-9 8v-8H6z',
  link: 'M20 28a9 9 0 002 10l1 1a9 9 0 0013-13l-4-4 M28 20a9 9 0 00-2-10l-1-1a9 9 0 00-13 13l4 4',
  lapis: 'M9 39l3-11L34 6l8 8-22 22-11 3z M28 12l8 8',
  globo: 'M24 6a18 18 0 100 36 18 18 0 000-36z M6 24h36 M24 6c6 6 6 30 0 36 M24 6c-6 6-6 30 0 36',
  pergunta: 'M24 6a18 18 0 100 36 18 18 0 000-36z M18 19a6 6 0 1110 5c-2 1.5-4 3-4 6 M24 34.2v.2',
  megafone: 'M6 20v8h6l22 10V10L12 20H6z M36 16a10 10 0 010 16',
  envelope: 'M6 11h36v26H6z M6 12l18 15 18-15',
  pergaminho: 'M12 6a5 5 0 000 10h24V6z M12 42a5 5 0 010-10h24v10z M12 16v16 M36 6v36',
  bloqueado: 'M24 6a18 18 0 100 36 18 18 0 000-36z M12 12l24 24',
};

/**
 * Ícones de traço, no mesmo estilo dos usados na navegação do celular —
 * substituem emoji nos botões (que renderizam de um jeito diferente em
 * cada sistema) por um glifo desenhado, consistente em qualquer tela.
 */
export default function Icone({ nome, tamanho = 16 }: { nome: keyof typeof CAMINHOS; tamanho?: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={tamanho}
      height={tamanho}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-3px', flex: 'none' }}
      fill="none"
      stroke="currentColor"
      strokeWidth={3.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}
