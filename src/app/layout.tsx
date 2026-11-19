import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

const thai = IBM_Plex_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono-plex",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "HCIA-Datacom Prep — ติวสอบ Huawei ICT Competition (Network Track)",
    template: "%s · HCIA-Datacom Prep",
  },
  description:
    "เว็บติวสอบ Huawei ICT Competition สาย Network: บทเรียน HCIA-Datacom ภาษาไทย, interactive labs, VRP CLI cheatsheet และ mock test จับเวลา",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

// Runs before paint so the saved/system theme applies without a flash.
const themeScript = `(function(){try{var t=localStorage.getItem('hcia:theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${thai.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
          ข้ามไปเนื้อหา
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
          {children}
        </main>
        <footer className="border-t border-border py-6 text-center text-sm text-muted">
          <div className="mx-auto max-w-6xl px-4">
            เว็บติวส่วนตัว ไม่ใช่เว็บไซต์ทางการของ Huawei · เนื้อหาเขียนใหม่ทั้งหมด อ้างอิงแหล่งที่มาในหน้า{" "}
            <Link className="underline hover:text-fg" href="/about/">
              เกี่ยวกับ
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
