/**
 * Better Auth API Route Handler
 * Handles all /api/auth/* requests
 */

import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/shared/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
