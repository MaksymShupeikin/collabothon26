import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Dev only: let a phone on the same Wi-Fi load dev resources (mobile testing via the Mac's LAN address).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"], // private LAN ranges incl. iPhone hotspot
};

export default nextConfig;
