import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/navbar";
import MigrationBanner from "@/components/MigrationBanner";
import Footer from "@/components/Footer";
import ConsentGate from "@/components/ConsentGate";

export const metadata: Metadata = {
  title: "Prediction market",
  description: "Created by Noah Broome",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#101827] min-h-screen w-full flex flex-col">
        <MigrationBanner/>
        <Navbar/>
        <div className="flex-1">{children}</div>
        <Footer/>
        <ConsentGate/>
      </body>
    </html>
  );
}
