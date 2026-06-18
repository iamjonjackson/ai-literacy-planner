import type { Metadata } from "next";
import "./globals.css";
import { AppDataProvider } from "@/lib/app-data";

export const metadata: Metadata = {
  title: "AI Literacy Programme Redesign Tool",
  description:
    "Plan AI literacy, learning outcomes, mapping, and assessment design across programmes aligned to the UNESCO AI competency framework",
};

export default function RootLayout({
  children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
      <html lang="en" className="h-full antialiased">
        <body className="min-h-full">
          <AppDataProvider>{children}</AppDataProvider>
        </body>
      </html>
    );
}
