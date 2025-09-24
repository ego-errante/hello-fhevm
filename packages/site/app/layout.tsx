import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Funnel_Sans } from "next/font/google";
import {
  FaHandRock,
  FaHandPaper,
  FaHandScissors,
  FaLock,
} from "react-icons/fa";

export const metadata: Metadata = {
  title: "Zama FHEVM SDK Quickstart",
  description: "Zama FHEVM SDK Quickstart app",
};

const funnelSans = Funnel_Sans({
  subsets: ["latin"],
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={funnelSans.className}>
      <body className={`zama-bg text-foreground antialiased`}>
        <div className="fixed inset-0 w-full h-full zama-bg z-[-20] min-w-[850px]"></div>
        <main className="flex flex-col max-w-screen-lg mx-auto pb-20 min-w-[850px]">
          <nav className="flex w-full px-3 md:px-0 h-fit py-10 justify-between items-center">
            <div className="flex items-center border-black p-1 border-2">
              <FaHandRock className="size-10" />
              <FaHandPaper className="size-10" />
              <FaHandScissors className="rotate-90 size-10" />
              <FaLock className="size-10" />
            </div>
          </nav>
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
