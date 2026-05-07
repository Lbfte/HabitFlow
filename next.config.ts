import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Se o seu repositório for "HabitFlow", mantenha assim. 
  // Se for "habitflow" (tudo minúsculo), mude aqui embaixo:
  basePath: '/HabitFlow', 
  assetPrefix: '/HabitFlow',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
