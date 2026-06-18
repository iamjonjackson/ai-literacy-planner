import type { Metadata } from "next";
import "./globals.css";
import { AppDataProvider } from "@/lib/app-data";
import { AuthProvider } from "@/lib/auth";

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
          <AuthProvider>
            <AppDataProvider>{children}</AppDataProvider>
          </AuthProvider>
        </body>
      </html>
    );
}
