import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF Question Bank",
  description: "Generate and browse question banks from uploaded PDFs"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
