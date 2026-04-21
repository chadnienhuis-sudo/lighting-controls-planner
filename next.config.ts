import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this project. Without this, Next 16
  // walks up to C:\Users\CHAD\projects\ (because a stray lockfile lives there)
  // and then can't resolve tailwindcss / other deps that only exist under
  // ./node_modules. Silences the "inferred workspace root" warning too.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
