import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // typescript: {
  //   ignoreBuildErrors: true, // Re-enable checks by removing or commenting out
  // },
  // eslint: {
  //   ignoreDuringBuilds: true, // Re-enable checks by removing or commenting out
  // },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co', // Spotify image CDN
        port: '',
        pathname: '/image/**',
      }
    ],
  },
};

export default nextConfig;
