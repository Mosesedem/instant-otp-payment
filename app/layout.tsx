import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "INSTANT OTP CHILD PANEL REGISTRATION",
  description:
    "Register for the InstantOTP child panel and start making money from your own platform.",
  icons: {
    icon: "/images/logo.svg",
    apple: "/images/logo.svg",
  },
  keywords:
    "InstantOTP, OTP, payment, gateway, child panel, registration, sign up, earn money, platform, online payments",
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
