import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevVerify - Code Evidence Platform",
  description: "Map resume bullet points directly to real code files in GitHub repositories, giving recruiters verifiable proof of technical skills.",
  keywords: ["DevVerify", "Next.js", "TypeScript", "Resume Verification", "Code Evidence", "GitHub", "Prisma"],
  authors: [{ name: "DevVerify" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "DevVerify - Code Evidence Platform",
    description: "Verifiable proof of your technical skills, backed by real code.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DevVerify - Code Evidence Platform",
    description: "Verifiable proof of your technical skills, backed by real code.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
