/**
 * Server Entry Point
 * Bootstraps the Express application
 */

import "dotenv/config";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./shared/utils/index.js";

async function main() {
    const app = createApp();

    app.listen(env.PORT, () => {
        logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
        logger.info(`📚 Environment: ${env.NODE_ENV}`);
        logger.info(`🔐 Auth URL: ${env.BETTER_AUTH_URL}`);
    });
}

main().catch((error) => {
    logger.error("Failed to start server", { error: String(error) });
    process.exit(1);
});
