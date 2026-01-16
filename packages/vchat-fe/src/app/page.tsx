/**
 * Root Page
 * Redirects to dashboard or login
 */

import { redirect } from "next/navigation";

export default function HomePage() {
  // TODO: Check authentication and redirect accordingly
  // For now, redirect to dashboard
  redirect("/dashboard");
}
