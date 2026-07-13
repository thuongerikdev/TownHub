import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.40.55",
    "localhost",
    "127.0.0.1",
    "172.27.192.1",   // WSL2 / network bridge IP
  ],
};

export default nextConfig;
