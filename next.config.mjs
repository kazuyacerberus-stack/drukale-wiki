/** @type {import('next').NextConfig} */
const nextConfig = {
  // o Glossário virou a Reserva de Imagens: favoritos e links antigos seguem pro lugar novo
  async redirects() {
    return [
      { source: '/glossario', destination: '/reservas', permanent: false },
      { source: '/glossario/:slug*', destination: '/reservas', permanent: false },
    ];
  },
};

export default nextConfig;
