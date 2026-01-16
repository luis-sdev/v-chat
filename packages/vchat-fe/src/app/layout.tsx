import type { Metadata } from "next";

import "./globals.css";
import { QueryProvider } from "@/shared/components/providers";

export const metadata: Metadata = {
  title: "V-Chat | Internal Knowledge Assistant",
  description:
    "RAG-powered chatbot for company policies, HR, and documentation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
