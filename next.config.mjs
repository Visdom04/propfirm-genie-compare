/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rtzkywwbsldinjgykqag.supabase.co',
        pathname: '/storage/v1/object/public/genie-assets/**',
      },
    ],
  },
};

export default nextConfig;
