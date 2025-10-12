/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable standalone output for Docker
  output: 'standalone',
  webpack: (config, { isServer }) => {
    // Exclude canvas from server-side bundle
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push('canvas')
    }
    return config
  },
}

export default nextConfig
