import type { Metadata } from "next";
import { FlowLifecycle } from "@/components/layout/FlowLifecycle";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { bodyFont, displayFont } from "./fonts";
import "./globals.css";

// English metadata until M8 adds locale routing and localised metadata/OG tags.
export const metadata: Metadata = {
  title: "ToneMatch",
  description:
    "Find the jewellery metals that suit your skin. The photo is analysed on your device and never uploaded.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <SiteFooter />
        <FlowLifecycle />
      </body>
    </html>
  );
}
