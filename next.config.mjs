/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [],
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-lib'],
  },
};

export default nextConfig;
