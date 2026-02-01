/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode for development
  reactStrictMode: true,
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),
}

module.exports = nextConfig
