/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow iframe embedding
  async headers() {
    return [
      {
        source: '/widget/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors *;"
          }
        ],
      },
    ]
  },
}

module.exports = nextConfig
