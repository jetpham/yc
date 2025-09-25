import "~/styles/globals.css";

import { type Metadata } from "next";
import {  Comic_Neue  } from "next/font/google";

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

const comic_neue = Comic_Neue({
  subsets: ["latin"],
  variable: "--font-comic-relief",
  weight: "300"
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${comic_neue.variable}`}>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
