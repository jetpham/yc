import "~/styles/globals.css";

import { type Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "YC Word Correlation",
  description: "Analyze and visualize trends in YC company descriptions",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  appleWebApp: {
    title: "YC Word Correlation",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
        <Analytics />
      </body>
    </html>
  );
}
