import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSetting } from "@/lib/data";
import { site } from "@/lib/site";
import { organizationJsonLd, websiteJsonLd, jsonLdString } from "@/lib/seo";

const plexSans = IBM_Plex_Sans({
  variable: "--font-sans-src",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono-src",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
});

export const metadata = {
  metadataBase: new URL(process.env.SITE_URL || site.url),
  title: `${site.name} — запчастини для тракторів і сільгосптехніки`,
  description: `${site.name}: ${site.tagline} Запчастини для тракторів, комбайнів і навісного обладнання з доставкою по всій Україні.`,
  keywords: "запчастини для тракторів, запчастини МТЗ, сільгосптехніка, агрозапчастини, Agrolab",
  openGraph: { type: "website", locale: "uk_UA", siteName: site.name },
};

export const viewport = {
  themeColor: "#2B4D1A",
};

import { CartProvider } from '@/contexts/CartContext';
import CartDrawer from '@/components/CartDrawer';
import ScrollAnimator from '@/components/ScrollAnimator';
import Analytics from '@/components/Analytics';

export default async function RootLayout({ children }) {

  let announcement;
  try {
    const v = await getSetting('announcement');
    announcement = v == null ? undefined : v;
  } catch (e) {
    announcement = undefined;
  }

  return (

    <html lang="uk" className={`${plexSans.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <CartProvider>
          <Navbar announcement={announcement} />
          <CartDrawer />
          <ScrollAnimator />
          <main>{children}</main>
          <Footer />
        </CartProvider>
        <Analytics />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(organizationJsonLd()) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(websiteJsonLd()) }} />
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </body>
    </html>
  );
}
