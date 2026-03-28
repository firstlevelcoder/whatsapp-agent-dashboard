/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('better-sqlite3')
    }
    return config
  },
  serverExternalPackages: ['better-sqlite3'],
}

export default nextConfig
