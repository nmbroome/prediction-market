import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/navbar";

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
      <body className="bg-[#101827] min-h-screen w-full">
        <Navbar/>
        {children}
      </body>
    </html>
  );
}
