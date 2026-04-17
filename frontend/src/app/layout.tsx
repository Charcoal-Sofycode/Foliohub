import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const interSans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfitDisplay = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jbMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FolioHub | Elite Media management",
  description: "The cinematic production hub for directors and editors.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${interSans.variable} ${outfitDisplay.variable} ${jbMono.variable} h-full antialiased dark scroll-smooth`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#050505] text-white selection:bg-white selection:text-black overflow-x-hidden">
        <div className="fixed inset-0 z-[-1] bg-[radial-gradient(circle_at_50%_0%,rgba(20,20,20,1)_0%,rgba(5,5,5,1)_100%)]"></div>
        {children}
      </body>
    </html>
  );
}
