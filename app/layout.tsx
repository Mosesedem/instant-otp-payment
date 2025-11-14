import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Akwa Ibom Tech Week 2025 - Event Registration",
  description:
    "Register for Akwa Ibom Tech Week 2025. Join us for the biggest tech event in Akwa Ibom State.",
  icons: {
    icon: "/images/icon-white.svg",
    apple: "/images/icon-white.svg",
  },
  keywords:
    "Akwa Ibom Tech Week, tech event, Akwa Ibom, technology conference, innovation, networking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head></head>
      <body className={`font-sans antialiased`}>
        {children}
        <Toaster position="top-center" richColors />
        <Analytics />
      </body>
    </html>
  );
}
