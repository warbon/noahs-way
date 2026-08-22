/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Philippines outgrew the generic destination template and moved to its
  // own page. Anything already pointing at the old path still resolves.
  async redirects() {
    return [
      { source: "/destinations/philippines", destination: "/philippines", permanent: true }
    ]
  },
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
