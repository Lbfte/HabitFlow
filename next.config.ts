import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Se o seu repositório no GitHub se chamar "HabitFlow", descomente as linhas abaixo:
  // basePath: '/HabitFlow',
  // assetPrefix: '/HabitFlow',
};

export default nextConfig;
