/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Exclude supabase directory from Next.js compilation
  // Supabase Edge Functions use Deno and should not be compiled by Next.js
  webpack: (config, { isServer }) => {
    // Ignore Supabase Edge Functions during webpack compilation
    const { IgnorePlugin } = require('webpack')
    
    config.plugins = config.plugins || []
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /^\.\/supabase\/functions\/.*$/,
      })
    )
    
    return config
  },
}

module.exports = nextConfig
