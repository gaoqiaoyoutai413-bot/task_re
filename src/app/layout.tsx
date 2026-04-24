import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthWrapper } from "@/components/AuthWrapper";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Analog-Digital Task Manager",
  description: "A next-generation task management app blending paper and digital.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} antialiased min-h-screen flex items-center justify-center p-2 md:p-4 overflow-hidden`}>
        {/* Main tablet container */}
        <AuthWrapper>
          <main className="w-full max-w-[98vw] 2xl:max-w-[1600px] h-[94vh] md:h-[96vh] bg-[#fdfbf7] rounded-sm shadow-2xl relative flex overflow-hidden paper-texture">
            {/* Subtle pages underneath effect */}
            <div className="absolute top-1 left-1 right-1 bottom-[-4px] bg-[#f4eee1] rounded-sm shadow-sm -z-10 border border-black/5" />
            <div className="absolute top-2 left-2 right-2 bottom-[-8px] bg-[#ebe5d9] rounded-sm shadow-sm -z-20 border border-black/5" />
            
            {children}
          </main>
        </AuthWrapper>
      </body>
    </html>
  );
}
