/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com"
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com"
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "4443"
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "4443"
      }
    ]
  }
}

export default nextConfig
