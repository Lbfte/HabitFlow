import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: 'export',
  // Se o seu repositório for "Synca", mantenha assim. 
  // Se for "synca" (tudo minúsculo), mude aqui embaixo.
  // Só aplicamos o prefixo em ambiente de produção (GitHub Pages) para evitar erro 404 no desenvolvimento local!
  basePath: isProd ? '/Synca' : '', 
  assetPrefix: isProd ? '/Synca' : '',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Permite acesso ao servidor de dev a partir de outros dispositivos na rede local
  allowedDevOrigins: ['192.168.100.252'],
};

export default nextConfig;
