import type { Metadata } from "next";
import "./globals.css";

// Placeholder metadata. Real copy, fonts and i18n (en/sq) arrive in M6 and M8.
export const metadata: Metadata = {
  title: "ToneMatch",
  description: "Jewellery metal and style guidance from an on-device photo analysis.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
