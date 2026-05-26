import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Allow HMR when opening dev via LAN IP (e.g. http://192.168.29.141:3000). */
  allowedDevOrigins: ["192.168.29.141"],
};

export default nextConfig;
