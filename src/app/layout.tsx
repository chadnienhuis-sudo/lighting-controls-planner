import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthProvider } from "@/lib/supabase/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Lighting Controls Planner — A free tool from A+ Lighting",
    template: "%s · Lighting Controls Planner",
  },
  description:
    "Build ASHRAE 90.1-2019 compliant lighting controls designs room by room. Free to use. Generates a complete controls narrative, room schedule, and commissioning notes. Interior + outdoor coverage, with IES illumination recommendations.",
  keywords: [
    "lighting controls planner",
    "ASHRAE 90.1",
    "lighting controls narrative",
    "sequence of operations",
    "commercial lighting design",
    "IES RP-1",
    "daylight harvesting",
    "A+ Lighting",
  ],
  authors: [{ name: "A+ Lighting Solutions, LLC", url: "https://apluslightingllc.com" }],
  openGraph: {
    title: "Lighting Controls Planner",
    description:
      "Free web tool for ASHRAE 90.1-2019 lighting controls design. From A+ Lighting.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Adobe Typekit: area-normal (body) + area-extended (headings) */}
        <link rel="stylesheet" href="https://use.typekit.net/qnr5vtx.css" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>
          <SiteHeader />
          <main className="flex-1 flex flex-col">{children}</main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
