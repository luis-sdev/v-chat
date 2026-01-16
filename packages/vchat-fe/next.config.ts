import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Enable React strict mode for better development experience
    reactStrictMode: true,

    // Transpile the database package from the monorepo
    transpilePackages: ["database"],

    // Experimental features
    experimental: {
        // Type-safe routes
        typedRoutes: true,
    },
};

export default nextConfig;
