import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UNESCO AI Competency Explorer",
  description:
    "Plan AI literacy across programmes with UNESCO competencies, learning outcomes, mapping, and assessment design.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
